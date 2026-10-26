import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:0cd352b4c767620fc47fb453f8a5cf0f@ufmgh6q8.ap-southeast.database.insforge.app:5432/insforge?sslmode=require';
const pool = new Pool({ connectionString });

async function main() {
  console.log('Connecting to PostgreSQL...');
  
  // 1. Check extensions
  const exts = await pool.query('SELECT extname, extversion FROM pg_extension;');
  console.log('\nInstalled Extensions:');
  exts.rows.forEach(r => console.log(`  - ${r.extname} (v${r.extversion})`));

  // 2. Check tables of interest
  const tables = ['ai_agents', 'knowledge_sources', 'knowledge_items', 'knowledge_documents', 'tenants', 'tenant_members', 'users'];
  for (const t of tables) {
    const cols = await pool.query(`
      SELECT column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    console.log(`\nTable '${t}' columns:`);
    cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type} (${c.udt_name}) | nullable: ${c.is_nullable}`));
  }

  // 3. Check RLS status
  const rls = await pool.query(`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname = ANY($1);
  `, [tables]);
  console.log('\nRLS Status:');
  rls.rows.forEach(r => console.log(`  - ${r.relname}: RLS ${r.relrowsecurity ? 'ENABLED' : 'DISABLED'}`));

  await pool.end();
}

main().catch(console.error);
