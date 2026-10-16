# SaveCall Testing, Quality, and Release Gates

## 1. Baseline commands

Inspect `package.json` before running commands. Current repository conventions include npm scripts for development, build, lint, and format; do not claim a `test` or `typecheck` script exists until verified. Add and standardize tests/commands deliberately rather than hiding absent tooling.

Likely checks, if configured:

```bash
npm ci
npm run lint
npm run build
npm test
npx tsc --noEmit
```

Use the package manager/lockfile the repository actually standardizes on. Do not generate contradictory npm and Bun lockfile updates unintentionally. Report exact commands and exit codes.

## 2. Test pyramid

### Unit tests
- tenant context resolution and authorization policy
- schemas and input validation
- state updates/corrections
- provider routing and deadline logic
- spoken-text sanitizer
- policy/confirmation transitions
- idempotency key construction

### Integration tests
- database operations with RLS and realistic tenant isolation
- knowledge ingestion and retrieval
- LiveKit token/session lifecycle where testable
- provider adapters using mocked HTTP servers
- webhook signature validation
- tool execution, idempotency, timeout and verification

### End-to-end tests
- authenticated user configures an AI Employee
- user tests a call through the supported demo path
- question is answered from approved tenant knowledge
- a supported sandbox workflow executes after confirmation
- dashboard shows the actual verified outcome
- user cannot view another tenant's call or knowledge

### Voice evaluation tests
Use deterministic scripted scenarios and recorded/synthetic audio fixtures. Avoid brittle tests that compare an entire natural-language answer byte-for-byte; assert the structured state, tool decision, safety behavior, and required meaning instead.

## 3. Minimum security regression suite

- missing/invalid auth is rejected on protected routes
- a forged `tenantId` does not change the server-resolved tenant
- cross-tenant reads and writes are rejected
- client history cannot include `system` or untrusted privileged roles
- no fallback to first/latest customer occurs
- session creation does not create fabricated business records
- knowledge retrieval always filters to authorized tenant and approved documents
- local-only provider mode performs zero cloud requests
- unapproved tools and missing confirmations never execute
- duplicate retries do not duplicate side effects
- timeout after a potentially successful action is reconciled before retry
- false tool success cannot be returned after failed persistence/verification
- invalid webhook signatures are rejected
- tokens/secrets do not appear in frontend bundle or logs

## 4. Test fixtures

- use explicit test tenants A and B
- create synthetic customers/documents with labels indicating test data
- mock external providers and integrations by default
- use a sandbox calendar/booking service for side-effecting tests
- clean up only records created by the test
- never run integration tests against real customer data unless specifically approved

## 5. Accessibility and UX checks

- keyboard-accessible call controls, dialogs, menus, and forms
- visible microphone permission and device states
- explicit connecting/connected/reconnecting/failed/ended states
- transcript and captions legible on mobile
- controls to stop/end call reliably
- errors include recovery steps without leaking internals
- loading/empty/error states for knowledge, integrations, and analytics

## 6. Release gates

A build is eligible for internal testing only when:
- production build succeeds
- lint/type checks configured for the project pass
- critical auth/tenant/security tests pass
- no critical secrets are committed
- migrations have been reviewed
- tested environment variables are documented
- README claims match verified behavior

A build is eligible for real pilot callers only when:
- every enabled tool is real, authorized, and tested
- fallback and handoff are understood and tested
- data retention/recording behavior is set
- provider/webhook tokens and secrets are configured safely
- logs and alerting can identify failed calls/actions
- rollback and incident contacts/runbook exist

A build is not “production ready” solely because a Vercel deployment succeeds.

## 7. Documentation discipline

For each release, document:
- features that were actually tested
- providers/models and configuration used
- known limitations
- deployment topology
- migrations/config changes
- security assumptions
- test results and latency measurement methodology

Do not leave claims such as “sub-250ms”, “offline”, “4-tier verification”, “production ready”, “RLS secured”, or “telephony ready” in README unless tests/configuration substantiate them.
