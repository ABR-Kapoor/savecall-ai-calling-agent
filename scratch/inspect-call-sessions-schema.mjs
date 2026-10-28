import pg from "pg";
import fs from "node:fs";

let cs = process.env.DATABASE_URL;
if (!cs && fs.existsSync(".env")) {
  for (const l of fs.readFileSync(".env", "utf-8").split("\n")) {
    if (l.startsWith("DATABASE_URL=")) cs = l.slice(13).trim();
  }
}

const pool = new pg.Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

async function run() {
  const res = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'call_sessions'
    ORDER BY ordinal_position;
  `);
  console.log("call_sessions columns:", res.rows);

  const conns = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'whatsapp_connections'
    ORDER BY ordinal_position;
  `);
  console.log("whatsapp_connections columns:", conns.rows);

  await pool.end();
}

run().catch(console.error);
