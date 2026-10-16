# Initial Known Findings from Public Repository Inspection

These are a starting set of issues for the IDE's source audit, not a substitute for checking the current branch. Reconfirm that the relevant code is still present before changing it.

## 1. Session creation and customer identity

The currently inspected `src/routes/api/voice/session.ts` accepts optional `tenantId`, `clerkUserId`, customer email/name/phone, and policy number from the request. It attempts to use a default/first tenant when no tenant is passed, can auto-create a customer and synthetic health/motor policies, and falls back to the latest customer in the tenant before using a synthetic fallback profile.

**Required outcome:** session creation must resolve the tenant from verified server context or a trusted inbound-number mapping; it must never select the first/latest customer or create fake real business records. Demo data must remain explicit and sandbox-only. Review access token permissions, room identity, error handling, and whether session persistence failures are allowed to continue.

## 2. Chat request and prompt assembly

The currently inspected `src/routes/api/voice/chat.ts` accepts caller-supplied `tenantId`, `customerId`, `customerName`, and message history that allows `system` role entries. Prompt assembly has industry-specific insurance defaults and loads approved knowledge items without an evident tenant predicate in the inspected query. Customer-related lookups need explicit authorized tenant ownership as well as customer ID scoping.

**Required outcome:** construct trusted policy/system messages server-side; derive tenant, call, agent, and customer context from an authorized session; reject or ignore untrusted privileged history roles; scope all knowledge and customer data; remove industry-specific fabricated defaults from production behavior; separate typed tools from free-form LLM text.

## 3. Provider fallback and privacy semantics

The inspected chat implementation uses timed provider calls to Groq and Ollama and a keyword heuristic to decide whether a query is sensitive. In `LLM_MODE=local`, the code can fall back to Groq if local inference fails.

**Required outcome:** document the intended privacy contract. If local-only means sensitive data must not leave the machine, local-only must never fall back to a cloud provider. Use an overall deadline and bounded retries, distinguish provider failure from empty output, and test the provider routing with mocked requests.

## 4. Documentation vs implementation

The README claims include sub-250 ms latency, a secure 4-tier verification workflow, RLS-based tenant protection, a browser fallback, and complete telephony readiness. The IDE must verify each claim through actual code, config, and tests. In particular, demo/simulated verification is not real security, a dialplan is not a successful inbound-call integration, and an assistant utterance is not proof a business action succeeded.

## 5. Required audit procedure

1. Re-open the current working-tree files and migrations.
2. Check whether these paths/behaviors are still present.
3. Write evidence-backed entries into `docs/CURRENT_STATE_AUDIT.md` using `docs/CURRENT_STATE_AUDIT_TEMPLATE.md`.
4. Rank issues by customer impact and exploitability.
5. Implement P0 fixes in small patches with regression tests.

Do not copy this document into marketing material. It is an engineering audit checklist.
