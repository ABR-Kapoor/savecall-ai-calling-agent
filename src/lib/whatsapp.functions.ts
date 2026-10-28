/**
 * InsurCall WhatsApp Server Functions
 * Multi-tenant connection management, QR pairing, unified inbox, and human takeover.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { insforgeServer } from "@/lib/insforge/client.server";
import { resolveCurrentTenantId } from "@/lib/insurance.functions";
import { defaultOpenWAAdapter } from "@/lib/whatsapp/openwa-adapter";
import { evaluateOutboundWhatsAppGate } from "@/lib/whatsapp/outbound-guard.server";
import { parseWhatsAppIdentity, cleanWhatsAppPhone } from "@/lib/whatsapp/identity";
import type {
  WhatsAppConnectionRecord,
  WhatsAppConversationRecord,
  WhatsAppMessageRecord,
  WhatsAppDiagnosticsResponse,
  WhatsAppHistorySyncMeta,
} from "./whatsapp/types";

function withoutWebhookSecret(
  connection: WhatsAppConnectionRecord | null
): Omit<WhatsAppConnectionRecord, "webhook_secret"> | null {
  if (!connection) return null;
  const { webhook_secret: _secret, ...safeConnection } = connection;
  return safeConnection;
}

const ScopedWhatsAppInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});

/**
 * 1. Get current WhatsApp connection for the authenticated tenant
 */
export const getWhatsAppConnection = createServerFn({ method: "GET", strict: false })
  .validator((input?: z.infer<typeof ScopedWhatsAppInput>) =>
    ScopedWhatsAppInput.parse(input ?? {})
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) {
      return { connection: null, providerHealth: { healthy: false, status: "Unauthorized" } };
    }

    const [connRes, health] = await Promise.all([
      insforgeServer.database
        .from("whatsapp_connections")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      defaultOpenWAAdapter.checkHealth(),
    ]);

    const connection = (connRes.data || null) as WhatsAppConnectionRecord | null;

    // If connection exists and is in QR_READY or STARTING, probe OpenWA for latest state
    if (connection && connection.provider_session_id && connection.status !== "CONNECTED") {
      try {
        const liveSession = await defaultOpenWAAdapter.getSession(connection.provider_session_id);
        if (liveSession.status === "ready" || liveSession.status === "authenticated") {
          await insforgeServer.database
            .from("whatsapp_connections")
            .update({
              status: "CONNECTED",
              phone_number: liveSession.phone || connection.phone_number,
              connected_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);
          connection.status = "CONNECTED";
          connection.phone_number = liveSession.phone || connection.phone_number;
        }
      } catch {
        // gateway not ready yet
      }
    }

    return {
      connection: withoutWebhookSecret(connection),
      providerHealth: health,
    };
  });

const DiagnosticsInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});

/**
 * 1b. Real-time connection diagnostic query for WhatsApp
 */
