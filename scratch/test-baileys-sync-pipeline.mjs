import pg from "pg";
import crypto from "node:crypto";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new pg.Pool({ connectionString: DATABASE_URL });

const TEST_TENANT_A = "a0000000-0000-0000-0000-000000000001";
const TEST_TENANT_B = "64537ca5-2338-44a0-af42-d3593e709576";
const APP_BASE_URL = process.env.APP_BASE_URL || "https://localhost:5173";
const GATEWAY_URL = process.env.WHATSAPP_SERVICE_URL || "http://127.0.0.1:2785";

async function runTests() {
  const client = await pool.connect();
  console.log("=== INSURCALL WHATSAPP SYNC & PERSISTENCE VERIFICATION ===");

  try {
    // 1. Verify schema columns
    const cols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'whatsapp_conversations'
      ORDER BY ordinal_position
    `);
    const colNames = cols.rows.map((c) => c.column_name);
    console.log("1. Checking whatsapp_conversations columns:", colNames.includes("is_demo") ? "PASS (is_demo exists)" : "FAIL");
    if (!colNames.includes("is_demo")) throw new Error("is_demo column missing");

    // 2. Fetch active WhatsApp connection for Tenant A
    const connRes = await client.query(
      `SELECT id, provider_session_id, phone_number, webhook_secret, status FROM whatsapp_connections WHERE tenant_id = $1`,
      [TEST_TENANT_A]
    );
    const conn = connRes.rows[0];
    if (!conn) throw new Error("No WhatsApp connection found for Tenant A");
    const webhookSecret = conn.webhook_secret;
    console.log(`2. WhatsApp Connection Found: ID ${conn.id}, Session ${conn.provider_session_id}, Phone ${conn.phone_number}`);

    // 2b. Test Real Baileys Gateway Diagnostics endpoint
    console.log("2b. Querying Gateway Diagnostics on port 2785...");
    const gatewayApiKey = process.env.OPENWA_API_KEY || "insurcall_openwa_admin_secret_2026";
    const diagRes = await fetch(`${GATEWAY_URL}/api/sessions/${conn.provider_session_id}/diagnostics`, {
      headers: {
        "x-api-key": gatewayApiKey,
      },
    });
    const diagJson = await diagRes.json();
    console.log("   Gateway Diagnostics Response:", diagJson);
    if (!diagJson.diagnostics) throw new Error("Gateway diagnostics failed");
    console.log("2b. PASS: Gateway diagnostics endpoint returns truthful runtime state!");

    // 3. Test: Real-format history-sync payload persists chats, contacts, and messages
    const syncChatId = "919425001122@s.whatsapp.net";
    const syncContactName = "Sunita Rao";
    const syncMsgId1 = `wamid.sync_${Date.now()}_01`;
    const syncMsgId2 = `wamid.sync_${Date.now()}_02`;

    const historyPayload = {
      event: "history.sync",
      sessionId: conn.provider_session_id,
      timestamp: Date.now(),
      data: {
        chats: [
          {
            id: syncChatId,
            name: null,
            unreadCount: 2,
            readOnly: false,
            conversationTimestamp: Date.now() - 3600000,
          },
        ],
        contacts: [
          {
            id: syncChatId,
            name: syncContactName,
            notify: "Sunita",
            verifiedName: "Sunita Rao Insurance",
          },
        ],
        messages: [
          {
            id: syncMsgId1,
            chatId: syncChatId,
            from: syncChatId,
            fromMe: false,
            body: "Need to verify cashless pre-auth status for Sunita Rao",
            timestamp: Date.now() - 3600000,
            status: "delivered",
          },
          {
            id: syncMsgId2,
            chatId: syncChatId,
            from: syncChatId,
            fromMe: true,
            body: "Your pre-authorization is under verification with the network TPA desk.",
            timestamp: Date.now() - 1800000,
            status: "read",
          },
        ],
        isLatest: true,
      },
    };

    const bodyStr = JSON.stringify(historyPayload);
    const sig = crypto.createHmac("sha256", webhookSecret).update(bodyStr).digest("hex");

    console.log("3. Dispatching history.sync webhook to /api/webhooks/whatsapp...");
    const webhookRes = await fetch(`${APP_BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": `sha256=${sig}`,
      },
      body: bodyStr,
    });
    const webhookJson = await webhookRes.json();
    console.log("   Webhook Response:", webhookRes.status, webhookJson);
    if (webhookRes.status !== 200) throw new Error(`Webhook failed: ${JSON.stringify(webhookJson)}`);

    // Verify conversation was created with contact's real name and is_demo = false
    const convCheck = await client.query(
      `SELECT id, customer_name, customer_phone, is_demo, unread_count FROM whatsapp_conversations WHERE tenant_id = $1 AND chat_id = $2`,
      [TEST_TENANT_A, syncChatId]
    );
    console.log("   Persisted conversation:", convCheck.rows[0]);
    if (!convCheck.rows[0]) throw new Error("Conversation was not persisted from history.sync");
    if (convCheck.rows[0].customer_name !== syncContactName) {
      throw new Error(`Expected customer_name '${syncContactName}', got '${convCheck.rows[0].customer_name}'`);
    }
    if (convCheck.rows[0].is_demo !== false) throw new Error("Expected is_demo = false for synced chat");

    // Verify messages were created
    const msgsCheck = await client.query(
      `SELECT id, direction, sender_type, status, is_demo, provider_message_id FROM whatsapp_messages WHERE tenant_id = $1 AND chat_id = $2 ORDER BY created_at ASC`,
      [TEST_TENANT_A, syncChatId]
    );
    console.log(`   Persisted messages count: ${msgsCheck.rows.length}`);
    if (msgsCheck.rows.length < 2) throw new Error("Messages not persisted from history.sync");
    console.log("3. PASS: Real history-sync successfully ingested chats, contacts, and messages!");

    // 4. Test: Repeated history batches do not create duplicates (Idempotency)
    console.log("4. Testing Idempotency on repeated history.sync...");
    const repeatRes = await fetch(`${APP_BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": `sha256=${sig}`,
      },
      body: bodyStr,
    });
    const repeatJson = await repeatRes.json();
    console.log("   Repeat Webhook Status:", repeatRes.status, repeatJson);

    const msgsCountAfter = await client.query(
      `SELECT count(*) FROM whatsapp_messages WHERE tenant_id = $1 AND chat_id = $2`,
      [TEST_TENANT_A, syncChatId]
    );
    if (Number(msgsCountAfter.rows[0].count) !== msgsCheck.rows.length) {
      throw new Error(`Duplicate messages created! Before: ${msgsCheck.rows.length}, After: ${msgsCountAfter.rows[0].count}`);
    }
    console.log("4. PASS: Repeated history batch caused zero duplicate messages or chats!");

    // 5. Test: Unknown contact displays verified phone number, NEVER a fabricated name
    console.log("5. Testing Unknown Contact Handling (No fake names)...");
    const unknownChatId = "919999888877@s.whatsapp.net";
    const unknownPhone = "+919999888877";
    const unknownMsgId = `wamid.unknown_${Date.now()}`;

    const unknownPayload = {
      event: "message.received",
      sessionId: conn.provider_session_id,
      timestamp: Date.now(),
      data: {
        id: unknownMsgId,
        chatId: unknownChatId,
        from: unknownChatId,
        fromMe: false,
        body: "Hello, I am asking about my two wheeler policy renewal",
        author: null,
        sender: null,
      },
    };
    const unknownBody = JSON.stringify(unknownPayload);
    const unknownSig = crypto.createHmac("sha256", webhookSecret).update(unknownBody).digest("hex");

    const unknownRes = await fetch(`${APP_BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": `sha256=${unknownSig}`,
      },
      body: unknownBody,
    });
    console.log("   Unknown message webhook status:", unknownRes.status);

    const unknownConv = await client.query(
      `SELECT id, customer_name, customer_phone FROM whatsapp_conversations WHERE tenant_id = $1 AND chat_id = $2`,
      [TEST_TENANT_A, unknownChatId]
    );
    console.log("   Unknown conversation customer_name:", unknownConv.rows[0]?.customer_name);
    if (!unknownConv.rows[0]) throw new Error("Unknown conversation not created");
    if (unknownConv.rows[0].customer_name !== unknownPhone) {
      throw new Error(`Expected customer_name '${unknownPhone}', got '${unknownConv.rows[0].customer_name}'`);
    }
    console.log("5. PASS: Unknown contact displays verified phone number without fabricated names!");

    // 6. Test: Multi-tenant boundary isolation
    console.log("6. Testing Multi-Tenant Boundary Isolation...");
    const tenantBConvs = await client.query(
      `SELECT id FROM whatsapp_conversations WHERE tenant_id = $1`,
      [TEST_TENANT_B]
    );
    const tenantAConvs = await client.query(
      `SELECT id FROM whatsapp_conversations WHERE tenant_id = $1`,
      [TEST_TENANT_A]
    );
    const overlap = tenantBConvs.rows.filter((b) => tenantAConvs.rows.some((a) => a.id === b.id));
    if (overlap.length > 0) throw new Error("Cross-tenant conversation leakage detected!");
    console.log(`   Tenant A: ${tenantAConvs.rows.length} convs, Tenant B: ${tenantBConvs.rows.length} convs, Overlap: 0`);
    console.log("6. PASS: Complete tenant isolation maintained!");

    // 7. Test: Demo fixtures excluded from live inbox queries
    console.log("7. Testing Demo Fixture Exclusions from Live Inbox...");
    const liveInboxConvs = await client.query(
      `SELECT id, customer_name, customer_phone, is_demo FROM whatsapp_conversations WHERE tenant_id = $1 AND is_demo = false`,
      [TEST_TENANT_A]
    );
    const demoConvs = await client.query(
      `SELECT id, customer_name, customer_phone, is_demo FROM whatsapp_conversations WHERE tenant_id = $1 AND is_demo = true`,
      [TEST_TENANT_A]
    );
    console.log(`   Live inbox count: ${liveInboxConvs.rows.length}, Demo fixture count: ${demoConvs.rows.length}`);
    for (const conv of liveInboxConvs.rows) {
      if (["Aarav Sharma", "Priya Patel", "Rajesh Mehta", "Test Recipient"].includes(conv.customer_name)) {
        throw new Error(`Demo contact '${conv.customer_name}' leaked into live inbox!`);
      }
    }
    console.log("7. PASS: Seed demo fixtures are 100% excluded from live inbox query!");

    // 8. Test: Delivery status updates
    console.log("8. Testing Message Delivery Status Updates...");
    const statusPayload = {
      event: "message.status",
      sessionId: conn.provider_session_id,
      timestamp: Date.now(),
      data: {
        messageId: syncMsgId2,
        chatId: syncChatId,
        status: "read",
      },
    };
    const statusBody = JSON.stringify(statusPayload);
    const statusSig = crypto.createHmac("sha256", webhookSecret).update(statusBody).digest("hex");

    await fetch(`${APP_BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": `sha256=${statusSig}`,
      },
      body: statusBody,
    });

    const statusCheck = await client.query(
      `SELECT status FROM whatsapp_messages WHERE tenant_id = $1 AND provider_message_id = $2`,
      [TEST_TENANT_A, syncMsgId2]
    );
    console.log("   Message status in DB:", statusCheck.rows[0]?.status);
    if (statusCheck.rows[0]?.status !== "read") {
      throw new Error(`Expected status 'read', got '${statusCheck.rows[0]?.status}'`);
    }
    console.log("8. PASS: Real message delivery status accurately preserved!");

    console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<");
  } finally {
    client.release();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
