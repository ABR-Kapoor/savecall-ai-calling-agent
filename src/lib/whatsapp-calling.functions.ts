/**
 * InsurCall WhatsApp Business Calling Server Functions
 * Multi-tenant, authenticated server functions for:
 * - Calling readiness & configuration status
 * - Setting up business calling hours & feature gates
 * - Initiating authorized outbound WhatsApp calls
 * - Terminating active calls
 * - Non-intrusive pipeline validation
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { insforgeServer } from "@/lib/insforge/client.server";
import { resolveCurrentTenantId } from "@/lib/insurance.functions";
import {
  getWhatsAppCallingConfig,
  validateWhatsAppCallingSetup,
  dialOutboundWhatsAppCall,
  disconnectWhatsAppCallSession,
} from "@/lib/voice/livekit-whatsapp.server";

const ScopedCallingInput = z.object({
  clerkUserId: z.string().optional(),
  tenantId: z.string().optional(),
});

/**
 * GET: Retrieves WhatsApp Business Calling status & diagnostics.
 */
export const getWhatsAppCallingStatus = createServerFn({ method: "GET", strict: false })
  .validator((input?: z.infer<typeof ScopedCallingInput>) =>
    ScopedCallingInput.parse(input ?? {})
  )
  .handler(async ({ data: input }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
      const validation = validateWhatsAppCallingSetup();
      const config = getWhatsAppCallingConfig();

      let connectionRecord: any = null;
      if (tenantId) {
        const { data: conn } = await insforgeServer.database
          .from("whatsapp_connections")
          .select(
            "id, session_name, provider, status, phone_number, meta_phone_number_id, calling_enabled, inbound_calling_enabled, outbound_calling_enabled, calling_hours, display_name, updated_at"
          )
          .eq("tenant_id", tenantId)
          .maybeSingle();
        connectionRecord = conn;
      }

      const publicBase =
        process.env["PUBLIC_API_BASE_URL"] ||
        (typeof window !== "undefined" ? window.location.origin : "https://app.insurcall.ai");

      const webhookUrl = `${publicBase.replace(/\/$/, "")}/api/webhooks/meta-whatsapp`;

      return {
        success: true,
        validation,
        connection: connectionRecord,
        webhookUrl,
        agentName: config.whatsappAgentName,
        callingEnabled: connectionRecord?.calling_enabled ?? config.callingEnabled,
        inboundEnabled: connectionRecord?.inbound_calling_enabled ?? config.inboundEnabled,
        outboundEnabled: connectionRecord?.outbound_calling_enabled ?? config.outboundEnabled,
        testMode: config.testMode,
        allowedTestRecipients: config.allowedTestRecipients,
        destinationCountry: config.destinationCountry,
        callingHours: connectionRecord?.calling_hours || {
          enabled: false,
          start: "09:00",
          end: "18:00",
          timezone: "Asia/Kolkata",
        },
      };
    } catch (err: any) {
      console.error("[WhatsApp Calling] Status error:", err);
      throw new Error(err.message || "Failed to load WhatsApp Calling status");
    }
  });

/**
 * POST: Updates tenant WhatsApp Calling preferences.
 */
const UpdateCallingSettingsSchema = z.object({
  clerkUserId: z.string().optional(),
  tenantId: z.string().optional(),
  metaPhoneNumberId: z.string().optional(),
  displayName: z.string().optional(),
  callingEnabled: z.boolean().optional(),
  inboundCallingEnabled: z.boolean().optional(),
  outboundCallingEnabled: z.boolean().optional(),
  callingHours: z
    .object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string(),
      timezone: z.string().optional(),
    })
    .optional(),
});

