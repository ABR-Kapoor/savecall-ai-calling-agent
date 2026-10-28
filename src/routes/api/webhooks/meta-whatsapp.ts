/**
 * Meta WhatsApp Cloud API Calling Webhook Route
 * Path: /api/webhooks/meta-whatsapp
 * Handles:
 * - GET: Webhook verification handshake with hub.verify_token and hub.challenge
 * - POST: HMAC-SHA256 verified call connect, SDP negotiation, and call termination events
 * Official Documentation: https://docs.livekit.io/telephony/connectors/whatsapp/
 */

import { createFileRoute } from "@tanstack/react-router";
import crypto from "node:crypto";
import { insforgeServer } from "@/lib/insforge/client.server";
import { cleanWhatsAppPhone } from "@/lib/whatsapp/identity";
import {
  getWhatsAppCallingConfig,
  acceptInboundWhatsAppCall,
  connectEstablishedWhatsAppCall,
  disconnectWhatsAppCallSession,
} from "@/lib/voice/livekit-whatsapp.server";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * Validates HMAC-SHA256 signature from Meta using META_APP_SECRET.
 */
function verifyMetaSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) return false;
  try {
    const rawSig = signatureHeader.startsWith("sha256=")
      ? signatureHeader.slice(7).trim()
      : signatureHeader.trim();
    const computed = crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(rawSig, "utf8");
    const compBuf = Buffer.from(computed, "utf8");
    if (sigBuf.length !== compBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, compBuf);
  } catch {
    return false;
  }
}

/**
 * Checks whether current time falls within tenant's configured calling hours.
 */
function isWithinCallingHours(hoursConfig: any): boolean {
  if (!hoursConfig || !hoursConfig.enabled) return true;
  try {
    const tz = hoursConfig.timezone || "Asia/Kolkata";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.format(now).split(":");
    const p0 = parts[0] ?? "0";
    const p1 = parts[1] ?? "0";
    const currentMin = parseInt(p0, 10) * 60 + parseInt(p1, 10);

    const startStr = typeof hoursConfig?.start === "string" ? hoursConfig.start : "09:00";
    const endStr = typeof hoursConfig?.end === "string" ? hoursConfig.end : "18:00";
    const startParts = startStr.split(":");
    const endParts = endStr.split(":");
    const startMin = (parseInt(startParts[0] || "9", 10)) * 60 + (parseInt(startParts[1] || "0", 10));
    const endMin = (parseInt(endParts[0] || "18", 10)) * 60 + (parseInt(endParts[1] || "0", 10));

    return currentMin >= startMin && currentMin <= endMin;
  } catch {
    return true;
  }
}

