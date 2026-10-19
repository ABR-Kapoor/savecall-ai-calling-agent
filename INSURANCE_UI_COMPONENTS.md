# SaveCall Insurance UI Components & Visual Reference

**Document type:** Companion design specification  
**Applies to:** Existing SaveCall insurance workspace, staff dashboard, policy/claim/approval views, call history, customer voice experience, and reusable insurance UI components  
**Use with:** `design.md`, `AGENTS.md`, repository README, and existing architecture/security instructions  
**Priority:** Visual and interaction specification; it does not supersede product, security, or data-integrity requirements.

---

## 0. Instructions to the IDE

Read this document fully before modifying UI components. Read `design.md` as the primary product/visual direction and this document as a focused component reference for insurance-specific surfaces.

Inspect the current application and implement the ideas as **native SaveCall components**, using the existing framework, routing, icon system, database types, and CSS conventions. Do not create a second design system or duplicate existing components. Do not replace genuine database behavior with sample records.

Use the linked insurance UI reference and the user-provided screenshots for broad design cues only: reassuring teal surfaces, white space, compact policy summaries, service-category tiles, visual claim progress, readable history, and rounded-but-restrained cards. Do not reproduce the reference pixel-for-pixel, reuse its proprietary illustrations, or convert the staff dashboard into a consumer mobile app.

The current product is an **insurance operations workspace powered by SaveCall's voice agent**. It should feel simple and trustworthy for staff while keeping insurance-sensitive actions explicit and auditable.

### Non-negotiable implementation rules

1. Audit the existing app, routes, schema, tokens, and components before editing.
2. Preserve working policies, claims, approvals, call sessions, audit logs, Clerk, InsForge, LiveKit, RAG, tenant scoping, and verified mutations.
3. Real values must come from authenticated, tenant-scoped queries. Never invent metrics, customer details, call statuses, amounts, dates, or policy states.
4. A status badge must reflect a persisted business state, not a visual guess.
5. Important actions need a clear label, appropriate confirmation, server-side authorization, and a visible outcome.
6. Every component must have loading, empty, error, and normal states where applicable.
7. Build mobile behavior intentionally; a desktop table must not simply overflow on narrow screens.
8. Do not claim that a claim was paid, a policy was changed, or a voice call succeeded until the underlying operation is verified.
9. Implement in small phases. Run type checks, tests, and the production build. Report what was actually verified.

---

## 1. Design goal

Borrow the best **component ideas** from the insurance app reference while adapting them to SaveCall's staff-facing workflow:

- A calm teal/green identity that signals stability and protection.
- White or warm-neutral surfaces instead of the current heavy dark command-center look.
- Compact summary cards that make insurance records easier to scan.
- Category tiles for policy types when choosing or filtering by insurance product.
- A clear claim timeline that explains the current step and the next expected action.
- Policy cards that summarize coverage without making users open every record.
- Lightweight history charts that support decisions instead of dominating the screen.
- Friendly empty and success states that reduce anxiety without being falsely reassuring.
- A mobile-friendly customer voice experience with obvious call and microphone controls.

The staff product must remain **operational, not promotional**. Avoid marketing gradients everywhere, oversized hero art, gamified financial claims, and decorative cards that hide important information.

### The product should communicate

- “I can understand this record quickly.”
- “I know what is happening and what to do next.”
- “Sensitive changes are controlled.”
- “The displayed data is real.”
- “The AI assists staff; it does not bypass staff responsibility or approval.”

---

## 2. Visual system

Use these as suggested tokens. First inspect the current CSS variables/theme system; map these values into the existing system rather than adding duplicate variables.

### 2.1 Color tokens

| Token | Suggested value | Usage |
|---|---|---|
| `--sc-page` | `#F6F8F7` | Main app canvas; very light neutral with a slight green cast |
| `--sc-surface` | `#FFFFFF` | Cards, tables, dialogs, panels |
| `--sc-surface-subtle` | `#F0F5F3` | Quiet inset panels, table hover states, grouped metadata |
| `--sc-border` | `#DDE6E2` | Card borders, separators, form outlines |
| `--sc-text` | `#172B27` | Primary readable text |
| `--sc-text-secondary` | `#5E716B` | Supporting copy, labels, descriptions |
| `--sc-text-muted` | `#7D8B86` | Secondary metadata only; maintain contrast |
| `--sc-primary` | `#176B5D` | Main brand actions, selected navigation, key chart series |
| `--sc-primary-hover` | `#115548` | Hover/active primary control |
| `--sc-primary-soft` | `#E3F2ED` | Selected/quiet teal panels |
| `--sc-primary-ink` | `#0F493F` | Text on pale teal surfaces |
| `--sc-info` | `#2563A6` | Informational state, links, non-risk status |
| `--sc-info-soft` | `#EAF2FC` | Informational backgrounds |
| `--sc-success` | `#16794B` | Verified success or completed states only |
| `--sc-success-soft` | `#E7F6EC` | Success pills and callouts |
| `--sc-warning` | `#946200` | Due soon, needs attention, pending review |
| `--sc-warning-soft` | `#FFF4D6` | Warning backgrounds |
| `--sc-danger` | `#B42332` | Failed, rejected, overdue, destructive action |
| `--sc-danger-soft` | `#FCEBEC` | Error backgrounds |
| `--sc-focus` | `#2B83D6` | Visible keyboard focus ring |