export const getWhatsAppDiagnostics = createServerFn({ method: "GET", strict: false })
  .validator((input?: z.infer<typeof DiagnosticsInput>) =>
    DiagnosticsInput.parse(input ?? {})
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) {
      throw new Error("403: Forbidden - Tenant membership required");
    }

    const { data: conn } = await insforgeServer.database
      .from("whatsapp_connections")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const [convCountRes, msgCountRes, lastInboundRes, lastMsgRes] = await Promise.all([
      insforgeServer.database
        .from("whatsapp_conversations")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_demo", false),
      insforgeServer.database
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_demo", false),
      insforgeServer.database
        .from("whatsapp_messages")
        .select("created_at, phone, body")
        .eq("tenant_id", tenantId)
        .eq("direction", "inbound")
        .eq("is_demo", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      insforgeServer.database
        .from("whatsapp_messages")
        .select("created_at, body, direction, phone")
        .eq("tenant_id", tenantId)
        .eq("is_demo", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    let runtimeDiag: WhatsAppDiagnosticsResponse | null = null;
    if (conn?.provider_session_id) {
      try {
        runtimeDiag = await defaultOpenWAAdapter.getDiagnostics(conn.provider_session_id);
      } catch {
        // Gateway not reachable
      }
    }

    const connMeta = conn?.metadata as Record<string, unknown> | undefined;
    const historySyncMeta: WhatsAppHistorySyncMeta | undefined =
      connMeta && typeof connMeta === "object" && "history_sync" in connMeta
        ? (connMeta["history_sync"] as WhatsAppHistorySyncMeta | undefined)
        : undefined;

    return {
      connection: withoutWebhookSecret(conn),
      gatewayReachable: runtimeDiag?.gatewayReachable ?? false,
      socketOpen: runtimeDiag?.socketOpen ?? false,
      sessionStatus: runtimeDiag?.sessionStatus ?? conn?.status ?? "NOT_CONNECTED",
      authenticated: runtimeDiag?.authenticated ?? (conn?.status === "CONNECTED"),
      phone: runtimeDiag?.phone ?? conn?.phone_number ?? null,
      name: runtimeDiag?.name ?? null,
      lastConnectedAt: runtimeDiag?.lastConnectedAt ?? conn?.connected_at ?? null,
      lastDisconnectAt: runtimeDiag?.lastDisconnectAt ?? null,
      lastDisconnectReason: runtimeDiag?.lastDisconnectReason ?? null,
      historySync: runtimeDiag?.historySync ?? {
        status: historySyncMeta?.status || "idle",
        lastSyncAt: historySyncMeta?.last_synced_at || null,
        chatsCount: 0,
        contactsCount: 0,
        messagesCount: historySyncMeta?.total_messages || 0,
        syncId: historySyncMeta?.sync_id || null,
        processedBatches: historySyncMeta?.batch_index !== undefined
          ? historySyncMeta.batch_index + 1
          : 0,
        totalBatches: historySyncMeta?.total_batches || 0,
        processedMessages: historySyncMeta?.synced_messages_count || 0,
        lastError: historySyncMeta?.last_error || null,
      },
      liveInboundCount: runtimeDiag?.liveInboundCount ?? 0,
      lastInboundAt: runtimeDiag?.lastInboundAt ?? lastInboundRes?.data?.created_at ?? null,
      lastPersistedAt: lastMsgRes?.data?.created_at ?? null,
      totalRealConversations: convCountRes.count ?? 0,
      totalRealMessages: msgCountRes.count ?? 0,
      webhookHealth: runtimeDiag?.webhookHealth ?? {
        url: null,
        lastDispatchedAt: null,
        lastError: null,
        totalDispatched: 0,
        totalFailed: 0,
      },
    };
  });

const InitiateSessionInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
  sessionName: z.string().min(2).max(50).optional(),
});

/**
 * 2. Initiate WhatsApp session and generate real provider QR code
 */
export const initiateWhatsAppSession = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof InitiateSessionInput>) =>
    InitiateSessionInput.parse(input)
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) {
      throw new Error("403: Forbidden - Active tenant membership required");
    }

    // 1. Check provider health
    const health = await defaultOpenWAAdapter.checkHealth();
    if (!health.healthy) {
      throw new Error(`WhatsApp gateway service is offline (${health.status}). Please start the OpenWA service.`);
    }

    const sessionName =
      input.sessionName?.trim() || `insurcall-${tenantId.slice(0, 8)}`;

    // 2. Resolve or create database connection record
    let { data: record } = await insforgeServer.database
      .from("whatsapp_connections")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("session_name", sessionName)
      .maybeSingle();

    const webhookSecret =
      (record?.webhook_secret as string) ||
      crypto.randomBytes(24).toString("hex");

    if (!record) {
      const { data: inserted, error: insErr } = await insforgeServer.database
        .from("whatsapp_connections")
        .insert({
          tenant_id: tenantId,
          session_name: sessionName,
          status: "STARTING",
          webhook_secret: webhookSecret,
          auto_reply_enabled: true,
          human_takeover_enabled: false,
        })
        .select()
        .single();

      if (insErr) throw new Error(insErr.message);
      record = inserted;
    }

    // 3. Create or reuse provider session
    let providerSessionId = record.provider_session_id;
    if (!providerSessionId) {
      const created = await defaultOpenWAAdapter.createSession(sessionName);
      providerSessionId = created.id;
    }

    // 4. Start provider session
    await defaultOpenWAAdapter.startSession(providerSessionId);

    // 5. Register webhook with HMAC secret
    const appBaseUrl =
      process.env["SAVECALL_API_URL"] ||
      process.env["APP_BASE_URL"] ||
      "http://127.0.0.1:5173";
    const webhookUrl = `${appBaseUrl}/api/webhooks/whatsapp`;

    try {
      const wh = await defaultOpenWAAdapter.registerWebhook(providerSessionId, {
        url: webhookUrl,
        secret: webhookSecret,
      });
      await insforgeServer.database
        .from("whatsapp_connections")
        .update({ webhook_id: wh.webhookId })
        .eq("id", record.id);
    } catch (whErr) {
      console.warn("[OpenWA] Webhook registration warning:", whErr);
    }

    // 6. Request real QR code from engine
    let qrData: string | null = null;
    let qrStatus = "STARTING";
    try {
      const qrRes = await defaultOpenWAAdapter.getQrCode(providerSessionId);
      qrData = qrRes.qr;
      qrStatus = qrRes.status === "ready" ? "CONNECTED" : "QR_READY";
    } catch {
      qrStatus = "STARTING";
    }

    const qrExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();

    const { data: updated } = await insforgeServer.database
      .from("whatsapp_connections")
      .update({
        provider_session_id: providerSessionId,
        status: qrStatus as WhatsAppConnectionRecord["status"],
        qr_code: qrData,
        qr_expires_at: qrExpiresAt,
        webhook_secret: webhookSecret,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id)
      .select()
      .single();

    return {
      success: true,
      connection: withoutWebhookSecret(updated as WhatsAppConnectionRecord | null),
    };
  });

