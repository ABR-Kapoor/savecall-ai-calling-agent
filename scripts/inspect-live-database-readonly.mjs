/**
 * Read-only inventory of the configured InsurCall PostgreSQL target.
 * Loads .env only when DATABASE_URL is not already set. Does not read business
 * row contents, and every query runs in a read-only transaction.
 */
import fs from "node:fs";
import pg from "pg";

if (!process.env.DATABASE_URL && fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}

if (!process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL to the intended PostgreSQL target first");
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 7000,
  query_timeout: 10000,
  max: 1,
});
const client = await pool.connect();
const tables = [
  "tenants",
  "tenant_members",
  "customers",
  "policies",
  "claims",
  "call_sessions",
  "messages",
  "audit_logs",
  "tool_executions",
  "ai_agents",
  "knowledge_sources",
  "agent_knowledge_sources",
  "document_chunks",
  "phone_numbers",
  "telephony_connections",
  "whatsapp_connections",
  "whatsapp_conversations",
  "whatsapp_messages",
  "outbox_events",
];

async function readOnly(work) {
  await client.query("BEGIN READ ONLY");
  try {
    return await work();
  } finally {
    await client.query("ROLLBACK");
  }
}

try {
  const identity = await readOnly(async () => {
    const result = await client.query(
      "select current_database() as database, current_user as role, r.rolsuper as superuser, r.rolbypassrls as bypasses_rls from pg_roles r where r.rolname = current_user"
    );
    return result.rows[0];
  });

  const migration = await readOnly(async () => {
    const result = await client.query(
      "select version_num from public.alembic_version"
    );
    return result.rows;
  }).catch((error) => ({ error: error.code || error.message }));

  const rls = await readOnly(async () => {
    const result = await client.query(
      "select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced, coalesce(s.n_live_tup,-1) as estimated_live_rows from pg_class c join pg_namespace n on n.oid=c.relnamespace left join pg_stat_user_tables s on s.relid=c.oid where n.nspname='public' and c.relname=any($1::text[]) order by c.relname",
      [tables]
    );
    return result.rows;
  });

  const policiesAndGrants = await readOnly(async () => {
    const policies = await client.query(
      "select tablename,policyname,cmd,roles from pg_policies where schemaname='public' and tablename=any($1::text[]) order by tablename,policyname",
      [tables]
    );
    const grants = await client.query(
      "select grantee,table_name,array_agg(privilege_type order by privilege_type) as privileges from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role') and table_name=any($1::text[]) group by grantee,table_name order by table_name,grantee",
      [tables]
    );
    return { policies: policies.rows, grants: grants.rows };
  });

  const anonProbe = await readOnly(async () => {
    try {
      await client.query("SET LOCAL ROLE anon");
      const result = await client.query(
        "select current_user as effective_role, current_setting('request.jwt.claims',true) as jwt_claims, exists(select 1 from public.tenants) as any_tenant, exists(select 1 from public.tenant_members) as any_membership, exists(select 1 from public.customers) as any_customer, exists(select 1 from public.policies) as any_policy, exists(select 1 from public.claims) as any_claim, exists(select 1 from public.audit_logs) as any_audit, exists(select 1 from public.whatsapp_connections) as any_whatsapp_connection, exists(select 1 from public.document_chunks) as any_knowledge_chunk"
      );
      return result.rows[0];
    } catch (error) {
      return { error: error.code || error.message };
    }
  });

  const rag = await readOnly(async () => {
    const columns = await client.query(
      "select a.attname as column_name,format_type(a.atttypid,a.atttypmod) as column_type from pg_attribute a join pg_class t on t.oid=a.attrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='document_chunks' and a.attnum>0 and not a.attisdropped order by a.attnum"
    );
    const vectorExtension = await client.query(
      "select extversion from pg_extension where extname='vector'"
    );
    const matchFunctions = await client.query(
      "select p.oid::regprocedure as signature,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname='match_document_chunks'"
    );
    const indexes = await client.query(
      "select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename=any($1::text[]) order by tablename,indexname",
      [["document_chunks", "whatsapp_connections", "whatsapp_conversations", "whatsapp_messages"]]
    );
    return {
      documentChunkColumns: columns.rows,
      vectorExtension: vectorExtension.rows,
      matchFunctions: matchFunctions.rows,
      indexes: indexes.rows,
    };
  });

  const explain = await readOnly(async () => {
    const queries = {
      inbox:
        "EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id,last_message_at FROM public.whatsapp_conversations WHERE tenant_id=(SELECT tenant_id FROM public.whatsapp_conversations LIMIT 1) ORDER BY last_message_at DESC LIMIT 100",
      rag: "EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM public.match_document_chunks((SELECT tenant_id FROM public.agent_knowledge_sources LIMIT 1),(SELECT agent_id FROM public.agent_knowledge_sources LIMIT 1),array_fill(0::real,ARRAY[384])::vector,0,5,'all-minilm-l6-v2-v1')",
    };
    const results = {};
    for (const [name, sql] of Object.entries(queries)) {
      try {
        const result = await client.query(sql);
        const root = result.rows[0]["QUERY PLAN"][0];
        const plan = root.Plan;
        results[name] = {
          nodeType: plan["Node Type"],
          actualRows: plan["Actual Rows"],
          executionMs: root["Execution Time"],
          planningMs: root["Planning Time"],
          sharedHitBlocks: plan["Shared Hit Blocks"],
          sharedReadBlocks: plan["Shared Read Blocks"],
        };
      } catch (error) {
        results[name] = { error: error.code || error.message };
      }
    }
    return results;
  });

  console.log(
    JSON.stringify({ identity, migration, rls, policiesAndGrants, anonProbe, rag, explain }, null, 2)
  );
} finally {
  client.release();
  await pool.end();
}
