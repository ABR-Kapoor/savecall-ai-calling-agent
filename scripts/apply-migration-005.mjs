import pg from 'pg';
import fs from 'fs';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL must target an explicitly selected development database');
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Reading migration file: insforge/migrations/005_phone_numbers_and_telephony.sql');
  const sql = fs.readFileSync('insforge/migrations/005_phone_numbers_and_telephony.sql', 'utf8');

  console.log('Applying migration 005 to PostgreSQL database...');
  await pool.query(sql);
  console.log('✓ Migration 005 applied successfully!');

  // Verify created tables and RLS status
  const tables = ['phone_numbers', 'telephony_connections'];
  const rls = await pool.query(`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname = ANY($1);
  `, [tables]);
  console.log('\nUpdated RLS Status:');
  rls.rows.forEach(r => console.log(`  - ${r.relname}: RLS ${r.relrowsecurity ? 'ENABLED' : 'DISABLED'}`));

  await pool.end();
}

main().catch(err => {
  console.error('Migration 005 failed:', err);
  process.exit(1);
});
