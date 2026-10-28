/**
 * InsurCall Outbound WhatsApp Safety Guard
 * Server-side fail-closed gates to prevent accidental WhatsApp message delivery,
 * infinite auto-reply cascades, ungrounded insurance advice, and unauthorized dev sends.
 */

import { parseWhatsAppIdentity } from "./identity";

export interface OutboundGateCheckParams {
  tenantId: string;
  chatId: string;
  recipientPhone?: string | null;
  messageType: "ai_auto_reply" | "staff_reply" | "test_message" | "system_notification";
  fromMe?: boolean;
  humanTakeoverActive?: boolean;
  connectionAutoReplyEnabled?: boolean;
  grounded?: boolean;
  needsHumanReview?: boolean;
  lastReplySentAt?: string | null;
}

export interface OutboundGateDecision {
  allowed: boolean;
  reason?: string;
  code:
    | "ALLOWED"
    | "KILL_SWITCH_ACTIVE"
    | "DEV_ALLOWLIST_RESTRICTED"
    | "RECIPIENT_NOT_ALLOWLISTED"
    | "LOOP_PREVENTION_SELF"
    | "GROUP_AUTO_REPLY_PROHIBITED"
    | "LID_UNMAPPED"
    | "HUMAN_TAKEOVER_ACTIVE"
    | "AUTO_REPLY_DISABLED"
    | "UNGROUNDED_KNOWLEDGE_ESCALATION"
    | "COOLDOWN_ACTIVE";
  sanitizedRecipient: string;
}

/**
 * Parses comma-separated allowlist of phone numbers and JIDs from environment.
 */
export function getTestRecipientAllowlist(): string[] {
  const raw = process.env["WHATSAPP_TEST_ALLOWLIST"] || "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      // Normalize to digits or clean JID
      const cleanDigits = item.replace(/\D/g, "");
      return cleanDigits ? `+${cleanDigits}` : item.toLowerCase();
    });
}

/**
 * Sanitizes phone numbers for safe logging without exposing personal data.
 */
export function maskRecipient(identifier: string): string {
  if (!identifier) return "unknown";
  if (identifier.length <= 6) return "***" + identifier.slice(-2);
  return identifier.slice(0, 3) + "***" + identifier.slice(-4);
}

/**
 * Evaluates whether an outbound message is authorized to be dispatched to the WhatsApp network.
 */
