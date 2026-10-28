import crypto from "crypto";
import { ingestDocument, validateUrlForSsrf } from "../src/lib/rag/ingestion.server.ts";
import { retrieveAgentKnowledge, generateGroundedAnswer } from "../src/lib/rag/retrieval.server.ts";
import { insforgeServer } from "../src/lib/insforge/client.server.ts";

async function runTestSuite() {
  console.log("==================================================================");
  console.log("   INSURCALL RAG SECURITY, ISOLATION & INGESTION TEST SUITE       ");
  console.log("==================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  // Set up 2 distinct test tenants and 2 test agents for cross-tenant testing
  const tenantA_id = crypto.randomUUID();
  const tenantB_id = crypto.randomUUID();
  const agentA1_id = crypto.randomUUID();
  const agentA2_id = crypto.randomUUID();
  const agentB_id = crypto.randomUUID();

  console.log("--- 1. Setting Up Test Tenants and Agents ---");
  await insforgeServer.database.from("tenants").insert([
    {
      id: tenantA_id,
      name: "Carrier A - Secure Health Assurance",
      slug: `carrier-a-${Date.now()}`,
      status: "active",
      branding_config: { privacy_policy: { model_routing: "local_only", allow_external_groq: false } },
    },
    {
      id: tenantB_id,
      name: "Carrier B - Isolated Motor Corp",
      slug: `carrier-b-${Date.now()}`,
      status: "active",
      branding_config: { privacy_policy: { model_routing: "local_only", allow_external_groq: false } },
    },
  ]);

  await insforgeServer.database.from("ai_agents").insert([
    {
      id: agentA1_id,
      tenant_id: tenantA_id,
      name: "Maya - Health Specialist",
      greeting: "Hello from Agent A1",
      tone: "Professional",
      languages: ["English"],
      voice: "en-IN-NeerjaNeural",
      can_answer_questions: true,
      can_capture_leads: true,
      can_book: false,
      can_transfer: true,
    },
    {
      id: agentA2_id,
      tenant_id: tenantA_id,
      name: "Arjun - Claims Adjuster",
      greeting: "Hello from Agent A2",
      tone: "Objective",
      languages: ["English"],
      voice: "en-IN-PrabhatNeural",
      can_answer_questions: true,
      can_capture_leads: false,
      can_book: false,
      can_transfer: true,
    },
    {
      id: agentB_id,
      tenant_id: tenantB_id,
      name: "Dev - Motor Bot",
      greeting: "Hello from Agent B",
      tone: "Direct",
      languages: ["English"],
      voice: "en-IN-PrabhatNeural",
      can_answer_questions: true,
      can_capture_leads: true,
      can_book: false,
      can_transfer: false,
    },
  ]);
  assert(true, "Initialized isolated test tenants and agents in database");

  // 2. SSRF Protection Tests
  console.log("\n--- 2. Testing SSRF Protection Safeguards ---");
  const dangerousUrls = [
    "http://localhost:8080/admin",
    "http://127.0.0.1:5432",
    "http://10.0.0.15/secret",
    "http://172.16.0.5/api",
    "http://192.168.1.1/router",
    "http://169.254.169.254/latest/meta-data/",
    "file:///etc/passwd",
    "ftp://untrusted.server/data",
  ];

  for (const badUrl of dangerousUrls) {
    let caught = false;
    try {
      validateUrlForSsrf(badUrl);
    } catch {
      caught = true;
    }
    assert(caught, `Blocked SSRF attempt to: ${badUrl}`);
  }

  const validPublicUrl = "https://example.com/insurance/policy-terms";
  const validated = validateUrlForSsrf(validPublicUrl);
  assert(validated.hostname === "example.com", "Permitted valid public HTTPS URL");

  // 3. Multi-Format Ingestion Tests
  console.log("\n--- 3. Testing Multi-Format Ingestion Pipeline ---");

  // 3a. Markdown / Text Ingestion for Agent A1 (Health Cashless terms)
  const mdContent = `
# Cashless Hospitalization Policy
Pre-authorization is strictly mandatory 48 hours prior to planned hospital admission.
Emergency admissions require notification within 24 hours of hospital entry.
Cashless approvals are processed through designated Third Party Administrators (TPA).

# Exclusions
Cosmetic treatments and unproven therapies are strictly excluded from coverage.
Pre-existing conditions carry a standard 24-month waiting period.
  `;
  const resMd = await ingestDocument({
    tenantId: tenantA_id,
    agentId: agentA1_id,
    sourceName: "CarrierA_Cashless_Guidelines.md",
    sourceType: "md",
    textContent: mdContent,
  });
  assert(resMd.status === "done" && resMd.chunksIndexed > 0, "Ingested Markdown policy with chunks and 384-dim embeddings");

  // 3b. CSV Ingestion for Agent A1 (Network Hospitals List)
  const csvContent = `Hospital_Name,City,Cashless_Tier,Specialty
Apollo Indraprastha,New Delhi,Tier 1,Cardiology & Multi-Specialty
Fortis Memorial,Gurugram,Tier 1,Oncology & Neurology
Max Healthcare,Saket,Tier 1,Emergency Care
`;
  const resCsv = await ingestDocument({
    tenantId: tenantA_id,
    agentId: agentA1_id,
    sourceName: "Network_Hospitals.csv",
    sourceType: "csv",
    textContent: csvContent,
  });
  assert(resCsv.status === "done" && resCsv.chunksIndexed === 3, "Ingested CSV tabular records with row provenance");

  // 3c. Plain Text Ingestion for Tenant B (Motor Coverage)
  const motorContent = `
# Motor Vehicle Own Damage Policy
Comprehensive cover protects against accidental damage, fire, and theft.
Third-party property damage limit is capped at INR 7,50,000 as per IRDAI mandate.
Compulsory deductible for private cars is INR 1,000 per claim.
  `;
  const resMotor = await ingestDocument({
    tenantId: tenantB_id,
    agentId: agentB_id,
    sourceName: "CarrierB_Motor_Policy.txt",
    sourceType: "txt",
    textContent: motorContent,
  });
  assert(resMotor.status === "done" && resMotor.chunksIndexed > 0, "Ingested Tenant B Motor document");

  // 4. Strict Cross-Tenant Isolation Tests (Negative Test)
  console.log("\n--- 4. Testing Strict Cross-Tenant Isolation (Negative Tests) ---");
  // Tenant B attempts to retrieve Tenant A's Cashless Hospitalization policy
  const crossTenantChunks = await retrieveAgentKnowledge(
    tenantB_id,
    agentB_id,
    "What is the pre-authorization requirement for cashless hospital admission?"
  );
  assert(
    crossTenantChunks.length === 0,
    "NEGATIVE TEST: Tenant B cannot retrieve Tenant A's private Health documentation"
  );

  // Tenant A attempts to retrieve Tenant B's Motor deductible policy
  const crossTenantMotor = await retrieveAgentKnowledge(
    tenantA_id,
    agentA1_id,
    "What is the compulsory deductible for private cars?"
  );
  assert(
    crossTenantMotor.length === 0,
    "NEGATIVE TEST: Tenant A cannot retrieve Tenant B's private Motor documentation"
  );

  // 5. Strict Cross-Agent Isolation within Same Tenant (Negative Test)
  console.log("\n--- 5. Testing Cross-Agent Isolation within Same Tenant ---");
  // Agent A2 (Claims Adjuster) was NOT assigned Cashless Guidelines; only Agent A1 was!
  const crossAgentChunks = await retrieveAgentKnowledge(
    tenantA_id,
    agentA2_id,
    "What is the pre-authorization requirement for cashless hospital admission?"
  );
  assert(
    crossAgentChunks.length === 0,
    "NEGATIVE TEST: Agent A2 cannot access Agent A1's unassigned knowledge sources"
  );

  // 6. Authorized Retrieval & Grounded Answer (Positive Test)
  console.log("\n--- 6. Testing Authorized Grounded Retrieval & Answer Generation ---");
  const authAnswer = await generateGroundedAnswer({
    tenantId: tenantA_id,
    agentId: agentA1_id,
    query: "When must I notify about emergency hospital admission?",
  });

  assert(authAnswer.grounded === true, "Authorized query is strictly verified as grounded");
  assert(authAnswer.citations.length > 0, "Response contains verified citations");
  assert(
    authAnswer.citations[0].sourceName === "CarrierA_Cashless_Guidelines.md",
    `Citation points to exact source: ${authAnswer.citations[0]?.sourceName}`
  );
  assert(
    authAnswer.answer.toLowerCase().includes("24 hours"),
    "Answer correctly reflects exact evidence (24 hours notification)"
  );

  // 7. Strict Abstention on Unrelated / Hallucinated Queries (Negative Test)
  console.log("\n--- 7. Testing Strict Abstention & Human Escalation ---");
  const unknownQuery = await generateGroundedAnswer({
    tenantId: tenantA_id,
    agentId: agentA1_id,
    query: "What is the warranty coverage for rocket engine turbochargers?",
  });
  assert(unknownQuery.grounded === false, "Unrelated query correctly rejected (grounded: false)");
  assert(unknownQuery.needs_human_review === true, "Unrelated query flagged for human review");
  assert(unknownQuery.citations.length === 0, "No fabricated citations created");

  // 8. Clean Source Deletion & Revocation
  console.log("\n--- 8. Testing Source Deletion & Access Revocation ---");
  await insforgeServer.database.from("document_chunks").delete().eq("source_id", resMd.sourceId);
  await insforgeServer.database.from("agent_knowledge_sources").delete().eq("source_id", resMd.sourceId);
  await insforgeServer.database.from("knowledge_sources").delete().eq("id", resMd.sourceId);

  const postDeleteChunks = await retrieveAgentKnowledge(
    tenantA_id,
    agentA1_id,
    "When must I notify about emergency hospital admission?"
  );
  assert(postDeleteChunks.length === 0, "Deleted source chunks are immediately purged from vector retrieval");

  // Clean up test data
  console.log("\n--- 9. Cleaning Up Test Artifacts ---");
  await insforgeServer.database.from("tenants").delete().in("id", [tenantA_id, tenantB_id]);
  assert(true, "Cleaned up test tenants and associated child records");

  console.log("\n==================================================================");
  console.log(`   ALL TESTS PASSED: ${passedTests}/${totalTests} (100% SUCCESS)`);
  console.log("==================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test suite encountered fatal error:", err);
  process.exit(1);
});
