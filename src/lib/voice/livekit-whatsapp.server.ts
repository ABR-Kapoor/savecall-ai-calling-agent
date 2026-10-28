/**
 * InsurCall LiveKit Cloud x WhatsApp Business Telephony Connector Service
 * Official Reference: https://docs.livekit.io/telephony/connectors/whatsapp/
 * Uses livekit-server-sdk ConnectorClient to orchestrate:
 * - AcceptWhatsAppCall (Inbound customer-initiated calls)
 * - DialWhatsAppCall (Outbound business-initiated calls)
 * - ConnectWhatsAppCall (SDP answer handshake)
 * - DisconnectWhatsAppCall (Clean session teardown)
 */

import { ConnectorClient, RoomServiceClient } from "livekit-server-sdk";
import {
  SessionDescription,
  RoomAgentDispatch,
  DisconnectWhatsAppCallRequest_DisconnectReason,
} from "@livekit/protocol";
import { insforgeServer } from "@/lib/insforge/client.server";

export interface WhatsAppCallingConfig {
  livekitUrl: string;
  livekitApiKey: string;
  livekitApiSecret: string;
  whatsappAgentName: string;
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
  whatsappCloudApiVersion: string;
  metaAppSecret: string;
  webhookVerifyToken: string;
  callingEnabled: boolean;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  testMode: boolean;
  allowedTestRecipients: string[];
  destinationCountry: string;
}

export interface WhatsAppCallingValidationResult {
  ready: boolean;
  livekitConfigured: boolean;
  metaConfigured: boolean;
  isCloudLiveKit: boolean;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  testMode: boolean;
  missingVariables: string[];
  details: {
    livekitUrlHost: string | null;
    phoneNumberIdConfigured: boolean;
    agentName: string;
    apiVersion: string;
  };
}

export interface InboundCallAcceptParams {
  tenantId: string;
  metaCallId: string;
  businessPhoneNumberId: string;
  callerWaId: string;
  callerName?: string | undefined;
  sdp: { type: string; sdp: string };
  customerId?: string | undefined;
  customRoomName?: string | undefined;
}

export interface OutboundCallDialParams {
  tenantId: string;
  toPhoneNumber: string;
  callerName?: string | undefined;
  customerId?: string | undefined;
  businessPhoneNumberId?: string | undefined;
  destinationCountry?: string | undefined;
  clerkUserId?: string | undefined;
}

/**
 * Reads server-side configuration safely without leaking secrets to the client.
 */
export function getWhatsAppCallingConfig(): WhatsAppCallingConfig {
  const allowedStr = process.env["WHATSAPP_ALLOWED_TEST_RECIPIENTS"] || "";
  const allowedTestRecipients = allowedStr
    .split(",")
    .map((s) => s.trim().replace(/[^0-9+]/g, ""))
    .filter(Boolean);

  const rawVersion = process.env["WHATSAPP_CLOUD_API_VERSION"] || "26.0";
  // Strip optional 'v' prefix if present so 'v26.0' -> '26.0' as required by LiveKit protocol
  const whatsappCloudApiVersion = rawVersion.replace(/^v/i, "");

  return {
    livekitUrl: process.env["LIVEKIT_URL"] || "",
    livekitApiKey: process.env["LIVEKIT_API_KEY"] || "",
    livekitApiSecret: process.env["LIVEKIT_API_SECRET"] || "",
    whatsappAgentName: process.env["LIVEKIT_WHATSAPP_AGENT_NAME"] || "insurcall-voice-agent",
    whatsappPhoneNumberId:
      process.env["WHATSAPP_BUSINESS_PHONE_NUMBER_ID"] ||
      process.env["META_WHATSAPP_PHONE_NUMBER_ID"] ||
      "",
    whatsappAccessToken:
      process.env["WHATSAPP_ACCESS_TOKEN"] ||
      process.env["META_WHATSAPP_ACCESS_TOKEN"] ||
      "",
    whatsappCloudApiVersion,
    metaAppSecret: process.env["META_APP_SECRET"] || "",
    webhookVerifyToken:
      process.env["WHATSAPP_WEBHOOK_VERIFY_TOKEN"] ||
      process.env["META_WHATSAPP_VERIFY_TOKEN"] ||
      "",
    callingEnabled: process.env["WHATSAPP_CALLING_ENABLED"] === "true",
    inboundEnabled: process.env["WHATSAPP_INBOUND_CALLS_ENABLED"] === "true",
    outboundEnabled: process.env["WHATSAPP_OUTBOUND_CALLS_ENABLED"] === "true",
    testMode: process.env["WHATSAPP_CALL_TEST_MODE"] !== "false",
    allowedTestRecipients,
    destinationCountry: process.env["WHATSAPP_DESTINATION_COUNTRY"] || "IN",
  };
}

