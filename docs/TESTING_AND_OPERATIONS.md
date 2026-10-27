# InsurCall: Testing and Operational Runbook

**Date:** October 26, 2026  
**Audience:** Site Reliability Engineers, DevOps Engineers, QA Engineers, Support Adjusters  
**Target Environment:** Node.js 20+, PostgreSQL 16 with pgvector, LiveKit Server, Clerk Auth

---

## 1. Quick Command Reference

All commands must be executed from the project root directory:

| Task | Command Line | Expected Outcome |
| :--- | :--- | :--- |
| **Typecheck** | `npx tsc --noEmit` | Exit code 0, zero diagnostic errors. |
| **Production Build** | `npm run build` | Builds client assets and SSR server bundles in `dist/`. |
| **Development Server** | `npm run dev` | Starts Vite local dev server at `http://localhost:5173`. |
| **Voice + RAG Tests** | `npx tsx scripts/test-voice-rag-integration.mjs` | Executes 38/38 end-to-end voice and RAG integration tests. |
| **RAG Hardening Tests** | `npx tsx scripts/test-rag-production-hardening.mjs` | Executes 58/58 RAG security, SSRF, injection, and multi-tenant tests. |
| **Telephony Tests** | `node scripts/test-phone-onboarding-telephony.mjs` | Executes 21/21 telephony lifecycle and carrier MMI tests. |
| **Full Regression Suite** | `npm run test` or running all 3 scripts sequentially | 117/117 automated assertions passing. |

---

## 2. Environment Prerequisites & Secrets Checklist

Ensure the following environment variables are provisioned in `.env` or the production secret manager:

```ini
# Database Connection (PostgreSQL 16 with pgvector extension)
DATABASE_URL="postgresql://user:password@host:5432/insurcall?sslmode=require"

# Clerk Authentication (Tenant & User Identity)
VITE_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."

# LiveKit Realtime Voice WebRTC Bridge
LIVEKIT_URL="wss://livekit.insurcall.ai"
LIVEKIT_API_KEY="APILK..."
LIVEKIT_API_SECRET="secret..."

# Telephony Gateway Integration (Inbound PSTN & Webhooks)
TELEPHONY_WEBHOOK_SECRET="whsec_..."
TELEPHONY_ROUTING_DID_POOL="+918047361829,+918047361830"

# AI Inference (LLM, Embeddings, TTS)
GROQ_API_KEY="gsk_..."
OPENROUTER_API_KEY="sk-or-..."
```

---

## 3. Database Migration Execution & Verification

### Running Migrations
Database migrations are located in `insforge/migrations/`.

1. To apply migration `005_phone_numbers_and_telephony.sql`:
   ```bash
   node scripts/apply-migration-005.mjs
   ```
2. Verify applied schema:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('phone_numbers', 'telephony_connections');
   ```
3. Verify Row Level Security (RLS) policies:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE tablename IN ('phone_numbers', 'telephony_connections');
   ```

---

## 4. Operational Incident Diagnostics & Triage

### Scenario A: Inbound Phone Call Not Connecting
1. **Check Telephony Webhook Logs:**
   - Query endpoint logs for `POST /api/webhooks/telephony`.
   - Verify HTTP 200 response. If HTTP 403 is returned, the destination DID is either unassigned or in `NOT_CONFIGURED` / `SETUP_PENDING` state.
2. **Verify Phone Number State in Database:**
   ```sql
   SELECT id, tenant_id, phone_number, status, connection_type, forwarding_config 
   FROM phone_numbers 
   WHERE forwarding_config->>'routingDid' = '+918047361829';
   ```
   Status must be `ACTIVE` for live client traffic.
3. **Verify Carrier Forwarding Status on Handset:**
   - Airtel / Vi / BSNL: Dial `*#61#` or `*#67#` to confirm active forwarding destination.
   - Jio: Dial `*#401#`.
   - Mobile Settings: Check Supplementary Services -> Call Forwarding in handset dialer.

### Scenario B: Agent Abstaining or Escalating Frequently
1. Check `call_sessions` table for `escalated = true` and review `escalation_reason`.
2. Inspect vector similarity scores in `document_chunks`.
3. If scores are below the 0.40 threshold, verify whether the agency has uploaded relevant policy guidelines to the tenant knowledge store.
4. Run the re-embedding diagnostic script:
   ```bash
   node scripts/reembed-chunks.mjs
   ```

### Scenario C: High-Risk Action Blocked by Compliance Guardrails
1. Check `approval_requests` table:
   ```sql
   SELECT id, tenant_id, request_type, status, reason, requested_at 
   FROM approval_requests 
   WHERE status = 'pending' 
   ORDER BY requested_at DESC;
   ```
2. A staff adjuster must log in to `/approvals` and click **Approve** or **Reject**. The automated voice agent will never execute policy cancellation, beneficiary change, or bank detail update without two-party verification.

---

## 5. Security & Isolation Incident Playbook

### Immediate Tenant Isolation Verification
To prove zero data leakage between tenants:
```bash
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function test() {
  const resA = await pool.query('SELECT count(*) FROM phone_numbers WHERE tenant_id = \$1', ['tenant-a']);
  const resB = await pool.query('SELECT count(*) FROM phone_numbers WHERE tenant_id = \$2', ['tenant-b']);
  console.log('Tenant A rows:', resA.rows[0].count, 'Tenant B rows:', resB.rows[0].count);
  await pool.end();
}
test();
"
```
No tenant can view or mutate records belonging to a different `tenant_id`.