Do not use green to mean “everything is safe”. Use success green only when the persisted state supports it. Use warning/orange for pending work and red for failures, rejected requests, or urgent risk. Never communicate status through color alone; always include readable text or an icon with an accessible label.

### 2.2 Teal usage

Teal is the signature color, not a paint bucket. Reserve saturated teal for:

- Primary actions.
- Active navigation.
- Important selected states.
- Small data visualizations.
- The compact AI employee/voice assistant identity.

Most content stays white with dark green-charcoal text. Do not make every card teal. Do not use gradients on tables, long forms, or record details.

### 2.3 Typography

- Use the project's existing readable sans-serif font. Prefer the existing configured font over adding a font dependency.
- Page title: 24–28 px desktop; 22–24 px mobile; semibold.
- Section title: 16–18 px; semibold.
- Card heading: 14–16 px; semibold.
- Body: 14–16 px, line height around 1.45–1.6.
- Table body: 13–14 px; never shrink critical data below a readable size.
- Labels/metadata: 12–13 px, with sufficient contrast.
- KPI value: 24–30 px; semibold/bold, tabular numbers if supported.
- Never use large thin numerals for money, claim amounts, or policy identifiers.

### 2.4 Spacing and geometry

Use a 4 px base spacing scale:

- 4 px: icon-to-label spacing only.
- 8 px: tight label groups.
- 12 px: compact row/card interior.
- 16 px: standard interior spacing.
- 20–24 px: card padding and section gaps.
- 28–32 px: section separation on desktop.

Suggested geometry:

- Main card radius: 14–16 px.
- Small control radius: 8–10 px.
- Pill radius: fully rounded.
- Primary buttons: 40–44 px high.
- Icon buttons: at least 40 x 40 px hit area.
- Card border: 1 px solid `--sc-border`.
- Shadow: subtle and rare; use borders to define structure. No floating shadow on every card.

### 2.5 Icons and illustrations

- Use the existing icon package. Do not add an icon package without checking `package.json`.
- Use simple line icons for health, life, motor, travel, home/property, claims, documents, calls, and approvals.
- Keep icon stroke and size consistent.
- Use illustration only in onboarding, a genuinely empty area, or the customer-facing voice screen. Staff pages should prioritize records and tasks.
- Use original/generated-safe or licensed assets only. Do not copy the Dribbble artwork, phone mockups, logos, or illustrations.

---

## 3. Information architecture and shell

### 3.1 Staff app shell

Use a light workspace shell:

- Left sidebar on wide desktop; collapsible on laptop/tablet.
- Top bar with page title/breadcrumb, tenant/company context, and authenticated staff menu.
- Main content canvas in warm off-white.
- White cards/panels with consistent borders.
- Optional global search only if it searches real accessible records.

Keep the sidebar compact and familiar:

1. Overview
2. Policies
3. Claims
4. Approvals
5. Voice Sessions
6. Knowledge / AI Employee (if available in the current product)
7. Audit Logs
8. Settings

Avoid duplicating navigation in a top tab bar and sidebar. Use contextual tabs only within a section, such as “All / Active / Expiring” in Policies.

### 3.2 Don't turn this into a phone-sized desktop dashboard

The Dribbble reference is consumer mobile UI. SaveCall's staff workspace is a desktop-first operational application that must still work on mobile. Borrow its clean component treatment, not its phone-only layout.

- Desktop: use a readable maximum content width with clear sections; avoid giant empty columns.
- Tablet: collapse sidebar and reduce grid columns.
- Mobile: single-column cards, simplified header, horizontally safe forms, and responsive record details.
- The `/voice` page is a special customer-facing full-screen experience and can use a centered phone-like call panel. Staff pages should not be placed inside an artificial phone frame.

### 3.3 Page width and density

- Use the available width without stretching every row edge-to-edge.
- Typical page content max width: around 1440 px when the viewport is very wide.
- Forms/details: around 900–1100 px where possible.
- Tables may use the full content width.
- The first screen should show the page title, principal action, and key current information without requiring a large scroll.
- Avoid oversized dashboard hero cards and overly tall empty panels.

---

## 4. Core component catalogue

Create or refactor reusable components only after checking for existing equivalents. Names below are examples; follow the repository's naming conventions.

### 4.1 `StatusBadge`

**Purpose:** Show a canonical record or workflow status consistently.

Suggested API:

```ts
type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type StatusBadgeProps = {
  label: string;
  tone: StatusTone;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
};
```

Requirements:

- Use a pale background, readable text, thin border if needed, and a small optional icon.
- Keep labels human-readable: “Active”, “Pending review”, “Under review”, “Needs documents”, “Approved”, “Paid”, “Rejected”, “Failed”, “Ended”.
- Map persisted statuses to display labels through a typed helper, not ad hoc per-page conditional colors.
- Unknown status values must fall back to a neutral label and be logged safely where useful. Do not silently mark unknown state successful.
- Do not infer a status from timestamps or record type unless defined in business logic.

