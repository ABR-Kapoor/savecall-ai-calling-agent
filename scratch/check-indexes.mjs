import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkIndexes() {
  const res = await pool.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE tablename IN ('whatsapp_connections', 'whatsapp_conversations', 'whatsapp_messages')
    ORDER BY tablename, indexname
  `);
  console.log(res.rows);
  await pool.end();
}

checkIndexes().catch(console.error);