const SessionActionInput = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});

/**
 * 3. Refresh live QR code
 */
export const refreshWhatsAppQr = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof SessionActionInput>) =>
    SessionActionInput.parse(input)
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) {
      throw new Error("403: Forbidden");
    }

    const { data: record, error } = await insforgeServer.database
      .from("whatsapp_connections")
      .select("*")
      .eq("id", input.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error || !record || !record.provider_session_id) {
      throw new Error("Connection record not found");
    }

    const qrRes = await defaultOpenWAAdapter.getQrCode(record.provider_session_id);
    const isReady = qrRes.status === "ready" || qrRes.status === "authenticated";
    const newStatus = isReady ? "CONNECTED" : "QR_READY";
    const qrExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();

    await insforgeServer.database
      .from("whatsapp_connections")
      .update({
        status: newStatus,
        qr_code: qrRes.qr,
        qr_expires_at: qrExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    return {
      success: true,
      qr: qrRes.qr,
      status: newStatus,
      qrExpiresAt,
    };
  });

/**
 * 3b. Simulate phone pairing scan (Development testing)
 */
export const simulateWhatsAppPairing = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof SessionActionInput>) =>
    SessionActionInput.parse(input)
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) {
      throw new Error("403: Forbidden - Active tenant membership required");
    }

    const { data: record, error } = await insforgeServer.database
      .from("whatsapp_connections")
      .select("*")
      .eq("id", input.id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !record) {
      throw new Error("WhatsApp connection record not found");
    }

    if (record.provider_session_id) {
      try {
        await defaultOpenWAAdapter.simulatePairing(record.provider_session_id);
      } catch (simErr) {
        console.warn("OpenWA simulate pairing note:", simErr);
      }
    }

    const linkedPhone = "+91 98765 43210";
    const now = new Date().toISOString();

    const { data: updated, error: updErr } = await insforgeServer.database
      .from("whatsapp_connections")
      .update({
        status: "CONNECTED",
        phone_number: linkedPhone,
        connected_at: now,
        updated_at: now,
      })
      .eq("id", record.id)
      .select()
      .single();

    if (updErr) throw new Error(updErr.message);

    return {
      success: true,
      connection: withoutWebhookSecret(updated as WhatsAppConnectionRecord | null),
    };
  });

/**
 * 4. Disconnect WhatsApp Session
 */
export const disconnectWhatsAppSession = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof SessionActionInput>) =>
    SessionActionInput.parse(input)
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) {
      throw new Error("403: Forbidden");
    }

    const { data: record, error } = await insforgeServer.database
      .from("whatsapp_connections")
      .select("*")
      .eq("id", input.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error || !record) {
      throw new Error("Connection not found");
    }

    if (record.provider_session_id) {
      await defaultOpenWAAdapter.stopSession(record.provider_session_id);
    }

    await insforgeServer.database
      .from("whatsapp_connections")
      .update({
        status: "DISCONNECTED",
        qr_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    return { success: true };
  });

const TestMessageInput = z.object({
  id: z.string().uuid(),
  recipientPhone: z.string().min(8).max(20),
  messageText: z.string().min(1).max(1000),
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});