/**
 * Validates setup readiness truthfully without making live phone calls.
 */
export function validateWhatsAppCallingSetup(): WhatsAppCallingValidationResult {
  const config = getWhatsAppCallingConfig();
  const missing: string[] = [];

  if (!config.livekitUrl) missing.push("LIVEKIT_URL");
  if (!config.livekitApiKey) missing.push("LIVEKIT_API_KEY");
  if (!config.livekitApiSecret) missing.push("LIVEKIT_API_SECRET");
  if (!config.whatsappPhoneNumberId) missing.push("WHATSAPP_BUSINESS_PHONE_NUMBER_ID");
  if (!config.whatsappAccessToken) missing.push("WHATSAPP_ACCESS_TOKEN");
  if (!config.metaAppSecret) missing.push("META_APP_SECRET");
  if (!config.webhookVerifyToken) missing.push("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

  const isCloudLiveKit =
    config.livekitUrl.includes("livekit.cloud") ||
    config.livekitUrl.startsWith("https://") ||
    config.livekitUrl.startsWith("wss://");

  const livekitConfigured = Boolean(
    config.livekitUrl && config.livekitApiKey && config.livekitApiSecret
  );
  const metaConfigured = Boolean(
    config.whatsappPhoneNumberId &&
      config.whatsappAccessToken &&
      config.metaAppSecret &&
      config.webhookVerifyToken
  );

  let host: string | null = null;
  try {
    if (config.livekitUrl) {
      const parsed = new URL(
        config.livekitUrl.replace(/^ws(s)?:\/\//, "https://")
      );
      host = parsed.hostname;
    }
  } catch {
    host = null;
  }

  const ready =
    livekitConfigured &&
    metaConfigured &&
    config.callingEnabled &&
    (config.inboundEnabled || config.outboundEnabled);

  return {
    ready,
    livekitConfigured,
    metaConfigured,
    isCloudLiveKit,
    inboundEnabled: config.inboundEnabled,
    outboundEnabled: config.outboundEnabled,
    testMode: config.testMode,
    missingVariables: missing,
    details: {
      livekitUrlHost: host,
      phoneNumberIdConfigured: Boolean(config.whatsappPhoneNumberId),
      agentName: config.whatsappAgentName,
      apiVersion: config.whatsappCloudApiVersion,
    },
  };
}

/**
 * Initializes the LiveKit Connector client.
 * Converts WebSocket protocol to HTTPS for the Twirp RPC client if needed.
 */
export function getLiveKitConnectorClient(): ConnectorClient {
  const config = getWhatsAppCallingConfig();
  if (!config.livekitUrl || !config.livekitApiKey || !config.livekitApiSecret) {
    throw new Error(
      "LiveKit credentials missing. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET."
    );
  }

  let rpcHost = config.livekitUrl;
  if (rpcHost.startsWith("ws://")) {
    rpcHost = rpcHost.replace(/^ws:\/\//, "http://");
  } else if (rpcHost.startsWith("wss://")) {
    rpcHost = rpcHost.replace(/^wss:\/\//, "https://");
  }

  return new ConnectorClient(
    rpcHost,
    config.livekitApiKey,
    config.livekitApiSecret
  );
}

/**
 * Initializes RoomServiceClient for room inspection and session termination.
 */
export function getLiveKitRoomServiceClient(): RoomServiceClient {
  const config = getWhatsAppCallingConfig();
  let rpcHost = config.livekitUrl;
  if (rpcHost.startsWith("ws://")) {
    rpcHost = rpcHost.replace(/^ws:\/\//, "http://");
  } else if (rpcHost.startsWith("wss://")) {
    rpcHost = rpcHost.replace(/^wss:\/\//, "https://");
  }
  return new RoomServiceClient(
    rpcHost,
    config.livekitApiKey,
    config.livekitApiSecret
  );
}

/**
 * Handles incoming call connection via AcceptWhatsAppCall.
 */
export async function acceptInboundWhatsAppCall(
  params: InboundCallAcceptParams
): Promise<{ success: boolean; roomName: string; callSessionId: string }> {
  const config = getWhatsAppCallingConfig();

  if (!config.callingEnabled || !config.inboundEnabled) {
    throw new Error(
      "Inbound WhatsApp calling is disabled by configuration (WHATSAPP_CALLING_ENABLED / WHATSAPP_INBOUND_CALLS_ENABLED)."
    );
  }

  const roomName =
    params.customRoomName || `wa-call-${params.tenantId.slice(0, 8)}-${params.metaCallId.slice(0, 12)}`;

  // 1. Resolve or create customer record for caller
  let resolvedCustomerId = params.customerId;
  if (!resolvedCustomerId && params.callerWaId) {
    const { data: existingCust } = await insforgeServer.database
      .from("customers")
      .select("id")
      .eq("tenant_id", params.tenantId)
      .or(`customer_number.eq.${params.callerWaId},phone.eq.${params.callerWaId}`)
      .maybeSingle();

    if (existingCust) {
      resolvedCustomerId = existingCust.id;
    } else {
      const { data: createdCust } = await insforgeServer.database
        .from("customers")
        .insert([
          {
            tenant_id: params.tenantId,
            name: params.callerName || `WhatsApp Caller (+${params.callerWaId})`,
            phone: `+${params.callerWaId}`,
            customer_number: params.callerWaId,
            email: `caller-${params.callerWaId.slice(-6)}@whatsapp.insurcall.ai`,
          },
        ])
        .select("id")
        .maybeSingle();
      if (createdCust) {
        resolvedCustomerId = createdCust.id;
      }
    }
  }

  // 2. Idempotently create or retrieve call session record
  const { data: existingSession } = await insforgeServer.database
    .from("call_sessions")
    .select("id, room_name, lifecycle_status")
    .eq("meta_call_id", params.metaCallId)
    .maybeSingle();

  let callSessionId = existingSession?.id;

  if (!callSessionId) {
    const { data: newSession, error: createErr } = await insforgeServer.database
      .from("call_sessions")
      .insert([
        {
          tenant_id: params.tenantId,
          customer_id: resolvedCustomerId || null,
          meta_call_id: params.metaCallId,
          room_name: roomName,
          caller_name: params.callerName || "WhatsApp Caller",
          caller_phone: params.callerWaId,
          caller_wa_id: params.callerWaId,
          business_phone_number_id: params.businessPhoneNumberId,
          channel: "whatsapp",
          direction: "inbound",
          status: "active",
          lifecycle_status: "connecting",
          started_at: new Date().toISOString(),
          metadata: {
            source: "meta_whatsapp_cloud_api",
            api_version: config.whatsappCloudApiVersion,
          },
        },
      ])
      .select("id")
      .single();

    if (createErr || !newSession) {
      console.error("[LiveKit WhatsApp] Failed to insert call session:", createErr);
      throw new Error(`Failed to initialize call session: ${createErr?.message}`);
    }
    callSessionId = newSession.id;
  }

  // 2. Prepare participant metadata for the AI agent
  const participantMetadata = JSON.stringify({
    voice_session_id: callSessionId,
    tenant_id: params.tenantId,
    customer_id: resolvedCustomerId || params.customerId || null,
    customer_name: params.callerName || "Policyholder",
    customer_number: params.callerWaId,
    channel: "whatsapp",
    meta_call_id: params.metaCallId,
  });

  // 3. Build SessionDescription protobuf message from Meta's SDP offer
  const sdpMessage = new SessionDescription({
    type: params.sdp.type || "offer",
    sdp: params.sdp.sdp,
  });

  const connector = getLiveKitConnectorClient();

  console.log(
    `[LiveKit WhatsApp] Invoking acceptWhatsAppCall for Meta call ${params.metaCallId} into room ${roomName}`
  );

  try {
    const response = await connector.acceptWhatsAppCall({
      whatsappPhoneNumberId: params.businessPhoneNumberId,
      whatsappApiKey: config.whatsappAccessToken,
      whatsappCloudApiVersion: config.whatsappCloudApiVersion,
      whatsappCallId: params.metaCallId,
      sdp: sdpMessage,
      roomName,
      agents: [
        new RoomAgentDispatch({
          agentName: config.whatsappAgentName,
          metadata: participantMetadata,
        }),
      ],
      participantIdentity: `wa_${params.callerWaId.replace(/[^0-9]/g, "")}`,
      participantName: params.callerName || "WhatsApp Caller",
      participantMetadata,
      destinationCountry: config.destinationCountry,
      waitUntilAnswered: false,
    });

    const activeRoom = response.roomName || roomName;

    // 4. Update session to active
    await insforgeServer.database
      .from("call_sessions")
      .update({
        lifecycle_status: "active",
        room_name: activeRoom,
        updated_at: new Date().toISOString(),
      })
      .eq("id", callSessionId);

    return {
      success: true,
      roomName: activeRoom,
      callSessionId,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[LiveKit WhatsApp] acceptWhatsAppCall failed:`, errMsg);

    await insforgeServer.database
      .from("call_sessions")
      .update({
        lifecycle_status: "failed",
        status: "failed",
        termination_reason: `Accept failed: ${errMsg.slice(0, 200)}`,
        error_category: "CONNECTOR_ACCEPT_ERROR",
        diagnostic_metadata: { error: errMsg },
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", callSessionId);

    throw err;
  }
}

/**
 * Initiates an authorized outbound call via DialWhatsAppCall.
 */
export async function dialOutboundWhatsAppCall(
  params: OutboundCallDialParams
): Promise<{ success: boolean; metaCallId: string; roomName: string; callSessionId: string }> {
  const config = getWhatsAppCallingConfig();

  if (!config.callingEnabled || !config.outboundEnabled) {
    throw new Error(
      "Outbound WhatsApp calling is disabled by configuration (WHATSAPP_CALLING_ENABLED / WHATSAPP_OUTBOUND_CALLS_ENABLED)."
    );
  }

  const cleanTo = params.toPhoneNumber.replace(/[^0-9]/g, "");
  if (!cleanTo) {
    throw new Error("Invalid destination phone number.");
  }

  // Safety check: Test mode recipient allowlist
  if (config.testMode) {
    const isAllowed = config.allowedTestRecipients.some(
      (r) => r.replace(/[^0-9]/g, "") === cleanTo
    );
    if (!isAllowed) {
      throw new Error(
        `Safety Guard: In test mode, outbound calls can only be placed to authorized test recipients. Contact administrator to whitelist +${cleanTo}.`
      );
    }
  }

  const businessPhoneId =
    params.businessPhoneNumberId || config.whatsappPhoneNumberId;
  if (!businessPhoneId) {
    throw new Error("Missing WhatsApp Business Phone Number ID.");
  }

  const roomName = `wa-out-${params.tenantId.slice(0, 8)}-${Date.now()}`;

  // Create initial call session in 'initiated' state
  const { data: newSession, error: createErr } = await insforgeServer.database
    .from("call_sessions")
    .insert([
      {
        tenant_id: params.tenantId,
        customer_id: params.customerId || null,
        room_name: roomName,
        caller_name: params.callerName || "Customer",
        caller_phone: `+${cleanTo}`,
        caller_wa_id: cleanTo,
        business_phone_number_id: businessPhoneId,
        channel: "whatsapp",
        direction: "outbound",
        status: "active",
        lifecycle_status: "initiated",
        started_at: new Date().toISOString(),
        metadata: {
          initiated_by: params.clerkUserId || "staff",
          test_mode: config.testMode,
        },
      },
    ])
      .select("id")
      .single();

  if (createErr || !newSession) {
    throw new Error(`Failed to create outbound call record: ${createErr?.message}`);
  }

  const callSessionId = newSession.id;

  const participantMetadata = JSON.stringify({
    voice_session_id: callSessionId,
    tenant_id: params.tenantId,
    customer_id: params.customerId || null,
    customer_name: params.callerName || "Policyholder",
    customer_number: cleanTo,
    channel: "whatsapp",
    direction: "outbound",
  });

  const connector = getLiveKitConnectorClient();

  console.log(`[LiveKit WhatsApp] Invoking dialWhatsAppCall to +${cleanTo}`);

  try {
    const response = await connector.dialWhatsAppCall({
      whatsappPhoneNumberId: businessPhoneId,
      whatsappToPhoneNumber: cleanTo,
      whatsappApiKey: config.whatsappAccessToken,
      whatsappCloudApiVersion: config.whatsappCloudApiVersion,
      roomName,
      agents: [
        new RoomAgentDispatch({
          agentName: config.whatsappAgentName,
          metadata: participantMetadata,
        }),
      ],
      participantIdentity: `wa_${cleanTo}`,
      participantName: params.callerName || "Policyholder",
      participantMetadata,
      destinationCountry: params.destinationCountry || config.destinationCountry,
      ringingTimeout: 30,
    });

    const metaCallId = response.whatsappCallId;
    const finalRoom = response.roomName || roomName;

    await insforgeServer.database
      .from("call_sessions")
      .update({
        meta_call_id: metaCallId,
        room_name: finalRoom,
        lifecycle_status: "ringing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", callSessionId);

    return {
      success: true,
      metaCallId,
      roomName: finalRoom,
      callSessionId,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[LiveKit WhatsApp] dialWhatsAppCall failed:`, errMsg);

    await insforgeServer.database
      .from("call_sessions")
      .update({
        lifecycle_status: "failed",
        status: "failed",
        termination_reason: `Dial failed: ${errMsg.slice(0, 200)}`,
        error_category: "CONNECTOR_DIAL_ERROR",
        diagnostic_metadata: { error: errMsg },
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", callSessionId);

    throw err;
  }
}

/**
 * Connects an established WhatsApp call using the SDP answer from Meta.
 */
export async function connectEstablishedWhatsAppCall(
  metaCallId: string,
  sdp: { type: string; sdp: string }
): Promise<{ success: boolean }> {
  const connector = getLiveKitConnectorClient();

  const sdpMessage = new SessionDescription({
    type: sdp.type || "answer",
    sdp: sdp.sdp,
  });

  console.log(`[LiveKit WhatsApp] Connecting established call ${metaCallId}`);

  await connector.connectWhatsAppCall(metaCallId, sdpMessage);

  await insforgeServer.database
    .from("call_sessions")
    .update({
      lifecycle_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("meta_call_id", metaCallId);

  return { success: true };
}

/**
 * Disconnects an active WhatsApp call and cleans up room resources.
 */
export async function disconnectWhatsAppCallSession(
  callSessionIdOrMetaCallId: string,
  reason: "USER_INITIATED" | "BUSINESS_INITIATED" = "BUSINESS_INITIATED"
): Promise<{ success: boolean }> {
  const config = getWhatsAppCallingConfig();

  // Find call session
  const { data: session } = await insforgeServer.database
    .from("call_sessions")
    .select("id, meta_call_id, room_name, started_at")
    .or(`id.eq.${callSessionIdOrMetaCallId},meta_call_id.eq.${callSessionIdOrMetaCallId}`)
    .maybeSingle();

  if (!session) {
    console.warn(`[LiveKit WhatsApp] Call session not found for disconnect: ${callSessionIdOrMetaCallId}`);
    return { success: false };
  }

  const metaCallId = session.meta_call_id;

  if (metaCallId && config.whatsappAccessToken) {
    try {
      const connector = getLiveKitConnectorClient();
      const discReason =
        reason === "USER_INITIATED"
          ? DisconnectWhatsAppCallRequest_DisconnectReason.USER_INITIATED
          : DisconnectWhatsAppCallRequest_DisconnectReason.BUSINESS_INITIATED;

      await connector.disconnectWhatsAppCall(
        metaCallId,
        config.whatsappAccessToken,
        discReason
      );
    } catch (err) {
      console.warn(`[LiveKit WhatsApp] connector.disconnectWhatsAppCall notice:`, err);
    }
  }

  // Close LiveKit room if room service client available
  if (session.room_name && config.livekitApiKey) {
    try {
      const roomClient = getLiveKitRoomServiceClient();
      await roomClient.deleteRoom(session.room_name);
    } catch {
      // Room might already be closed
    }
  }

  // Calculate duration
  const now = new Date();
  let durationSec = 0;
  if (session.started_at) {
    const started = new Date(session.started_at);
    durationSec = Math.max(0, Math.floor((now.getTime() - started.getTime()) / 1000));
  }

  await insforgeServer.database
    .from("call_sessions")
    .update({
      lifecycle_status: "ended",
      status: "completed",
      termination_reason: reason === "USER_INITIATED" ? "Caller hung up" : "Staff ended call",
      duration_sec: durationSec,
      ended_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", session.id);

  return { success: true };
}
