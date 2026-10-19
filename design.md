# SaveCall Design System & Product UX Blueprint

**Document type:** Product design specification and implementation contract for the IDE agent  
**Product:** SaveCall — AI voice assistance and operations for insurance businesses  
**Primary objective:** Replace the current dark, dense, insurance-admin UI with a polished, bright, guided experience inspired by the clarity and onboarding rhythm of modern AI products such as ElevenLabs, while retaining SaveCall's identity, insurance workflows, security controls, and actual backend behavior.  
**Implementation rule:** Audit the existing app before changing it. Preserve working logic, routes, database contracts, authentication, tenant isolation, approval workflows, and real voice integrations. Refactor UI in controlled phases rather than replacing the application with mock screens.

---

## 0. Instruction to the IDE agent

Treat this document as the product and UX source of truth for the next redesign. Read it alongside `AGENTS.md`, repository README, existing architecture notes, schema/migrations, and current route implementations.

Before implementation:

1. Inspect the actual repository, package scripts, design system, routing, shared components, authentication, onboarding/profile tables, InsForge schema, and all current insurance screens.
2. Map each current screen and action to its current implementation and API/database source.
3. Identify existing design primitives before adding another component library.
4. Produce a short file-specific plan, then implement in phases below.
5. Do not stop after producing a plan. Implement, test, and report results.

### Non-negotiable constraints

- Do not copy ElevenLabs branding, copywriting, exact layouts, or proprietary visual assets. Use the supplied screenshots as inspiration for onboarding clarity, restrained whitespace, stepwise choices, and focused templates—not as a pixel-for-pixel target.
- Keep **SaveCall** as the product name. “Insurance AI” may remain a workspace/vertical label, not the universal brand identity.
- Keep the insurance experience genuinely useful: policies, claims, approvals, voice sessions, audit trail, company settings, and identity mapping must continue to work.
- The underlying platform must remain reusable for other business types later. Insurance workflows belong in an insurance module/configuration, not in every generic component.
- Do not fabricate KPIs, active-call indicators, voice readiness, transcripts, training results, pricing, free-credit balances, or successful business actions.
- Do not label retrieval-based knowledge ingestion as “training the LLM.” Use **Business Knowledge**, **Knowledge Base**, or **Teach your assistant**.
- Keep tenant scoping, database row-level security, authorization, and approval controls. Never weaken security to simplify onboarding.
- Do not put secrets, internal identifiers, or unnecessary personal data in the browser, client logs, model prompts, or URL parameters.
- Do not require a credit card for a free trial unless the product owner explicitly approves that business decision. Default to an honest, no-card-required free start.
- The first release should feel complete but should not attempt to build every future capability at once.

---

## 1. Product position and design principles

### 1.1 Product definition

SaveCall helps insurance businesses answer routine customer calls, look up authorized policy information, collect claim information, stage sensitive changes for review, and transfer cases to people when necessary. It combines a customer-facing voice assistant with a simple operations workspace for staff.

The user should feel they are **setting up a trustworthy digital assistant for their insurance business**, not configuring machine-learning infrastructure.

### 1.2 The experience should communicate

1. **Control:** staff can see what the assistant is allowed to do.
2. **Clarity:** every status has a specific meaning; no fake “live” or “trained” badges.
3. **Trust:** show evidence, approval requirements, usage, privacy choices, and failure states honestly.
4. **Low effort:** ask only what is needed at each step; allow skipping optional setup.
5. **Progress:** small, meaningful milestones and a clear readiness checklist create momentum without manipulative gamification.
6. **Calm professionalism:** finance/insurance workflows must feel safe and deliberate.
7. **Human control:** make handoff and approval part of the product, not a hidden exception.
8. **Progressive disclosure:** simple defaults first; advanced configuration remains available.

### 1.3 Tone of voice

Use direct, concise, reassuring language. Avoid exaggerated claims and futuristic hype.

Good examples:
- “Set up your insurance assistant.”
- “Try a test conversation before enabling live calls.”
- “Your assistant can answer from approved business information.”
- “Nominee changes require staff approval.”
- “No card required to start.” (Only if true in implementation.)
- “We could not connect to the voice service. Your settings have been saved.”

Avoid:
- “AI fully trained!” when only a prompt or retrieval index was saved.
- “100% secure,” “fully compliant,” or “zero risk.”
- “Your assistant is live” before the real worker and voice pathway are healthy.
- Artificial urgency, fake countdowns, hidden recurring billing, guilt-inducing upgrade prompts, or misleading scarcity.

### 1.4 Target users

**Primary: Insurance owner/operations manager**
- Needs quick setup, missed-call reduction, reliable routine answers, and clear escalation.
- May not understand AI infrastructure.
- Wants a safe way to trial the assistant before enabling real customers.

**Secondary: Front-desk/call-center staff**
- Needs recent calls, clear statuses, summaries, approvals, and the ability to take over.

**Compliance/authorized reviewer**
- Needs to see what action was requested, evidence and payload, why approval is needed, who approved/rejected it, and whether the mutation actually completed.