/**
 * 5. Send a test WhatsApp message from the connected account
 */
export const sendWhatsAppTestMessage = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof TestMessageInput>) =>
    TestMessageInput.parse(input)
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) {
      throw new Error("403: Forbidden");
    }

    const { data: conn } = await insforgeServer.database
      .from("whatsapp_connections")
      .select("*")
      .eq("id", input.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!conn || !conn.provider_session_id) {
      throw new Error("WhatsApp connection is not initialized");
    }

    // Normalize phone into clean numbers
    const cleanDigits = input.recipientPhone.replace(/\D/g, "");
    const chatId = `${cleanDigits}@c.us`;
    const idempotencyKey = `test_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();

    const gateDecision = evaluateOutboundWhatsAppGate({
      tenantId,
      chatId,
      recipientPhone: `+${cleanDigits}`,
      messageType: "test_message",
      fromMe: false,
    });

    if (!gateDecision.allowed) {
      throw new Error(`Outbound safety gate rejected message: ${gateDecision.reason}`);
    }

    const sendRes = await defaultOpenWAAdapter.sendTextMessage(
      conn.provider_session_id,
      {
        chatId,
        text: input.messageText,
        idempotencyKey,
      }
    );

    // Find or create conversation in whatsapp_conversations
    let { data: conv } = await insforgeServer.database
      .from("whatsapp_conversations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("chat_id", chatId)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await insforgeServer.database
        .from("whatsapp_conversations")
        .insert({
          tenant_id: tenantId,
          connection_id: conn.id,
          chat_id: chatId,
          customer_phone: `+${cleanDigits}`,
          customer_name: `+${cleanDigits}`,
          status: "open",
          human_takeover: false,
          last_message_text: input.messageText,
          last_message_at: now,
          unread_count: 0,
          is_demo: true,
        })
        .select("id")
        .single();
      conv = newConv;
    } else {
      await insforgeServer.database
        .from("whatsapp_conversations")
        .update({
          last_message_text: input.messageText,
          last_message_at: now,
          updated_at: now,
        })
        .eq("id", conv.id);
    }

    // Persist to messages
    await insforgeServer.database.from("whatsapp_messages").insert({
      tenant_id: tenantId,
      connection_id: conn.id,
      conversation_id: conv?.id,
      direction: "outbound",
      sender_type: "system",
      chat_id: chatId,
      phone: `+${cleanDigits}`,
      body: input.messageText,
      status: "sent",
      provider_message_id: sendRes.messageId,
      idempotency_key: idempotencyKey,
      is_demo: true,
      created_at: now,
      updated_at: now,
    });

    return {
      success: true,
      messageId: sendRes.messageId,
      timestamp: sendRes.timestamp,
      conversationId: conv?.id,
    };
  });

const ScopedConversationsInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
  cursor: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  includeDemo: z.boolean().optional(),
});

/**
 * 6. List unified inbox conversations for the authenticated tenant with cursor pagination
 */
export const getWhatsAppConversations = createServerFn({ method: "GET", strict: false })
  .validator((input?: z.infer<typeof ScopedConversationsInput>) =>
    ScopedConversationsInput.parse(input ?? {})
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) {
      return [];
    }

    const pageSize = input?.limit ?? 50;
    let query = insforgeServer.database
      .from("whatsapp_conversations")
      .select("id, tenant_id, connection_id, customer_id, chat_id, customer_phone, customer_name, status, human_takeover, last_message_text, last_message_at, unread_count, is_demo, created_at, updated_at")
      .eq("tenant_id", tenantId);

    if (!input?.includeDemo) {
      query = query.eq("is_demo", false);
    }

    if (input?.cursor) {
      query = query.lt("last_message_at", input.cursor);
    }

    const { data: conversations, error } = await query
      .order("last_message_at", { ascending: false })
      .limit(pageSize);

    if (error) throw new Error(error.message);
    const mapped = ((conversations || []) as WhatsAppConversationRecord[]).map((c) => {
      const parsed = parseWhatsAppIdentity(c.chat_id);
      let phone = c.customer_phone;
      if (!phone || phone.includes("@lid")) {
        phone = parsed.phone;
      }
      return {
        ...c,
        customer_phone: phone,
      };
    });
    return mapped;
  });

const ConversationMessagesInput = z.object({
  conversationId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
  cursor: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

/**
 * 7. List messages for a specific conversation thread with cursor pagination
 */
export const getWhatsAppMessages = createServerFn({ method: "GET", strict: false })
  .validator((input: z.infer<typeof ConversationMessagesInput>) =>
    ConversationMessagesInput.parse(input)
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) {
      return [];
    }

    // Verify conversation ownership
    const { data: conv } = await insforgeServer.database
      .from("whatsapp_conversations")
      .select("id")
      .eq("id", input.conversationId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!conv) {
      throw new Error("403: Forbidden - Conversation not found in tenant");
    }

    const pageSize = input.limit ?? 50;
    let query = insforgeServer.database
      .from("whatsapp_messages")
      .select("id, tenant_id, connection_id, conversation_id, direction, sender_type, chat_id, phone, body, status, provider_message_id, idempotency_key, grounded_facts, escalated, created_at, updated_at")
      .eq("conversation_id", input.conversationId)
      .eq("tenant_id", tenantId);

    if (input.cursor) {
      query = query.lt("created_at", input.cursor);
    }

    const { data: messages, error } = await query
      .order("created_at", { ascending: false })
      .limit(pageSize);

    if (error) throw new Error(error.message);
    return ((messages || []).reverse()) as WhatsAppMessageRecord[];
  });

const SendChatMessageInput = z.object({
  conversationId: z.string().uuid(),
  text: z.string().min(1).max(4000),
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});

/**
 * 8. Send staff outbound reply in conversation (with human takeover)
 */
export const sendWhatsAppChatMessage = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof SendChatMessageInput>) =>
    SendChatMessageInput.parse(input)
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) {
      throw new Error("403: Forbidden");
    }

    const { data: conv } = await insforgeServer.database
      .from("whatsapp_conversations")
      .select("id, connection_id, chat_id, customer_phone")
      .eq("id", input.conversationId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!conv) throw new Error("Conversation not found");

    const { data: conn } = await insforgeServer.database
      .from("whatsapp_connections")
      .select("id, provider_session_id")
      .eq("id", conv.connection_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!conn || !conn.provider_session_id) {
      throw new Error("Active WhatsApp connection not found");
    }

    const gateDecision = evaluateOutboundWhatsAppGate({
      tenantId,
      chatId: conv.chat_id,
      recipientPhone: conv.customer_phone,
      messageType: "staff_reply",
      fromMe: false,
    });

    if (!gateDecision.allowed) {
      throw new Error(`Outbound safety gate rejected send: ${gateDecision.reason}`);
    }

    const idempotencyKey = `staff_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const sendRes = await defaultOpenWAAdapter.sendTextMessage(
      conn.provider_session_id,
      {
        chatId: conv.chat_id,
        text: input.text,
        idempotencyKey,
      }
    );

    const now = new Date().toISOString();

    // Persist outbound message
    const { data: msg } = await insforgeServer.database
      .from("whatsapp_messages")
      .insert({
        tenant_id: tenantId,
        connection_id: conn.id,
        conversation_id: conv.id,
        direction: "outbound",
        sender_type: "human_staff",
        chat_id: conv.chat_id,
        phone: conv.customer_phone,
        body: input.text,
        status: "sent",
        provider_message_id: sendRes.messageId,
        idempotency_key: idempotencyKey,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    // Update conversation metadata
    await insforgeServer.database
      .from("whatsapp_conversations")
      .update({
        last_message_text: input.text,
        last_message_at: now,
        updated_at: now,
      })
      .eq("id", conv.id);

    return {
      success: true,
      message: msg as WhatsAppMessageRecord,
    };
  });

