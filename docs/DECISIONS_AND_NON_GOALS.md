# SaveCall Decisions, Defaults, and Non-Goals

This document prevents the IDE from making arbitrary architecture or product decisions. Update it when decisions change.

## 1. Current defaults

- Product: multi-tenant AI Voice Employee / receptionist for businesses.
- Initial channel: browser/WebRTC voice test using the existing LiveKit path where it works.
- Languages: English, Hindi, Hinglish as explicit product goals; measure quality rather than assume parity.
- Inference preference: open-source/local where practical, with explicitly configured cloud providers allowed. Privacy mode must be enforced, not inferred from keywords.
- Frontend: retain existing React/TanStack Start/Vite/TypeScript architecture unless a validated limitation requires change.
- Auth/database: audit the existing Clerk + InsForge integration, establish one canonical identity mapping, and keep server authorization plus RLS.
- Main business entities: organizations, AI Employees, knowledge, calls, contacts/leads, appointments, tools, policies, events, audit records.
- Telephony: separate milestone after browser voice and security are stable.
- Research: evaluation must be reproducible and product safety must not be bypassed for experiments.

## 2. Decisions the IDE must not guess

If not discoverable from the code or environment documentation, record a question/decision instead of inventing an answer:
- whether Clerk or InsForge owns login/session authentication as the source of truth
- exact production hosting topology and network boundaries
- which real booking/calendar integration is the first supported tool
- whether call audio and full transcripts are stored, and for how long
- which telephony/PBX/carrier is the first supported path
- exact caller verification requirements for each business workflow
- whether the first demo tenant is public, invite-only, or authenticated-only

Prefer a safe test/sandbox default until a decision is made.

## 3. Non-goals for the initial MVP

Do not add these before core security and a real end-to-end browser workflow are dependable:
- generalized outbound calling campaigns
- unrestricted autonomous actions against arbitrary customer APIs
- multi-agent orchestration for its own sake
- marketplace, billing, enterprise RBAC matrix, or complex CRM suite
- unsupported claims about compliance certifications
- multiple telephony carriers at once
- vertical-specific insurance/healthcare data models as universal defaults
- fine-tuning/training infrastructure if configuration, retrieval, and tool reliability solve the initial requirement

## 4. Truthful demo policy

Demo data is allowed only when clearly segregated and labelled. Demo routes may use synthetic customers and sandbox actions. A demo success must never be presented as a real business booking or real policy result. Do not quietly reuse demo fixtures in production fallback paths.

## 5. Architecture changes

Every major proposed change must state:
- problem it solves
- evidence in current implementation
- options considered
- impact on data and users
- migration/rollout plan
- test plan
- rollback strategy
- added operational cost/complexity

A smaller patch is preferred when it adequately solves the problem.