### 4.2 `MetricCard`

**Purpose:** A small, consistent dashboard summary.

Recommended fields:

- Label.
- Main value.
- Optional icon.
- Optional short supporting text.
- Optional real comparison with a named period.
- Optional click-through destination if a filtered list exists.

Rules:

- Prefer 3–4 cards, not a wall of metrics.
- Use one primary value and one supporting line.
- No decorative chart unless it adds information.
- Never show an unqualified percentage. Include what it measures and over what period.
- No green up-arrow unless the change is measured and a higher value is genuinely favorable.
- For missing data, show `—` or a deliberate empty state, not zero unless zero is known.

### 4.3 `PolicySummaryCard`

**Purpose:** Compact policy overview usable in policy lists, customer context panels, and search results.

Suggested contents:

- Policy number (monospace/tabular style).
- Policyholder name and safe customer identifier if needed.
- Policy type/product.
- Current status.
- Coverage/sum insured, if the schema and current user permissions allow it.
- Premium and next due/renewal date, when available.
- A single clear “View policy” action or clickable card.

Example hierarchy:

```text
POL-HLTH-4491                           Active
Platinum Family Health Guard
Light Lannister
Coverage ₹10,00,000 · Annual premium ₹32,000
Renewal 01 Dec 2026
[View policy]
```

The example is illustrative only. Never insert these literal values into production. Render values from the actual tenant-scoped record.

Rules:

- Desktop cards should not force all details into one line.
- Use a small policy-type icon on a muted circular background.
- Keep important money/date data aligned and readable.
- Do not show full sensitive customer data on hover or in unnecessary list rows.
- On mobile, stack details cleanly; actions remain accessible.

### 4.4 `PolicyTypeTile`

**Purpose:** Choose or filter policy type.

Types may include Health, Life, Motor, Travel, Property/Home, or types supplied by the tenant configuration.

Contents:

- Consistent line icon.
- Short label.
- Optional real count when used as a filter.
- Selected state with pale teal fill and teal border.

Rules:

- Use a 2–4 column grid depending on available width.
- Tiles are for navigation/filtering, not decorative KPI cards.
- Support keyboard navigation, visible focus, and selected state beyond color.
- If a tenant's products differ, allow configuration rather than assuming a universal fixed list.

### 4.5 `CoverageSummary`

**Purpose:** Explain what a policy covers at a glance.

Show only verified fields that exist in the policy schema, such as:

- Sum insured / coverage limit.
- Premium and frequency.
- Deductible or co-pay, if applicable.
- Effective period.
- Key included protections, when backed by the policy document or structured coverage fields.
- Exclusions and conditions as a separate, clearly labeled section.

Rules:

- Do not manufacture a coverage meter or “protection score” without a documented definition and verified input fields.
- Avoid unsupported claims such as “fully covered” or “100% protected”.
- Make exclusions and conditions discoverable. Do not hide them behind optimistic marketing copy.
- Use key-value rows and short lists, not dense blocks of text.
- Where source knowledge is uncertain, show “Not available in the current record” rather than infer coverage.

### 4.6 `ClaimSummaryCard`

**Purpose:** Display a claim in lists and dashboards without requiring immediate navigation to details.

Show:

- Claim number.
- Claimant/policyholder, with permitted level of detail.
- Linked policy number/type.
- Submitted/received date.
- Claim amount only when available and semantically defined.
- Current persisted status.
- Next action or missing information, if explicitly available.

Important money-field rules:

- Use the schema's correct field (`estimated_amount`, approved/settlement amount, or equivalent) based on its meaning.
- Do not conflate requested, estimated, approved, and paid amounts.
- If the amount is unknown, use “Not provided” or `—`; do not represent missing values as ₹0.

Interaction:

- Clicking the card/row opens Claim Details.
- A primary action such as “Review claim” appears only when the current user is authorized and an actual action is available.
- A visible amount does not imply approval or payout.

### 4.7 `ClaimProgressTimeline`

**Purpose:** Reduce uncertainty by showing the actual lifecycle of a claim.

Use an accessible vertical timeline in claim details. On small mobile screens, a compact progress stepper may be used for the main stages, with a full event list below.

Potential stages depend on the real business workflow, for example:

1. Received / Submitted
2. Initial review
3. Documents required (conditional)
4. Assessment / Processing
5. Decision
6. Settlement / Closed

Do not force every claim through the same linear stages if the business schema supports alternate paths, rejection, withdrawal, or reopening.

Each timeline item may show:

- Stage label.
- Actual event time.
- Actor/source (customer, staff, automated process) when appropriate.
- A short factual note.
- Related document or action where available.

Rules:

- Completed stages use a subtle success marker.
- Current stage uses a teal marker and explicit “Current stage” text.
- Future stages remain neutral, not green.
- Failed/rejected/returned states are shown as branch outcomes, not as later successful steps.
- If event history is missing, do not fabricate prior timestamps. Show the known current status with a notice that detailed history is unavailable.
- The AI may summarize timeline events, but the persisted event log remains the source of truth.

### 4.8 `ApprovalReviewCard`