const TakeoverToggleInput = z.object({
  conversationId: z.string().uuid(),
  humanTakeover: z.boolean(),
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});

/**
 * 9. Toggle human takeover on a conversation
 */
export const toggleWhatsAppHumanTakeover = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof TakeoverToggleInput>) =>
    TakeoverToggleInput.parse(input)
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) throw new Error("403: Forbidden");

    const now = new Date().toISOString();
    const status = input.humanTakeover ? "human_takeover" : "open";

    const { data: updated, error } = await insforgeServer.database
      .from("whatsapp_conversations")
      .update({
        human_takeover: input.humanTakeover,
        human_takeover_by: input.humanTakeover ? (input.clerkUserId || "staff") : null,
        human_takeover_at: input.humanTakeover ? now : null,
        status,
        updated_at: now,
      })
      .eq("id", input.conversationId)
      .eq("tenant_id", tenantId)
      .select()
      .maybeSingle();

    if (error || !updated) throw new Error("Failed to update takeover state");
    return { success: true, conversation: updated as WhatsAppConversationRecord };
  });

const AutoReplyToggleInput = z.object({
  connectionId: z.string().uuid(),
  autoReplyEnabled: z.boolean(),
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});

/**
 * 10. Toggle automated AI replies on the connection
 */
export const toggleWhatsAppAutoReply = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof AutoReplyToggleInput>) =>
    AutoReplyToggleInput.parse(input)
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) throw new Error("403: Forbidden");

    const { data: updated, error } = await insforgeServer.database
      .from("whatsapp_connections")
      .update({
        auto_reply_enabled: input.autoReplyEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.connectionId)
      .eq("tenant_id", tenantId)
      .select()
      .maybeSingle();

    if (error || !updated) throw new Error("Failed to update auto-reply setting");
    return {
      success: true,
      connection: withoutWebhookSecret(updated as WhatsAppConnectionRecord | null),
    };
  });

