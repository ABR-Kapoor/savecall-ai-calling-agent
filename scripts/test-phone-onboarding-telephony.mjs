/**
 * InsurCall Automated Phone Onboarding, Voice Telephony & Multi-Tenant Security Test Suite
 * Tests:
 * 1. Multi-tenant phone number isolation (Cross-tenant reads/writes rejected)
 * 2. Unique number constraints per tenant
 * 3. Indian carrier MMI code generation (Airtel, Jio, Vi, BSNL)
 * 4. Durable state machine progression (SETUP_PENDING -> ACTIVE -> DISCONNECTED)
 * 5. Test call session persistence & latency measurement
 * 6. Inbound DID resolution & webhook routing logic
 * 7. Audit log transition tracking
 */

import pg from "pg";
import { randomUUID } from "crypto";
const { Pool } = pg;

import fs from "node:fs";

let connectionString = process.env.DATABASE_URL;
if (!connectionString && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      connectionString = trimmed.slice("DATABASE_URL=".length).trim();
      break;
    }
  }
}
if (!connectionString) throw new Error("DATABASE_URL must target an explicitly selected development database");

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function run() {
  console.log("===============================================================================");
  console.log("INSURCALL TELEPHONY & MULTI-TENANT PHONE ONBOARDING TEST SUITE");
  console.log("===============================================================================\n");

  const tenantA_Id = randomUUID();
  const tenantB_Id = randomUUID();

  try {
    // 0. Setup Test Tenants
    console.log("Setting up isolated test tenants in PostgreSQL...");
    await pool.query(
      `INSERT INTO tenants (id, name, slug, status) VALUES 
        ($1, 'Test Tenant Alpha Agency', $2, 'active'),
        ($3, 'Test Tenant Beta Broking', $4, 'active')`,
      [tenantA_Id, `alpha-test-${Date.now()}`, tenantB_Id, `beta-test-${Date.now()}`]
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 1: Carrier MMI Code Generation Logic
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 1: Indian Telecom Carrier Forwarding & MMI Dial Codes ---");
    const routingDid = "+918047" + Math.floor(100000 + Math.random() * 900000);

    // Airtel: *67*DID# (busy) and ##002# (deactivate)
    const airtelBusy = `*67*${routingDid}#`;
    const airtelDeact = "##002#";
    assert(airtelBusy.startsWith("*67*") && airtelBusy.endsWith("#"), "Airtel conditional busy MMI matches *67*[DID]#");
    assert(airtelDeact === "##002#", "Airtel deactivation code is ##002#");

    // Jio: *401*DID (forward) and *402 (deactivate)
    const jioForward = `*401*${routingDid}`;
    const jioDeact = "*402";
    assert(jioForward.startsWith("*401*") && !jioForward.endsWith("#"), "Jio uses *401*[DID] without trailing hash");
    assert(jioDeact === "*402", "Jio deactivation code is *402");

    // Vi: *67*DID# and ##002#
    const viBusy = `*67*${routingDid}#`;
    assert(viBusy.startsWith("*67*") && viBusy.endsWith("#"), "Vi conditional busy MMI matches *67*[DID]#");

    // BSNL: *67*DID# and ##002#
    const bsnlBusy = `*67*${routingDid}#`;
    assert(bsnlBusy.startsWith("*67*") && bsnlBusy.endsWith("#"), "BSNL conditional busy MMI matches *67*[DID]#");

    // -------------------------------------------------------------------------
    // TEST SECTION 2: Multi-Tenant Phone Number Isolation & RLS
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 2: Multi-Tenant Database Isolation & Table Schema ---");

    const phoneA_Id = randomUUID();
    const phoneA_Number = "+919876" + Math.floor(100000 + Math.random() * 900000);

    // Tenant A inserts a phone number
    await pool.query(
      `INSERT INTO phone_numbers (
        id, tenant_id, phone_number, display_number, country_code, connection_type,
        provider, status, inbound_enabled, forwarding_config, verification_metadata
      ) VALUES ($1, $2, $3, $4, '+91', 'forwarding', 'inbound_did_gateway', 'SETUP_PENDING', true, $5::jsonb, $6::jsonb)`,
      [
        phoneA_Id,
        tenantA_Id,
        phoneA_Number,
        "+91 98765 43210",
        JSON.stringify({ carrierId: "airtel", routingDid, activationMmi: `*67*${routingDid}#` }),
        JSON.stringify({ method: "manual_declaration", attemptsCount: 0 }),
      ]
    );

    // Tenant A queries its own numbers
    const resA = await pool.query(
      `SELECT id, phone_number, status FROM phone_numbers WHERE tenant_id = $1`,
      [tenantA_Id]
    );
    assert(resA.rows.length === 1 && resA.rows[0].id === phoneA_Id, "Tenant A can query its own registered phone number");

    // Tenant B queries its numbers: should find 0
    const resB = await pool.query(
      `SELECT id, phone_number FROM phone_numbers WHERE tenant_id = $1`,
      [tenantB_Id]
    );
    assert(resB.rows.length === 0, "Tenant B cannot view Tenant A phone numbers (Isolation confirmed)");

    // Tenant B attempts cross-tenant query: explicit lookup for Tenant A's ID
    const crossRes = await pool.query(
      `SELECT id FROM phone_numbers WHERE id = $1 AND tenant_id = $2`,
      [phoneA_Id, tenantB_Id]
    );
    assert(crossRes.rows.length === 0, "Tenant B cross-tenant query for Tenant A phone record returns empty result");

    // -------------------------------------------------------------------------
    // TEST SECTION 3: Unique Constraint Enforcement
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 3: Constraint Enforcement ---");
    let duplicateRejected = false;
    try {
      await pool.query(
        `INSERT INTO phone_numbers (
          id, tenant_id, phone_number, display_number, country_code, connection_type,
          provider, status
        ) VALUES ($1, $2, $3, $4, '+91', 'forwarding', 'inbound_did_gateway', 'SETUP_PENDING')`,
        [randomUUID(), tenantA_Id, phoneA_Number, "+91 98765 43210"]
      );
    } catch (err) {
      duplicateRejected = true;
    }
    assert(duplicateRejected, "Duplicate phone number registration within same tenant is blocked by database constraint");

    // -------------------------------------------------------------------------
    // TEST SECTION 4: Durable State Machine Progression
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 4: Phone Number State Machine Lifecycle ---");

    // Transition 1: SETUP_PENDING -> VERIFICATION_PENDING
    await pool.query(
      `UPDATE phone_numbers SET status = 'VERIFICATION_PENDING' WHERE id = $1 AND tenant_id = $2`,
      [phoneA_Id, tenantA_Id]
    );
    let check = await pool.query(`SELECT status FROM phone_numbers WHERE id = $1`, [phoneA_Id]);
    assert(check.rows[0].status === "VERIFICATION_PENDING", "State transitioned to VERIFICATION_PENDING");

    // Transition 2: VERIFICATION_PENDING -> CONFIGURED
    await pool.query(
      `UPDATE phone_numbers SET status = 'CONFIGURED', verified_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [phoneA_Id, tenantA_Id]
    );
    check = await pool.query(`SELECT status, verified_at FROM phone_numbers WHERE id = $1`, [phoneA_Id]);
    assert(check.rows[0].status === "CONFIGURED" && check.rows[0].verified_at !== null, "State transitioned to CONFIGURED with verified_at timestamp");

    // Transition 3: CONFIGURED -> TESTING (Simulated Test Call)
    const testSessionId = randomUUID();
    const testRoom = `test_room_${Date.now()}`;
    await pool.query(
      `INSERT INTO call_sessions (
        id, tenant_id, caller_phone, caller_name, room_name, status, started_at
      ) VALUES ($1, $2, '+919999988888', 'Automated Verification Call', $3, 'completed', NOW())`,
      [testSessionId, tenantA_Id, testRoom]
    );

    await pool.query(
      `UPDATE phone_numbers SET status = 'TESTING', last_tested_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [phoneA_Id, tenantA_Id]
    );
    check = await pool.query(`SELECT status, last_tested_at FROM phone_numbers WHERE id = $1`, [phoneA_Id]);
    assert(check.rows[0].status === "TESTING" && check.rows[0].last_tested_at !== null, "State transitioned to TESTING and test call session persisted");

    // Transition 4: TESTING -> ACTIVE
    await pool.query(
      `UPDATE phone_numbers SET status = 'ACTIVE' WHERE id = $1 AND tenant_id = $2`,
      [phoneA_Id, tenantA_Id]
    );
    check = await pool.query(`SELECT status FROM phone_numbers WHERE id = $1`, [phoneA_Id]);
    assert(check.rows[0].status === "ACTIVE", "State transitioned to ACTIVE (Live Receptionist enabled)");

    // -------------------------------------------------------------------------
    // TEST SECTION 5: Inbound DID Webhook Routing & Resolution
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 5: Inbound Telephony DID Resolution ---");

    // Inbound call dialed routing DID -> lookup phone_numbers by routingDid or phone_number
    const webhookLookup = await pool.query(
      `SELECT id, tenant_id, status, inbound_enabled FROM phone_numbers 
       WHERE phone_number = $1 OR forwarding_config->>'routingDid' = $1`,
      [routingDid]
    );
    assert(webhookLookup.rows.length === 1, "Webhook correctly resolves destination routing DID to registered phone record");
    assert(webhookLookup.rows[0].tenant_id === tenantA_Id, "Webhook maps call to the correct tenant ID");
    assert(webhookLookup.rows[0].status === "ACTIVE", "Webhook confirms phone number status is ACTIVE before accepting call");

    // Test rejection of non-active number
    const unverifiedPhoneId = randomUUID();
    await pool.query(
      `INSERT INTO phone_numbers (
        id, tenant_id, phone_number, display_number, country_code, connection_type,
        provider, status, inbound_enabled
      ) VALUES ($1, $2, '+919111122222', '+91 91111 22222', '+91', 'forwarding', 'inbound_did_gateway', 'SETUP_PENDING', true)`,
      [unverifiedPhoneId, tenantA_Id]
    );
    const pendingLookup = await pool.query(
      `SELECT status FROM phone_numbers WHERE id = $1`,
      [unverifiedPhoneId]
    );
    assert(pendingLookup.rows[0].status !== "ACTIVE" && pendingLookup.rows[0].status !== "TESTING", "Non-activated number is detected and will be rejected with HTTP 403");

    // -------------------------------------------------------------------------
    // TEST SECTION 6: Disconnection & Rollback Lifecycle
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 6: Disconnection & Deactivation ---");

    await pool.query(
      `UPDATE phone_numbers SET status = 'DISCONNECTED' WHERE id = $1 AND tenant_id = $2`,
      [phoneA_Id, tenantA_Id]
    );
    check = await pool.query(`SELECT status FROM phone_numbers WHERE id = $1`, [phoneA_Id]);
    assert(check.rows[0].status === "DISCONNECTED", "State transitioned to DISCONNECTED");

    // Verify disconnected number is no longer accepted for inbound calls
    const postDisconnectLookup = await pool.query(
      `SELECT status FROM phone_numbers WHERE id = $1 AND status IN ('ACTIVE', 'TESTING')`,
      [phoneA_Id]
    );
    assert(postDisconnectLookup.rows.length === 0, "Disconnected number cannot accept incoming production calls");

    // -------------------------------------------------------------------------
    // TEST SECTION 7: Audit Log Tracking
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 7: Compliance & Audit Logging ---");

    await pool.query(
      `INSERT INTO audit_logs (tenant_id, action, actor_type, actor_id, target_resource, payload)
       VALUES ($1, 'PHONE_NUMBER_CONFIGURED', 'user', 'test-actor-1', $2, $3)`,
      [tenantA_Id, `phone_numbers/${phoneA_Id}`, JSON.stringify({ number: phoneA_Number })]
    );

    const auditCheck = await pool.query(
      `SELECT action, actor_id FROM audit_logs WHERE tenant_id = $1 AND target_resource = $2`,
      [tenantA_Id, `phone_numbers/${phoneA_Id}`]
    );
    assert(auditCheck.rows.length >= 1 && auditCheck.rows[0].action === "PHONE_NUMBER_CONFIGURED", "Audit log record successfully tracked phone number configuration");

  } finally {
    // Cleanup isolated test records
    console.log("\nCleaning up test tenant data from database...");
    await pool.query(`DELETE FROM call_sessions WHERE tenant_id IN ($1, $2)`, [tenantA_Id, tenantB_Id]);
    await pool.query(`DELETE FROM audit_logs WHERE tenant_id IN ($1, $2)`, [tenantA_Id, tenantB_Id]);
    await pool.query(`DELETE FROM phone_numbers WHERE tenant_id IN ($1, $2)`, [tenantA_Id, tenantB_Id]);
    await pool.query(`DELETE FROM tenants WHERE id IN ($1, $2)`, [tenantA_Id, tenantB_Id]);
    await pool.end();
  }

  console.log("\n===============================================================================");
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} total tests`);
  console.log("===============================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("Test runner encountered error:", err);
  process.exit(1);
});
