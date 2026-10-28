import pg from "pg";
import crypto from "node:crypto";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new pg.Pool({ connectionString: DATABASE_URL });

const APP_BASE_URL = process.env.APP_BASE_URL || "https://127.0.0.1:5173";
const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || "ad80b78a70e1bdb54d24d90a63907b3cef4610b782e090a2";
const TEST_TENANT_ID = "a0000000-0000-0000-0000-000000000001";
const SESSION_ID = "insurcall-a0000000";

async function verifySingleInbound() {
  const client = await pool.connect();
  console.log("================================================================");
  console.log("   INSURCALL SINGLE REAL INBOUND MESSAGE VERIFICATION SUITE");
  console.log("================================================================");

  try {
    // 1. Initial counts in PostgreSQL
    const initialMsgCount = await client.query(
      "SELECT count(*) FROM whatsapp_messages WHERE tenant_id = $1 AND is_demo = false",
      [TEST_TENANT_ID]
    );
    const initialOutboundCount = await client.query(
      "SELECT count(*) FROM whatsapp_messages WHERE tenant_id = $1 AND direction = 'outbound'",
      [TEST_TENANT_ID]
    );
    console.log(`Initial real messages count in DB: ${initialMsgCount.rows[0].count}`);
    console.log(`Initial outbound messages count in DB: ${initialOutboundCount.rows[0].count}`);

    // 2. Prepare single inbound message payload
    const testMsgId = `real_test_${Date.now()}`;
    const customerPhone = "+919876500001";
    const customerName = "Rohan Varma";
    const messageBody = "Hello, can you confirm if my motor policy MP-2026-9901 is active?";
    const chatId = `${customerPhone.replace(/[^0-9]/g, "")}@s.whatsapp.net`;

    const payload = {
      event: "message.received",
      sessionId: SESSION_ID,
      timestamp: Date.now(),
      data: {
        id: testMsgId,
        chatId: chatId,
        from: chatId,
        fromMe: false,
        body: messageBody,
        author: customerName,
        senderPhone: customerPhone.replace("+", ""),
        timestamp: Date.now(),
        type: "chat",
      },
    };

    const connRes = await client.query(
      "SELECT id, webhook_secret FROM whatsapp_connections WHERE tenant_id = $1 AND provider_session_id = $2",
      [TEST_TENANT_ID, SESSION_ID]
    );
    const activeSecret = connRes.rows[0]?.webhook_secret || WEBHOOK_SECRET;

    const bodyString = JSON.stringify(payload);
    const signature = crypto.createHmac("sha256", activeSecret).update(bodyString).digest("hex");

    console.log(`\nDispatching ONE real inbound message to: ${APP_BASE_URL}/api/webhooks/whatsapp`);
    console.log(`From: ${customerName} (${customerPhone})`);
    console.log(`Body: "${messageBody}"`);

    const res = await fetch(`${APP_BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": `sha256=${signature}`,
      },
      body: bodyString,
    });

    const resText = await res.text();
    console.log(`Webhook HTTP status: ${res.status}`);
    console.log(`Webhook response: ${resText}`);

    if (res.status !== 200) {
      throw new Error(`Webhook failed with status ${res.status}: ${resText}`);
    }

    // 3. Verify exactly one message inserted in PostgreSQL
    const afterMsgRes = await client.query(
      "SELECT id, conversation_id, direction, sender_type, phone, body, is_demo, created_at FROM whatsapp_messages WHERE provider_message_id = $1",
      [testMsgId]
    );

    if (afterMsgRes.rows.length !== 1) {
      throw new Error(`Expected exactly 1 inserted message row, found: ${afterMsgRes.rows.length}`);
    }

    const insertedMsg = afterMsgRes.rows[0];
    console.log("\n[PASS] Verified inserted record in PostgreSQL:");
    console.log(JSON.stringify(insertedMsg, null, 2));

    // Verify properties
    if (insertedMsg.direction !== "inbound") {
      throw new Error(`Expected direction 'inbound', got '${insertedMsg.direction}'`);
    }
    if (insertedMsg.is_demo !== false) {
      throw new Error(`Expected is_demo = false, got ${insertedMsg.is_demo}`);
    }
    if (insertedMsg.body !== messageBody) {
      throw new Error(`Expected body '${messageBody}', got '${insertedMsg.body}'`);
    }

    // 4. Verify conversation record exists and is linked
    const convRes = await client.query(
      "SELECT id, customer_name, customer_phone, last_message_text, is_demo FROM whatsapp_conversations WHERE id = $1",
      [insertedMsg.conversation_id]
    );

    if (convRes.rows.length !== 1) {
      throw new Error("Linked conversation not found!");
    }
    console.log("\n[PASS] Verified linked conversation in PostgreSQL:");
    console.log(JSON.stringify(convRes.rows[0], null, 2));

    if (convRes.rows[0].customer_name !== customerName) {
      throw new Error(`Expected customer_name '${customerName}', got '${convRes.rows[0].customer_name}'`);
    }
    if (convRes.rows[0].is_demo !== false) {
      throw new Error(`Expected conversation is_demo = false, got ${convRes.rows[0].is_demo}`);
    }

    // 5. Verify ZERO outbound messages were created or sent
    const finalOutboundCount = await client.query(
      "SELECT count(*) FROM whatsapp_messages WHERE tenant_id = $1 AND direction = 'outbound'",
      [TEST_TENANT_ID]
    );
    console.log(`\nFinal outbound count: ${finalOutboundCount.rows[0].count} (initial: ${initialOutboundCount.rows[0].count})`);
    if (Number(finalOutboundCount.rows[0].count) !== Number(initialOutboundCount.rows[0].count)) {
      throw new Error("Outbound message was dispatched! AI auto-replies were supposed to remain blocked!");
    }
    console.log("[PASS] Zero outbound messages generated or dispatched!");

    // 6. Test Deduplication Idempotency (replay same message)
    console.log("\nTesting message deduplication by re-sending the identical payload...");
    const replayRes = await fetch(`${APP_BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": `sha256=${signature}`,
      },
      body: bodyString,
    });
    console.log(`Replay status: ${replayRes.status}`);

    const replayCheck = await client.query(
      "SELECT count(*) FROM whatsapp_messages WHERE provider_message_id = $1",
      [testMsgId]
    );
    if (Number(replayCheck.rows[0].count) !== 1) {
      throw new Error(`Duplicate message created! Count: ${replayCheck.rows[0].count}`);
    }
    console.log("[PASS] Replay produced zero duplicates! Exactly 1 message row remains in database.");

    // 7. Verify message appears in Live Inbox query (is_demo = false)
    const inboxQuery = await client.query(
      `SELECT c.id, c.customer_name, c.customer_phone, c.last_message_text, c.is_demo,
              m.id as msg_id, m.body as msg_body, m.direction
       FROM whatsapp_conversations c
       JOIN whatsapp_messages m ON m.conversation_id = c.id
       WHERE c.tenant_id = $1 AND c.is_demo = false AND m.provider_message_id = $2`,
      [TEST_TENANT_ID, testMsgId]
    );
    if (inboxQuery.rows.length !== 1) {
      throw new Error("Live inbox query did not find the message!");
    }
    console.log("\n[PASS] Verified message appears in Unified Live Inbox query:");
    console.log(JSON.stringify(inboxQuery.rows[0], null, 2));

    console.log("\n================================================================");
    console.log("   >>> SUCCESS: REAL INBOUND MESSAGE VERIFIED END-TO-END! <<<");
    console.log("================================================================");
  } finally {
    client.release();
    await pool.end();
  }
}

verifySingleInbound().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
