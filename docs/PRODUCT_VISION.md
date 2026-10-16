# SaveCall Product Vision and Requirements

## 1. Product definition

**SaveCall is an AI Voice Employee platform that helps businesses answer customer calls, handle routine conversations, perform approved business tasks, and hand difficult or sensitive situations to a human with context.**

SaveCall is not merely a voice chatbot. Its value is completed, verifiable business work: resolving a question, qualifying a lead, checking real availability, creating a verified appointment, recording a clear outcome, or transferring a caller to the right person.

Core product promise:

> Automate repetitive calls. Keep humans in control of important decisions.

Never position the product as a guaranteed replacement for all human staff. It should make the team's work more reliable and measurable.

## 2. Customers and use cases

The platform is industry-neutral. The first implementation should support generic business workflows without baking one industry into the runtime:

- answering business FAQs and questions from approved content
- explaining services, pricing, business hours, locations, and policies
- capturing and qualifying leads
- checking availability through a real configured integration
- booking, rescheduling, and cancelling appointments when permitted
- collecting callback requests
- transferring to a human
- writing summaries and structured call outcomes

Insurance claims, clinic workflows, and other vertical-specific workflows must be optional modules/configuration, not global assumptions. A customer must never receive fabricated policy, claim, healthcare, payment, or appointment information.

## 3. Primary user journey

1. **Create account / sign in.** Establish the authenticated user and their organization membership.
2. **Create company.** Collect company name, business category, timezone, preferred languages, operating hours, and main call purpose. Keep required fields minimal.
3. **Create AI Employee.** Set its display name, role, greeting, voice/language, tone, allowed tasks, and handoff destination.
4. **Teach the employee.** Add website URLs or upload supported documents/FAQs. Show processing and review state. Do not say an item was learned until ingestion has completed successfully.
5. **Configure skills and rules.** Select available tasks and connect integrations. Clearly show which actions require customer confirmation or human approval.
6. **Test safely.** Offer a browser/WebRTC test call using a sandbox/test configuration. Clearly label test actions and never contact a real customer from a test session.
7. **Readiness check.** Confirm that knowledge, policies, tools, escalation routes, and deployment settings are valid.
8. **Deploy gradually.** Start in test mode; then optional assist/controlled mode; only enable autopilot within explicit business rules.
9. **Review performance.** Show calls, task outcomes, escalations, unresolved requests, latency, and failure reasons from actual recorded events.

Business users should see “Knowledge”, “Skills”, “Rules”, “Calls”, “Performance”, and “AI Employee”, not “embeddings”, “temperature”, “tokens”, or “vector database”.

## 4. Deployment modes

- `TEST`: synthetic/test data or sandbox tools only; no real customer-impacting side effects.
- `ASSIST`: limited, low-risk use; route out-of-scope or unavailable situations to a human.
- `CONTROLLED`: only explicitly selected intents/actions are automated.
- `AUTOPILOT`: only enabled after readiness requirements pass; still constrained by the same authorization, confirmation, and escalation policies.

A mode is a server-enforced policy, not just a visual badge. Changing modes must be authorized and audited.

## 5. Dashboard and outcomes

Show honest, traceable metrics such as:
- calls started/completed/failed
- calls resolved according to defined success criteria
- bookings/leads created and verified
- transfers to humans
- calls needing review
- average and percentile response/turn latency
- tool failure rate
- estimated staff time saved only where the estimate's formula is documented

A reply saying “done” is not a completed outcome. A task counts as completed only when its success criteria have been met and backed by the tool/database result.

## 6. Human handoff

A transfer should carry a structured summary, caller identity level (verified/unverified), intent, important extracted facts, actions already attempted, tool results, and the reason for escalation. Do not disclose information to a receiving human unless their permissions allow it. If a true warm transfer is not implemented, label the current behavior accurately (for example, “request callback” or “show handoff instructions”).

## 7. Product-quality principles

- The user should understand what the AI can do before connecting a real number.
- The agent must disclose that it is an AI when appropriate and never pretend to be human.
- The agent should speak naturally but prioritize correctness over theatrical empathy.
- Ambiguity should trigger a clear clarification question.
- Unknown answers should trigger an honest limitation and, where configured, handoff.
- Destructive or consequential actions need confirmation and verification.
- Privacy, tenant isolation, and user control are product features, not later add-ons.
- Default UI must work on desktop and mobile, with accessible controls and clear connection/error states.

## 8. Success definition

SaveCall's MVP is successful when a signed-in business can configure one AI Employee, add approved knowledge, conduct a reliable browser voice test, safely complete at least one real sandbox workflow, observe a truthful call trace, and verify that one tenant cannot access another tenant's data.