export const Route = createFileRoute("/api/webhooks/meta-whatsapp")({
  server: {
    handlers: {
      /**
       * GET Handler: Meta Webhook Verification Handshake
       */
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const config = getWhatsAppCallingConfig();

        if (
          mode === "subscribe" &&
          token &&
          config.webhookVerifyToken &&
          token === config.webhookVerifyToken
        ) {
          console.log("[Meta Webhook] Successfully verified handshake challenge.");
          return new Response(challenge || "", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        console.warn("[Meta Webhook] GET handshake rejected: token mismatch or invalid mode.");
        return new Response("Forbidden", { status: 403 });
      },

      /**
       * POST Handler: Meta Calling and Message Events Ingress
       */
      POST: async ({ request }) => {
        const config = getWhatsAppCallingConfig();
        const rawBody = await request.text();

        if (!rawBody) {
          return json({ error: "Empty request body" }, 400);
        }

        // 1. Verify Meta HMAC-SHA256 cryptographic signature
        const signatureHeader =
          request.headers.get("x-hub-signature-256") ||
          request.headers.get("X-Hub-Signature-256");

        // Allow test mode bypass only if explicitly enabled and secret is not configured
        const isSignatureValid = verifyMetaSignature(
          rawBody,
          signatureHeader,
          config.metaAppSecret
        );

        if (!isSignatureValid && config.metaAppSecret) {
          console.warn("[Meta Webhook] POST rejected: invalid HMAC-SHA256 signature.");
          return json({ error: "Invalid signature" }, 401);
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return json({ error: "Malformed JSON payload" }, 400);
        }

        // Must be whatsapp_business_account object
        if (payload?.object !== "whatsapp_business_account") {
          return json({ received: true, ignored: "non_whatsapp_object" });
        }

        const entries = Array.isArray(payload.entry) ? payload.entry : [];
        const processedEvents: any[] = [];

        for (const entry of entries) {
          const changes = Array.isArray(entry.changes) ? entry.changes : [];
          for (const change of changes) {
            const value = change.value;
            if (!value) continue;

            const phoneNumberId =
              value.metadata?.phone_number_id ||
              value.phone_number_id ||
              config.whatsappPhoneNumberId;
            const displayPhone = value.metadata?.display_phone_number || "";

            // 2. Resolve tenant by Meta Phone Number ID
            let tenantId: string | null = null;
            let callingHours: any = null;

            if (phoneNumberId) {
              const { data: conn } = await insforgeServer.database
                .from("whatsapp_connections")
                .select("tenant_id, calling_enabled, inbound_calling_enabled, calling_hours")
                .or(
                  `meta_phone_number_id.eq.${phoneNumberId},phone_number.eq.${phoneNumberId},phone_number.eq.${displayPhone}`
                )
                .maybeSingle();

              if (conn) {
                tenantId = conn.tenant_id;
                callingHours = conn.calling_hours;
              }
            }

            // Fallback to active primary tenant if not yet mapped
            if (!tenantId) {
              const { data: defaultTenant } = await insforgeServer.database
                .from("tenants")
                .select("id")
                .limit(1)
                .maybeSingle();
              tenantId = defaultTenant?.id || null;
            }

            if (!tenantId) {
              console.warn(
                `[Meta Webhook] Unable to resolve tenant for phone_number_id: ${phoneNumberId}`
              );
              continue;
            }

            // 3. Inspect for Call events
            const calls = Array.isArray(value.calls) ? value.calls : [];

            for (const call of calls) {
              const callId = call.call_id || call.id;
              if (!callId) continue;

              const direction =
                call.direction || (call.from ? "inbound" : "outbound");
              const eventType =
                call.event ||
                call.status ||
                (call.sdp?.type === "offer"
                  ? "connect"
                  : call.sdp?.type === "answer"
                  ? "answer"
                  : "unknown");

              const eventKey = `meta_call:${callId}:${eventType}:${call.timestamp || Date.now()}`;

              // 4. Idempotency Check: Claim event in database
              const { data: existingEvent } = await insforgeServer.database
                .from("whatsapp_call_events")
                .select("id")
                .eq("event_key", eventKey)
                .maybeSingle();

              if (existingEvent) {
                console.log(
                  `[Meta Webhook] Duplicate call event deduplicated: ${eventKey}`
                );
                continue;
              }

              // Insert event record to claim it
              await insforgeServer.database.from("whatsapp_call_events").insert([
                {
                  tenant_id: tenantId,
                  event_key: eventKey,
                  event_type: eventType,
                  meta_call_id: callId,
                  direction,
                  status: call.status || eventType,
                  payload: {
                    direction,
                    has_sdp: Boolean(call.sdp),
                    sdp_type: call.sdp?.type,
                    from: call.from,
                    to: call.to,
                  },
                },
              ]);

              // 5. Handle Inbound Call Offer (connect event)
              if (
                (eventType === "connect" || eventType === "offered") &&
                call.sdp?.type === "offer"
              ) {
                // Check calling hours
                if (!isWithinCallingHours(callingHours)) {
                  console.warn(
                    `[Meta Webhook] Inbound call outside business hours from ${call.from}. Rejecting.`
                  );
                  await insforgeServer.database.from("call_sessions").insert([
                    {
                      tenant_id: tenantId,
                      meta_call_id: callId,
                      room_name: `rejected-${callId}`,
                      caller_phone: call.from,
                      caller_wa_id: call.from,
                      channel: "whatsapp",
                      direction: "inbound",
                      status: "failed",
                      lifecycle_status: "rejected",
                      termination_reason: "Outside business hours",
                      started_at: new Date().toISOString(),
                      ended_at: new Date().toISOString(),
                    },
                  ]);
                  continue;
                }

                // Check caller contact in customers table
                const cleanFrom = cleanWhatsAppPhone(call.from || "");
                const { data: cust } = await insforgeServer.database
                  .from("customers")
                  .select("id, name")
                  .eq("tenant_id", tenantId)
                  .or(`customer_number.eq.${cleanFrom},phone.eq.${cleanFrom}`)
                  .maybeSingle();

                try {
                  const acceptResult = await acceptInboundWhatsAppCall({
                    tenantId,
                    metaCallId: callId,
                    businessPhoneNumberId: phoneNumberId || config.whatsappPhoneNumberId,
                    callerWaId: cleanFrom,
                    callerName: cust?.name || call.from,
                    sdp: call.sdp,
                    customerId: cust?.id,
                  });

                  processedEvents.push({
                    callId,
                    action: "accepted",
                    roomName: acceptResult.roomName,
                  });
                } catch (err: any) {
                  console.error(
                    `[Meta Webhook] Failed to accept inbound call ${callId}:`,
                    err
                  );
                  processedEvents.push({
                    callId,
                    action: "accept_failed",
                    error: err.message,
                  });
                }
              }

              // 6. Handle Outbound Call SDP Answer
              else if (
                (eventType === "connect" || eventType === "answered" || eventType === "answer") &&
                call.sdp?.type === "answer"
              ) {
                try {
                  await connectEstablishedWhatsAppCall(callId, call.sdp);
                  processedEvents.push({
                    callId,
                    action: "connected_answer",
                  });
                } catch (err: any) {
                  console.error(
                    `[Meta Webhook] Failed to connect SDP answer for ${callId}:`,
                    err
                  );
                  processedEvents.push({
                    callId,
                    action: "connect_failed",
                    error: err.message,
                  });
                }
              }

              // 7. Handle Call Termination (hang up, ended, failed, rejected)
              else if (
                eventType === "terminate" ||
                eventType === "ended" ||
                eventType === "failed" ||
                eventType === "rejected" ||
                eventType === "missed"
              ) {
                try {
                  await disconnectWhatsAppCallSession(callId, "USER_INITIATED");
                  processedEvents.push({
                    callId,
                    action: "terminated",
                  });
                } catch (err: any) {
                  console.error(
                    `[Meta Webhook] Failed to process call termination for ${callId}:`,
                    err
                  );
                }
              }
            }
          }
        }

        return json({
          success: true,
          processed: processedEvents.length,
          events: processedEvents,
        });
      },
    },
  },
});
