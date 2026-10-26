import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0cd352b4c767620fc47fb453f8a5cf0f@ufmgh6q8.ap-southeast.database.insforge.app:5432/insforge?sslmode=require' });

async function reload() {
  await pool.query("NOTIFY pgrst, 'reload schema';");
  console.log("✓ Successfully notified PostgREST to reload schema cache!");
  await pool.end();
}
reload().catch(console.error);
