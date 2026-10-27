import pg from 'pg';
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must target an explicitly selected development database');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function reload() {
  await pool.query("NOTIFY pgrst, 'reload schema';");
  console.log("✓ Successfully notified PostgREST to reload schema cache!");
  await pool.end();
}
reload().catch(console.error);
