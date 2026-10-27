import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

async function run() {
  const client = await pool.connect();
  try {
    const cols1 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'whatsapp_conversations' ORDER BY ordinal_position");
    console.log("WHATSAPP_CONVERSATIONS COLUMNS:", cols1.rows.map(c => `${c.column_name}:${c.data_type}`).join(", "));

    const cols2 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'whatsapp_messages' ORDER BY ordinal_position");
    console.log("WHATSAPP_MESSAGES COLUMNS:", cols2.rows.map(c => `${c.column_name}:${c.data_type}`).join(", "));

    const convs = await client.query("SELECT id, tenant_id, customer_name, customer_phone, last_message_text, unread_count, human_takeover, created_at FROM whatsapp_conversations ORDER BY created_at DESC LIMIT 10");
    console.log("WHATSAPP_CONVERSATIONS ROWS (Count: " + convs.rows.length + "):", convs.rows);

    const msgs = await client.query("SELECT id, conversation_id, sender_type, body, created_at FROM whatsapp_messages ORDER BY created_at DESC LIMIT 10");
    console.log("WHATSAPP_MESSAGES ROWS (Count: " + msgs.rows.length + "):", msgs.rows);

    const conns = await client.query("SELECT id, tenant_id, provider_session_id, status, phone_number, connected_at, created_at FROM whatsapp_connections");
    console.log("WHATSAPP_CONNECTIONS:", conns.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