**Purpose:** Help staff review high-impact requests safely.

Display:

- Request type.
- Related policy/customer.
- Requesting actor (AI employee/customer/staff, as supported).
- Submission time.
- Risk/severity label only if generated by a defined policy.
- Proposed changes as before → after values.
- Required approval state.
- Approve and Reject actions if the current role permits them.

For nominee/contact/cancellation requests, show the actual proposed mutation in human-readable form. Do not make staff decode raw JSON as the only way to understand a request.

Approval interaction:

1. Open a review/detail panel.
2. Confirm target identity and proposed change.
3. Clearly state the impact.
4. Approve or reject intentionally.
5. For rejection, collect a reason where required.
6. Prevent duplicate submissions and display pending action state.
7. Display the server's actual result.
8. Link to the audit event or target record where permitted.

A frontend status update alone is not a real approval. The backend must authorize the actor, execute the correct target mutation, preserve transaction consistency, and record the audit result. Maintain the existing business and security requirements.

### 4.9 `ActivityChart`

**Purpose:** Show operational history without overwhelming the dashboard.

Use a small bar/line chart for real data such as:

- Calls per day/week.
- Claims received over time.
- Premium/payment activity only if the required source data exists.
- Resolution or escalation trends with defined semantics.

Guidelines:

- One chart per visual region.
- Default to a meaningful recent range.
- Give clear axis labels or concise tooltips; avoid unlabeled decoration.
- Use teal as the primary series and muted neutrals for comparison; use amber only for a meaningful category.
- Show empty state when there is insufficient history.
- Label the period and timezone where relevant.
- Do not display sample values in production.
- Do not imply causal relationships from simple time-series correlation.
- Supply accessible text/table summary where possible.

Avoid the large hero chart treatment seen in some consumer apps. Charts should answer a practical question quickly.

### 4.10 `ActivityList` / `HistoryRow`

**Purpose:** Scan recent calls, policy actions, claims events, and approvals.

Each row should use:

- A small consistent icon/category marker.
- Primary title.
- One line of secondary context.
- Status badge.
- Timestamp using a consistent locale/timezone policy.
- Click-through to the relevant record when authorized.

For financial history, distinguish charge/premium, refund, claim payment, and pending amount. Do not use red text for every financial number; reserve red for negative or actionable failure states. Never imply a transaction occurred just because an AI mentioned it.

### 4.11 `DocumentRow`

**Purpose:** Display policy PDFs, claim evidence, customer documents, and knowledge sources.

Show filename/title, document type, uploaded/source date, processing/review state, and available actions. Keep file permissions tenant-scoped and verify downloads server-side where required.

For knowledge documents, distinguish these statuses clearly:

- Uploaded
- Processing
- Processed
- Needs review
- Approved for use
- Indexing failed
- Removed/archived

Do not label the model “trained” if the application only parses/indexes documents for RAG retrieval. Use “Knowledge updated” or “Ready to use” only when the relevant pipeline step has genuinely completed.

### 4.12 `CustomerContextPanel`

**Purpose:** Provide staff or the AI handoff recipient with compact customer context.

Show the minimum useful information:

- Customer display name.
- Verified/unverified state.
- Safe customer/policy identifiers.
- Linked policies and relevant claims.
- Preferred language only if sourced legitimately.
- Recent interaction summary if persisted and permissioned.

Do not show full identity data unless necessary. Distinguish “verified caller” from “customer record found”; these are not equivalent. Never auto-match an unknown caller to a customer merely because that customer was the most recently created or accessed.

### 4.13 `VoiceAssistantPanel`

**Purpose:** Surface SaveCall's AI employee as a useful part of the insurance operations workspace.

Use a compact panel, not a huge decorative hero.

Include:

- AI employee name and configured role.
- Real operational state: Ready, Busy, Offline, Configuration needed, or Error.
- Configured languages.
- Last successful test or latest relevant activity only when persisted.
- Clear “Test assistant” / “Configure assistant” action.

Use a real service health signal. Do not show “Live”, “Ready”, “trained”, or response-time claims from static text. Differentiate media server availability from agent worker readiness and from a successful end-to-end test.

### 4.14 `CallSessionRow` and call detail

List view should display caller label according to verification and privacy rules, room/call identifier, duration, current status, start/end time, and a link to a detail page.

Call detail can contain:

- Actual session lifecycle timeline.
- Transcript where the recording/transcript policy permits it.
- Summary visibly labeled as AI-generated if applicable.
- Tool/action trace.
- Handoff details.
- Error reason or disconnect reason.
- Provider/latency diagnostics for authorized staff.

Rules:

- Ended calls need an end timestamp and calculated duration.
- Active calls need live status only if the runtime confirms it.
- Reconcile stale sessions safely; never leave known-ended sessions indefinitely active.
- Transcript and summary are not authoritative evidence that a tool succeeded; the verified tool result is.

---

## 5. Page-specific design requirements

### 5.1 Overview dashboard

The goal is **answer “what needs attention?” within a few seconds**.

Suggested layout:

