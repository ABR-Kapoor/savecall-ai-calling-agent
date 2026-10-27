import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

async function run() {
  const client = await pool.connect();
  try {
    console.log("Adding is_demo column to whatsapp_conversations and whatsapp_messages...");
    await client.query(`
      ALTER TABLE whatsapp_conversations
      ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
    `);

    await client.query(`
      ALTER TABLE whatsapp_messages
      ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
    `);

    console.log("Marking known seed demo records as is_demo = true...");
    const convRes = await client.query(`
      UPDATE whatsapp_conversations
      SET is_demo = true
      WHERE customer_name IN ('Aarav Sharma', 'Priya Patel', 'Rajesh Mehta', 'Test Recipient')
         OR customer_phone IN ('+919876543210', '+919123456789', '+919988776655', '+918839650036')
      RETURNING id, customer_name, customer_phone;
    `);
    console.log(`Updated ${convRes.rowCount} demo conversations:`, convRes.rows);

    const msgRes = await client.query(`
      UPDATE whatsapp_messages
      SET is_demo = true
      WHERE conversation_id IN (
        SELECT id FROM whatsapp_conversations WHERE is_demo = true
      ) OR phone IN ('+919876543210', '+919123456789', '+919988776655', '+918839650036')
      RETURNING id;
    `);
    console.log(`Updated ${msgRes.rowCount} demo messages as is_demo = true.`);

    // Check unique constraints for chat_id per tenant and connection
    const constraints = await client.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'whatsapp_conversations'::regclass;
    `);
    console.log("whatsapp_conversations constraints:", constraints.rows);

    // Create unique index on (tenant_id, chat_id) if not already exists for idempotency
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant_chat
      ON whatsapp_conversations (tenant_id, chat_id);
    `);
    console.log("Ensured unique index on (tenant_id, chat_id).");

    // Create unique index on (tenant_id, provider_message_id) where provider_message_id is not null
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_provider_msg
      ON whatsapp_messages (tenant_id, provider_message_id)
      WHERE provider_message_id IS NOT NULL;
    `);
    console.log("Ensured unique index on (tenant_id, provider_message_id).");

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