export const updateWhatsAppCallingSettings = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof UpdateCallingSettingsSchema>) =>
    UpdateCallingSettingsSchema.parse(input)
  )
  .handler(async ({ data: input }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
      if (!tenantId) {
        throw new Error("Unauthorized: Tenant could not be resolved.");
      }

      // Check if whatsapp_connections row exists
      const { data: existing } = await insforgeServer.database
        .from("whatsapp_connections")
        .select("id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (input.metaPhoneNumberId !== undefined) {
        updatePayload["meta_phone_number_id"] = input.metaPhoneNumberId;
      }
      if (input.displayName !== undefined) {
        updatePayload["display_name"] = input.displayName;
      }
      if (input.callingEnabled !== undefined) {
        updatePayload["calling_enabled"] = input.callingEnabled;
      }
      if (input.inboundCallingEnabled !== undefined) {
        updatePayload["inbound_calling_enabled"] = input.inboundCallingEnabled;
      }
      if (input.outboundCallingEnabled !== undefined) {
        updatePayload["outbound_calling_enabled"] = input.outboundCallingEnabled;
      }
      if (input.callingHours !== undefined) {
        updatePayload["calling_hours"] = input.callingHours;
      }

      if (existing) {
        const { error: updErr } = await insforgeServer.database
          .from("whatsapp_connections")
          .update(updatePayload)
          .eq("id", existing.id);

        if (updErr) throw new Error(updErr.message);
      } else {
        const { error: insErr } = await insforgeServer.database
          .from("whatsapp_connections")
          .insert([
            {
              tenant_id: tenantId,
              session_name: "meta_cloud_calling",
              provider: "meta_cloud",
              status: "CONNECTED",
              ...updatePayload,
            },
          ]);

        if (insErr) throw new Error(insErr.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error("[WhatsApp Calling] Update settings error:", err);
      throw new Error(err.message || "Failed to update WhatsApp calling settings");
    }
  });

/**
 * GET: Returns call sessions with WhatsApp filter support.
 */
const GetCallSessionsFilterSchema = z.object({
  clerkUserId: z.string().optional(),
  tenantId: z.string().optional(),
  channel: z.enum(["all", "whatsapp", "webrtc", "phone"]).optional(),
  limit: z.number().optional().default(50),
});

export const getUnifiedCallSessions = createServerFn({ method: "GET", strict: false })
  .validator((input?: z.infer<typeof GetCallSessionsFilterSchema>) =>
    GetCallSessionsFilterSchema.parse(input ?? {})
  )
  .handler(async ({ data: input }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
      if (!tenantId) return [];

      let query = insforgeServer.database
        .from("call_sessions")
        .select(
          "id, room_name, caller_name, caller_phone, caller_wa_id, started_at, ended_at, duration_sec, status, lifecycle_status, direction, channel, meta_call_id, summary, transcript, risk_state, customer_id, termination_reason"
        )
        .eq("tenant_id", tenantId)
        .order("started_at", { ascending: false })
        .limit(input?.limit || 50);

      if (input?.channel && input.channel !== "all") {
        query = query.eq("channel", input.channel);
      }

      const { data: sessions, error } = await query;
      if (error) throw new Error(error.message);
      if (!sessions || sessions.length === 0) return [];

      const customerIds = [
        ...new Set(sessions.map((s: any) => s.customer_id).filter(Boolean)),
      ];

      const { data: custs } =
        customerIds.length > 0
          ? await insforgeServer.database
              .from("customers")
              .select("id, name, customer_number, email")
              .eq("tenant_id", tenantId)
              .in("id", customerIds)
          : { data: [] };

      const custMap = new Map((custs || []).map((c: any) => [c.id, c]));

      return sessions.map((s: any) => ({
        ...s,
        customers:
          custMap.get(s.customer_id) ||
          (s.caller_name ? { name: s.caller_name } : null),
      }));
    } catch (err: any) {
      console.error("[WhatsApp Calling] Get unified sessions error:", err);
      throw new Error(err.message || "Failed to load call sessions");
    }
  });

/**
 * POST: Initiates an authorized outbound WhatsApp voice call.
 */
const InitiateOutboundCallSchema = z.object({
  clerkUserId: z.string().optional(),
  tenantId: z.string().optional(),
  toPhoneNumber: z.string().min(5),
  callerName: z.string().optional(),
  customerId: z.string().optional(),
  confirmed: z.boolean(),
});

