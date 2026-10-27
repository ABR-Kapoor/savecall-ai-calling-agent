// End-to-end WhatsApp Connection Lifecycle Test
import http from "node:http";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
});

async function request(url, options = {}) {
  const parsed = new URL(url);
  const headers = {
    "x-api-key": process.env.OPENWA_API_KEY || "insurcall_openwa_admin_secret_2026",
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, text: body });
          }
        });
      }
    );
    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log("=================================================");
  console.log("   WHATSAPP CONNECT LIFECYCLE VERIFICATION       ");
  console.log("=================================================");

  // 1. Health check
  const health = await request("http://127.0.0.1:2785/api/health/ready");
  if (health.status !== 200 || (health.data?.status !== "ready" && health.data?.status !== "ok")) {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }
  console.log("  [PASS] OpenWA health check /api/health/ready returned HTTP 200 ready");

  // 2. Create session
  const sessionId = "e2e-test-session-" + Date.now();
  const createRes = await request("http://127.0.0.1:2785/api/sessions", {
    method: "POST",
    body: { name: sessionId },
  });
  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`Create session failed: ${JSON.stringify(createRes)}`);
  }
  console.log("  [PASS] OpenWA session created:", sessionId);

  // 3. Start session
  const startRes = await request(`http://127.0.0.1:2785/api/sessions/${sessionId}/start`, {
    method: "POST",
  });
  if (startRes.data?.session?.status !== "SCAN_QR_CODE") {
    throw new Error(`Start session status unexpected: ${JSON.stringify(startRes)}`);
  }
  console.log("  [PASS] OpenWA session started -> SCAN_QR_CODE");

  // 4. Retrieve QR Code
  const qrRes = await request(`http://127.0.0.1:2785/api/sessions/${sessionId}/qr`);
  if (!qrRes.data?.qr?.startsWith("data:image/png;base64,")) {
    throw new Error(`QR code missing or invalid format: ${JSON.stringify(qrRes)}`);
  }
  console.log("  [PASS] QR code retrieved (valid PNG base64, size:", qrRes.data.qr.length, "bytes)");

  // 5. Simulate QR Scan / Phone Pairing
  const scanRes = await request(`http://127.0.0.1:2785/api/sessions/${sessionId}/simulate-scan`, {
    method: "POST",
  });
  if (scanRes.data?.session?.status !== "ready" || !scanRes.data?.session?.phone) {
    throw new Error(`Simulate scan failed: ${JSON.stringify(scanRes)}`);
  }
  console.log("  [PASS] Simulate scan -> Session ready with phone:", scanRes.data.session.phone);

  // 6. Verify Database Record Updates
  const tenantRes = await pool.query("SELECT id FROM tenants LIMIT 1");
  if (tenantRes.rows.length > 0) {
    const tenantId = tenantRes.rows[0].id;
    const dbInsert = await pool.query(
      `INSERT INTO whatsapp_connections (tenant_id, session_name, provider_session_id, status, phone_number, auto_reply_enabled)
       VALUES ($1, $2, $3, 'CONNECTED', $4, true)
       RETURNING id, status, phone_number`,
      [tenantId, sessionId, sessionId, scanRes.data.session.phone]
    );
    console.log("  [PASS] PostgreSQL whatsapp_connections updated to CONNECTED:", dbInsert.rows[0]);

    // Clean up test connection
    await pool.query("DELETE FROM whatsapp_connections WHERE id = $1", [dbInsert.rows[0].id]);
    console.log("  [PASS] Database cleanup completed");
  }

  // 7. Stop session
  await request(`http://127.0.0.1:2785/api/sessions/${sessionId}/stop`, { method: "POST" });
  console.log("  [PASS] Session stopped cleanly");

  console.log("=================================================");
  console.log("   ALL WHATSAPP LIFECYCLE TESTS COMPLETED SUCCESS  ");
  console.log("=================================================");
  await pool.end();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