1. Header: `Overview` plus a calm description such as “Insurance operations at a glance.”
2. Compact AI assistant readiness panel, only if it conveys current actionable state.
3. Three or four metrics maximum: Active Policies, Open Claims, Pending Approvals, Voice Sessions for a clearly stated period.
4. Main row: Pending Approvals / Needs Attention and Recent Voice Sessions.
5. Lower row, only if useful: Recent Claims or a small Calls/Claims trend.

Rules:

- Avoid giant empty panels.
- Every metric card should have a clear destination.
- List only a handful of recent items and include “View all”.
- Use skeletons during loading and useful empty states when no records exist.
- Do not render demo/fallback counts when the API fails. Show a recoverable error.
- If voice sessions are active, expose current state; if ended, show their real duration.
- Keep content order stable between loads so the page does not jump around.

### 5.2 Policies directory

Top area:

- Page title and concise description.
- Primary action only if the current product truly supports creating a policy; do not invent a create-policy feature.
- Search by policy number, customer name, or approved indexed fields.
- Small filter chips or select controls: All, Active, Expiring Soon, Expired, Inactive where those states exist.
- Optional policy-type filters.

Desktop rows should show the essential columns only:

- Policy number
- Policyholder
- Plan/type
- Coverage / sum insured
- Premium
- Renewal/due date
- Status
- View details

Use a responsive table on desktop and a `PolicySummaryCard` list on mobile. Keep identifiers readable and copyable. Do not cram nominee details into the main table if they are not essential to the immediate task.

Policy detail page/panel:

- Policy header with policy number and status.
- Policyholder summary.
- Plan/type and coverage amount.
- Effective dates and premium/payment details where available.
- Coverage and exclusions.
- Nominee information only for authorized roles.
- Linked claims and relevant history.
- Actions permitted by the current role and policy state.

Sensitive changes must use the approved workflow; do not expose direct edit controls when the backend requires an approval request.

### 5.3 Claims directory and detail

Claims directory:

- Search by claim number, policy number, and claimant name within the tenant.
- Filters based on real persisted statuses.
- Compact claim cards/table with claimed/estimated/approved/paid amounts kept semantically distinct.
- Show “Needs attention” only if there is an explicit reason.

Claim details:

- Claim number and current status.
- Linked policy and customer context.
- Requested or estimated amount (labeled correctly).
- Date reported/submitted.
- Description.
- Claim progress timeline from real events if available.
- Documents/evidence section.
- Notes and audit trail according to role.
- A clear next step or responsible party where the system actually has that information.

Keep rejection, missing documents, and processing delays factual and respectful. Do not use celebratory success graphics for claims that are merely submitted.

### 5.4 Approvals queue

Prioritize work by clear status and actual policy-defined urgency, not arbitrary bright colors.

List row/card:

- Request type.
- Policy/customer.
- Submitted at.
- Status and optional defined risk level.
- Short proposed change.
- Review action.

Review screen should show a diff-like view for before/after values. For example, nominee changes should show the existing nominee and proposed nominee, but only when authorized to view those fields.

Approval and rejection buttons should not sit beside a dense truncated JSON payload without context. Show a detail panel first for sensitive operations. Use server-side transactional safeguards and exact target binding.

### 5.5 Voice Sessions

Use searchable, paginated sessions with real status, start time, duration, and a safe caller label.

Suggested filters:

- All
- Active
- Completed
- Failed
- Human handoff (if persisted)

Session detail:

- Caller/verification state.
- Real connection lifecycle.
- Transcript and response turns, if retained.
- Tool calls and verified outcomes.
- Handoff context.
- Error diagnostics.

Do not make every session look successful. Failed and incomplete sessions should be discoverable and diagnosable.

### 5.6 Settings / AI Employee Studio

Use a guided editor with grouped sections rather than overwhelming the user with all settings at once:

1. Employee identity: name and role.
2. Voice and languages.
3. Greeting and communication style.
4. Business knowledge.
5. Skills/tools.
6. Rules and confirmation requirements.
7. Human handoff.
8. Test and readiness.

Keep business language in the visible interface. Technical diagnostics can live in an advanced/engineering panel.

Rename “LLM Training Data” to **“Company Knowledge”** or **“Business Knowledge”** if the implementation is retrieval-based. Explain whether uploaded content is processing, awaiting review, approved, and available to the assistant.

Use clear persistence states: Unsaved changes, Saving, Saved, Save failed. Do not display a successful save indicator before the backend confirms persistence.

### 5.7 Customer-facing `/voice` interface

This is not the same as the staff workspace. Use a simplified, mobile-friendly call experience informed by clean consumer insurance UI, but retain SaveCall branding.

Layout:

- Light neutral background.
- One centered call panel with moderate width and comfortable whitespace.
- SaveCall identity and the business/assistant identity clearly shown.
- A restrained teal waveform/orb or listening indicator, animated only when actual audio/state events support it.
- Concise purpose statement. Do not invent hotline numbers or claim “official” status unless the business configured and authorized that wording.
- Clear live call state: Connecting, Requesting microphone, Connected, Listening, Processing, Speaking, Reconnecting, Error, Ended.
- Obvious microphone mute/unmute and end-call controls.
- Readable user/assistant transcript where appropriate.
- Clear retry/error states.

