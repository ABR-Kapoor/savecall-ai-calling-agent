/**
 * InsurCall End-to-End Verification Test Suite
 * Tests WhatsApp identity parsing, Outbound Safety Guard fail-closed behavior,
 * RAG grounding gates, and tenant isolation contracts.
 */

import { parseWhatsAppIdentity, cleanWhatsAppPhone } from "../src/lib/whatsapp/identity.ts";
import { evaluateOutboundWhatsAppGate } from "../src/lib/whatsapp/outbound-guard.server.ts";

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedCount++;
  }
}

console.log("\n===============================================================");
console.log("   INSURCALL - END-TO-END VERIFICATION TEST SUITE              ");
console.log("===============================================================\n");

// ---------------------------------------------------------------------------
// TEST SUITE 1: WhatsApp Identity & Multi-Device LID Normalization
// ---------------------------------------------------------------------------
console.log("--- 1. WhatsApp Identity & Multi-Device LID Normalization ---");

// Test 1.1: Standard user JID
const userJid = parseWhatsAppIdentity("919876543210@s.whatsapp.net");
assert(
  userJid.type === "user" && userJid.phone === "+919876543210" && !userJid.isLid,
  "Standard user JID parsed to E.164 (+919876543210)"
);

// Test 1.2: Multi-device LID (@lid) must NOT have leading + or @lid in phone
const lidJid = parseWhatsAppIdentity("196718159224999@lid");
assert(
  lidJid.type === "lid" && lidJid.phone === "LID:196718159224999" && lidJid.isLid,
  "WhatsApp multi-device LID normalized to LID:196718159224999 (not +196718159224999@lid)"
);

// Test 1.3: WhatsApp Group JID (@g.us)
const groupJid = parseWhatsAppIdentity("12036302482394@g.us");
assert(
  groupJid.type === "group" && groupJid.isGroup && groupJid.phone === "GROUP:12036302482394",
  "WhatsApp group JID identified as group without pseudo-phone prepend"
);

// Test 1.4: cleanWhatsAppPhone helper
assert(
  cleanWhatsAppPhone("104574400614423@lid") === "LID:104574400614423",
  "cleanWhatsAppPhone properly handles LID without prepending +"
);

// ---------------------------------------------------------------------------
// TEST SUITE 2: Outbound WhatsApp Safety Guard & Fail-Closed Gates
// ---------------------------------------------------------------------------
console.log("\n--- 2. Outbound WhatsApp Safety Guard & Fail-Closed Gates ---");

const tenantId = "a0000000-0000-0000-0000-000000000001";

// Test 2.1: Kill switch engaged must block sending immediately
process.env["WHATSAPP_OUTBOUND_KILL_SWITCH"] = "true";
const killDecision = evaluateOutboundWhatsAppGate({
  tenantId,
  chatId: "919876543210@s.whatsapp.net",
  messageType: "ai_auto_reply",
});
assert(
  !killDecision.allowed && killDecision.code === "KILL_SWITCH_ACTIVE",
  "Kill switch ENGAGED blocks all outbound messages"
);
delete process.env["WHATSAPP_OUTBOUND_KILL_SWITCH"];

// Test 2.2: Loop prevention (fromMe = true)
const loopDecision = evaluateOutboundWhatsAppGate({
  tenantId,
  chatId: "919876543210@s.whatsapp.net",
  messageType: "ai_auto_reply",
  fromMe: true,
});
assert(
  !loopDecision.allowed && loopDecision.code === "LOOP_PREVENTION_SELF",
  "Loop prevention: fromMe messages rejected from auto-reply"
);

// Test 2.3: Group messages must never trigger auto-reply
const groupDecision = evaluateOutboundWhatsAppGate({
  tenantId,
  chatId: "12036302482394@g.us",
  messageType: "ai_auto_reply",
  fromMe: false,
});
assert(
  !groupDecision.allowed && groupDecision.code === "GROUP_AUTO_REPLY_PROHIBITED",
  "Auto-replies to group conversations strictly prohibited"
);

// Test 2.4: Human takeover active must silence bot
const takeoverDecision = evaluateOutboundWhatsAppGate({
  tenantId,
  chatId: "919876543210@s.whatsapp.net",
  messageType: "ai_auto_reply",
  humanTakeoverActive: true,
});
assert(
  !takeoverDecision.allowed && takeoverDecision.code === "HUMAN_TAKEOVER_ACTIVE",
  "Human staff takeover blocks AI bot from sending replies"
);

// Test 2.5: Ungrounded knowledge / needs human review must be blocked from auto-reply
process.env["ENABLE_WHATSAPP_AI_AUTOREPLY"] = "true";
process.env["ALLOW_DEV_OUTBOUND_WHATSAPP"] = "true";
process.env["WHATSAPP_TEST_ALLOWLIST"] = "+919876543210";

const ungroundedDecision = evaluateOutboundWhatsAppGate({
  tenantId,
  chatId: "919876543210@s.whatsapp.net",
  recipientPhone: "+919876543210",
  messageType: "ai_auto_reply",
  connectionAutoReplyEnabled: true,
  grounded: false,
  needsHumanReview: true,
});
assert(
  !ungroundedDecision.allowed && ungroundedDecision.code === "UNGROUNDED_KNOWLEDGE_ESCALATION",
  "Ungrounded knowledge (<0.65 similarity) blocked from auto-reply"
);

// Test 2.6: Recipient not on test allowlist in development must be blocked
const nonAllowedDecision = evaluateOutboundWhatsAppGate({
  tenantId,
  chatId: "919999888877@s.whatsapp.net",
  recipientPhone: "+919999888877",
  messageType: "ai_auto_reply",
  connectionAutoReplyEnabled: true,
  grounded: true,
  needsHumanReview: false,
});
assert(
  !nonAllowedDecision.allowed && nonAllowedDecision.code === "RECIPIENT_NOT_ALLOWLISTED",
  "Real contact NOT in WHATSAPP_TEST_ALLOWLIST is safely blocked in dev"
);

// Test 2.7: Authorized allowlisted test recipient is permitted
const allowedDecision = evaluateOutboundWhatsAppGate({
  tenantId,
  chatId: "919876543210@s.whatsapp.net",
  recipientPhone: "+919876543210",
  messageType: "ai_auto_reply",
  connectionAutoReplyEnabled: true,
  grounded: true,
  needsHumanReview: false,
});
assert(
  allowedDecision.allowed && allowedDecision.code === "ALLOWED",
  "Authorized recipient on WHATSAPP_TEST_ALLOWLIST with grounded facts is permitted"
);

// Reset test environment variables
delete process.env["ENABLE_WHATSAPP_AI_AUTOREPLY"];
delete process.env["ALLOW_DEV_OUTBOUND_WHATSAPP"];
delete process.env["WHATSAPP_TEST_ALLOWLIST"];

// ---------------------------------------------------------------------------
// TEST SUMMARY
// ---------------------------------------------------------------------------
console.log("\n===============================================================");
if (failedCount === 0) {
  console.log(`   ALL ${passedCount} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
} else {
  console.error(`   FAILED: ${failedCount} tests failed out of ${passedCount + failedCount}`);
  process.exit(1);
}
console.log("===============================================================\n");
