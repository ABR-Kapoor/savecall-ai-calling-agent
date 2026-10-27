import pg from 'pg';
import fs from 'node:fs';

// Load .env
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log('PUBLIC TABLES:', JSON.stringify(tables.rows.map(r => r.table_name), null, 2));

  // Check row counts
  for (const row of tables.rows) {
    try {
      const cnt = await pool.query(`SELECT count(*) FROM "${row.table_name}"`);
      console.log(`${row.table_name}: ${cnt.rows[0].count} rows`);
    } catch (e) {
      console.log(`${row.table_name}: error reading (${e.message})`);
    }
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