export function evaluateOutboundWhatsAppGate(params: OutboundGateCheckParams): OutboundGateDecision {
  const {
    chatId,
    recipientPhone,
    messageType,
    fromMe,
    humanTakeoverActive,
    connectionAutoReplyEnabled,
    grounded,
    needsHumanReview,
    lastReplySentAt,
  } = params;

  const identity = parseWhatsAppIdentity(chatId);
  const targetPhone = recipientPhone || identity.phone;
  const sanitized = maskRecipient(targetPhone);

  // 1. Independent Server-Side Kill Switch
  const killSwitchActive = process.env["WHATSAPP_OUTBOUND_KILL_SWITCH"] === "true";
  if (killSwitchActive) {
    console.warn(`[Outbound Safety Gate] Blocked ${messageType} to ${sanitized}: Server kill switch is ENGAGED.`);
    return {
      allowed: false,
      reason: "Server-side outbound WhatsApp kill switch is engaged.",
      code: "KILL_SWITCH_ACTIVE",
      sanitizedRecipient: sanitized,
    };
  }

  // 2. Loop Prevention: never reply to self-messages or outbound echoes
  if (fromMe === true) {
    return {
      allowed: false,
      reason: "Blocked loop: message originated from self or outbound echo.",
      code: "LOOP_PREVENTION_SELF",
      sanitizedRecipient: sanitized,
    };
  }

  // 3. Prevent auto-replies to groups
  if (messageType === "ai_auto_reply" && identity.isGroup) {
    return {
      allowed: false,
      reason: "Automated replies to group conversations are prohibited.",
      code: "GROUP_AUTO_REPLY_PROHIBITED",
      sanitizedRecipient: sanitized,
    };
  }

  // 4. Prevent auto-replies to unmapped WhatsApp LIDs
  if (messageType === "ai_auto_reply" && identity.isLid) {
    const allowlist = getTestRecipientAllowlist();
    const isAllowlisted = allowlist.some(
      (a) => a === chatId.toLowerCase() || a === targetPhone.toLowerCase()
    );
    if (!isAllowlisted) {
      return {
        allowed: false,
        reason: "Recipient is a multi-device LID without verified phone mapping or explicit allowlist.",
        code: "LID_UNMAPPED",
        sanitizedRecipient: sanitized,
      };
    }
  }

  // 5. Human Staff Takeover Gate: if staff is in control, AI bot must not speak
  if (messageType === "ai_auto_reply" && humanTakeoverActive) {
    return {
      allowed: false,
      reason: "Human staff takeover is active for this conversation.",
      code: "HUMAN_TAKEOVER_ACTIVE",
      sanitizedRecipient: sanitized,
    };
  }

  // 6. Feature Gate for AI Auto-Replies
  if (messageType === "ai_auto_reply") {
    const serverAutoReplyEnabled = process.env["ENABLE_WHATSAPP_AI_AUTOREPLY"] === "true";
    if (!serverAutoReplyEnabled || !connectionAutoReplyEnabled) {
      return {
        allowed: false,
        reason: "Automated AI replies are paused in server configuration or connection settings.",
        code: "AUTO_REPLY_DISABLED",
        sanitizedRecipient: sanitized,
      };
    }

    // 7. Grounded Knowledge Requirement: ungrounded answers must never auto-reply
    if (grounded === false || needsHumanReview === true) {
      return {
        allowed: false,
        reason: "Response requires human adjuster review; ungrounded automatic response blocked.",
        code: "UNGROUNDED_KNOWLEDGE_ESCALATION",
        sanitizedRecipient: sanitized,
      };
    }

    // 8. Cooldown to prevent runaway cascades (minimum 4 seconds between replies to the same chat)
    if (lastReplySentAt) {
      const elapsedMs = Date.now() - new Date(lastReplySentAt).getTime();
      if (elapsedMs < 4000) {
        return {
          allowed: false,
          reason: "Rate limit cooldown active for this conversation thread.",
          code: "COOLDOWN_ACTIVE",
          sanitizedRecipient: sanitized,
        };
      }
    }
  }

  // 9. Development & Test Environment Recipient Allowlist
  const isDevOrTest =
    process.env["NODE_ENV"] !== "production" ||
    process.env["VERCEL_ENV"] === "preview" ||
    process.env["VERCEL_ENV"] === "development";

  const allowDevSending = process.env["ALLOW_DEV_OUTBOUND_WHATSAPP"] === "true";

  if (isDevOrTest) {
    if (!allowDevSending && messageType === "ai_auto_reply") {
      return {
        allowed: false,
        reason: "Development environment: outbound AI auto-replies are disabled by default.",
        code: "DEV_ALLOWLIST_RESTRICTED",
        sanitizedRecipient: sanitized,
      };
    }

    const allowlist = getTestRecipientAllowlist();
    if (allowlist.length > 0) {
      const normalizedTargetPhone = targetPhone.replace(/\D/g, "");
      const isRecipientAllowed = allowlist.some((allowedItem) => {
        const allowedClean = allowedItem.replace(/\D/g, "");
        if (allowedClean && normalizedTargetPhone.endsWith(allowedClean)) return true;
        if (allowedItem.toLowerCase() === chatId.toLowerCase()) return true;
        return false;
      });

      if (!isRecipientAllowed) {
        console.warn(
          `[Outbound Safety Gate] Blocked send to ${sanitized}: recipient is not on WHATSAPP_TEST_ALLOWLIST in dev mode.`
        );
        return {
          allowed: false,
          reason: `Recipient ${sanitized} is not on the authorized development allowlist.`,
          code: "RECIPIENT_NOT_ALLOWLISTED",
          sanitizedRecipient: sanitized,
        };
      }
    }
  }

  return {
    allowed: true,
    code: "ALLOWED",
    sanitizedRecipient: sanitized,
  };
}