**Technical administrator**
- Needs provider health, integration settings, logs, identity and permissions, and diagnostic details—but these should not dominate the ordinary user experience.

---

## 2. Design direction: bright, calm, credible

### 2.1 Overall visual language

Replace the current mostly black/navy dashboard with a **bright enterprise workspace**:

- Warm off-white/light-gray canvas.
- White content surfaces.
- Dark ink text with high contrast.
- Deep navy for primary brand/strong anchors.
- SaveCall cyan/teal as the main interactive accent.
- Green only for verified success/healthy status.
- Amber for needs-attention/review.
- Red for errors, rejected actions, or critical warnings.
- Subtle borders rather than heavy shadows.
- Spacious but efficient content layouts.
- Rounded corners used consistently, not on every element excessively.
- Small purposeful icons paired with text labels.
- Motion only where it explains progression or state.

The interface should feel modern and welcoming, not childish or toy-like. Gamification applies to **setup progress and safe experimentation**, not to claims, approvals, policy edits, or other consequential work.

### 2.2 Suggested design tokens

Use existing tokens if the repo already has a coherent system; otherwise introduce semantic CSS variables/design tokens. Keep tokens centralized.

```css
:root {
  --sc-canvas: #F6F8FB;
  --sc-surface: #FFFFFF;
  --sc-surface-soft: #F9FAFC;
  --sc-border: #E3E8EF;
  --sc-border-strong: #CBD5E1;
  --sc-text: #172033;
  --sc-text-secondary: #526174;
  --sc-text-muted: #738195;
  --sc-brand: #087E8B;
  --sc-brand-hover: #066873;
  --sc-brand-soft: #E5F6F7;
  --sc-brand-strong: #075B66;
  --sc-success: #16794A;
  --sc-success-soft: #E8F7EE;
  --sc-warning: #9A5B00;
  --sc-warning-soft: #FFF4D9;
  --sc-danger: #B42318;
  --sc-danger-soft: #FEECEB;
  --sc-info: #2457A7;
  --sc-info-soft: #EAF2FF;
  --sc-focus: #168AAD;
  --sc-shadow-card: 0 1px 2px rgba(16, 24, 40, .04), 0 4px 16px rgba(16, 24, 40, .03);
  --sc-radius-sm: 8px;
  --sc-radius-md: 12px;
  --sc-radius-lg: 16px;
  --sc-radius-xl: 22px;
}
```

These are starting values, not permission to introduce inconsistent hard-coded colors across files. Match the final contrast using accessible color contrast checks.

### 2.3 Typography

- Use the current supported UI font if it is legible and renders consistently; otherwise use a neutral system sans-serif.
- Page title: 24–30 px desktop, 22–26 px mobile, semibold.
- Section title: 16–19 px semibold.
- Body: 14–16 px.
- Supporting text: 12–14 px, never too pale to read.
- Avoid making core values, statuses, and table labels tiny.
- Use tabular numerals for counts, currency, and durations when available.
- Reserve monospace for technical IDs, room IDs, and diagnostic payloads.

### 2.4 Layout and spacing

- Prefer a max-width content region of roughly 1200–1360 px for dense workspaces.
- Use a 4/8 px spacing scale consistently.
- Content cards should have enough padding to create separation but should not waste half a screen on a single row.
- Do not stretch tiny tables edge-to-edge when their content is small; align the container to the page grid.
- Use one clear primary action per screen, with secondary actions visually quieter.
- On desktop, use a compact left navigation and a clear page header. On mobile, switch to a drawer/bottom-navigation pattern appropriate to the existing router and component system.
- Avoid excessive nested cards. A section can be a section without another card around every element.

### 2.5 Motion and animation

Keep transitions short, smooth, and functional:
- Page/step transition: approximately 180–280 ms.
- Button hover/focus: 120–180 ms.
- Progress transitions should animate the filled segment, not the entire page.
- Use a restrained one-time SaveCall mark animation at onboarding entry: a gentle outline/stroke reveal or subtle glow, then move to content quickly.
- Do not gate the app behind a long cinematic animation or block navigation while decorative effects play.
- Provide `prefers-reduced-motion` support. Essential states must be communicated through text and icons, not animation alone.
- Never use a fake call connection animation to mask a real connection failure.

---

## 3. Information architecture

Keep the top-level navigation short and task-oriented. Do not expose every implementation detail as a permanent menu item.

### Primary navigation

1. **Home** — high-level operational snapshot and next best action.
2. **AI Assistant** — identity, voice, behavior, skills, knowledge readiness, and testing.
3. **Calls** — recent/live/completed sessions, transcripts, outcomes, and handoffs.
4. **Policies** — insurance policy records and lookups.
5. **Claims** — intake/status and claim records.
6. **Approvals** — actions requiring an authorized human decision.
7. **Knowledge** — sources, extracted facts, review, and retrieval health.
8. **Activity** — security and business audit history; restrict details by role.