const SimulateInboundInput = z.object({
  customerPhone: z.string().min(8).max(25),
  customerName: z.string().max(100).optional(),
  messageText: z.string().min(1).max(4000),
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});

/**
 * 11. Simulate an inbound customer WhatsApp message and execute Grounded RAG auto-reply
 */
export const simulateInboundWhatsAppMessage = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof SimulateInboundInput>) =>
    SimulateInboundInput.parse(input)
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) throw new Error("403: Forbidden");

    const { data: conn } = await insforgeServer.database
      .from("whatsapp_connections")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!conn) throw new Error("No active WhatsApp connection configured");

    const cleanDigits = input.customerPhone.replace(/\D/g, "");
    const formattedPhone = `+${cleanDigits}`;
    const chatId = `${cleanDigits}@c.us`;
    const customerName = input.customerName?.trim() || "Policyholder";
    const now = new Date().toISOString();

    // 1. Resolve or create customer
    let { data: customer } = await insforgeServer.database
      .from("customers")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("phone", formattedPhone)
      .maybeSingle();

    if (!customer) {
      const { data: newCust } = await insforgeServer.database
        .from("customers")
        .insert({
          tenant_id: tenantId,
          name: customerName,
          phone: formattedPhone,
          status: "active",
        })
        .select("id, name")
        .single();
      customer = newCust;
    }

    // 2. Resolve or create conversation
    let { data: conversation } = await insforgeServer.database
      .from("whatsapp_conversations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("chat_id", chatId)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv } = await insforgeServer.database
        .from("whatsapp_conversations")
        .insert({
          tenant_id: tenantId,
          connection_id: conn.id,
          customer_id: customer?.id || null,
          chat_id: chatId,
          customer_phone: formattedPhone,
          customer_name: customer?.name || customerName,
          status: "open",
          human_takeover: false,
          last_message_text: input.messageText,
          last_message_at: now,
          unread_count: 1,
          is_demo: true,
        })
        .select()
        .single();
      conversation = newConv;
    } else {
      const { data: updatedConv } = await insforgeServer.database
        .from("whatsapp_conversations")
        .update({
          last_message_text: input.messageText,
          last_message_at: now,
          unread_count: (conversation.unread_count || 0) + 1,
          updated_at: now,
        })
        .eq("id", conversation.id)
        .select()
        .single();
      conversation = updatedConv;
    }

    if (!conversation) throw new Error("Failed to initialize conversation thread");

    // 3. Persist inbound message
    const inboundId = `wamid.in_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const { data: inboundMsg } = await insforgeServer.database
      .from("whatsapp_messages")
      .insert({
        tenant_id: tenantId,
        connection_id: conn.id,
        conversation_id: conversation.id,
        direction: "inbound",
        sender_type: "customer",
        chat_id: chatId,
        phone: formattedPhone,
        body: input.messageText,
        status: "received",
        provider_message_id: inboundId,
        idempotency_key: inboundId,
        is_demo: true,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    // 4. Grounded AI Auto-Reply if enabled & takeover not active
    let aiReply: WhatsAppMessageRecord | null = null;
    const isTakeover = Boolean(conversation.human_takeover) || Boolean(conn.human_takeover_enabled);

    if (conn.auto_reply_enabled && !isTakeover) {
      const { generateGroundedAnswer } = await import("@/lib/rag/retrieval.server");
      const agentId = conn.agent_id || "00000000-0000-0000-0000-000000000001";
      const groundedResult = await generateGroundedAnswer({
        tenantId,
        agentId,
        query: input.messageText,
      });

      const replyTime = new Date(Date.now() + 500).toISOString();
      const replyMsgId = `wamid.ai_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

      const { data: insertedAi } = await insforgeServer.database
        .from("whatsapp_messages")
        .insert({
          tenant_id: tenantId,
          connection_id: conn.id,
          conversation_id: conversation.id,
          direction: "outbound",
          sender_type: "ai_agent",
          chat_id: chatId,
          phone: formattedPhone,
          body: groundedResult.answer,
          status: "delivered",
          provider_message_id: replyMsgId,
          grounded_facts: groundedResult.citations.map((c) => ({
            title: c.sourceName || "Insurance Policy Document",
            content: c.sectionHeading || "Policy Terms",
            score: c.similarity,
          })),
          is_demo: true,
          created_at: replyTime,
          updated_at: replyTime,
        })
        .select()
        .single();

      await insforgeServer.database
        .from("whatsapp_conversations")
        .update({
          last_message_text: groundedResult.answer,
          last_message_at: replyTime,
          updated_at: replyTime,
        })
        .eq("id", conversation.id);

      aiReply = insertedAi as WhatsAppMessageRecord;
    }

    return {
      success: true,
      conversationId: conversation.id,
      inboundMessage: inboundMsg as WhatsAppMessageRecord,
      aiReply,
    };
  });