Do not keep a “Dialing…” spinner indefinitely. Use real connection state and a bounded timeout. Do not claim encrypted/live/AI-ready status unless the system verifies it.

Audio correctness takes precedence over visual polish: microphone audio must reach the actual AI worker, a real transcript must be generated, the response must come from the backend, and the actual generated audio must be audible.

### 5.8 Customer-facing insurance portal (future/optional)

Only build a customer policyholder portal if it is explicitly in scope. If added, consumer patterns from the reference can be used more directly:

- Home summary with active policy cards.
- Policy categories.
- Premium/renewal reminders.
- Claim tracker.
- Documents/ID cards.
- Profile and covered members.
- Support/voice assistant entry point.

Keep this portal distinct from staff routes and permissions. Do not use staff-level insurance records or expose other policyholders' data. Do not assume this portal exists just because `/voice` does.

---

## 6. Tables, cards, and interaction behavior

### 6.1 Tables

- Keep headers clear and labels sentence case.
- Align money consistently to the right on desktop.
- Use tabular numerals for identifiers, amounts, and timestamps.
- Use row hover for discoverability, but do not rely on hover for actions.
- Provide a visible focus state for keyboard navigation.
- Support loading, empty, error, and paginated states.
- On mobile, convert rows to stacked cards or provide a carefully designed horizontal overflow container only when necessary.
- Never make a destructive action the only obvious row affordance.

### 6.2 Forms

- Use persistent labels, not placeholders as the only label.
- Explain validation problems near the associated field.
- Preserve entered data after recoverable server errors.
- Disable submit during in-flight mutations, and also protect the backend against duplicate requests.
- Confirm high-impact actions with a meaningful summary, not a generic “Are you sure?”.
- Do not ask the user to re-enter data the backend can safely determine.
- For amounts, dates, and phone numbers, validate format and business rules server-side as well as client-side.

### 6.3 Dialogs and drawers

Use a right-side drawer for quick, read-mostly detail if it improves flow. Use a full page for complex record review, long timelines, or sensitive actions requiring careful attention.

- Keep dialogs narrow enough to scan.
- Make consequences explicit.
- Put the primary action in a consistent footer.
- Keep Cancel visible and safe.
- Do not dismiss silently while a mutation is running.
- Handle server errors without clearing the review context.

### 6.4 Loading and skeletons

- Skeletons should approximate the component being loaded.
- Avoid blocking an entire page while a small panel refreshes.
- Do not use skeletons indefinitely. Transition to an error or retry option on timeout.
- Use optimistic updates only when rollback is reliable and the domain action is safe. For approvals and insurance mutations, prefer confirmed results over deceptive optimism.

### 6.5 Empty states

Empty state examples:

- Policies: “No policies found for these filters.” + “Clear filters”.
- Claims: “No claims yet for this workspace.” Only show a creation action if creating a claim is genuinely supported here.
- Approvals: “You're all caught up.” This should only appear after a successful query returns no pending requests.
- Voice sessions: “No call sessions in this period.” + a real setup/test action if appropriate.
- Knowledge: “Add company knowledge so SaveCall can answer with your business’s information.” + supported upload/source actions.

Do not show an “all clear” state when the backend request failed.

### 6.6 Toasts and alerts

- Success toasts only after server-confirmed success.
- Error messages should explain what the user can do next.
- Use inline alerts for persistent issues that affect the page.
- Never expose stack traces, SQL, tokens, internal secrets, or sensitive records.

---

## 7. Responsive behavior

### Desktop (approximately 1200 px and wider)

- Sidebar visible.
- Overview metric cards in one row if each has enough width.
- Tables use full available content width.
- Policy details can use a main content column and a side summary only where it improves scanning.

### Tablet (approximately 768–1199 px)

- Sidebar collapses or becomes a drawer.
- Metric cards use two columns.
- Long table columns are hidden or moved into details; do not shrink text aggressively.
- Detail pages may stack summary sections.

### Mobile (below approximately 768 px)

- One-column layouts.
- Sidebar becomes a navigation drawer or compact mobile menu.
- Main actions remain visible and thumb-friendly.
- Policy/claim tables become readable cards or detail navigation.
- Keep content away from screen edges using 16 px or greater horizontal padding.
- Do not use hover-only controls.
- Avoid sticky bottom actions that cover critical content or browser controls.
- Voice screen gets special full-height responsive layout and handles safe areas.

Use breakpoints consistent with the existing application unless the current design system defines better ones. Verify narrow widths, zoom, and long text.

---

## 8. Accessibility requirements

- All buttons, inputs, menus, rows, dialogs, and tabs must be keyboard-accessible.
- Focus rings must be clearly visible.
- Inputs have programmatic labels and useful error associations.
- Statuses must include text, not color alone.
- Icons-only controls need accessible names/tooltips.
- Dialog focus must be managed correctly and return to the invoking control.
- Honor reduced-motion preferences. Essential status must not depend on animation.
- Avoid low-contrast pale teal text on white.
- Charts need a text summary or accessible equivalent.
- Ensure the voice UI state is available to assistive technology without announcing every waveform animation.

---