Place company profile, team/permissions, integrations, usage/plan, privacy/data retention, and advanced diagnostics under **Settings**. If the existing app has a separate audit route, preserve the route and permissions even if the navigation label becomes “Activity.”

### Navigation principles

- Keep route paths stable where possible; redesign page internals without breaking deep links.
- If routes need to move, add redirects and test old links.
- Hide or disable menu entries based on verified permissions rather than merely hiding buttons in the page.
- Do not remove functionality just because it is not in the first viewport.
- Insurance-specific navigation should be contextual to an insurance workspace/module; reusable voice-agent configuration should stay generic.

---

## 4. Onboarding: guided, short, and honest

### 4.1 Goals

Onboarding should get the user to a **working test conversation** as quickly as possible while saving company/workspace settings correctly and establishing required consent. Do not force a user to complete telephony, billing, or advanced model settings before they can test the assistant.

Use a persistent but unobtrusive step indicator, such as `1 of 5`, with Back, Continue, and Skip where safe. Preserve progress if the user refreshes or leaves, subject to the current authentication/session model.

### 4.2 Proposed first-run flow

**Step 0 — SaveCall opening animation**
- Bright, clean page with a simple SaveCall mark and the product line: “A more reliable first response for every customer call.”
- Animate the mark once; transition promptly to onboarding.
- Show no misleading technical claims or live status.
- Include a reduced-motion fallback.
- If the user already completed onboarding, skip this and route them to Home.

**Step 1 — Choose what to set up**
Title: `What would you like to set up?`
Subtitle: `You can change this later. Your choice helps us prepare the right workspace.`

Present two clear, selectable cards:

1. **Insurance Operations** (recommended for insurance teams)
   - “Manage policies, claims, approvals, and customer calls in one workspace.”
   - Opens the insurance-oriented workspace with its existing modules.
2. **Voice Assistant Studio**
   - “Build and test a voice assistant before connecting it to customer calls.”
   - Opens the assistant-first setup path; insurance features remain available if selected/configured.

These are workspace modes, not separate accounts or isolated backend products. A user must be able to switch context later. Persist the chosen default workspace/mode in the database.

If product strategy later requires a business-use-case selection, show it as a following question rather than adding six competing platform cards on the first step.

**Step 2 — Personalize the workspace**
Title: `Let’s set up your workspace`
Fields:
- Your display name (optional unless required by actual product logic).
- Company/organization name (required to activate a workspace).
- Business type, defaulted to Insurance when coming from Insurance Operations.
- Preferred interface language (English initially; only offer Hindi or other languages if the UI has actually been localized).
- “How did you hear about SaveCall?” (optional).

Referral source options should include:
- Search engine
- YouTube/video
- LinkedIn or other social media
- Colleague or referral
- University/research
- Event/webinar
- Online article/blog
- Other
- Prefer not to say

If `Other` is selected, reveal an optional free-text field with a short character limit. Never require a marketing attribution answer to access the product.

**Step 3 — Privacy, terms, and consent**
Use brief, human-readable summaries with links to the actual privacy notice and terms. Do not invent legal wording or claim compliance that has not been assessed.

Required acknowledgements should exist only where the product/legal requirements justify them. Keep these separate:
- Acceptance of applicable terms.
- Acknowledgement of the privacy/data-processing notice.
- Optional marketing/newsletter consent, unchecked by default.
- Optional product analytics consent if needed by the product and not covered by another lawful basis.

Explain, in plain language, what data SaveCall stores and why: account/workspace setup, preferences, usage/diagnostics, configuration, and—when the user enables calling—call metadata and any configured transcript/recording data. Link to retention/deletion settings when implemented.

Do not add an arbitrary “I am over 18” checkbox merely to copy another product's onboarding. If age or authority confirmation is actually required for the product, implement it with reviewed copy and the appropriate audience model. For business workspace creation, prefer an accurate statement such as “I am authorized to configure this workspace for the organization” if the product's policy requires it.

**Step 4 — Prepare your assistant**
Title: `Meet your insurance assistant`
- Assistant name, with a useful default that the user can edit.
- Tone/persona presets such as Professional & Empathetic, Concise, Friendly, and Formal/Compliance-focused.
- Supported language selection (only options actually supported by the configured runtime).
- Greeting preview.
- Clear notice: preview/test mode does not contact real customers or change live policy records.

Avoid asking for every possible parameter. Use safe defaults and a later “Advanced settings” section.

**Step 5 — Add business knowledge (optional now)**
Title: `Help your assistant answer accurately`
Provide easy entry points:
- Add a website URL.
- Upload supported PDF/text documents.
- Add common questions and answers.
- Start with an example template clearly marked as example content.
- Skip for now.

Explain the process accurately: “SaveCall extracts information and makes approved content available to the assistant.” Do not say the base model is retrained unless fine-tuning truly occurs. Show queued/processing/review-required/ready/error statuses based on actual backend results.