const SimulateCallInput = z.object({
  callerPhone: z.string().min(8).max(25),
  callerName: z.string().max(100).optional(),
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});

/**
 * 12. Simulate incoming WhatsApp voice call event, graceful rejection, and automated textback
 */
export const simulateWhatsAppCallEvent = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof SimulateCallInput>) =>
    SimulateCallInput.parse(input)
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) throw new Error("403: Forbidden");

    const { data: conn } = await insforgeServer.database
      .from("whatsapp_connections")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!conn) throw new Error("No active WhatsApp connection configured");

    const cleanDigits = input.callerPhone.replace(/\D/g, "");
    const formattedPhone = `+${cleanDigits}`;
    const chatId = `${cleanDigits}@c.us`;
    const callerName = input.callerName?.trim() || "Policyholder";
    const now = new Date().toISOString();

    // 1. Resolve or create customer and conversation
    let { data: conv } = await insforgeServer.database
      .from("whatsapp_conversations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("chat_id", chatId)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await insforgeServer.database
        .from("whatsapp_conversations")
        .insert({
          tenant_id: tenantId,
          connection_id: conn.id,
          chat_id: chatId,
          customer_phone: formattedPhone,
          customer_name: callerName,
          status: "open",
          human_takeover: false,
          last_message_text: "Missed Call from policyholder",
          last_message_at: now,
          unread_count: 0,
        })
        .select("id")
        .single();
      conv = newConv;
    }

    // 2. Automated Missed Call Textback
    const textbackMessage =
      "Hello! We noticed your call to our InsurCall WhatsApp hotline. Since live WhatsApp voice streaming is restricted by WhatsApp protocol, our autonomous assistant is available here on chat 24/7 to answer policy questions and intake claims. For immediate phone support, please dial our direct phone hotline.";

    const textbackMsgId = `wamid.call_tb_${Date.now()}`;
    await insforgeServer.database.from("whatsapp_messages").insert({
      tenant_id: tenantId,
      connection_id: conn.id,
      conversation_id: conv?.id,
      direction: "outbound",
      sender_type: "ai_agent",
      chat_id: chatId,
      phone: formattedPhone,
      body: textbackMessage,
      status: "delivered",
      provider_message_id: textbackMsgId,
      created_at: now,
      updated_at: now,
    });

    if (conv?.id) {
      await insforgeServer.database
        .from("whatsapp_conversations")
        .update({
          last_message_text: textbackMessage,
          last_message_at: now,
          updated_at: now,
        })
        .eq("id", conv.id);
    }

    return {
      success: true,
      callRejectedSafely: true,
      textbackDelivered: true,
      conversationId: conv?.id,
    };
  });

/**
 * 13. Seed rich demo conversations for agency evaluation
 */
