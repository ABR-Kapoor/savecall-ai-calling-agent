# InsurCall: Production Gap & Risk Register

**Date:** October 26, 2026  
**Auditor:** Principal Engineer & Application Security Architect  
**Review Standard:** Enterprise Production Readiness Gate

---

## 1. Risk Matrix Overview

| Finding ID | Severity | Subsystem | Blocker Type | Status |
| :--- | :---: | :--- | :--- | :---: |
| **GAP-SEC-001** | **P0** | Tenant Authorization | Code | **RESOLVED** |
| **GAP-SEC-002** | **P0** | Voice Session Auth | Code | **RESOLVED** |
| **GAP-TEL-001** | **P0** | Phone Number Schema & Backend | Code & DB | **RESOLVED** |
| **GAP-TEL-002** | **P1** | Inbound Telephony Webhook | Code | **RESOLVED** |
| **GAP-UI-001** | **P1** | Settings UI Contrast & Copy | UI / UX | **RESOLVED** |
| **GAP-ONB-001** | **P1** | Voice-Guided Onboarding Interview | UI / Speech | **RESOLVED** |
| **GAP-REG-001** | **P1** | DoT Call Forwarding Circular Compliance | Telecom Regulatory | **RESOLVED** |
| **GAP-RAG-001** | **P2** | RAG SSRF & Prompt Injection Defenses | Security / AI | **RESOLVED** |
| **GAP-TEL-003** | **P2** | Live PSTN Carrier DID Provisioning Pool | Carrier Access / KYC | **BLOCKED_EXTERNAL_PREREQUISITE** |
| **GAP-MOD-001** | **P2** | High-Concurrency Dedicated LiveKit Cluster | Cloud Infrastructure | **BLOCKED_EXTERNAL_PREREQUISITE** |
| **GAP-LEG-001** | **P3** | Formal IRDAI Telephony Voice Recording Review | Legal & Compliance | **PENDING_EXTERNAL_REVIEW** |

---

## 2. Detailed Gap Register

### GAP-SEC-001: Insecure Client-Controlled Tenant ID Resolution
- **Severity:** P0 (Critical Security Boundary)
- **Subsystem:** Server Functions (`src/lib/insurance.functions.ts`)
- **Impact:** An attacker could pass an arbitrary `tenantId` in client RPC calls (`getDashboardMetrics`, `getPolicies`, `getClaims`, `getApprovalRequests`, `getCallSessions`, `getAuditLogs`, `getTenantSettings`) and inspect or mutate another company's records.
- **Evidence:**
  ```ts
  // Vulnerable pattern:
  if (explicitTenantId) return explicitTenantId;
  const { data: tenant } = await insforgeServer.database
    .from("tenants").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return tenant?.id || null;
  ```
- **Remediation:** Enforce server-side Clerk token validation. Validate that the requesting user is an active member of the tenant. Reject cross-tenant overrides with HTTP 403. Removed the blind `limit 1` fallback.
- **Status:** **RESOLVED** (Verified by 21 multi-tenant test assertions).

---

### GAP-SEC-002: Unchecked Tenant Fallback in Voice Session Initialization
- **Severity:** P0 (Critical Security Boundary)
- **Subsystem:** LiveKit Voice Session Endpoint (`src/routes/api/voice/session.ts`)
- **Impact:** Opening `/voice` without passing `tenantId` would assign the caller to an arbitrary tenant's voice agent, exposing company guidelines and customer policies.
- **Evidence:**
  ```ts
  const { data: fallbackTenant } = await insforgeServer.database
    .from("tenants").select("id, name, slug").limit(1).maybeSingle();
  ```
- **Remediation:** Removed arbitrary fallback. Enforced authenticated user tenant lookup via `tenant_members`. If unauthenticated or no tenant matches, returns HTTP 401/403.
- **Status:** **RESOLVED** (Verified by `test-voice-rag-integration.mjs`).

---

### GAP-TEL-001: Missing Phone Number & Telephony Infrastructure
- **Severity:** P0 (Core Value Proposition)
- **Subsystem:** Database & Telephony Domain
- **Impact:** Users had no way to configure, verify, test, or activate phone lines.
- **Evidence:** Missing `phone_numbers` and `telephony_connections` tables; no telephony server functions.
- **Remediation:**
  - Applied migration `005_phone_numbers_and_telephony.sql` with PostgreSQL RLS policies.
  - Implemented domain models in `src/lib/telephony/types.ts`.
  - Implemented carrier MMI specs in `src/lib/telephony/indian-carriers.ts`.
  - Implemented server functions in `src/lib/telephony.functions.ts`.
  - Created Phone Hub UI in `src/routes/_authenticated/phone.tsx`.