Never mix a shared example template with a tenant's production knowledge without making its example status obvious. Unreviewed extracted facts must not silently become authoritative content for consequential insurance responses.

**Step 6 — First test conversation**
Show a friendly but restrained assistant test area.
- Button: `Start a test conversation`.
- Visible microphone permission explanation.
- Real connection state, real transcripts, and real audible response state.
- Suggested test prompts: “What can you help customers with?”, “How would you look up a policy?”, “What happens if you do not know an answer?”
- Do not allow live claims/policy modifications in test mode.
- If the required worker/provider is unavailable, show a clear setup error and a retry/check-configuration action. Do not spin indefinitely or label the assistant “Ready.”

**Step 7 — Free start and launch checklist**
Show the free tier and usage allowance clearly before the user makes any plan choice.
- Make `Start free` or `Continue with free credits` the primary button.
- Include a visible `Skip for now` option for optional configuration and pricing exploration.
- State whether a payment method is required. Default assumption: not required for free onboarding.
- Explain what consumes credits, what is included, what occurs when credits reach zero, and whether the user can top up or upgrade. These details must match the implemented billing/usage ledger.
- Do not make the user choose a paid plan to access a demo test call.

Finish with a checklist rather than a celebratory wall of badges:
- Workspace created.
- Assistant configured.
- Knowledge source added (optional).
- Test call completed (only when actually completed).
- Live calling configured (only when actually configured).

Use `Ready to test`, `Needs setup`, and `Ready for controlled deployment` only when backed by explicit readiness checks.

### 4.3 Resume and skip behavior

- Optional steps may be skipped safely.
- Required account/security steps may not be skipped if they are genuinely mandatory; explain why.
- Save partial onboarding progress server-side for authenticated users.
- Re-entering onboarding should resume incomplete steps rather than duplicate a company, agent, or subscription.
- Provide a route from the main app to finish setup later.
- Make “Skip” mean skip—not silently create paid billing, enable live calls, or consent to marketing.

---

## 5. Honest free credits and pricing UX

### 5.1 Product principle

The free tier should reduce fear and help users experience real value before paying. Use ethical product psychology: reduce uncertainty, show progress, make reversal easy, and demonstrate a genuine outcome. Do not use dark patterns or emotional pressure.

### 5.2 Pricing screen structure

Header:
- `Try SaveCall with free credits`
- `Test the assistant and review its answers before connecting real customer calls.`

Then a compact usage card showing:
- Included free credits or minutes.
- Current balance.
- Estimated usage cost per test action only if calculation is reliable.
- What consumes usage.
- Whether credits expire.
- What happens when the allowance runs out.
- Whether a card is required.

Use configurable plan data, not hardcoded numbers in the React component. The real allowance and pricing must be approved and based on current infrastructure/provider costs before release.

Possible plans are conceptual until product/finance decisions are made:
- **Free trial:** limited usage to test and evaluate; no live customer deployment by default.
- **Starter:** one assistant and a modest monthly usage allocation for a small insurance team.
- **Team:** more usage, staff access, and workflow controls.
- **Business:** larger volumes, integrations, governance, and support.

Do not publish invented rupee prices or unsupported concurrency claims. All displayed prices must specify currency, billing period, included usage, overage rules, tax handling where relevant, and cancellation terms.

### 5.3 Button hierarchy

Primary: `Start free with X credits` (replace X only from actual plan configuration).  
Secondary: `Compare plans`.  
Tertiary: `I'll decide later`.

Do not make paid upgrade the most visually prominent choice for a new user. Do not hide the free option beneath a carousel. If billing is not yet implemented, mark paid plans as `Coming soon` or keep them out of the purchase path; do not simulate a subscription.

### 5.4 Usage states

- Normal: “You have 18 of 20 test minutes remaining.” (example format only; values from database.)
- Low balance: “You have 3 minutes left in your free test allowance.”
- Exhausted: “Your free allowance has been used. Your assistant settings are saved. Add usage or choose a plan to continue testing.”
- Billing service unavailable: do not decrement a fake balance; show a temporary status and retry.

Make the consumption model understandable and avoid surprising bills or automatic paid conversion.

---

## 6. Home dashboard: small-business-first, not call-center-giant

The current dashboard is visually large and has multiple oversized sections. Replace it with a compact, prioritized workspace aimed initially at an insurance team with simple operational needs.

### 6.1 Desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Good morning, [Name]                          [Test assistant]       │
│ [Company] · Insurance Operations                [Setup: 3 of 5]      │
├──────────────────────────────────────────────────────────────────────┤
│ Assistant status: Testing / Ready / Needs attention                   │
│ [Short explanation]                    [Open assistant setup →]       │
├──────────────────────────────────────────────────────────────────────┤
│ Calls today    Handled by assistant    Needs review    Claims started │
│    real count          real count          real count       real count│
├──────────────────────────────────┬───────────────────────────────────┤
│ Recent calls                     │ Needs your attention              │
│ compact list, 4–6 rows            │ pending approvals/errors/setup   │
│ View all                         │ Open queue                         │
├──────────────────────────────────┴───────────────────────────────────┤
│ Optional: recent activity / knowledge readiness                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Dashboard rules