## 9. Motion and micro-interactions

Use motion to clarify state, not to entertain users during sensitive insurance work.

Recommended:

- 120–180 ms transitions for hover/focus/selection.
- Subtle fade/slide when a drawer opens.
- Small progress transition when a claim stage changes after a verified backend result.
- Gentle listening pulse only while live audio indicates listening.
- Clear disabled/loading button state while an operation runs.

Avoid:

- Large spring/bounce animation on financial data.
- Confetti for an ordinary policy update or claim submission.
- Pulsing green “live” indicator without real runtime health.
- Loading animations that conceal failed connections.
- Motion that triggers continuously and drains battery on mobile.

Honor `prefers-reduced-motion` and avoid animation as the only communication of progress.

---

## 10. Insurance data semantics and visual truth

This section is mandatory because attractive insurance UI can accidentally communicate a false business state.

### Premium and coverage

- Label `premium`, payment schedule, and `sum insured` distinctly.
- Show a currency symbol and locale format consistently.
- Do not infer monthly premium from an annual amount unless frequency is explicit and the calculation is labeled.
- Do not label a coverage limit as a claim payout.

### Claims

Keep these separate where present:

- Requested amount.
- Estimated amount.
- Approved amount.
- Paid/settled amount.

Do not show `₹0` when a field is null or missing. A literal zero is allowed only when the stored value represents an actual zero.

### Dates

- Use a consistent locale and timezone.
- Keep ISO values for API/database values and format them at the UI boundary.
- Never render placeholder or synthetic dates as actual dates.
- Distinguish renewal date, premium due date, claim submission date, and last updated.

### Identity

- Customer record lookup does not automatically prove caller identity.
- Display verification state explicitly.
- Do not expose full email/phone/identity number by default.

### Approvals

- A request being submitted is not the same as a request being approved.
- Approval does not imply that the target mutation succeeded unless it is transactionally completed and verified.
- A rejected claim is not a paid claim and should not share successful styling.

### Audit logs

- Do not call an audit log “immutable” or “tamper-proof” unless the implementation actually enforces that property.
- Display persisted outcomes, actors, and timestamps accurately.

### Voice calls

- “Connected” means the client actually joined the room.
- “AI ready” means the AI worker/provider is actually ready for the supported interaction.
- “Completed” means a terminal lifecycle event was recorded.
- “Resolved” means there is a defined, verifiable resolution criterion.

---

## 11. Component-level TypeScript discipline

Use the project's actual types. Avoid `any`, duplicated type declarations, and type assertions that hide missing schema fields.

Recommended patterns:

- Centralized typed status-to-tone mapping.
- Shared formatters for currency, dates, durations, and identifiers.
- Reusable typed loading/empty/error patterns.
- Data access remains in existing loaders/query functions, not scattered through presentational components.
- Presentational components receive normalized props rather than depend on provider-specific query response shapes.
- Avoid duplicating fetches when the route already loads the same data.
- Preserve server/client boundaries and do not expose service secrets in client modules.

A component should not know how to bypass tenant scope or call a privileged service. Authorization remains backend/database responsibility.

---

## 12. Suggested reusable component structure

Only implement this exact file organization if it fits the existing repository. Prefer extending existing component directories and reuse local conventions.

```text
src/components/
  ui/
    StatusBadge.tsx
    MetricCard.tsx
    EmptyState.tsx
    ErrorState.tsx
    LoadingSkeleton.tsx
    PageHeader.tsx
  insurance/
    PolicySummaryCard.tsx
    PolicyTypeTile.tsx
    CoverageSummary.tsx
    ClaimSummaryCard.tsx
    ClaimProgressTimeline.tsx
    ApprovalReviewCard.tsx
    ActivityChart.tsx
    ActivityList.tsx
    DocumentRow.tsx
    CustomerContextPanel.tsx
  voice/
    VoiceAssistantPanel.tsx
    CallSessionRow.tsx
```

Use PascalCase only if that matches existing conventions. Do not create all files as empty abstractions. Build components when at least two real screens need them or their logic meaningfully improves consistency.

### Shared hooks/utilities only where justified

```text
src/lib/formatters/
  currency.ts
  date-time.ts
  duration.ts
src/lib/insurance/
  status-presentation.ts
  policy-display.ts
  claim-display.ts
```

Keep business rules in domain/business logic, not the visual component. UI status mapping may decide how to present a known status, but must not decide whether the claim is actually approved.

---

## 13. Page contracts: data and states

Before finishing each page, write down the actual data source and state transitions.

Example for a Policies page:

```ts
type PoliciesPageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; policies: PolicySummary[] };
```

Adapt the pattern to the project's actual data-fetching framework. Do not introduce redundant state unions if a route loader or query library already handles these states well.

For each screen, verify:

- Which authenticated tenant supplies the data?
- Which database fields are rendered?
- Which fields may be null?
- What happens when a request fails?
- What permissions control each action?
- What is the actual post-mutation state?
- How is the result audited?

---

## 14. Implementation phases

### Phase 0 — Audit and baseline

