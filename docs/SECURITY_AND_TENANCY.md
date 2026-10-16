# SaveCall Security, Identity, and Multi-Tenancy Requirements

## 1. Threat model

Assume callers and browsers can manipulate every request field, replay requests, submit prompt injections, and attempt to access another tenant's records. Assume retrieved documents and external integration responses may contain malicious or misleading instructions. Assume provider and network requests can time out after a side effect occurred.

Security goals:
- one tenant cannot read or mutate another tenant's data
- unauthenticated users cannot use privileged management APIs
- a voice session cannot select a customer or tenant merely by claiming an ID
- business actions occur only with proper permission and confirmation
- secrets and sensitive data are not unnecessarily exposed to models/logs
- failures cannot be misrepresented as success

## 2. Identity model

Choose and document one canonical mapping between the existing Clerk identity and the database identity. Do not mix Clerk and InsForge identities implicitly.

For a management request:
1. Verify the session/token server-side.
2. Resolve the authenticated user from the verified identity.
3. Resolve their organization membership from the database.
4. Verify the required role/permission for this exact action.
5. Use the resolved tenant ID in every query/write.

A request field such as `tenantId`, `customerId`, `clerkUserId`, email, phone, or LiveKit metadata is an identifier, not proof of identity. Where a client sends an ID, compare it with the server-resolved context and reject mismatches.

## 3. Tenant selection

Forbidden in production:
- defaulting to the first tenant in the database
- using a hardcoded tenant UUID
- selecting the latest customer when no identity match is found
- choosing a tenant based on an untrusted browser value
- trusting tenant IDs passed in LLM prompts, history, room names, or tool arguments

For an authenticated dashboard session, tenant comes from verified membership. For a public demo session, require a deliberate demo/tenant selector that resolves to a published demo configuration with constrained sandbox tools. For inbound telephone calls, resolve tenant through a verified configured inbound-number mapping or trusted provider metadata. Unknown number/call identity must fail closed or enter a configured generic intake flow without access to private customer records.

## 4. Database/RLS requirements

For every tenant-owned table:
- include a `tenant_id` directly or prove tenant ownership through a foreign-key relationship
- index `tenant_id` plus frequent lookup keys
- scope every server-side read/update/delete to authorized tenant context
- add RLS policies where supported and verify them using separate tenant identities
- do not allow clients to write `tenant_id` freely unless a server policy validates it
- use least-privilege credentials; service-role credentials must never reach the browser
- constrain foreign keys so related rows cannot cross tenants

RLS is defense in depth. A service-role/admin API key can bypass RLS in some systems; the server must still implement authorization.

## 5. Critical behavior fixes to prioritize

Audit and replace any code path that:
- auto-creates a real customer from arbitrary client input without validated enrollment
- creates fake policies/claims/appointments during session setup
- uses placeholders such as `user@example.com`, generic phone numbers, sample sums insured, or default customer IDs in a production path
- loads knowledge items without explicit tenant scope
- loads customer, policy, or claim records by customer ID without confirming tenant ownership
- accepts `role: "system"` in caller-submitted chat history
- returns a useful-looking success response when database persistence or action execution failed

Browser-controlled conversation history must never be allowed to inject a system message. Rebuild history server-side from the trusted persisted call state or strictly permit user/assistant turns after validating their order and limits.

## 6. Sensitive data and verification

- Collect only the information needed for the current task.
- Mask phone numbers and other identifiers in routine logs and UI where appropriate.
- Do not expose policy/claim/private appointment details to an unverified caller.
- Treat caller ID as a weak signal, not robust identity proof.
- An OTP flow needs a real challenge, delivery/verification provider or trusted internal mechanism, expiry, rate limits, attempt limits, replay prevention, and audit events. Simulated OTP is test-only.
- For high-risk profile changes, payments, refunds, policy changes, and similar operations, require stronger authentication and human approval if required by business policy.
- Do not send sensitive queries to a cloud LLM based solely on string matching. Enforce the configured provider privacy policy before sending data.
- Do not place secrets in the model context, retrieved documents, frontend state, URLs, browser storage, or client logs.

## 7. Webhook and media security

- Verify telephony provider signatures using the exact provider's documented signing rules.
- Reject invalid signatures, stale/replayed requests where replay protection is supported, and malformed payloads.
- Use constant-time comparisons for custom secret checks where appropriate.
- Authenticate LiveKit webhook/event requests using supported verification.
- Issue short-lived LiveKit tokens scoped to the intended room and participant permissions only.
- Do not let a browser choose arbitrary room names/identities with elevated permissions.
- Apply rate limits to session creation, chat, uploads, OTP endpoints, and outbound-call actions.
- Configure CORS/CSRF/session protections according to the actual auth/session model.

## 8. Prompt injection and tool safety

Knowledge documents are data, not instructions. A retrieved paragraph must never override system policy, access controls, or tool schemas.

For every tool call:
1. validate the name against an allowlist
2. validate arguments against a schema
3. resolve tenant and caller permissions from trusted server context
4. apply business-rule validation
5. check confirmation/approval requirements
6. execute with least privilege and idempotency where appropriate
7. verify the result from the source of truth
8. persist audit events and return a truthful result

Never execute model-generated SQL, shell commands, or arbitrary URLs. Limit tool timeouts and response payload sizes.

## 9. Retention, consent, and privacy

- Define whether audio, transcripts, summaries, and model prompts are stored.
- Make recording/transcript behavior configurable by tenant and comply with applicable jurisdictional requirements before live rollout.
- Provide an explicit retention/deletion policy and ensure deletion includes derived data where required.
- Record consent/disclosure state when needed for the deployment.
- Do not claim GDPR, SOC 2, HIPAA, or other compliance before a real gap assessment and required controls are complete.

## 10. Required security tests

At minimum, automated tests must prove:
- User A cannot read or mutate tenant B's records using a changed ID.
- A forged tenant ID does not change the resolved tenant.
- An unverified customer cannot read private policies/claims.
- An invalid telephony webhook signature is rejected.
- Caller-submitted `system` history is rejected/ignored.
- Disabled tool calls and non-confirmed consequential actions do not execute.
- A provider/tool timeout cannot result in a false success.
- local-only privacy mode never calls a cloud provider.