- Keep four or fewer headline metric cards in the first viewport.
- Every metric must use real tenant-scoped data and have a clear time range.
- If no calls exist, show an empty state and an honest next action, not zero-heavy intimidating cards.
- If provider/worker is unhealthy, make that visible at the top, with a practical action.
- Show only 4–6 recent calls; use a “View all calls” link for the complete registry.
- Prioritize pending approvals and failed operations over decorative analytics.
- Avoid huge empty panels, giant page headings, dense tables, and redundant status chips.
- Do not show advanced infrastructure metrics to ordinary business users by default.
- Use a clear empty state: “No calls yet. Test your assistant to see the conversation and outcome here.”

### 6.3 Use human-readable call outcomes

Prefer:
- Answered question.
- Policy information provided.
- Claim intake started.
- Sent to staff.
- Action needs review.
- Could not complete.

Technical statuses can be accessible in a details view, but should not dominate the list.

### 6.4 Metric definitions

Document and test definitions. For example:
- **Calls today:** sessions started in the tenant's defined local timezone during the current day.
- **Handled by assistant:** sessions where a real assistant participant processed at least one user turn—not merely room creation.
- **Resolved:** calls with a verified final outcome according to explicit criteria.
- **Needs review:** pending approvals plus failed/unresolved cases, avoiding double-counting where possible.
- **Claims started:** claim records actually persisted, not a model's spoken intention.

Do not label `all sessions` as “resolved” without a verified outcome field.

---

## 7. Assistant Studio: simple setup first, advanced controls later

Replace the current overloaded Settings experience with an assistant workspace structured into clear sections.

### 7.1 Main Studio layout

Header:
- Assistant name and role.
- Real status: Draft, Testing, Ready for controlled use, Paused, or Needs attention.
- Primary action: `Test assistant`.
- Secondary action: `Save changes` or autosave indicator where genuinely supported.

Tabs/sections:
1. Overview
2. Voice & language
3. Knowledge
4. Skills & rules
5. Test conversations
6. Deployment

Do not mix carrier address/phone details, Clerk identity mappings, knowledge data, and voice persona into one long form.

### 7.2 Voice & language

Fields:
- Assistant name.
- Role/purpose in plain language.
- Language support that is actually available.
- Voice selection backed by the configured TTS provider.
- Communication style preset.
- First greeting.

Provide a short audio preview only if an actual TTS preview is working. Label generated preview audio as a preview; do not imply a real call is underway.

Show validation, autosave, and unsaved-changes state accurately.

### 7.3 Knowledge setup

Provide a simple summary:
- Number of sources.
- Sources needing review.
- Approved/available knowledge items.
- Last successful processing time.
- Most recent ingestion errors.

Provide actions: Add website, Upload document, Add FAQ, Review facts.

Use appropriate source-specific progress states such as `Queued`, `Processing`, `Needs review`, `Available to assistant`, and `Failed`. These states must correspond to persisted backend status.

### 7.4 Skills and rules

Present each skill as an understandable capability with a short description and a safe activation state.

Insurance examples:
- Answer approved policy questions.
- Look up policy status.
- Record a claim enquiry.
- Request a nominee update for staff approval.
- Transfer to an agent.

For each skill, show whether it is configured, which permission/connection it needs, and whether a human approval is required.

Do not expose a dangerous switch that allows the LLM to update insurance records directly. Separate read-only lookup, record creation, and sensitive mutations.

### 7.5 Deployment readiness

Provide a checklist with explicit status sources:
- Assistant settings saved.
- At least one approved knowledge source (if required by configured role).
- STT provider healthy.
- LLM provider healthy.
- TTS provider healthy.
- LiveKit reachable.
- AI worker available.
- Human handoff destination configured when necessary.
- Sensitive actions have confirmation/approval rules.

The app may enter `Testing` when some deployment checks are incomplete. It must not enter `Live` until required checks genuinely pass. Keep live deployment as an explicit user action.

---

## 8. Insurance workspace redesign

### 8.1 Policies

- Page title: `Policies`.
- Subtitle: `Find policy details for customers in your authorized workspace.`
- Search by policy number, customer, or plan.
- Compact table on desktop; cards or a responsive table on mobile.
- Show customer, policy number, policy type, status, renewal/due date, and relevant summary.
- Use real stored amounts and dates; show `—` for unavailable fields, not a misleading zero.
- Open a side panel/detail page for full information rather than crowding the table with every column.
- Never expose another tenant's records through search, sort, pagination, aggregate counts, or detail routes.

### 8.2 Claims

- Title: `Claims`.
- Primary action: `Record claim enquiry` only if that operation is implemented and authorized.
- Show claim number, policy/customer, submitted date, estimated amount where available, status, and next action.
- Distinguish `Enquiry recorded`, `Submitted`, `Under review`, `Approved`, `Rejected`, and `Paid` only if the backend state machine supports them.
- A recorded enquiry must not be represented as an approved/paid claim.
- Missing amount must show `Not estimated` or `—`, not ₹0 unless zero is actually stored as a valid amount.

