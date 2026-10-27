/**
 * Indian Telecom Carrier Forwarding Specifications & MMI Dial Codes
 * Verified according to Department of Telecommunications (DoT) and GSM standards.
 */

import { IndianCarrierInfo } from "./types";

export const INDIAN_CARRIERS: Record<string, IndianCarrierInfo> = {
  airtel: {
    id: "airtel",
    name: "Bharti Airtel",
    type: "mobile",
    conditionalBusyCode: "*67*<DID>#",
    conditionalNoAnswerCode: "*61*<DID>#",
    conditionalUnreachableCode: "*62*<DID>#",
    unconditionalForwardCode: "*21*<DID>#",
    deactivateAllCode: "##002#",
    statusCheckCode: "*#67#",
    chargeNotice:
      "Airtel applies standard per-minute outgoing voice rates or plan minutes to forwarded legs. Unconditional forwarding applies even when phone is turned off.",
    supportsCliPreservation: true,
    notes: "Supports full Calling Line Identification (CLI) pass-through on conditional forwarding.",
  },
  jio: {
    id: "jio",
    name: "Reliance Jio",
    type: "mobile",
    conditionalBusyCode: "*401*<DID>",
    conditionalNoAnswerCode: "*403*<DID>",
    conditionalUnreachableCode: "*409*<DID>",
    unconditionalForwardCode: "*401*<DID>",
    deactivateAllCode: "*402",
    statusCheckCode: "*#401#",
    chargeNotice:
      "Jio deducts forwarded call minutes from your active unlimited voice quota or top-up balance. Dial *402 from handset dialer to deactivate at any time.",
    supportsCliPreservation: true,
    notes: "Jio utilizes non-standard asterisk-based USSD codes. Ensure *402 is saved for instant rollback.",
  },
  vi: {
    id: "vi",
    name: "Vodafone Idea (Vi)",
    type: "mobile",
    conditionalBusyCode: "*67*<DID>#",
    conditionalNoAnswerCode: "*61*<DID>#",
    conditionalUnreachableCode: "*62*<DID>#",
    unconditionalForwardCode: "*21*<DID>#",
    deactivateAllCode: "##002#",
    statusCheckCode: "*#002#",
    chargeNotice:
      "Standard domestic voice call tariffs apply to forwarded call duration as per your Vi postpaid or prepaid plan.",
    supportsCliPreservation: true,
    notes: "Standard GSM codes work reliably across all 22 Vi telecom circles.",
  },
  bsnl: {
    id: "bsnl",
    name: "BSNL Mobile",
    type: "mobile",
    conditionalBusyCode: "*67*<DID>#",
    conditionalNoAnswerCode: "*61*<DID>#",
    conditionalUnreachableCode: "*62*<DID>#",
    unconditionalForwardCode: "*21*<DID>#",
    deactivateAllCode: "##002#",
    statusCheckCode: "*#21#",
    chargeNotice:
      "BSNL prepaid requires active voice balance. Postpaid accounts incur outgoing talktime per your billing cycle.",
    supportsCliPreservation: true,
    notes: "Works on GSM 3G/4G network. Requires call forwarding facility enabled on SIM.",
  },
  tata_tele: {
    id: "tata_tele",
    name: "Tata Tele Business Services (Smartflo)",
    type: "enterprise",
    conditionalBusyCode: "SIP_HUNT_GROUP",
    conditionalNoAnswerCode: "SIP_HUNT_GROUP",
    conditionalUnreachableCode: "SIP_FAILOVER",
    unconditionalForwardCode: "SIP_DIRECT_URI",
    deactivateAllCode: "PORTAL_RESET",
    statusCheckCode: "API_POLL",
    chargeNotice:
      "Enterprise SIP trunk pricing governed by master service agreement (MSA). No consumer SIM tariffs apply.",
    supportsCliPreservation: true,
    notes: "Enterprise cloud PBX and SIP trunking for high-concurrency insurance hotlines.",
  },
  exotel: {
    id: "exotel",
    name: "Exotel Cloud Telephony",
    type: "enterprise",
    conditionalBusyCode: "APPLET_FALLBACK",
    conditionalNoAnswerCode: "APPLET_FALLBACK",
    conditionalUnreachableCode: "APPLET_FAILOVER",
    unconditionalForwardCode: "PASSTHRU_APPLET",
    deactivateAllCode: "FLOW_DISCONNECT",
    statusCheckCode: "API_HEALTH",
    chargeNotice:
      "Exotel pulse-based billing per connected stream. Call recording and GST billed according to contract.",
    supportsCliPreservation: true,
    notes: "Indian cloud telephony provider with native DoT compliance and high-availability endpoints.",
  },
};

/**
 * Normalizes phone numbers to clean E.164 format (+91XXXXXXXXXX)
 */
export function normalizeE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }
  if (raw.startsWith("+")) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

/**
 * Formats a normalized phone number for pleasant Indian display (+91 98765 43210)
 */
export function formatDisplayNumber(e164: string): string {
  const clean = normalizeE164(e164);
  if (clean.startsWith("+91") && clean.length === 13) {
    const p1 = clean.slice(3, 8);
    const p2 = clean.slice(8);
    return `+91 ${p1} ${p2}`;
  }
  return clean;
}

/**
 * Official Department of Telecommunications (DoT) Call Forwarding Advisory
 * Directive issued March 28, 2024 (effective April 15, 2024).
 */
export const DOT_CALL_FORWARDING_ADVISORY = {
  circularNumber: "16-6/2020-TC",
  date: "March 28, 2024",
  effectiveDate: "April 15, 2024",
  authority: "Department of Telecommunications (DoT), Ministry of Communications, Government of India",
  summary:
    "DoT directed Access Service Licensees to discontinue USSD-based call forwarding (*401*, *21*, etc.) effective April 15, 2024 to curb fraudulent call redirection. Users must configure call forwarding via handset settings or carrier apps.",
  androidInstructions: [
    "Open Phone / Dialer app -> Settings (top right menu)",
    "Tap Supplementary Services or Calling Accounts -> Call Forwarding",
    "Select Voice Calls -> When Busy or When Unanswered",
    "Enter your assigned InsurCall Routing DID and tap Enable / Turn On",
  ],
  iosInstructions: [
    "Open Settings -> Phone -> Call Forwarding",
    "Toggle Call Forwarding to ON",
    "Tap Forward to and enter your assigned InsurCall Routing DID",
    "Exit settings to apply forwarding immediately",
  ],
  carrierPortalNotice:
    "Alternatively, you may configure forwarding within your carrier mobile app (MyJio, Airtel Thanks, or Vi app) under Call Management settings.",
};