export const initiateOutboundWhatsAppCallServerFn = createServerFn({
  method: "POST",
  strict: false,
})
  .validator((input: z.infer<typeof InitiateOutboundCallSchema>) =>
    InitiateOutboundCallSchema.parse(input)
  )
  .handler(async ({ data: input }) => {
    try {
      if (!input.confirmed) {
        throw new Error("Explicit user confirmation is required to initiate an outbound call.");
      }

      const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
      if (!tenantId) {
        throw new Error("Unauthorized: Tenant membership not verified.");
      }

      // Verify tenant connection calling status
      const { data: conn } = await insforgeServer.database
        .from("whatsapp_connections")
        .select("calling_enabled, outbound_calling_enabled, meta_phone_number_id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const globalConfig = getWhatsAppCallingConfig();
      const callingEnabled = conn?.calling_enabled ?? globalConfig.callingEnabled;
      const outboundEnabled = conn?.outbound_calling_enabled ?? globalConfig.outboundEnabled;

      if (!callingEnabled || !outboundEnabled) {
        throw new Error(
          "Outbound WhatsApp calling is disabled for this tenant. Enable it in Calling Settings."
        );
      }

      const businessPhoneId =
        conn?.meta_phone_number_id || globalConfig.whatsappPhoneNumberId;

      const result = await dialOutboundWhatsAppCall({
        tenantId,
        toPhoneNumber: input.toPhoneNumber,
        callerName: input.callerName,
        customerId: input.customerId,
        businessPhoneNumberId: businessPhoneId,
        clerkUserId: input.clerkUserId,
      });

      return {
        success: true,
        metaCallId: result.metaCallId,
        roomName: result.roomName,
        callSessionId: result.callSessionId,
      };
    } catch (err: any) {
      console.error("[WhatsApp Calling] Initiate outbound error:", err);
      throw new Error(err.message || "Failed to initiate outbound WhatsApp call");
    }
  });

/**
 * POST: Safely terminates an active WhatsApp voice call.
 */
const TerminateCallSchema = z.object({
  callSessionId: z.string(),
  clerkUserId: z.string().optional(),
});

export const terminateWhatsAppCallServerFn = createServerFn({
  method: "POST",
  strict: false,
})
  .validator((input: z.infer<typeof TerminateCallSchema>) =>
    TerminateCallSchema.parse(input)
  )
  .handler(async ({ data: input }) => {
    try {
      const result = await disconnectWhatsAppCallSession(
        input.callSessionId,
        "BUSINESS_INITIATED"
      );
      return result;
    } catch (err: any) {
      console.error("[WhatsApp Calling] Terminate call error:", err);
      throw new Error(err.message || "Failed to terminate call");
    }
  });

/**
 * POST: Non-intrusive setup and configuration validation.
 */
export const validateCallingSetupServerFn = createServerFn({
  method: "POST",
  strict: false,
})
  .handler(async () => {
    try {
      const validation = validateWhatsAppCallingSetup();
      const config = getWhatsAppCallingConfig();

      const checkList = [
        {
          id: "livekit_url",
          label: "LiveKit URL Configured",
          passed: Boolean(config.livekitUrl),
          detail: config.livekitUrl ? config.livekitUrl.split("@").pop() : "Missing LIVEKIT_URL",
        },
        {
          id: "livekit_cloud",
          label: "LiveKit Cloud Telephony Verified",
          passed: validation.isCloudLiveKit,
          detail: validation.isCloudLiveKit
            ? "Cloud project detected"
            : "Self-hosted URL detected. Telephony WhatsApp Connector requires LiveKit Cloud.",
        },
        {
          id: "livekit_keys",
          label: "LiveKit API Key & Secret",
          passed: Boolean(config.livekitApiKey && config.livekitApiSecret),
          detail:
            config.livekitApiKey && config.livekitApiSecret
              ? "Credentials present"
              : "Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET",
        },
        {
          id: "meta_phone_id",
          label: "Meta Phone Number ID",
          passed: Boolean(config.whatsappPhoneNumberId),
          detail: config.whatsappPhoneNumberId || "Missing WHATSAPP_BUSINESS_PHONE_NUMBER_ID",
        },
        {
          id: "meta_token",
          label: "Meta Access Token",
          passed: Boolean(config.whatsappAccessToken),
          detail: config.whatsappAccessToken
            ? "Access token configured"
            : "Missing WHATSAPP_ACCESS_TOKEN",
        },
        {
          id: "meta_secret",
          label: "Meta App Secret",
          passed: Boolean(config.metaAppSecret),
          detail: config.metaAppSecret
            ? "HMAC App Secret configured"
            : "Missing META_APP_SECRET",
        },
        {
          id: "verify_token",
          label: "Webhook Verify Token",
          passed: Boolean(config.webhookVerifyToken),
          detail: config.webhookVerifyToken
            ? "Verify token configured"
            : "Missing WHATSAPP_WEBHOOK_VERIFY_TOKEN",
        },
        {
          id: "agent_name",
          label: "AI Voice Agent Dispatch",
          passed: Boolean(config.whatsappAgentName),
          detail: `Worker: ${config.whatsappAgentName}`,
        },
        {
          id: "calling_gates",
          label: "Calling Feature Gates",
          passed: config.callingEnabled,
          detail: config.callingEnabled
            ? `Inbound: ${config.inboundEnabled}, Outbound: ${config.outboundEnabled}`
            : "Feature disabled (WHATSAPP_CALLING_ENABLED=false)",
        },
      ];

      return {
        success: true,
        validation,
        checkList,
      };
    } catch (err: any) {
      console.error("[WhatsApp Calling] Validation test error:", err);
      throw new Error(err.message || "Validation failed");
    }
  });
