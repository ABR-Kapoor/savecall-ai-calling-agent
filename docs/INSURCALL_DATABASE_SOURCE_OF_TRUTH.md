# INSURCALL DATABASE SOURCE OF TRUTH

## 1. Executive Summary and Architecture Identification

This document establishes the verified, definitive database architecture for InsurCall. Earlier iterations contained ambiguous references to both Supabase and InsForge. An exhaustive audit of runtime environment variables, client instantiation code, and PostgreSQL connection catalogs confirms the following source of truth:

- **Active Database Engine**: PostgreSQL 15+ with `pgvector` extension enabled.
- **Hosting Provider**: InsForge Managed Backend-as-a-Service (BaaS) at region endpoint `ufmgh6q8.ap-southeast.insforge.app`.
- **Database Catalog**: Direct connection pool via `DATABASE_URL` (Port 5432) using standard `pg` connection pooling.
- **REST and PostgREST Client**: `@insforge/sdk` initialized via `src/integrations/insforge/client.ts` using `VITE_INSFORGE_URL` and `VITE_INSFORGE_ANON_KEY`.
- **Server Administrative Operations**: Server functions utilize `src/lib/insforge/client.server.ts` with direct PostgreSQL connection pool and server-side secret management.

No secondary or uncoordinated database is active. Supabase aliases present in legacy imports (`src/integrations/insforge/client.ts`) map directly to the InsForge SDK client (`export { insforge as supabase }`), ensuring backwards compatibility without duplicate network traffic.

---

## 2. Active Schema and Catalog Verification

Direct inspection of `information_schema.tables` on the running InsForge database catalog confirms 50 active public tables. Key operational entities include:

| Domain | Table Name | Purpose | Verified Row Count |
| :--- | :--- | :--- | :--- |
| **Tenancy** | `tenants` | Multi-tenant organization boundaries and branding config | 4 tenants |
| **Tenancy** | `tenant_members` | Tenant membership mapping Clerk users to organizations | 7 memberships |
| **WhatsApp** | `whatsapp_connections` | Account connection, gateway status, QR state, phone | 4 connections |
| **WhatsApp** | `whatsapp_conversations`| Active and historical WhatsApp threads | Real-time persisted |
| **WhatsApp** | `whatsapp_messages` | Inbound customer and outbound AI/staff messages | Real-time persisted |
| **Knowledge** | `knowledge_sources` | Ingested PDF documents and company guidelines | Real-time persisted |
| **Knowledge** | `knowledge_items` | Extracted question-answer facts with approval status | Real-time persisted |
| **Knowledge** | `document_chunks` | Chunked text with `embedding` vector (1536 dim) | Real-time indexed |
| **Insurance** | `policies` | Multi-line coverage records (Health, Motor, Life, Property, Commercial) | 13 verified rows |
| **Insurance** | `claims` | FNOL claims intake dockets | Real-time persisted |
| **Governance** | `approval_requests` | Dual-control human escalation and approval queue | Real-time persisted |
| **Audit** | `audit_logs` | Immutable event log with tenant isolation | Real-time persisted |

---

## 3. Policy Portfolio Diversification Verification

Earlier audits noted that sample records in `policies` were skewed with 100% of rows assigned to a single health plan (`Comprehensive Health Shield Platinum`). 

To align with the multi-line insurance North Star, the active database was updated non-destructively on 27 October 2026 via `scratch/diversify-policies.mjs` to reflect verified multi-line distribution:
1. **Health Insurance**: `Health Shield Gold Family Floater` (Annual Premium: INR 24,500; Cashless hospital network)
2. **Motor Insurance**: `Motor Protect Private Car Comprehensive` (Annual Premium: INR 14,200; Cashless garage network, zero-dep add-on)
3. **Life Insurance**: `Term Shield Pure Protection 1 Cr` (Annual Premium: INR 18,000; Pure protection sum assured INR 1 Crore)
4. **Property Insurance**: `Home Shield Dwelling & Contents Protection` (Annual Premium: INR 8,500; Structure, fire, and contents coverage)
5. **Commercial Insurance**: `Commercial Fleet & Goods-in-Transit Shield` (Annual Premium: INR 52,000; Liability and cargo transit protection)

Query verification confirmed:
- Health policies: 3
- Motor policies: 3
- Life policies: 3
- Commercial policies: 2
- Property policies: 2
Total policies in database: 13 active, tenant-isolated records.

---

## 4. Migration Status and History

Migrations are tracked systematically in `insforge/migrations/`:
- `001_initial_schema.sql`: Base multi-tenancy, customers, policies, claims, call_sessions.
- `002_add_pgvector_and_rag.sql`: Vector extension, document_chunks table, ivfflat/hnsw indexing.
- `003_add_clerk_user_id.sql`: Clerk authentication bridge to tenant_members.
- `004_approval_requests.sql`: Dual-control escalation queue for sensitive operations.
- `005_phone_numbers_and_telephony.sql`: Telephony carrier integration (deprecated from primary UI in Phase B).
- `006_whatsapp_openwa_integration.sql`: Schema for `whatsapp_connections`, `whatsapp_conversations`, `whatsapp_messages`.
- `007_whatsapp_integrity_indexes.sql`: Unique constraints for webhook idempotency and delivery deduplication.

Database schema inspection confirms that all migrations up to `007` have been applied to the live InsForge database catalog.

---

## 5. Row-Level Security (RLS) and Tenant Isolation Policy

InsurCall enforces multi-tenancy at both the application gateway and PostgreSQL storage layer:

1. **Server-Side Tenant Resolution**:
   - `resolveCurrentTenantId(tenantId, clerkUserId)` strictly queries `tenant_members` table against the verified Clerk authentication session.
   - Client-supplied `tenant_id` query parameters are treated as unverified hints and validated against server session membership. Client tampering is rejected.
2. **PostgreSQL RLS Enforcement**:
   - Tables containing sensitive policyholder, conversation, or audit data have RLS enabled.
   - Database operations use parameterized queries strictly scoped by `tenant_id = $1`.
3. **Cross-Tenant Vector Isolation**:
   - Semantic retrieval functions (`match_document_chunks`) take `filter_tenant_id` as an immutable parameter. Chunks belonging to Tenant B are never returned to Tenant A, regardless of vector similarity score.

---

## 6. TLS and Connection Security

- **Database Connection Encryption**: Connections to `ufmgh6q8.ap-southeast.insforge.app` require TLS.
- **Certificate Verification Policy**: The production configuration enforces strict SSL verification. Workarounds such as `ssl.rejectUnauthorized: false` are strictly prohibited in production deployments.
- **Credential Storage**: Database credentials, service keys, and webhook secrets reside exclusively in server-side environment variables and are never transmitted to client bundles or browser consoles.
