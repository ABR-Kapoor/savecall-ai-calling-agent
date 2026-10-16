# SaveCall Prioritized Implementation Roadmap

The IDE must inspect the actual codebase before estimating or executing these phases. Do not implement all phases in one giant change. Reorder only when evidence shows a dependency or severity requires it.

## Priority definitions

- **P0 — Critical:** customer-data exposure, unauthorized actions, credential exposure, fabricated business records, or data corruption.
- **P1 — MVP correctness:** reliable identity, tenant configuration, call session lifecycle, truthful responses, tests, and one end-to-end supported use case.
- **P2 — Product completeness:** business onboarding, knowledge management, real tools, call trace, and graceful handoff.
- **P3 — Operational readiness:** load tests, telemetry, retention, deployment automation, and telephony integration.
- **P4 — Research and scale:** benchmark harness, multilingual formal evaluation, multi-worker scaling, and advanced analytics.

## Phase 0 — Repository truth and baseline

Deliverables:
- `docs/CURRENT_STATE_AUDIT.md` with source-backed status: verified/partial/missing/unsafe
- baseline commands/results for install, lint, typecheck if available, build, and tests
- current routes, data schema/migrations, auth model, provider path, deployment path
- a list of README/documentation claims that are unverified or contradicted by implementation

Acceptance: no source change yet; top risks and a proposed P0 patch set are presented.

## Phase 1 — P0 security and data integrity

Inspect and fix, based on evidence:
- server-side session/auth verification
- canonical user-to-tenant membership resolution
- explicit tenant scope for every tenant-owned query
- RLS and foreign-key constraints where supported
- removal of first-tenant/latest-customer/hardcoded-ID fallbacks
- removal of synthetic business records from real session creation
- untrusted client history role validation; reject client-supplied system messages
- webhook signature validation or disable/document unsupported inbound webhook until secure
- server-only credentials and safe error handling

Acceptance:
- cross-tenant negative tests pass
- anonymous/unauthorized access fails closed
- missing identity does not disclose records or create synthetic real data
- no production request can generate fake claims/policies/appointments
- secrets do not appear in browser build/logs

## Phase 2 — Canonical app and config lifecycle

Build a complete minimum journey for an authenticated business:
- create/join organization
- create and edit one AI Employee
- edit greeting, languages, allowed skills, handoff behavior, and deployment mode
- save versioned config with validation
- display integration and readiness status

Acceptance: reload preserves settings; changes are tenant-scoped/audited; UI does not show a feature as connected or ready when server checks fail.

## Phase 3 — Safe voice session lifecycle

- validate session input and channel
- resolve tenant/agent on the server
- create a persisted call/session record
- issue short-lived least-privilege LiveKit token or clearly route to explicitly marked local demo path
- enforce one owner/tenant for the session
- handle reconnect, expiry, explicit end, transport failure, and duplicate end requests
- avoid exposing unnecessary PII in room metadata

Acceptance: test session works, expires as expected, closes cleanly, and cannot be used to join another tenant's room.

## Phase 4 — Truthful AI provider routing

- centralize provider adapters and configuration validation
- define local-only, cloud-only, and hybrid semantics precisely
- enforce privacy class before provider selection
- implement request deadline, bounded retries, cancellation, and observable failover
- separate timeout/provider failure from legitimate empty output
- validate provider output and sanitize speech output without deleting meaningful content

Acceptance: tests prove disabled providers are never called, local-only never calls cloud, timeout is bounded, and fallback status is visible in safe diagnostics.

## Phase 5 — Generic business knowledge

- upload or add supported knowledge sources
- process asynchronously where appropriate and expose status/error state
- enforce tenant scope, source approval, file/URL safety, and content limits
- persist source IDs and versions
- retrieve only approved knowledge for the authorized tenant
- answer unknown questions honestly

Acceptance: tenant A cannot retrieve tenant B's knowledge; unapproved/failed knowledge is excluded; answers are traceable to sources or clearly marked as general assistance.

## Phase 6 — One verified business workflow

Choose one MVP task supported by a real sandbox integration, preferably lead capture or appointment booking. Do not build an abstract “tool framework” without one complete vertical slice.

- define typed request/response schemas
- enforce permissions and business rules
- handle explicit confirmation
- use idempotency
- persist tool execution events
- verify result from source of truth
- report success only after verification

Acceptance: positive, negative, timeout-after-success, duplicate request, and unauthorized-action tests pass.

## Phase 7 — Call timeline, transcripts, and handoff

- event timeline for call lifecycle, retrieval, actions, verification, and errors
- transcript and summary settings with retention controls
- structured handoff package and a truthful current transfer/callback behavior
- call outcome labeling from verified state

Acceptance: dashboard outcomes reconcile with call/tool records; no success is inferred from generated text.

## Phase 8 — Product onboarding and deployment modes

- welcome and company setup
- knowledge and skills setup
- test call and readiness checklist
- server-enforced test/assist/controlled/autopilot modes
- safe warnings for missing knowledge/integration/handoff

Acceptance: a first-time business owner can get from account to a safe test call without editing prompts or database records manually.

## Phase 9 — Telephony integration (separate milestone)

Only start after browser voice and security are stable.
- select and document supported PBX/carrier architecture
- authenticated inbound webhook, number-to-tenant mapping, deduplication
- audio bridging/codecs and lifecycle reconciliation
- tested human transfer/hangup behavior
- secrets/network/availability/runbook

Acceptance: one test inbound number works end-to-end in a controlled environment, with positive and negative signature tests. Do not mark telephony implemented just because config files exist.

## Phase 10 — Operational and research readiness

- load/soak testing and measured concurrency
- p50/p90/p95/p99 latency and failure rates
- retention/deletion/backups/recovery documentation
- alerting/health checks and integration status
- research scenario harness, baselines, ablations, reproducible output

Acceptance: published capacity/latency is tied to a reproducible test setup and dated report.

## Rule for scope

The next phase begins only after acceptance criteria for the current phase have been checked. If a critical issue appears mid-phase, stop feature expansion and address it first.
