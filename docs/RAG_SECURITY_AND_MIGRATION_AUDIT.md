# RAG Security & Migration Audit (Milestone 1)

## 1. Executive Summary
- **Identity Provider**: Clerk (`clerk_user_id` text strings, verified via `@clerk/backend`).
- **Database**: PostgreSQL hosted on InsForge BaaS (`https://ufmgh6q8.ap-southeast.insforge.app`).
- **Current Authorization Model**: Trusted backend service layer (`getInsforgeServerClient` / `clerkClient`) resolving tenant IDs via `tenant_members` bridge table.
- **RAG Status**: Initial knowledge tables exist (`knowledge_sources`, `knowledge_items`, `knowledge_documents`), currently unindexed with vectors and without fine-grained per-agent isolation RLS.

---

## 2. Live Database Schema Inventory

### 2.1 Core Identity & Multi-Tenancy Tables
| Table | Primary Key | Owner / Isolation Column | Purpose |
| :--- | :--- | :--- | :--- |
| `tenants` | `id` (UUID) | Root tenant entity (`slug` unique) | Agency/Carrier organization settings and agent prompts. |
| `tenant_members` | `id` (UUID) | `tenant_id` (UUID) + `clerk_user_id` (TEXT) | Maps verified Clerk users to tenant with roles (`owner`, `agent`, `compliance`). |
| `users` | `id` (UUID) | Global InsForge identity (`email` string) | Platform-level user catalog for dashboard sync. |
| `customers` | `id` (UUID) | `tenant_id` (UUID) + `clerk_user_id` (TEXT) | Policyholder accounts scoped per tenant. |

### 2.2 Domain Insurance Tables
| Table | Primary Key | Foreign Keys | Isolation Model |
| :--- | :--- | :--- | :--- |
| `policies` | `id` (UUID) | `tenant_id` -> `tenants.id`, `customer_id` -> `customers.id` | Scoped to tenant and customer. |
| `claims` | `id` (UUID) | `tenant_id`, `customer_id`, `policy_id` | Scoped to tenant, customer, and policy. |
| `call_sessions` | `id` (UUID) | `tenant_id`, `customer_id` | LiveKit session audit, duration, 3-word summary. |
| `messages` | `id` (UUID) | `call_session_id` -> `call_sessions.id` | Turn-by-turn conversational transcript. |
| `audit_logs` | `id` (UUID) | `tenant_id`, `call_session_id` | Immutable compliance and regulatory trail. |
| `tool_executions` | `id` (UUID) | `tenant_id`, `call_session_id` | Agent tool invocation audit. |

### 2.3 Knowledge & RAG Tables (Current State)
| Table | Existing Columns | Missing Capabilities for Strict RAG |
| :--- | :--- | :--- |
| `knowledge_sources` | `id`, `tenant_id`, `business_id`, `type`, `name`, `source_uri`, `status`, `metadata`, `created_at`, `updated_at` | Missing: `agent_id`, `content_hash`, `approved_by`, `crawl_depth`, `document_provenance`. |
| `knowledge_items` | `id`, `tenant_id`, `business_id`, `source_id`, `category`, `question`, `answer`, `approved`, `embedding` | Missing: `agent_id`, chunk metadata, chunk page/sheet range, vector dimension check. |
| `knowledge_documents` | Legacy unindexed container | Needs structured extraction and status tracking. |

---

## 3. Clerk Identity to PostgreSQL RLS Mapping Strategy

### 3.1 The Problem
In standard Supabase/PostgREST setups:
- `auth.uid()` expects a UUID from Supabase Auth (`auth.users`).
- Clerk user IDs are strings (e.g. `user_3KzhVfmM80JCbApQHF90dMsfoFZ`), which cannot cast to `auth.uid()`.

### 3.2 Chosen Implementation Path
1. **JWT Verification with Clerk**:
   - The backend server extracts the Clerk session JWT via `@clerk/backend` `verifyToken(token, { secretKey })`.
   - The verified `sub` claim is the authoritative `clerkUserId`.
2. **Session Variable / Claims Carrier in Postgres**:
   - In PostgREST / InsForge, request tokens carry `request.jwt.claims` -> `sub`.
   - We map `clerk_user_id = (current_setting('request.jwt.claims', true)::json->>'sub')`.
3. **Defense-in-Depth Layer**:
   - Every database query in the server functions (`src/lib/insurance.functions.ts` and `src/lib/train.functions.ts`) resolves `tenant_id` from `tenant_members` where `clerk_user_id = verified_clerk_id`.
   - Never trust client-supplied `tenantId`, `businessId`, or `ownerId`.

---

## 4. Proposed Incremental RAG Migration (`002_rag_security_schema.sql`)

### 4.1 Knowledge Sources Enhancement
- Add `agent_id UUID REFERENCES agents(id) ON DELETE CASCADE`.
- Add `content_hash TEXT`.
- Add `approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'))`.
- Add `provenance JSONB DEFAULT '{}'::jsonb`.

### 4.2 Document Chunks & Vector Store (`document_chunks`)
- Create dedicated `document_chunks` table:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
  - `agent_id UUID NOT NULL`
  - `source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE`
  - `chunk_index INTEGER NOT NULL`
  - `content TEXT NOT NULL`
  - `page_number INTEGER`
  - `sheet_name TEXT`
  - `section_heading TEXT`
  - `metadata JSONB DEFAULT '{}'::jsonb`
  - `embedding vector(384)` or `vector(768)`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`

### 4.3 Strict Tenant & Agent RLS Policies
```sql
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_agent_source_isolation ON knowledge_sources
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE clerk_user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
  )
);
```

---

## 5. Security & Privacy Safeguards
1. **SSRF-Proof Web Crawler**: Block RFC 1918 private IPs, AWS/GCP metadata (`169.254.169.254`), loopbacks, and enforce strict domain boundaries.
2. **Local Inference by Default**: Groq disabled unless `workspace_privacy` explicitly toggled to `external_allowed`.
3. **Evidence-Grounded Policy Responses**: Return citations with source ID, title, and page number; abstain if similarity score falls below threshold.
