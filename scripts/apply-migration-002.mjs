import pg from 'pg';
import fs from 'fs';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:0cd352b4c767620fc47fb453f8a5cf0f@ufmgh6q8.ap-southeast.database.insforge.app:5432/insforge?sslmode=require';
const pool = new Pool({ connectionString });

async function main() {
  console.log('Reading migration file: insforge/migrations/002_rag_security_schema.sql');
  const sql = fs.readFileSync('insforge/migrations/002_rag_security_schema.sql', 'utf8');

  console.log('Applying migration to PostgreSQL database...');
  await pool.query(sql);
  console.log('✓ Migration 002 applied successfully!');

  // Verify created tables and RLS status
  const tables = ['agent_knowledge_sources', 'document_chunks', 'knowledge_sources'];
  const rls = await pool.query(`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname = ANY($1);
  `, [tables]);
  console.log('\nUpdated RLS Status:');
  rls.rows.forEach(r => console.log(`  - ${r.relname}: RLS ${r.relrowsecurity ? 'ENABLED' : 'DISABLED'}`));

  // Verify function match_document_chunks exists
  const func = await pool.query(`
    SELECT proname, proargnames 
    FROM pg_proc 
    WHERE proname = 'match_document_chunks';
  `);
  console.log('\nFunction match_document_chunks:', func.rows[0]?.proname || 'NOT FOUND');

  await pool.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
