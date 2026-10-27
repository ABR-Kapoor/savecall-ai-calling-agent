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

async function runTestSuite() {
  const client = await pool.connect();
  console.log("================================================================================");
  console.log("   INSURCALL BOUNDED WHATSAPP HISTORY SYNC & RESILIENCE VERIFICATION SUITE");
  console.log("================================================================================\n");

  try {
    // 1. Fetch connection details for Tenant A
    const connRes = await client.query(
      `SELECT id, provider_session_id, phone_number, webhook_secret, status, metadata FROM whatsapp_connections WHERE tenant_id = $1`,
      [TEST_TENANT_A]
    );
    const conn = connRes.rows[0];
    if (!conn) throw new Error("Tenant A connection record not found");
    const webhookSecret = conn.webhook_secret;
    console.log(`[Setup] Tenant A Connection: ID ${conn.id}, Session: ${conn.provider_session_id}, Phone: ${conn.phone_number}`);

    // Helper to dispatch signed webhook
    async function postWebhook(payload) {
      const bodyStr = JSON.stringify(payload);
      const sig = crypto.createHmac("sha256", webhookSecret).update(bodyStr).digest("hex");
      const res = await fetch(`${APP_BASE_URL}/api/webhooks/whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hub-Signature-256": `sha256=${sig}`,
          "X-OpenWA-Signature": `sha256=${sig}`,
          "X-Signature": sig,
        },
        body: bodyStr,
      });
      const data = await res.json();
      return { status: res.status, data };
    }

    // -------------------------------------------------------------------------
    // TEST 1: Large Multi-Batch Bounded Synchronization (500 messages, 3 batches)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 1: Multi-Batch Bounded Synchronization (500 msgs across 3 batches) ---");
    const syncId = `sync_test_bounded_${Date.now()}`;
    const testChat1 = "919425112233@s.whatsapp.net";
    const testChat2 = "919425445566@s.whatsapp.net";

    const allTestMessages = [];
    for (let i = 0; i < 500; i++) {
      allTestMessages.push({
        id: `wamid.batch_test_${syncId}_${String(i).padStart(4, "0")}`,
        chatId: i % 2 === 0 ? testChat1 : testChat2,
        from: i % 2 === 0 ? testChat1 : testChat2,
        fromMe: i % 3 === 0,
        body: `Automated policy query / reply index ${i} for cashless verification`,
        timestamp: Date.now() - (500 - i) * 60000,
        status: i % 3 === 0 ? "read" : "delivered",
      });
    }

    const BATCH_SIZE = 200;
    const totalBatches = Math.ceil(allTestMessages.length / BATCH_SIZE); // 3 batches (200, 200, 100)

    let totalPersistedFromBatches = 0;
    for (let b = 0; b < totalBatches; b++) {
      const slice = allTestMessages.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      const batchPayload = {
        event: "history.sync",
        sessionId: conn.provider_session_id,
        timestamp: Date.now(),
        data: {
          syncId,
          batchIndex: b,
          totalBatches,
          batchSize: slice.length,
          totalMessages: allTestMessages.length,
          chats: b === 0 ? [
            { id: testChat1, name: "Meera Sen", unreadCount: 1, conversationTimestamp: Date.now() - 3600000 },
            { id: testChat2, name: "Vikram Malhotra", unreadCount: 0, conversationTimestamp: Date.now() - 1800000 },
          ] : [],
          contacts: b === 0 ? [
            { id: testChat1, name: "Meera Sen", notify: "Meera", verifiedName: "Meera Sen" },
            { id: testChat2, name: "Vikram Malhotra", notify: "Vikram", verifiedName: "Vikram Malhotra" },
          ] : [],
          messages: slice,
          isLatest: b === totalBatches - 1,
        },
      };

      const startMs = Date.now();
      const { status, data } = await postWebhook(batchPayload);
      const elapsedMs = Date.now() - startMs;

      console.log(`   Batch ${b + 1}/${totalBatches}: HTTP ${status} in ${elapsedMs}ms, inserted: ${data.insertedMessages}, skipped: ${data.skippedDuplicates}`);
      if (status !== 200) throw new Error(`Batch ${b} failed with status ${status}: ${JSON.stringify(data)}`);
      totalPersistedFromBatches += data.insertedMessages;
    }

    console.log(`   Total inserted messages from 3 batches: ${totalPersistedFromBatches}`);
    if (totalPersistedFromBatches !== 500) {
      throw new Error(`Expected 500 inserted messages, got ${totalPersistedFromBatches}`);
    }

    // Verify in database
    const dbMsgCount = await client.query(
      `SELECT count(*) FROM whatsapp_messages WHERE tenant_id = $1 AND provider_message_id LIKE $2`,
      [TEST_TENANT_A, `wamid.batch_test_${syncId}_%`]
    );
    console.log(`   Database count for syncId ${syncId}: ${dbMsgCount.rows[0].count}`);
    if (Number(dbMsgCount.rows[0].count) !== 500) {
      throw new Error(`Database verification failed: expected 500, found ${dbMsgCount.rows[0].count}`);
    }

    // Verify metadata progress on connection
    const metaCheck = await client.query(
      `SELECT metadata FROM whatsapp_connections WHERE id = $1`,
      [conn.id]
    );
    const syncMeta = metaCheck.rows[0].metadata?.history_sync;
    console.log(`   Connection metadata history_sync:`, syncMeta);
    if (!syncMeta || syncMeta.status !== "completed") {
      throw new Error("Connection metadata did not record completed status");
    }
    console.log("PASS: Multi-batch bounded sync ingested 500 messages across 3 batches with zero timeouts!");

    // -------------------------------------------------------------------------
    // TEST 2: Idempotent Retries & Duplicate Prevention
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Idempotent Duplicate Delivery Prevention ---");
    // Re-send batch 1 (slice of messages 0 to 200)
    const duplicateBatch = {
      event: "history.sync",
      sessionId: conn.provider_session_id,
      timestamp: Date.now(),
      data: {
        syncId,
        batchIndex: 0,
        totalBatches,
        batchSize: 200,
        totalMessages: allTestMessages.length,
        chats: [],
        contacts: [],
        messages: allTestMessages.slice(0, 200),
        isLatest: false,
      },
    };

    const dupRes = await postWebhook(duplicateBatch);
    console.log(`   Duplicate batch delivery result: HTTP ${dupRes.status}, inserted: ${dupRes.data.insertedMessages}, skipped: ${dupRes.data.skippedDuplicates}`);
    if (dupRes.status !== 200) throw new Error("Duplicate delivery returned non-200");
    if (dupRes.data.insertedMessages !== 0) {
      throw new Error(`Expected 0 inserted messages on retransmission, got ${dupRes.data.insertedMessages}`);
    }
    if (dupRes.data.skippedDuplicates !== 200) {
      throw new Error(`Expected 200 skipped duplicates, got ${dupRes.data.skippedDuplicates}`);
    }

    const countAfterDup = await client.query(
      `SELECT count(*) FROM whatsapp_messages WHERE tenant_id = $1 AND provider_message_id LIKE $2`,
      [TEST_TENANT_A, `wamid.batch_test_${syncId}_%`]
    );
    if (Number(countAfterDup.rows[0].count) !== 500) {
      throw new Error(`Duplicate rows created! Expected 500, found ${countAfterDup.rows[0].count}`);
    }
    console.log("PASS: Replayed batches cause zero duplicate records!");

    // -------------------------------------------------------------------------
    // TEST 3: Partial Failures & Fault Tolerance
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Partial Failures (Malformed Items in Batch) ---");
    const mixedBatch = {
      event: "history.sync",
      sessionId: conn.provider_session_id,
      timestamp: Date.now(),
      data: {
        syncId: `sync_fault_${Date.now()}`,
        batchIndex: 0,
        totalBatches: 1,
        chats: [],
        contacts: [],
        messages: [
          { id: null, chatId: testChat1, body: "Invalid missing id" },
          { id: `wamid.valid_${Date.now()}_01`, chatId: testChat1, body: "Valid item 1", fromMe: false, timestamp: Date.now() },
          { id: `wamid.invalid_body_${Date.now()}`, chatId: testChat1, body: "", fromMe: false },
          { id: `wamid.valid_${Date.now()}_02`, chatId: testChat2, body: "Valid item 2", fromMe: true, timestamp: Date.now() },
        ],
        isLatest: true,
      },
    };

    const mixedRes = await postWebhook(mixedBatch);
    console.log(`   Mixed batch response: HTTP ${mixedRes.status}, inserted: ${mixedRes.data.insertedMessages}`);
    if (mixedRes.status !== 200) throw new Error("Mixed batch failed");
    if (mixedRes.data.insertedMessages !== 2) {
      throw new Error(`Expected exactly 2 valid items inserted, got ${mixedRes.data.insertedMessages}`);
    }
    console.log("PASS: Malformed message items are gracefully filtered without aborting valid messages!");

    // -------------------------------------------------------------------------
    // TEST 4: Gateway Diagnostics & Sync Status Endpoints
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Gateway Diagnostics & Sync Status Endpoints ---");
    const diagRes = await fetch(`${GATEWAY_URL}/api/sessions/${conn.provider_session_id}/diagnostics`, {
      headers: { "x-api-key": "insurcall_openwa_admin_secret_2026" },
    });
    const diagData = await diagRes.json();
    console.log(`   Gateway Diagnostics status: ${diagData.diagnostics?.sessionStatus}, socketOpen: ${diagData.diagnostics?.socketOpen}`);
    if (!diagData.diagnostics?.socketOpen) throw new Error("Gateway socket is not reported open");

    const syncStatusRes = await fetch(`${GATEWAY_URL}/api/sessions/${conn.provider_session_id}/history-sync/status`, {
      headers: { "x-api-key": "insurcall_openwa_admin_secret_2026" },
    });
    const syncStatusData = await syncStatusRes.json();
    console.log(`   History Sync Status API:`, syncStatusData.historySync);
    if (!syncStatusData.success) throw new Error("History sync status endpoint failed");
    console.log("PASS: Gateway sync status and diagnostics endpoints respond accurately!");

    // -------------------------------------------------------------------------
    // TEST 5: Tenant Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: Multi-Tenant Boundary Isolation ---");
    const tenantBMsgs = await client.query(
      `SELECT count(*) FROM whatsapp_messages WHERE tenant_id = $1 AND provider_message_id LIKE $2`,
      [TEST_TENANT_B, `wamid.batch_test_${syncId}_%`]
    );
    console.log(`   Tenant B message count for Tenant A's syncId: ${tenantBMsgs.rows[0].count}`);
    if (Number(tenantBMsgs.rows[0].count) !== 0) {
      throw new Error("Cross-tenant leakage: Tenant B can see Tenant A's synced messages!");
    }
    console.log("PASS: Strict multi-tenant isolation preserved across bulk history synchronization!");

    // -------------------------------------------------------------------------
    // Clean up test batch records
    // -------------------------------------------------------------------------
    console.log("\n--- Cleaning up temporary test batch records ---");
    await client.query(
      `DELETE FROM whatsapp_messages WHERE tenant_id = $1 AND (provider_message_id LIKE $2 OR provider_message_id LIKE 'wamid.valid_%')`,
      [TEST_TENANT_A, `wamid.batch_test_${syncId}_%`]
    );
    await client.query(
      `DELETE FROM whatsapp_conversations WHERE tenant_id = $1 AND chat_id IN ($2, $3)`,
      [TEST_TENANT_A, testChat1, testChat2]
    );
    console.log("PASS: Cleanup completed.");

    console.log("\n================================================================================");
    console.log("   >>> ALL 5 BOUNDED HISTORY SYNC & RESILIENCE TESTS PASSED! <<<");
    console.log("================================================================================");
  } finally {
    client.release();
    await pool.end();
  }
}

runTestSuite().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
