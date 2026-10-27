# InsurCall System Map and Route-to-Feature Architecture

This document provides a comprehensive route-to-feature map of InsurCall, detailing which backend functions, database tables, and external interfaces power each customer-facing and administrative surface.

---

## 1. System Overview

InsurCall is an insurance-first WhatsApp customer support and policyholder inquiry platform with grounded AI automation. The architecture is composed of:
1. **Frontend / Application Shell**: Built on React 19, TanStack Router (file-based routing), TanStack Start / Vinxi, and TanStack React Query.
2. **Authentication & Identity**: Clerk React and Clerk Backend SDK, with tenant resolution mapping Clerk user IDs to InsurCall business tenants.
3. **Backend-as-a-Service & Database**: InsForge SDK (`@insforge/sdk`) and direct PostgreSQL connection pool (`pg`) for high-performance and transactional queries.
4. **WhatsApp Multi-Device Engine**: Pinned upstream OpenWA v0.25.0 specification implemented with a native `@whiskeysockets/baileys` socket engine and resilient server-side fallback (`embedded-engine.server.ts`).
5. **Retrieval-Augmented Generation (RAG)**: Multi-tenant vector knowledge store using `pgvector` (`cosine` similarity) and local ONNX embedding models (`all-MiniLM-L6-v2`) or OpenRouter/Groq API integrations with strict abstention gates.

---

## 2. Route-to-Feature Mapping

| Route | Primary Feature | Backend Functions / APIs | Database Tables Involved | Status Classification |
|---|---|---|---|---|
| `/_authenticated/dashboard` | **Overview**: Operational overview of WhatsApp activity, pending handoffs, grounded knowledge metrics, and system health. | `getDashboardMetrics`, `getTenantSettings`, `getWhatsAppConnection` | `whatsapp_conversations`, `whatsapp_messages`, `approval_requests`, `knowledge_sources`, `tenants` | **REAL** |
| `/_authenticated/whatsapp` | **WhatsApp Inbox**: Unified conversation stream, human takeover controls, live multi-device QR pairing, and call textback rules. | `getWhatsAppConnection`, `getWhatsAppConversations`, `getWhatsAppMessages`, `sendWhatsAppChatMessage`, `sendWhatsAppTestMessage`, `toggleWhatsAppHumanTakeover`, `toggleWhatsAppAutoReply`, `simulateInboundWhatsAppMessage`, `simulateWhatsAppCallEvent` | `whatsapp_connections`, `whatsapp_conversations`, `whatsapp_messages`, `customers`, `tenants` | **REAL** |
| `/_authenticated/agent` | **AI Agent**: Agent identity, tone, bilingual language settings, greeting disclosure, permitted/disallowed skills, and prompt preview. | `getTenantSettings`, `updateTenantSettings` | `ai_agents`, `tenants`, `tenant_members` | **REAL** |
| `/_authenticated/train` | **Knowledge & Training**: Guided conversational training, PDF/FAQ ingestion, fact review and approval queue, and retrieval test sandbox. | `ingestPdf`, `addManualKnowledgeFact`, `updateFactApproval`, `deleteKnowledgeSource`, `retrieveAgentKnowledge` | `knowledge_sources`, `document_chunks`, `agent_knowledge_sources`, `tenants` | **REAL** |
| `/_authenticated/change-requests` | **Approvals & Handoffs**: Human-in-the-loop compliance decisions for policy updates, claim disputes, and escalated inquiries. | `getApprovalRequests`, `updateApprovalStatus` | `approval_requests`, `customers`, `policies`, `audit_logs` | **REAL** |
| `/_authenticated/policies` | **Insurance Records**: Verified policyholder coverage directory across lines (Health, Motor, Life, Property, Commercial, Travel). | `getPolicies`, `getCustomers`, `getClaims` | `policies`, `customers`, `tenants` | **REAL** |
| `/_authenticated/claims` | **Claims Intake & FNOL**: Registered First Notice of Loss filings captured via conversational assistant and staff reviews. | `getClaims`, `getClaimStatusPresentation` | `claims`, `policies`, `customers` | **PARTIALLY IMPLEMENTED** (UI active, DB table empty, requires WhatsApp FNOL bridge) |
| `/_authenticated/settings` | **Settings & Security**: Workspace profile, team members, WhatsApp provider credentials, privacy/retention policy, and health status. | `getTenantSettings`, `updateTenantSettings`, `syncClerkUser` | `tenants`, `tenant_members`, `users` | **REAL** |
| `/_authenticated/audit` | **Activity & Audit**: Tenant-scoped audit trail of all AI assistant tool actions, staff handoffs, and policy accesses. | `getAuditLogs` | `audit_logs`, `tenants` | **REAL** |
| `/_authenticated/onboarding` | **Guided Business Setup**: Multi-step business setup covering organization details, insurance lines, WhatsApp pairing, and interview. | `getTenantSettings`, `updateTenantSettings` | `tenants`, `tenant_members`, `ai_agents` | **REAL** |
| `/_authenticated/phone` | Deprecated Cellular / PSTN Forwarding surface | Telephony functions | `phone_numbers`, `telephony_connections` | **DEPRECATED** (Hidden from primary navigation; replaced by WhatsApp Channels) |
| `/_authenticated/calls` | Telephony Call Log | Telephony functions | `call_sessions` | **DEPRECATED** (Secondary telephony log; non-primary) |
| `/voice` | Voice Call Simulator | LiveKit / WebRTC simulator | None | **MOCK / SIMULATOR** |
| `/api/webhooks/whatsapp` | WhatsApp Webhook Ingress: HMAC verification, loop prevention, deduplication, and RAG answer synthesis. | OpenWA webhook handler, `generateGroundedAnswer` | `whatsapp_connections`, `whatsapp_conversations`, `whatsapp_messages`, `customers`, `tenants` | **REAL** |
| `/api/webhooks/clerk` | Clerk User Lifecycle Webhook: User creation, email verification, and tenant association. | Clerk event parser | `users`, `tenant_members`, `tenants` | **REAL** |

---

## 3. Component Hierarchy

```
AppShell (Layout)
 ├── Desktop Sidebar (8 Canonical Navigation Items)
 │    ├── Overview (/dashboard)
 │    ├── WhatsApp Inbox (/whatsapp)
 │    ├── AI Agent (/agent)
 │    ├── Knowledge & Training (/train)
 │    ├── Approvals & Handoffs (/change-requests)
 │    ├── Insurance Records (/policies)
 │    ├── Settings & Security (/settings)
 │    └── Activity & Audit (/audit)
 ├── Top Header (Workspace Identity, Status Indicator, User Profile)
 └── Page Content Container (Responsive Max-Width, Light Theme, Zero Horizontal Overflow)
```

---

## 4. Architectural Boundaries

1. **WhatsApp Isolation**: The WhatsApp subsystem interacts exclusively through the `IWhatsAppProvider` interface and `OpenWAAdapter`, keeping upstream transport details isolated from core business logic.
2. **Tenant Boundary**: Every database query in server functions enforces tenant isolation by resolving `tenant_id` from the authenticated Clerk session before touching PostgreSQL tables.
3. **Safety Gate**: The RAG pipeline requires cosine similarity &gt;= 0.40 against approved documents. If insufficient evidence exists, it triggers an abstention response and records an escalation in `approval_requests`.