### 8.3 Approvals

Make this screen the most deliberate interface in the app; it is a consequential action surface, not a gamified task list.

Each request should show:
- Action and target record.
- Customer/policy context the reviewer is authorized to see.
- What will change: before/after values where available.
- Why approval is required.
- Requested by: AI assistant or staff, with call reference where available.
- Risk classification based on defined rules.
- Approve and Reject actions with required confirmation for meaningful mutations.
- Reason field where rejection rationale is needed.
- Current status, actor, decision time, and outcome.

On approval, the UI must distinguish:
- Decision recorded.
- Business mutation applied.
- Business mutation failed.

These are not the same status. Do not show “Approved successfully” if the target mutation or required audit write failed. Use idempotent server-side workflows and concurrency safeguards.

### 8.4 Calls

Default view should show recent completed calls and calls requiring attention. Avoid an enormous registry of every room in the first screen.

Columns/fields:
- Start time.
- Customer/caller label appropriate to verification state.
- Outcome.
- Duration.
- Language.
- Human handoff / needs-review indicator.
- View summary.

In call details, use a readable conversation timeline with:
- Speaker.
- Transcript content when stored and authorized.
- Tool action and result.
- Evidence/source references where available.
- Approval/handoff events.
- Errors, if any.

Do not mark an AI participant as “active” purely because a database row was left open. Reconcile lifecycle state with real connection/disconnection events.

### 8.5 Activity/Audit

Ordinary staff should see a readable activity view; administrators/compliance reviewers can access more detailed audit data according to permissions.

The system may describe logs as tamper-evident only if the implementation has verifiable integrity controls. Do not call a normal database table “immutable” unless updates/deletes and privileged modifications are demonstrably controlled.

Keep raw payloads collapsed by default, redact sensitive values where appropriate, and preserve the required investigation/audit detail for authorized reviewers.

---

## 9. Data model and persistence contract for onboarding

First inspect the current schema and reuse existing profile, tenant, settings, and consent tables where suitable. Do not create duplicate tables simply to match this document. Any migrations must be additive, reviewed, idempotent where possible, and tested against the current schema.

### 9.1 Data to persist

**Workspace profile** (per tenant/workspace):
- `display_name` or organization display label if applicable.
- `workspace_mode` such as `insurance_operations` or `voice_assistant_studio`.
- `business_type` such as `insurance`.
- `preferred_language`.
- `onboarding_status`.
- `onboarding_step` or equivalent resumable state.
- `created_at`, `updated_at`.

**Referral attribution:**
- `referral_source` from an enumerated set.
- `referral_source_other` only if `Other` is selected.
- Optional first-touch/campaign attribution if the app actually collects it with an appropriate privacy notice.
- Do not store raw browser fingerprints or unrelated tracking identifiers for attribution.

**Consent records:**
- Consent/acknowledgement type.
- Whether accepted/declined.
- Policy/document version shown.
- Timestamp.
- Actor/user ID associated through trusted authentication.
- Tenant/workspace context when applicable.
- Evidence needed to audit the decision, without storing more data than necessary.

Marketing consent must be separate and optional. Do not use a single `consent=true` field to mean acceptance of terms, privacy acknowledgement, analytics, and marketing all at once.

**Plan/usage:**
- Plan identifier from server-controlled configuration.
- Usage ledger or meter source.
- Credit grant and balance derived from ledger where practicable.
- Grant/usage timestamps and reason.
- Payment/subscription provider ID only after a real integration exists.

Do not trust a credit balance posted by the client. Credit grants and debits must be server-controlled, tenant-scoped, idempotent, and auditable.

### 9.2 Security and privacy rules

- Derive user and tenant identity from trusted server-side auth/session/membership resolution.
- Do not allow a client to assign itself a privileged role, tenant ID, paid plan, unlimited balance, or consent timestamp.
- Validate all enumerated fields and lengths on the server.
- Enforce database RLS/policies where available.
- Use minimal retention for onboarding attribution and diagnostics.
- Provide ways to update profile/consent preferences and request deletion where the product supports it.
- Do not silently enroll users in promotional email or outbound calling campaigns.

---

## 10. Empty, loading, error, and success states

Every data-backed screen must implement all applicable states.

### Loading
- Use small skeletons that resemble the eventual content.
- Avoid blank screens and endless spinners.
- If a request takes too long, provide retry/diagnostics.

### Empty state
Explain why there is no data and offer the next useful action.

Examples:
- Policies: “No policies found for this search.” plus clear search reset.
- Calls: “No calls yet. Test your assistant to see a conversation here.”
- Knowledge: “Add an FAQ, website, or document to help your assistant answer accurately.”
- Approvals: “Nothing needs your review right now.”

