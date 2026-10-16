# SaveCall Data Model and API Contracts

This is a target domain model, not a demand to create every table immediately. Inspect current InsForge migrations first; reconcile this model with actual schema and implement the smallest necessary migrations. Do not rename/drop existing tables without a reviewed migration and compatibility plan.

## 1. Canonical domain entities

### `users` / `organization_memberships`
Represent authenticated product users and their relationship to organizations. If Clerk remains the auth provider, store a stable verified Clerk subject and map it to membership. Enforce roles server-side. Avoid duplicating credentials or pretending a customer/contact is the same entity as a login user.

### `tenants` (organizations)
`id`, `name`, `slug`, `timezone`, `business_category`, `status`, `settings`, timestamps.

### `ai_employees`
`id`, `tenant_id`, `name`, `role`, `status`, `deployment_mode`, current config version, timestamps.

### `agent_config_versions`
Immutable/versioned configuration: greeting, languages, voice provider/voice, tone, operating hours, enabled skills, allowed tools, escalation configuration, policy references, model routing/privacy settings. Do not store secrets in the config JSON.

### `knowledge_sources` / `knowledge_documents` / `knowledge_chunks`
Track source URI or storage key, file type, content hash, upload owner, processing state, approval status, parser version, chunking/embedding version, timestamps, and tenant ownership. Each chunk links to the source/document and has a retrieval representation where supported. Unapproved/failed content must not enter production retrieval.

### `tools` / `tool_permissions` / `integrations`
Track tool capability, enabled status, configuration references (never raw secrets), required confirmation, allowed roles/agent modes, and integration health. Actual credentials must be stored in a secret manager/platform secret store.

### `calls` / `call_participants` / `call_events`
Store tenant, AI Employee/config version, channel, provider call/room identifier, timestamps, lifecycle, outcome, language, and failure reason. Events store event type, occurrence time, correlation IDs, safe metadata, and optional trace version. Apply retention rules to transcript/audio fields.

### `transcripts` / `call_summaries`
Store only when configured and authorized. Keep transcript turns ordered with speaker, timestamp, language, and provenance. Summaries are derived data and must not be treated as authoritative facts.

### `tool_executions` / `audit_logs`
Record action name, validated normalized arguments (redacted where needed), actor/call/tenant, status transitions, idempotency key, tool result reference, verification state, and timestamps. Never store secrets in arguments or audit detail.

### Business-domain records
Use general entities such as `customers`/`contacts`, `leads`, `appointments`/`bookings`, `services`, and `business_hours` where needed. Only add domain-specific entities (for example insurance policies/claims) when implementing an explicitly scoped vertical module. Do not create those records automatically during a voice session.

## 2. Multi-tenant invariants

- Every tenant-owned record has a tenant ownership path enforced in both application code and database policies.
- Foreign keys cannot link records across tenants.
- Every route/service derives the authorized tenant from server-verified context.
- Tenant context is mandatory in domain services; avoid optional tenant filters that silently mean “all tenants”.
- Unique constraints should generally include tenant where the business rule is tenant-scoped.
- RLS policies and negative cross-tenant tests are mandatory.

## 3. API conventions

- Validate all request bodies, path params, and query params using Zod or the project's established runtime schema validator.
- Define typed success and error responses; do not return raw provider/database errors.
- Use appropriate status codes: 400 malformed input, 401 unauthenticated, 403 unauthorized, 404 inaccessible/not found where appropriate, 409 conflict/idempotency collision, 422 business rule failure, 429 rate limited, 5xx transient/internal failure.
- Limit request size, history length, output size, and request frequency.
- Provide correlation/request IDs and structured server logs.
- Return only fields the caller is permitted to see.
- Do not place secrets or private customer data in URLs.

## 4. Suggested logical API surface

Keep existing routes where suitable; this list is a capability map, not permission to duplicate routes.

### Session / calls
- `POST /api/voice/session`: authorize channel and tenant, create a call/session row, create a least-privilege LiveKit token if applicable, return a minimal session descriptor. Must not auto-create private customer business data.
- `POST /api/voice/chat` or internal agent endpoint: accept a user turn associated with a valid call/session, derive tenant/call/agent config from server-verified session context, update conversation state, and return the assistant turn with safe trace metadata.
- `POST /api/calls/:id/end`: authorize call ownership and close the lifecycle idempotently.

### AI Employee / organization management
CRUD routes for company and employee configuration must be authenticated and tenant-scoped. Changes to active configurations should create a new version or audit event.

### Knowledge
Upload, processing status, approval/rejection, deletion, and search routes must verify tenant ownership and document permissions. Avoid ingesting a public URL without protections against SSRF, internal IP access, oversized downloads, and unsupported content.

### Tools/integrations
Expose only specific approved operations. Never expose an unrestricted generic database or HTTP proxy tool to the LLM.

### Telephony
An inbound webhook must validate the provider signature, map the called number to a configured tenant/AI Employee, deduplicate/reconcile provider call IDs, and return an appropriate provider response. The external webhook should not accept a `tenantId` supplied by the caller as authoritative.

## 5. LLM message/history contract

- Construct the system/developer policy prompt on the server.
- The browser must not be permitted to send arbitrary system messages.
- Prefer trusted persisted state/history associated with the authorized call.
- If client-provided history is temporarily required, allow only user/assistant roles, enforce ordering and strict length limits, and never treat it as the source of truth for actions or identity.
- Keep retrieved evidence separate from instructions and include source IDs/metadata for traceability.
- Store provider/model/config version for reproducibility, while avoiding unnecessary raw prompt retention.

## 6. Idempotency and consistency

Side-effecting tools should accept or create an idempotency key scoped to tenant/action. Use database uniqueness/transactions when possible. If a request times out, reconcile operation status before repeating it. Tool status, call event, and business record must tell a consistent story.

## 7. Migration rules

- Review current migrations and live schema before changing data structures.
- Make additive, forward migrations where practical.
- Include indexes, constraints, and RLS policies with tenant-owned table changes.
- Provide seed data only in a clearly separated development/test process.
- Do not seed fake production customers, claims, policies, or appointments.
- Document required rollout order and rollback strategy for destructive changes.