- **Status:** **RESOLVED** (Verified by 21/21 tests in `test-phone-onboarding-telephony.mjs`).

---

### GAP-TEL-002: Missing Inbound Telephony Webhook
- **Severity:** P1 (Production Ingestion)
- **Subsystem:** Webhook Router (`src/routes/api/webhooks/telephony.ts`)
- **Impact:** External telecom providers could not notify InsurCall when an incoming call arrived.
- **Remediation:** Created `src/routes/api/webhooks/telephony.ts` with signature verification, destination DID lookup, tenant resolution, call session creation, and LiveKit bridge routing.
- **Status:** **RESOLVED** (Verified by tests).

---

### GAP-UI-001: Settings Banner Contrast and Misleading Technical Copy
- **Severity:** P1 (User Experience & Trust)
- **Subsystem:** UI / Settings (`src/routes/_authenticated/settings.tsx`)
- **Impact:** Low-contrast text on dark cyan gradient; confusing technical terms ("Groq Llama 3.3 70B", "Quick Train", "LLM Training Data") made users believe foundation models were fine-tuned rather than grounded via RAG retrieval; voice selector defaulted to US voices (`en-US-JennyNeural`).
- **Remediation:**
  - Redesigned banner with high-contrast accessible surfaces.
  - Replaced technical jargon with clear business copy: "Intelligent AI Voice Receptionist", "Retrieval-Grounded Store".
  - Made Indian neural voices (`en-IN-NeerjaNeural`, `en-IN-PrabhatNeural`, `hi-IN-SwaraNeural`, `hi-IN-MadhurNeural`) the default options.
- **Status:** **RESOLVED**.

---

### GAP-ONB-001: Non-Conversational Agent Configuration in Onboarding
- **Severity:** P1 (User Experience)
- **Subsystem:** Onboarding Flow (`src/routes/_authenticated/onboarding.tsx`)
- **Impact:** Nontechnical agency owners had to manually draft prompts rather than configuring by speaking.
- **Remediation:**
  - Implemented Step 2: "Build your receptionist by talking" interactive voice interview.
  - Integrated browser Web Speech recognition with mic indicator, live transcripts, read-aloud questions via SpeechSynthesis, and accessible text fallback.
  - Assembled structured tenant agent configuration with immutable safety safeguards.
- **Status:** **RESOLVED**.

---

### GAP-REG-001: DoT Circular 16-6/2020-TC USSD Forwarding Compliance
- **Severity:** P1 (Regulatory & Telecom Operations)
- **Subsystem:** Carrier Forwarding Guidance
- **Impact:** DoT circular dated March 28, 2024 discontinued USSD-based call forwarding effective April 15, 2024. Recommending dial codes as the sole path caused carrier rejections on certain SIMs.
- **Remediation:**
  - Added Handset Settings procedures (Android Supplementary Services and iOS Settings) as the primary compliant path in `phone.tsx` and `indian-carriers.ts`.
  - Clearly designated MMI codes as legacy secondary references.
  - Added formal DoT regulatory disclosure notice.
- **Status:** **RESOLVED**.

---

### GAP-TEL-003: Real Production Indian DID Pool Allocation
- **Severity:** P2 (External Carrier Prerequisite)
- **Subsystem:** Telecom Carrier Provider (Tata Tele / Exotel / Airtel Enterprise)
- **Impact:** Live external PSTN calls require an active enterprise carrier agreement and verified GSTIN/KYC document submission for commercial Indian DID allocation.
- **Blocker Reason:** External commercial carrier procurement, contract execution, and KYC verification.
- **Status:** **BLOCKED_EXTERNAL_PREREQUISITE**.

---

### GAP-MOD-001: Dedicated High-Availability LiveKit SIP Cluster
- **Severity:** P2 (Infrastructure Scaling)
- **Subsystem:** Cloud WebRTC & Media Infrastructure
- **Impact:** Development currently runs against local LiveKit development endpoints (`ws://127.0.0.1:7880`). High-concurrency production requires managed LiveKit Cloud or Kubernetes cluster with redundant TURN/STUN servers.
- **Blocker Reason:** Cloud deployment credentials and domain DNS records (`livekit.insurcall.ai`).
- **Status:** **BLOCKED_EXTERNAL_PREREQUISITE**.

---

### GAP-LEG-001: Formal IRDAI Telephony Voice Recording Regulatory Review
- **Severity:** P3 (Legal & Compliance)
- **Subsystem:** Legal / Regulatory
- **Impact:** Ensuring agency compliance with IRDAI voice recording retention mandates (3-year or 5-year retention for policy sales vs claims).
- **Remediation:** Retention policy schema supports configurable days (`retention_days`). Legal review must confirm specific agency retention parameters.
- **Status:** **PENDING_EXTERNAL_REVIEW**.