### Error state
- Human-readable message.
- Retry where safe.
- Do not leak stack traces, SQL, provider secrets, or tokens.
- Do not turn errors into fake empty states.
- Preserve user-entered form data where safe.

### Success state
Use success only after the server confirms the relevant durable operation. For long-running ingestion, success may mean `Import queued`; it must not mean `Knowledge ready` until processing completes.

---

## 11. Accessibility and responsive behavior

- Meet WCAG 2.2 AA as the design target; actually check contrast, focus visibility, keyboard navigation, and accessible names.
- All inputs have persistent visible labels; do not rely on placeholders.
- Every button and interactive card is keyboard accessible with visible focus states.
- Selection cards announce their selected state to assistive technology.
- Errors are programmatically associated with inputs and explained in text.
- Statuses are conveyed by both color and text/icon.
- Provide reduced-motion behavior.
- Use semantic headings and landmarks.
- Voice controls must work by keyboard and have clear permission/error messages.
- Support widths down to small mobile screens without clipped tables or inaccessible horizontally overflowing forms.
- Use a side panel on desktop only where it does not block core content; on mobile, turn it into a full-screen detail sheet/page.

---

## 12. Component inventory

Before introducing new components, check for existing equivalents and consolidate rather than creating near-duplicates.

Recommended shared primitives:
- `AppShell` / `Sidebar` / mobile navigation.
- `PageHeader` with title, description, and actions.
- `ProgressSteps` for onboarding.
- `SelectableOptionCard` with icon, title, description, selected and disabled states.
- `StatusBadge` with a typed status map.
- `MetricCard` for the small KPI set.
- `EmptyState`.
- `ErrorState` / `InlineAlert`.
- `LoadingSkeleton`.
- `ConfirmDialog`.
- `FormField` / `FormSection`.
- `UsageAllowanceCard` driven by server data.
- `ReadinessChecklist` driven by health checks.
- `TranscriptTimeline`.
- `ApprovalDiff` for before/after mutations.
- `SourceStatusRow` for knowledge ingestion/review.
- `AuditEventDetails` with collapsed/redacted payloads.

Components must not embed insurance business logic unless explicitly part of the insurance module. Shared components should receive typed data and callbacks rather than importing database clients directly.

---

## 13. Interaction rules

- Use a clear primary button for each step; avoid multiple competing high-emphasis CTAs.
- Disable submission only when required fields are invalid or an operation is actually in progress. Explain why when disabled.
- Prevent double submission for operations such as workspace creation, knowledge import, approval, and plan selection.
- Autosave only if the current data layer safely supports it; otherwise use an explicit Save action and show saved/unsaved state.
- Use dialogs for destructive or consequential actions. The dialog must name the exact action and target.
- For a sensitive policy change, show the proposed change and the fact that approval is pending; do not make the customer believe the change is already effective.
- Search should be debounced where appropriate, abort stale requests, and preserve tenant scoping.
- Filtering and pagination must be applied server-side for large datasets and must not accidentally bypass authorization.
- When switching workspace mode, do not delete data or change permissions. It is a presentation/default workspace choice unless explicitly designed otherwise.

---

## 14. Implementation mapping to the current application

The supplied screenshots show current routes/areas resembling:
- `/dashboard`
- `/policies`
- `/claims`
- `/change-requests`
- `/calls`
- `/audit`
- `/settings`
- `/voice`
- a knowledge-training/review route

The authenticated route files previously discussed include:
- `src/routes/_authenticated/dashboard.tsx`
- `src/routes/_authenticated/claims.tsx`
- `src/routes/_authenticated/change-requests.tsx`
- `src/routes/_authenticated/calls.tsx`
- `src/routes/_authenticated/audit.tsx`
- `src/routes/_authenticated/train.tsx`
- `src/lib/insurance.functions.ts`
- `src/lib/train.functions.ts`
- `src/routes/api/voice/session.ts`
- `src/routes/api/voice/chat.ts`

These paths may have changed. Verify actual names before edits.

### UI/data separation

- Keep DB access and authorization in the existing server-side data/function layer.
- UI components should use typed loaders/actions/functions rather than directly querying unrestricted tables.
- The Home dashboard must call real tenant-scoped metrics.
- Onboarding saves must use an authenticated, server-validated mutation.
- Workspace mode, referral source, onboarding progress, consent, and plan usage must have durable persistence if shown as saved state.
- The free-credit UI must consume a server-reported balance and real usage ledger or remain clearly marked as not yet available.
- Existing approval mutations and audit behavior must continue to pass regression tests.

---

## 15. Phased delivery plan

### Phase 0 — Inventory and safety baseline

Deliver:
- Current route and component map.
- Current design token/component inventory.
- Schema map for tenants, users, preferences, onboarding, consent, plans/credits, knowledge, policies, claims, approvals, calls, and audit events.
- List of current hardcoded values and fake statuses.
- Baseline command/test results.

Do not redesign all pages before this inventory is complete.

### Phase 1 — Design foundations and app shell