- Read `design.md`, `AGENTS.md`, README, and existing application instructions.
- Inventory current routes, shared components, design tokens, icons, styles, and responsive behavior.
- Identify current dark-theme dependencies and any pages hardcoded to insurance.
- Inspect database fields and loaders used by Policies, Claims, Approvals, Calls, Overview, Settings, and `/voice`.
- Record existing build/test status before changes.
- Produce an implementation plan with exact files and no unnecessary rewrites.

### Phase 1 — Foundation tokens and shell

- Add/map the light color tokens in the existing theme.
- Convert page canvas, navigation shell, headers, cards, forms, buttons, and tables to the new theme.
- Maintain responsive navigation and visible keyboard focus.
- Do not change database/business logic in the same batch unless a UI defect depends on it.

### Phase 2 — High-reuse primitives

Implement/refactor:

- `StatusBadge`
- `MetricCard`
- `PageHeader`
- `EmptyState`
- `ErrorState`
- loading skeleton pattern
- shared formatters

Validate each primitive on a real page before applying it everywhere.

### Phase 3 — Overview dashboard

- Reduce to the most useful 3–4 metrics.
- Add compact recent calls and pending approvals.
- Remove giant empty panels.
- Replace hardcoded/fallback metrics with actual state-aware rendering.
- Ensure links take the user to filtered real records.

### Phase 4 — Policies and claims

- Implement/refine `PolicySummaryCard`, `PolicyTypeTile`, `CoverageSummary`, and `ClaimSummaryCard`.
- Add/read policy and claim detail views only where appropriate.
- Use accurate field semantics and clear status treatments.
- Build responsive record lists.

### Phase 5 — Claim lifecycle, approvals, documents

- Add `ClaimProgressTimeline` only when real event history supports it.
- Improve approval detail/review UI with a readable before/after summary.
- Display document processing and approval states honestly.
- Preserve server-side authorization, transaction safety, audit records, and tenant isolation.

### Phase 6 — Calls and AI employee panel

- Refine call registry/detail.
- Add compact `VoiceAssistantPanel` tied to actual health signals.
- Keep the `/voice` call interface separate and verify its actual audio path; this spec does not excuse an unworking voice pipeline.

### Phase 7 — Responsive/accessibility refinement

- Test desktop, tablet, and mobile widths.
- Test keyboard interaction, accessible names, reduced motion, contrast, and readable long identifiers.
- Ensure charts/tables have accessible alternatives.

### Phase 8 — Validation and cleanup

- Remove dead CSS and duplicated styles caused by the redesign.
- Search for hardcoded sample records or static status strings used as production data.
- Verify all routes, actions, and filters.
- Run TypeScript, tests, regression tests, and production build.
- Report remaining unverified interactions honestly.

---

## 15. Acceptance criteria

### Visual consistency

- [ ] Main staff workspace uses the light, calm, teal-led system.
- [ ] Cards, borders, typography, spacing, and badges are consistent.
- [ ] Teal is an accent, not the background of every component.
- [ ] The dashboard no longer looks like a giant dark operations command center.
- [ ] Tables/cards have intentional mobile behavior.
- [ ] No component is copied pixel-for-pixel from the Dribbble reference.

### Insurance usability

- [ ] Policy records are scannable and details are semantically accurate.
- [ ] Claims show the correct amount field and real status.
- [ ] Claim progress reflects event history or clearly shows when history is unavailable.
- [ ] Approvals show the actual proposed mutation and authorized actions only.
- [ ] Recent activity and call sessions are real persisted records.
- [ ] Empty/error states are not confused with successful zero-result queries.

### Trust and security

- [ ] No mocked metrics or fabricated production records.
- [ ] Tenant isolation and existing authorization remain intact.
- [ ] Sensitive actions remain backend-validated and auditable.
- [ ] Customer identity and call status are represented truthfully.
- [ ] No unverified claims such as “live”, “trained”, “encrypted”, “paid”, or “resolved”.

### Engineering quality

- [ ] Shared components have no duplicated business-rule logic.
- [ ] Types reflect actual schema and nullability.
- [ ] No unnecessary new dependency or broad rewrite.
- [ ] Loading, empty, error, and success states tested.
- [ ] Keyboard and responsive interactions verified.
- [ ] TypeScript and production build pass.
- [ ] Actual test results and remaining blockers are reported.

---

## 16. Final instruction to the coding agent

Use this specification as an **additive design extension** to `design.md`. The primary design direction remains bright, calm, trustworthy, simple, and serious. This document gives the insurance-specific patterns and component behavior.

First inspect the actual repository and database schema. Then implement the reusable foundation and improve the existing pages in the phased order above. Preserve all working behavior. Do not stop at a plan, but do not attempt an uncontrolled one-shot rewrite.

The outcome should feel like a modern insurance operations product: the calming visual clarity of a consumer insurance app, the compactness of a good B2B SaaS workspace, and the operational integrity required for an AI system that handles real customer conversations and sensitive business actions.

---

## Reference

- Dribbble inspiration supplied by the product owner: [Insurance App UI Kit](https://dribbble.com/shots/25707084-Insurance-App-UI-Kit)
- Treat the reference as inspiration for broad interaction and component patterns. Implement a distinct SaveCall visual identity and original layout.