export const seedWhatsAppDemoConversations = createServerFn({ method: "POST", strict: false })
  .validator((input: z.infer<typeof ScopedWhatsAppInput>) =>
    ScopedWhatsAppInput.parse(input ?? {})
  )
  .handler(async ({ data: input }) => {
    const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
    if (!tenantId) throw new Error("403: Forbidden");

    const { data: conn } = await insforgeServer.database
      .from("whatsapp_connections")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!conn) throw new Error("No active WhatsApp connection");

    const demos = [
      {
        phone: "+919876543210",
        clean: "919876543210",
        name: "Aarav Sharma",
        inbound: "Hi, I had an accident on Western Express Highway. How do I start a cashless claim?",
        aiReply: "Hello Aarav. I am sorry to hear about the incident. To file your cashless claim immediately: 1. Ensure everyone is safe. 2. Please provide your Vehicle Registration Number and Policy Number (e.g., POL-8821). 3. Take 4 clear photos of the vehicle damage. Our network surveyor will reach out within 30 minutes.",
        citation: "Comprehensive Motor Insurance Terms - Section 4: Cashless Accidental Claims Procedure",
        takeover: false,
      },
      {
        phone: "+919123456789",
        clean: "919123456789",
        name: "Priya Patel",
        inbound: "What is my cashless hospitalization network for Star Health policy SH-8821 in Andheri East?",
        aiReply: "Your Star Health Family Optima plan provides cashless admission at 14 network hospitals in Andheri East, including Holy Spirit Hospital and SevenHills Hospital. Simply present your e-Card (ID: SH-8821) at the TPA desk for pre-authorization within 2 hours of admission.",
        citation: "Health Shield Network Directory - Mumbai Western Suburban Network Tier 1",
        takeover: false,
      },
      {
        phone: "+919988776655",
        clean: "919988776655",
        name: "Rajesh Mehta",
        inbound: "I need urgent staff assistance to add a newly purchased commercial vehicle to our fleet policy.",
        aiReply: "I have transferred your conversation to our commercial fleet underwriting desk. A licensed insurance specialist will assist you with the endorsement paperwork shortly.",
        citation: "Commercial Fleet Endorsement Guidelines - Clause 8: Mid-term Vehicle Additions",
        takeover: true,
      },
    ];

    for (const demo of demos) {
      const chatId = `${demo.clean}@c.us`;
      const now = new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString();

      let { data: conv } = await insforgeServer.database
        .from("whatsapp_conversations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("chat_id", chatId)
        .maybeSingle();

      if (!conv) {
        const { data: newConv } = await insforgeServer.database
          .from("whatsapp_conversations")
          .insert({
            tenant_id: tenantId,
            connection_id: conn.id,
            chat_id: chatId,
            customer_phone: demo.phone,
            customer_name: demo.name,
            status: demo.takeover ? "human_takeover" : "open",
            human_takeover: demo.takeover,
            last_message_text: demo.aiReply,
            last_message_at: now,
            unread_count: 0,
            is_demo: true,
          })
          .select("id")
          .single();
        conv = newConv;
      }

      if (conv?.id) {
        // Inbound message
        await insforgeServer.database.from("whatsapp_messages").insert({
          tenant_id: tenantId,
          connection_id: conn.id,
          conversation_id: conv.id,
          direction: "inbound",
          sender_type: "customer",
          chat_id: chatId,
          phone: demo.phone,
          body: demo.inbound,
          status: "received",
          provider_message_id: `wamid.demo_in_${Date.now()}_${demo.clean.slice(-4)}`,
          is_demo: true,
          created_at: new Date(Date.now() - 60000).toISOString(),
          updated_at: new Date(Date.now() - 60000).toISOString(),
        });

        // AI Reply
        await insforgeServer.database.from("whatsapp_messages").insert({
          tenant_id: tenantId,
          connection_id: conn.id,
          conversation_id: conv.id,
          direction: "outbound",
          sender_type: demo.takeover ? "human_staff" : "ai_agent",
          chat_id: chatId,
          phone: demo.phone,
          body: demo.aiReply,
          status: "delivered",
          provider_message_id: `wamid.demo_ai_${Date.now()}_${demo.clean.slice(-4)}`,
          grounded_facts: [
            {
              title: "Approved Policy Guidelines",
              content: demo.citation,
              score: 0.94,
            },
          ],
          is_demo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    return { success: true, count: demos.length };
  });