Implement:
- Light design tokens and typography.
- Shared buttons, fields, cards, status badges, alerts, dialogs, and page header.
- Responsive bright `AppShell`/navigation.
- Preserve routing and existing data behavior.

Acceptance:
- Current major pages render in the new theme.
- No broken routes or removed controls.
- Keyboard focus and color contrast are checked.
- TypeScript/build remain clean.

### Phase 2 — Onboarding flow and persisted profile

Implement:
- Opening animation with reduced-motion support.
- Workspace mode selection.
- Organization/profile fields.
- Referral-source question and optional `Other` value.
- Terms/privacy/consent UI using reviewed document links and separate optional marketing consent.
- Resumable progress.
- Server-side persistence and RLS/authorization review.

Acceptance:
- Refresh does not duplicate or lose completed work.
- Skip has documented semantics.
- Referral and consent values are persisted correctly.
- No client-controlled tenant assignment or role escalation.

### Phase 3 — Honest free onboarding and trial allowance

Implement:
- Free-start pricing card.
- Plan comparison if actual plan configuration exists.
- Explain usage units and exhaustion behavior.
- Persist server-controlled allowance/ledger if the required usage accounting is approved and implemented.

Acceptance:
- No invented prices or balances.
- No silent payment-method collection or paid conversion.
- A test call does not bypass allowance controls.
- Failed requests do not charge or decrement usage incorrectly.

### Phase 4 — Home dashboard simplification

Implement the compact dashboard in Section 6 with real data.

Acceptance:
- Four or fewer headline metrics.
- Real tenant-scoped metrics and explicit date window.
- Useful first-run empty state.
- Provider/worker failure state is honest.
- Recent calls and approvals have working deep links.

### Phase 5 — Assistant Studio and knowledge UX

Implement the sectioned Studio, knowledge status, skill/rule configuration, testing, and deployment-readiness checks.

Acceptance:
- No false “trained” or “live” labels.
- Actual provider health/readiness state.
- Knowledge source statuses reflect persisted processing state.
- Consequential actions are locked behind approved server-side policy.

### Phase 6 — Insurance workflow polish

Refine policies, claims, approvals, calls, and activity according to Section 8.

Acceptance:
- Existing data queries and mutations still work.
- Approval target mutations and audit events pass tests.
- Missing amounts/status values are not misrepresented.
- Every list/detail/action remains tenant-scoped and permission-controlled.

### Phase 7 — Design QA, accessibility, and release

Run desktop/tablet/mobile QA, accessibility pass, regression tests, and live integration checks. Remove debug UI and unresolved misleading copy.

---

## 16. Test and release requirements

Run existing test scripts discovered from the package manifest. At minimum, where supported by the repository:

```bash
npx tsc --noEmit
npm run build
```

Run relevant regression and browser tests. Do not assume these two commands verify database security or real voice behavior.

### Specific tests

**Onboarding**
- Step selection and Back/Continue behavior.
- Skip and resume behavior.
- Required and optional validation.
- Referral source enum and `Other` field validation.
- Consent separation and unchecked marketing default.
- Persistence after refresh.
- Duplicate workspace creation prevention.

**Pricing/credits**
- Server-authoritative balance.
- Idempotent grant/charge behavior.
- No unauthorized plan/credit changes.
- Exhausted balance behavior.
- No decrement on a failed/unstarted test session unless policy explicitly says otherwise and is documented.

**Dashboard**
- Empty tenant.
- Tenant with calls/claims/approvals.
- Cross-tenant access attempts.
- Missing fields.
- API/provider unavailable.

**Insurance workflows**
- Claim values and statuses render correctly.
- Approval decisions and target mutations are consistent.
- Duplicate approval requests do not cause duplicate mutations.
- Audit history reflects real outcomes.

**Voice**
- UI reflects actual connection, worker readiness, microphone, transcript, and output audio state.
- Errors do not spin indefinitely.
- Failed calls are not counted as resolved.

### Final report

After each phase, summarize:
- Files changed.
- Components/routes affected.
- Database migrations and security policy changes.
- Tests actually run and their output.
- Unverified items and current blockers.
- Any product decisions still requiring approval.

Use only `PASS`, `FAIL`, and `NOT VERIFIED` for acceptance status. Never claim “production ready” only because the app builds.

---

## 17. Definition of done

The redesign is successful when a first-time insurance user can create a workspace, understand their privacy choices, start with the free trial allowance, configure an assistant, add or skip knowledge, test a real conversation, and reach a simple dashboard without technical knowledge.

A staff member can find a policy, review a claim enquiry, approve/reject a sensitive request, inspect a call result, and understand what actually happened.

The experience is bright, approachable, and lightly gamified through progress and meaningful milestones—but serious actions remain deliberate, accessible, auditable, and secure.

The UI is connected to real backend state. No critical workflow is a decorative mock. The existing insurance module works today, while the architecture remains able to support other business verticals later.

**Start with Phase 0, then implement sequentially. Do not attempt an uncontrolled all-at-once rewrite.**
