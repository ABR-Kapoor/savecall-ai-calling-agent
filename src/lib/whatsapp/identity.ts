/**
 * InsurCall WhatsApp Identity Parser & Normalizer
 * Authoritatively parses WhatsApp JIDs, multi-device LIDs, group IDs, and telephone numbers.
 */

export interface ParsedWhatsAppIdentity {
  rawJid: string;
  type: "user" | "lid" | "group" | "broadcast";
  phone: string;
  displayIdentifier: string;
  isGroup: boolean;
  isLid: boolean;
}

/**
 * Authoritatively parses WhatsApp JIDs into structured identity metadata.
 * Correctly distinguishes between:
 * - standard user JIDs (<phone>@s.whatsapp.net or <phone>@c.us)
 * - multi-device linked device LIDs (<lid>@lid)
 * - WhatsApp groups (<group_id>@g.us)
 * - broadcast lists (status@broadcast or <id>@broadcast)
 */
export function parseWhatsAppIdentity(rawJid: string): ParsedWhatsAppIdentity {
  const cleanJid = (rawJid || "").trim();

  // 1. WhatsApp Multi-Device LID (Linked Identity Device)
  if (cleanJid.endsWith("@lid") || cleanJid.includes("@lid")) {
    const lidDigits = cleanJid.replace(/@lid/g, "").split(":")[0] || "";
    return {
      rawJid: cleanJid,
      type: "lid",
      phone: `LID:${lidDigits}`,
      displayIdentifier: `LID: ${lidDigits}`,
      isGroup: false,
      isLid: true,
    };
  }

  // 2. WhatsApp Group
  if (cleanJid.endsWith("@g.us") || cleanJid.includes("@g.us")) {
    const groupId = cleanJid.replace(/@g\.us/g, "").split(":")[0] || "";
    return {
      rawJid: cleanJid,
      type: "group",
      phone: `GROUP:${groupId}`,
      displayIdentifier: `Group (${groupId})`,
      isGroup: true,
      isLid: false,
    };
  }

  // 3. Broadcast list
  if (cleanJid.includes("@broadcast")) {
    return {
      rawJid: cleanJid,
      type: "broadcast",
      phone: cleanJid,
      displayIdentifier: "Broadcast Channel",
      isGroup: true,
      isLid: false,
    };
  }

  // 4. Standard User Phone Number (@s.whatsapp.net or @c.us or plain digits)
  const digitsOnly = cleanJid
    .replace(/@s\.whatsapp\.net|@c\.us/g, "")
    .split(":")[0]
    ?.replace(/\D/g, "") || "";

  const phone = digitsOnly ? (digitsOnly.startsWith("+") ? digitsOnly : `+${digitsOnly}`) : cleanJid;

  return {
    rawJid: cleanJid,
    type: "user",
    phone,
    displayIdentifier: phone,
    isGroup: false,
    isLid: false,
  };
}

/**
 * Extracts a normalized phone number string or formatted identifier from a WhatsApp JID.
 */
export function cleanWhatsAppPhone(rawJid: string): string {
  return parseWhatsAppIdentity(rawJid).phone;
}

/**
 * Returns a human-friendly display label for a contact identity.
 */
export function formatContactDisplayIdentifier(phoneOrJid: string, contactName?: string | null): string {
  if (contactName && contactName.trim()) {
    return contactName.trim();
  }
  const parsed = parseWhatsAppIdentity(phoneOrJid);
  return parsed.displayIdentifier;
}
