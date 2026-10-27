# INSURCALL PRODUCT AND UX PLAN

## 1. Product North Star and Strategic Mission

InsurCall is an enterprise-grade, WhatsApp-first customer support and policy administration platform designed specifically for insurance agencies, corporate brokerages, and composite carriers.

The platform enables insurance organizations to deploy a company-specific AI assistant that:
1. Answers policyholder inquiries strictly using approved company knowledge.
2. Manages multi-channel WhatsApp messaging with verified delivery receipts.
3. Automatically captures First Notice of Loss (FNOL) claim incident details.
4. Enforces dual-control human escalation boundaries when handling high-risk operations (e.g. beneficiary alterations, unverified coverage interpretations).
5. Maintains a tenant-isolated, regulatory-compliant audit log of all customer interactions and system decisions.

---

## 2. Deprecation of Cellular / PSTN Telecom Artifacts

A critical architectural finding from the repository audit was the presence of cellular telephony flows (SIM forwarding, *21* dialing codes, Airtel/Jio/Vodafone USSD setup, dedicated landline marketing, and enterprise SIP trunks) in primary navigation.

These concepts have been permanently removed from the primary customer journey because:
- InsurCall is fundamentally a **WhatsApp-first** communication platform.
- Cellular carrier forwarding creates misleading customer expectations regarding telecommunication carrier regulatory licensing (DOT/TRAI).
- WhatsApp Business voice and messaging operate on IP signalling rather than cellular switched circuits.

All cellular telephony pages (`/phone`, `/calls`) have been removed from primary navigation. The WhatsApp channel configuration (`/whatsapp`) now serves as the unified communication headquarters.

---

## 3. Canonical Information Architecture (8 Primary Surfaces)

In accordance with the Product North Star, navigation and terminology across the application are locked down to 8 canonical surfaces:

| Surface Name | Route | Core Responsibility |
| :--- | :--- | :--- |
| **Overview** | `/dashboard` | Executive KPI dashboard: WhatsApp channel status, conversation metrics, knowledge freshness, and pending approvals queue. |
| **WhatsApp Inbox** | `/whatsapp` | Unified multi-tenant WhatsApp desk: live QR connection, conversation timeline, AI/staff messaging, and automation rules. |
| **AI Agent** | `/agent` | AI Agent Studio: persona, languages, welcome greeting, statutory AI disclosure, permitted/prohibited boundaries, and system prompt preview. |
| **Knowledge & Training** | `/train` | Single teaching surface: multi-turn guided conversational interview, PDF/document ingestion, fact approval queue, and retrieval inspector. |
| **Approvals & Handoffs** | `/change-requests` | Dual-control human authorization queue: review and approve high-risk changes (nominees, claim disputes, manual payouts). |
| **Insurance Records** | `/policies` | Multi-line coverage directory: verified policy records across Health, Motor, Life, Property, and Commercial lines. |
| **Settings & Security** | `/settings` | Workspace governance: organizational profile, tenant members, API keys, webhook secrets, and data retention policies. |
| **Activity & Audit** | `/audit` | Regulatory compliance log: tenant-isolated, immutable chronological record of all agent decisions and human overrides. |

---

## 4. Visual Design System and Responsive Layout

### 4.1 Strict Light-Mode Design
InsurCall implements a restrained, high-contrast, professional light-mode aesthetic tailored for financial services:
- **Page Canvas**: Warm near-white (`#FAF9F6`).
- **Surface Elevation**: Pure white cards (`#FFFFFF`) with subtle border lines (`#E2E8F0` / `border-slate-200`) and soft shadows (`shadow-xs`).
- **Typography & Hierarchy**: Deep navy text (`#111827`) for headings; slate-600 (`#475569`) for body copy; monospace for identifiers, policy numbers, and timestamps.
- **Brand Accents**: Controlled deep teal (`#087F8C`) for primary interactive controls; soft teal tints (`#E6F6F7`) for active badges and navigation highlights.
- **Dark Mode Policy**: All dark-mode toggles, inverted dark themes, and dark gradient hero banners have been eliminated to ensure consistent readability.

### 4.2 Viewport Responsiveness Standards
All interfaces are built and validated across standard operational viewports:
- **1440 x 900 (Desktop Workstation)**: Dual-pane layout, persistent sidebar, expanded table views.
- **1280 x 800 (Standard Laptop)**: Auto-collapsing secondary drawers, responsive data grids.
- **1024 x 768 (Tablet / Compact Screen)**: Stacked filter panels, responsive tables with horizontal scroll containment.
- **390 x 844 (Mobile Viewport)**: Mobile navigation sheet, card-based summaries replacing wide tables, touch-optimized button targets.

Zero horizontal document overflow occurs at any of these standard breakpoints.

---

## 5. User Guidance and Defensive UX Principles

Complex operational tasks follow strict defensive design principles:
1. **Explicit Purpose**: Every form clearly explains why an input is required and how it affects live customer interactions.
2. **Real Runtime Feedback**: Button loading spinners, success toasts, and error notices reflect verified database responses rather than optimistic simulations.
3. **Empty States with Direction**: Empty tables provide context-specific next steps (e.g. "Upload your first policy PDF" or "Complete the guided interview") rather than blank voids.
4. **Destructive Action Confirmation**: Irreversible operations (deleting a knowledge source, revoking an approved fact, taking over a live chat) require explicit confirmation.
