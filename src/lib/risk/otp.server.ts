import { Resend } from "resend";
import { insforgeServer } from "@/lib/insforge/client.server";

const resendApiKey = process.env["RESEND_API_KEY"];
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const senderEmail = process.env["OTP_SENDER_EMAIL"] || "verify@savecall.ai";

function hashOtp(otp: string): string {
  // In Node/V8 environment, simple hash
  let hash = 0;
  for (let i = 0; i < otp.length; i++) {
    hash = (hash << 5) - hash + otp.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}_${otp.length}`;
}

export async function createAndSendOtp(params: {
  callSessionId: string;
  customerId: string;
  purpose: "update_contact_details" | "change_nominee" | "update_bank_details" | "cancel_policy";
  channel?: "email" | "sms";
}): Promise<{ ok: boolean; message: string; maskedDestination: string }> {
  // 1. Fetch customer details
  const { data: customer, error: custErr } = await insforgeServer.database
    .from("customers")
    .select("name, email, phone")
    .eq("id", params.customerId)
    .maybeSingle();

  if (custErr || !customer) {
    throw new Error("Customer not found for OTP dispatch");
  }

  const destination = customer.email;
  const maskedDestination = destination.replace(/^(.{2})(.*)(@.*)$/, "$1***$3");

  // 2. Generate random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashed = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  // 3. Store challenge in InsForge
  await insforgeServer.database.from("otp_challenges").insert({
    call_session_id: params.callSessionId,
    customer_id: params.customerId,
    purpose: params.purpose,
    channel: params.channel ?? "email",
    destination_masked: maskedDestination,
    otp_hash: hashed,
    expires_at: expiresAt,
  });

  // 4. Send email via Resend
  if (resend && customer.email) {
    try {
      await resend.emails.send({
        from: senderEmail,
        to: customer.email,
        subject: `Your SaveCall Verification Code: ${otp}`,
        text: `Hello ${customer.name},\n\nYour one-time verification code for ${params.purpose.replace(/_/g, " ")} is: ${otp}\n\nThis code will expire in 5 minutes. If you did not request this, please hang up immediately.\n\nSaveCall Security Team`,
      });
    } catch (mailErr) {
      console.error("Resend OTP delivery failed:", mailErr);
    }
  } else {
    console.info(`[DEV OTP NOTIFICATION] Code for ${customer.name} (${customer.email}): ${otp}`);
  }

  return {
    ok: true,
    message: `OTP sent to ${maskedDestination}. Valid for 5 minutes.`,
    maskedDestination,
  };
}

export async function verifyOtpCode(params: {
  callSessionId: string;
  customerId: string;
  code: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const hashed = hashOtp(params.code.trim());

  // Find latest active challenge for this session
  const { data: challenge } = await insforgeServer.database
    .from("otp_challenges")
    .select("id, purpose, expires_at, attempt_count, max_attempts, used")
    .eq("call_session_id", params.callSessionId)
    .eq("customer_id", params.customerId)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challenge) {
    return { ok: false, reason: "No active OTP challenge found for this session." };
  }

  if (Date.now() > new Date(challenge.expires_at).getTime()) {
    return { ok: false, reason: "OTP has expired. Please request a new code." };
  }

  if (challenge.attempt_count >= challenge.max_attempts) {
    return { ok: false, reason: "Maximum verification attempts exceeded." };
  }

  // Check code
  const { data: matched } = await insforgeServer.database
    .from("otp_challenges")
    .select("id")
    .eq("id", challenge.id)
    .eq("otp_hash", hashed)
    .maybeSingle();

  if (!matched) {
    // Increment attempts
    await insforgeServer.database
      .from("otp_challenges")
      .update({ attempt_count: challenge.attempt_count + 1 })
      .eq("id", challenge.id);
    return { ok: false, reason: "Invalid OTP code. Please check and try again." };
  }

  // Mark challenge verified and used
  const validUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min window
  await insforgeServer.database
    .from("otp_challenges")
    .update({ used: true, verified_at: new Date().toISOString() })
    .eq("id", challenge.id);

  // Update call session
  await insforgeServer.database
    .from("call_sessions")
    .update({ otp_verified_until: validUntil })
    .eq("id", params.callSessionId);

  return { ok: true };
}
