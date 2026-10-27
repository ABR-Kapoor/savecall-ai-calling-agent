import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function inspect() {
  const tables = ["whatsapp_connections", "whatsapp_conversations", "whatsapp_messages"];
  for (const t of tables) {
    console.log(`=== ${t} ===`);
    const cols = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [t]
    );
    console.log(cols.rows);
  }
  await pool.end();
}

inspect().catch(console.error);
