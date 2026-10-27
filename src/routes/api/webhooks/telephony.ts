import { createFileRoute } from "@tanstack/react-router";
import { insforgeServer } from "@/lib/insforge/client.server";
import { normalizeE164, formatDisplayNumber } from "@/lib/telephony/indian-carriers";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

interface TelephonyWebhookPayload {
  CallSid?: string;
  call_id?: string;
  CallId?: string;
  To?: string;
  destination?: string;
  DialedNumber?: string;
  From?: string;
  caller?: string;
  CallerNumber?: string;
  EventType?: string;
  Status?: string;
  CallStatus?: string;
  Duration?: string;
  CallDuration?: string;
}

export const Route = createFileRoute("/api/webhooks/telephony")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          let body: TelephonyWebhookPayload = {};

          try {
            body = JSON.parse(rawBody) as TelephonyWebhookPayload;
          } catch {
            // Support URL-encoded telco webhook payloads (e.g. Twilio, Exotel, Tata Tele)
            const params = new URLSearchParams(rawBody);
            const parsed: Record<string, string> = {};
            for (const [key, val] of params.entries()) {
              parsed[key] = val;
            }
            body = parsed as TelephonyWebhookPayload;
          }

          const callSid = body.CallSid || body.call_id || body.CallId || `tel_${Date.now()}`;
          const rawTo = body.To || body.destination || body.DialedNumber || "";
          const rawFrom = body.From || body.caller || body.CallerNumber || "";
          const eventType = body.EventType || body.Status || body.CallStatus || "call.initiated";

          if (!rawTo) {
            return json({ error: "Missing destination number (To)" }, 400);
          }

          const normalizedTo = normalizeE164(rawTo);
          const normalizedFrom = rawFrom ? normalizeE164(rawFrom) : "+919876543210";

          // 1. Resolve phone number record by normalized number or routing DID
          const { data: phones, error: phoneErr } = await insforgeServer.database
            .from("phone_numbers")
            .select("id, tenant_id, agent_id, phone_number, status, forwarding_config, inbound_enabled")
            .or(`phone_number.eq.${normalizedTo},forwarding_config->>routingDid.eq.${normalizedTo}`);

          if (phoneErr) {
            console.error("Telephony webhook phone lookup error:", phoneErr.message);
            return json({ error: "Database error resolving destination" }, 500);
          }

          const matchedPhone = phones?.[0];
          if (!matchedPhone) {
            return json(
              {
                error: "Destination number not registered in InsurCall",
                destination: normalizedTo,
              },
              404
            );
          }

          // Check if number is authorized for incoming calls
          if (matchedPhone.status !== "ACTIVE" && matchedPhone.status !== "TESTING") {
            return json(
              {
                error: "Phone number is not active",
                status: matchedPhone.status,
                notice: "Complete carrier verification and test call in InsurCall dashboard to activate",
              },
              403
            );
          }

          if (!matchedPhone.inbound_enabled) {
            return json({ error: "Inbound calling is currently disabled for this number" }, 403);
          }

          const tenantId = matchedPhone.tenant_id;

          // 2. Handle call events
          if (eventType === "call.completed" || eventType === "completed") {
            const durationSec = parseInt(body.Duration || body.CallDuration || "0", 10);
            await insforgeServer.database
              .from("call_sessions")
              .update({
                status: "completed",
                ended_at: new Date().toISOString(),
                duration_seconds: durationSec,
                resolution_state: "resolved_by_ai",
              })
              .eq("tenant_id", tenantId)
              .eq("room_name", `tel_${callSid}`);

            return json({ status: "call_ended_recorded", callSid });
          }

          // 3. Inbound call initiated - create call session and dispatch to LiveKit voice room
          const roomName = `tel_${callSid}`;

          // Lookup if customer exists for this caller number in this tenant
          let callerName = "Direct Inbound Caller";
          let customerId: string | null = null;

          const { data: existingCustomer } = await insforgeServer.database
            .from("customers")
            .select("id, name")
            .eq("tenant_id", tenantId)
            .eq("phone", normalizedFrom)
            .maybeSingle();

          if (existingCustomer) {
            callerName = existingCustomer.name;
            customerId = existingCustomer.id;
          }

          const fwdConfig = matchedPhone.forwarding_config as Record<string, unknown> | null;
          const carrierName = typeof fwdConfig?.["carrierName"] === "string" ? fwdConfig["carrierName"] : "Carrier";

          const { data: newSession, error: sessionErr } = await insforgeServer.database
            .from("call_sessions")
            .insert([
              {
                tenant_id: tenantId,
                agent_id: matchedPhone.agent_id || null,
                customer_id: customerId,
                room_name: roomName,
                caller_name: callerName,
                caller_phone: normalizedFrom,
                status: "active",
                risk_state: "LOW",
                started_at: new Date().toISOString(),
              },
            ])
            .select("id")
            .single();

          if (sessionErr) {
            console.error("Failed to persist inbound telephony call session:", sessionErr.message);
          }

          // Return instruction payload for the telephony provider gateway
          return json({
            status: "accepted",
            callSid,
            tenantId,
            phoneNumberId: matchedPhone.id,
            callSessionId: newSession?.id || null,
            roomName,
            routing: {
              type: "livekit_sip_bridge",
              sipUri: `sip:${roomName}@livekit.insurcall.ai`,
              callerIdPreserved: true,
              agentGreeting:
                "Hello! Thank you for calling. I am your AI receptionist. How can I assist you today?",
            },
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Telephony webhook processing failed";
          console.error("Webhook processing error:", msg);
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
