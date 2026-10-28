/**
 * InsurCall WhatsApp Webhook Ingress
 * Handles inbound events from OpenWA / Baileys:
 * - HMAC-SHA256 cryptographic verification
 * - Idempotency deduplication
 * - Outbound loop prevention (fromMe check)
 * - Message persistence
 * - Multi-Device History Sync ingestion (messaging-history.set)
 * - Incremental chat and contact upserts
 * - Grounded RAG auto-reply execution with human takeover honor
 * - Delivery status and receipt correlation
 */

import { createFileRoute } from "@tanstack/react-router";
import { insforgeServer } from "@/lib/insforge/client.server";
import { OpenWAAdapter, defaultOpenWAAdapter } from "@/lib/whatsapp/openwa-adapter";
import type { OpenWAWebhookDelivery } from "@/lib/whatsapp/types";

interface TenantBrandingConfig {
  agent_config?: {
    instructions?: string;
  };
}

interface SyncedChatPayload {
  id?: string;
  name?: string | null;
  unreadCount?: number;
  readOnly?: boolean;
  conversationTimestamp?: number;
}

interface SyncedContactPayload {
  id?: string;
  name?: string | null;
  notify?: string | null;
  verifiedName?: string | null;
}

interface SyncedMessagePayload {
  id?: string;
  chatId?: string;
  from?: string;
  fromMe?: boolean;
  body?: string;
  timestamp?: number;
  pushName?: string | null;
  status?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

import { cleanWhatsAppPhone, parseWhatsAppIdentity } from "@/lib/whatsapp/identity";
import { evaluateOutboundWhatsAppGate } from "@/lib/whatsapp/outbound-guard.server";

export const Route = createFileRoute("/api/webhooks/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const verifyToken =
          process.env["WHATSAPP_WEBHOOK_VERIFY_TOKEN"] ||
          process.env["META_WHATSAPP_VERIFY_TOKEN"] ||
          "";

        if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
          return new Response(challenge || "", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          if (!rawBody) {
            return json({ error: "Empty request body" }, 400);
          }

          let delivery: OpenWAWebhookDelivery;
          try {
            delivery = JSON.parse(rawBody) as OpenWAWebhookDelivery;
          } catch {
            return json({ error: "Malformed JSON payload" }, 400);
          }

          const { event, sessionId, idempotencyKey, deliveryId, data } = delivery;

          if (!sessionId) {
            return json({ error: "Missing sessionId in webhook delivery" }, 400);
          }

          // 1. Resolve tenant connection by provider session ID
          const { data: connection, error: connErr } = await insforgeServer.database
            .from("whatsapp_connections")
            .select("*")
            .eq("provider_session_id", sessionId)
            .maybeSingle();

          if (connErr || !connection) {
            console.warn(`[WhatsApp Webhook] Unknown provider session: ${sessionId}`);
            return json({ error: "Session not found or unassociated with tenant" }, 404);
          }

          // 2. Cryptographic signature verification (HMAC-SHA256)
          const signatureHeader =
            request.headers.get("x-openwa-signature") ||
            request.headers.get("x-hub-signature-256") ||
            request.headers.get("x-signature") ||
            "";

          const webhookSecret =
            (connection.webhook_secret as string | null) ||
            process.env["WHATSAPP_WEBHOOK_SECRET"] ||
            "insurcall_whatsapp_hmac_secret_2026";

          const isValid = OpenWAAdapter.verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
          if (!isValid) {
            console.warn("WhatsApp webhook rejected: invalid signature");
            return json({ error: "Invalid cryptographic signature" }, 401);
          }

          // 3. Deduplication check using idempotencyKey or deliveryId
          const dedupId = idempotencyKey || deliveryId;
          if (dedupId) {
            const { data: existing } = await insforgeServer.database
              .from("whatsapp_messages")
              .select("id")
              .eq("tenant_id", connection.tenant_id)
              .eq("connection_id", connection.id)
              .eq("idempotency_key", dedupId)
              .maybeSingle();

            if (existing) {
              return json({ status: "ok", deduplicated: true });
            }
          }

          const tenantId = connection.tenant_id as string;
          const now = new Date().toISOString();

          // 4. Handle Event Types
          switch (event) {
            case "session.status":
            case "session.authenticated": {
              const statusStr = String(data?.["status"] || "").toLowerCase();
              let newStatus = connection.status;
              if (statusStr === "ready" || statusStr === "authenticated") {
                newStatus = "CONNECTED";
              } else if (statusStr === "qr_ready") {
                newStatus = "QR_READY";
              } else if (statusStr === "disconnected") {
                newStatus = "DISCONNECTED";
              }

              const phone = data?.["phone"] ? String(data["phone"]) : connection.phone_number;

              await insforgeServer.database
                .from("whatsapp_connections")
                .update({
                  status: newStatus,
                  phone_number: phone,
                  connected_at: newStatus === "CONNECTED" ? now : connection.connected_at,
                  last_active_at: now,
                  updated_at: now,
                })
                .eq("id", connection.id);

              return json({ status: "ok", updatedStatus: newStatus, phone });
            }

            case "session.disconnected": {
              await insforgeServer.database
                .from("whatsapp_connections")
                .update({
                  status: "DISCONNECTED",
                  updated_at: now,
                })
                .eq("id", connection.id);

              return json({ status: "ok", statusUpdated: "DISCONNECTED" });
            }

            case "session.qr": {
              const qrCode = data?.["qr"] ? String(data["qr"]) : null;
              await insforgeServer.database
                .from("whatsapp_connections")
                .update({
                  status: "QR_READY",
                  qr_code: qrCode,
                  qr_expires_at: new Date(Date.now() + 60000).toISOString(),
                  updated_at: now,
                })
                .eq("id", connection.id);

              return json({ status: "ok", event: "session.qr" });
            }

            case "history.sync": {
              // Ingest Baileys Multi-Device bounded history synchronization batch
              const syncId = data?.["syncId"] ? String(data["syncId"]) : `sync_${Date.now()}`;
              const batchIndex = typeof data?.["batchIndex"] === "number" ? (data["batchIndex"] as number) : 0;
              const totalBatches = typeof data?.["totalBatches"] === "number" ? (data["totalBatches"] as number) : 1;
              const totalMessages = typeof data?.["totalMessages"] === "number" ? (data["totalMessages"] as number) : 0;
              const rawChats = (data?.["chats"] as SyncedChatPayload[] | undefined) || [];
              const rawContacts = (data?.["contacts"] as SyncedContactPayload[] | undefined) || [];
              const rawMessages = (data?.["messages"] as SyncedMessagePayload[] | undefined) || [];

              console.log(
                `[Webhook history.sync] Batch ${batchIndex + 1}/${totalBatches} (${rawMessages.length} msgs, ${rawChats.length} chats, ${rawContacts.length} contacts)`
              );

              // 1. Build contact lookup map
              const contactNames = new Map<string, string>();
              for (const c of rawContacts) {
                if (c?.id) {
                  const resolved = c.name || c.notify || c.verifiedName || null;
                  if (resolved) contactNames.set(c.id, resolved);
                }
              }

              // 2. Efficient bulk upsert for chats
              const conversationIdMap = new Map<string, string>();

              if (rawChats.length > 0) {
                const validChats = rawChats.filter(
                  (ch): ch is SyncedChatPayload & { id: string } =>
                    Boolean(ch?.id && !ch.id.endsWith("@broadcast") && !ch.id.includes("status@broadcast"))
                );

                const chatIds = Array.from(new Set(validChats.map((ch) => ch.id)));

                // Query existing conversations in chunks of 50 to prevent query overflow
                for (let i = 0; i < chatIds.length; i += 50) {
                  const chunk = chatIds.slice(i, i + 50);
                  const { data: existingConvs } = await insforgeServer.database
                    .from("whatsapp_conversations")
                    .select("id, chat_id, customer_name")
                    .eq("tenant_id", tenantId)
                    .in("chat_id", chunk);

                  for (const conv of (existingConvs || []) as Array<{ id: string; chat_id: string; customer_name: string | null }>) {
                    conversationIdMap.set(conv.chat_id, conv.id);
                  }
                }

                // Prepare new conversations to insert
                const newConversationsToInsert = [];
                for (const chat of validChats) {
                  if (!conversationIdMap.has(chat.id)) {
                    const formattedPhone = cleanWhatsAppPhone(chat.id);
                    const realName = chat.name || contactNames.get(chat.id) || formattedPhone;
                    const timestamp = chat.conversationTimestamp ? new Date(chat.conversationTimestamp).toISOString() : now;

                    newConversationsToInsert.push({
                      tenant_id: tenantId,
                      connection_id: connection.id,
                      chat_id: chat.id,
                      customer_phone: formattedPhone,
                      customer_name: realName,
                      status: "open",
                      human_takeover: false,
                      last_message_text: null,
                      last_message_at: timestamp,
                      unread_count: chat.unreadCount ?? 0,
                      is_demo: false,
                      created_at: timestamp,
                      updated_at: now,
                    });
                  }
                }

                // Bulk insert new conversations in chunks of 50
                for (let i = 0; i < newConversationsToInsert.length; i += 50) {
                  const insertChunk = newConversationsToInsert.slice(i, i + 50);
                  const { data: insertedChats } = await insforgeServer.database
                    .from("whatsapp_conversations")
                    .insert(insertChunk)
                    .select("id, chat_id");

                  for (const ch of (insertedChats || []) as Array<{ id: string; chat_id: string }>) {
                    conversationIdMap.set(ch.chat_id, ch.id);
                  }
                }
              }

              // 3. Resolve conversations for all messages in this batch
              const validMessages = rawMessages.filter(
                (m): m is SyncedMessagePayload & { id: string; chatId: string; body: string } =>
                  Boolean(m?.id && m?.chatId && m?.body)
              );

              const msgChatIds = Array.from(new Set(validMessages.map((m) => m.chatId)));
              const missingChatIds = msgChatIds.filter((cid) => !conversationIdMap.has(cid));

              if (missingChatIds.length > 0) {
                // Bulk query existing DB conversations for missing chat IDs
                for (let i = 0; i < missingChatIds.length; i += 50) {
                  const chunk = missingChatIds.slice(i, i + 50);
                  const { data: existingConvs } = await insforgeServer.database
                    .from("whatsapp_conversations")
                    .select("id, chat_id")
                    .eq("tenant_id", tenantId)
                    .in("chat_id", chunk);

                  for (const conv of (existingConvs || []) as Array<{ id: string; chat_id: string }>) {
                    conversationIdMap.set(conv.chat_id, conv.id);
                  }
                }

                // Insert any conversation that genuinely does not exist yet
                const trulyMissing = missingChatIds.filter((cid) => !conversationIdMap.has(cid));
                if (trulyMissing.length > 0) {
                  const autoConvs = trulyMissing.map((cid) => {
                    const formattedPhone = cleanWhatsAppPhone(cid);
                    const realName = contactNames.get(cid) || formattedPhone;
                    return {
                      tenant_id: tenantId,
                      connection_id: connection.id,
                      chat_id: cid,
                      customer_phone: formattedPhone,
                      customer_name: realName,
                      status: "open",
                      human_takeover: false,
                      last_message_text: null,
                      last_message_at: now,
                      unread_count: 0,
                      is_demo: false,
                      created_at: now,
                      updated_at: now,
                    };
                  });

                  for (let i = 0; i < autoConvs.length; i += 50) {
                    const { data: insertedAuto } = await insforgeServer.database
                      .from("whatsapp_conversations")
                      .insert(autoConvs.slice(i, i + 50))
                      .select("id, chat_id");

                    for (const c of (insertedAuto || []) as Array<{ id: string; chat_id: string }>) {
                      conversationIdMap.set(c.chat_id, c.id);
                    }
                  }
                }
              }

              // 4. Bulk message deduplication
              const msgProviderIds = validMessages.map((m) => m.id);
              const existingMsgIdSet = new Set<string>();

              for (let i = 0; i < msgProviderIds.length; i += 50) {
                const chunk = msgProviderIds.slice(i, i + 50);
                const { data: existingMsgs } = await insforgeServer.database
                  .from("whatsapp_messages")
                  .select("provider_message_id")
                  .eq("tenant_id", tenantId)
                  .in("provider_message_id", chunk);

                for (const em of (existingMsgs || []) as Array<{ provider_message_id: string | null }>) {
                  if (em.provider_message_id) existingMsgIdSet.add(em.provider_message_id);
                }
              }

              // 5. Bulk message insertion (filtered to uninserted messages)
              const newMessagesToInsert = [];
              const latestMessagePerChat = new Map<string, { body: string; time: string }>();

              for (const msg of validMessages) {
                if (existingMsgIdSet.has(msg.id)) continue;
                const convId = conversationIdMap.get(msg.chatId);
                if (!convId) continue;

                const msgPhone = cleanWhatsAppPhone(msg.chatId);
                const msgTime = msg.timestamp ? new Date(msg.timestamp).toISOString() : now;
                const direction = msg.fromMe ? "outbound" : "inbound";
                const senderType = msg.fromMe ? "human_staff" : "customer";

                newMessagesToInsert.push({
                  tenant_id: tenantId,
                  connection_id: connection.id,
                  conversation_id: convId,
                  direction,
                  sender_type: senderType,
                  chat_id: msg.chatId,
                  phone: msgPhone,
                  body: msg.body,
                  status: msg.status || "delivered",
                  provider_message_id: msg.id,
                  idempotency_key: `history_${msg.id}`,
                  is_demo: false,
                  created_at: msgTime,
                  updated_at: now,
                });

                latestMessagePerChat.set(convId, { body: msg.body, time: msgTime });
              }

              let insertedCount = 0;
              for (let i = 0; i < newMessagesToInsert.length; i += 50) {
                const insertChunk = newMessagesToInsert.slice(i, i + 50);
                const { data: inserted, error: msgInsErr } = await insforgeServer.database
                  .from("whatsapp_messages")
                  .insert(insertChunk)
                  .select("id");

                if (!msgInsErr && inserted) {
                  insertedCount += inserted.length;
                } else if (!msgInsErr) {
                  insertedCount += insertChunk.length;
                }
              }

              // Update latest message snippet on conversations
              for (const [convId, snippet] of latestMessagePerChat.entries()) {
                await insforgeServer.database
                  .from("whatsapp_conversations")
                  .update({
                    last_message_text: snippet.body,
                    last_message_at: snippet.time,
                    updated_at: now,
                  })
                  .eq("id", convId);
              }

              // 6. Update sync progress on connection metadata
              const currentMeta = (connection.metadata || {}) as Record<string, unknown>;
              const prevSync = (currentMeta["history_sync"] as Record<string, unknown> | undefined) || {};
              const prevCount = typeof prevSync["synced_messages_count"] === "number" ? (prevSync["synced_messages_count"] as number) : 0;
              const isSyncDone = batchIndex >= totalBatches - 1;

              await insforgeServer.database
                .from("whatsapp_connections")
                .update({
                  metadata: {
                    ...currentMeta,
                    history_sync: {
                      sync_id: syncId,
                      batch_index: batchIndex,
                      total_batches: totalBatches,
                      total_messages: totalMessages || rawMessages.length,
                      synced_messages_count: prevCount + insertedCount,
                      status: isSyncDone ? "completed" : "syncing",
                      last_synced_at: now,
                    },
                  },
                  last_active_at: now,
                  updated_at: now,
                })
                .eq("id", connection.id);

              return json({
                status: "ok",
                event: "history.sync",
                syncId,
                batchIndex,
                totalBatches,
                insertedMessages: insertedCount,
                skippedDuplicates: validMessages.length - newMessagesToInsert.length,
                syncedChats: rawChats.length,
                syncedContacts: rawContacts.length,
              });
            }

            case "chats.upsert":
            case "chats.update": {
              const rawChats = (data?.["chats"] as SyncedChatPayload[] | undefined) || [];
              for (const chat of rawChats) {
                if (!chat?.id || chat.id.endsWith("@broadcast")) continue;

                const chatId = chat.id;
                const formattedPhone = cleanWhatsAppPhone(chatId);
                const realName = chat.name || formattedPhone;
                const timestamp = chat.conversationTimestamp ? new Date(chat.conversationTimestamp).toISOString() : now;

                const { data: existingConv } = await insforgeServer.database
                  .from("whatsapp_conversations")
                  .select("id")
                  .eq("tenant_id", tenantId)
                  .eq("chat_id", chatId)
                  .maybeSingle();

                if (existingConv) {
                  await insforgeServer.database
                    .from("whatsapp_conversations")
                    .update({
                      customer_name: realName,
                      unread_count: chat.unreadCount ?? 0,
                      is_demo: false,
                      updated_at: now,
                    })
                    .eq("id", existingConv.id);
                } else {
                  await insforgeServer.database.from("whatsapp_conversations").insert({
                    tenant_id: tenantId,
                    connection_id: connection.id,
                    chat_id: chatId,
                    customer_phone: formattedPhone,
                    customer_name: realName,
                    status: "open",
                    human_takeover: false,
                    unread_count: chat.unreadCount ?? 0,
                    is_demo: false,
                    last_message_at: timestamp,
                    created_at: timestamp,
                    updated_at: now,
                  });
                }
              }
              return json({ status: "ok", processedChats: rawChats.length });
            }

            case "contacts.upsert":
            case "contacts.update": {
              const rawContacts = (data?.["contacts"] as SyncedContactPayload[] | undefined) || [];
              for (const c of rawContacts) {
                if (!c?.id) continue;
                const name = c.name || c.notify || c.verifiedName;
                if (!name) continue;

                // Update real contact name on existing conversation
                await insforgeServer.database
                  .from("whatsapp_conversations")
                  .update({
                    customer_name: name,
                    updated_at: now,
                  })
                  .eq("tenant_id", tenantId)
                  .eq("chat_id", c.id);
              }
              return json({ status: "ok", processedContacts: rawContacts.length });
            }

            case "message.status": {
              const messageId = String(data?.["messageId"] || "");
              const status = String(data?.["status"] || "delivered");
              if (messageId) {
                await insforgeServer.database
                  .from("whatsapp_messages")
                  .update({
                    status,
                    updated_at: now,
                  })
                  .eq("tenant_id", tenantId)
                  .eq("provider_message_id", messageId);
              }
              return json({ status: "ok", messageId, updatedStatus: status });
            }

            case "call.received": {
              const callId = data?.call?.id || data?.id || `call_${Date.now()}`;
              console.info(`[WhatsApp Call] Inbound call detected from ${data?.from || "unknown"}. ID: ${callId}`);

              try {
                await defaultOpenWAAdapter.rejectCall(sessionId, String(callId));
              } catch {
                // Ignore if not supported
              }

              // Simply log the call; do not send any automated text message
              return json({ status: "ok", callLogged: true });
            }

            case "message.received": {
              // Loop prevention check: if fromMe is true, ignore to prevent infinite reply cascades!
              if (data?.fromMe === true) {
                return json({ status: "ok", ignoredSelfMessage: true });
              }

              const rawChatId = String(data?.chatId || data?.from || "");
              const rawBody = String(data?.body || "").trim();

              if (!rawChatId || !rawBody) {
                return json({ status: "ok", ignoredEmptyMessage: true });
              }

              const formattedPhone = cleanWhatsAppPhone(rawChatId);
              const senderName = data?.["author"] || data?.["sender"] || formattedPhone;

              // 5. Resolve or create customer record
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
                    name: String(senderName),
                    phone: formattedPhone,
                    status: "active",
                    provider: "whatsapp",
                    provider_customer_id: rawChatId,
                  })
                  .select("id, name")
                  .single();
                customer = newCust;
              }

              // 6. Resolve or create conversation thread
              let { data: conversation } = await insforgeServer.database
                .from("whatsapp_conversations")
                .select("*")
                .eq("tenant_id", tenantId)
                .eq("chat_id", rawChatId)
                .maybeSingle();

              if (!conversation) {
                const { data: newConv } = await insforgeServer.database
                  .from("whatsapp_conversations")
                  .insert({
                    tenant_id: tenantId,
                    connection_id: connection.id,
                    customer_id: customer?.id || null,
                    chat_id: rawChatId,
                    customer_phone: formattedPhone,
                    customer_name: String(senderName),
                    status: "open",
                    human_takeover: false,
                    last_message_text: rawBody,
                    last_message_at: now,
                    unread_count: 1,
                    is_demo: false,
                  })
                  .select()
                  .single();
                conversation = newConv;
              } else {
                await insforgeServer.database
                  .from("whatsapp_conversations")
                  .update({
                    last_message_text: rawBody,
                    last_message_at: now,
                    unread_count: (conversation.unread_count || 0) + 1,
                    is_demo: false,
                    updated_at: now,
                  })
                  .eq("id", conversation.id);
              }

              // 7. Persist inbound message BEFORE initiating AI reply
              const messageId = String(data?.id || `msg_${Date.now()}`);
              await insforgeServer.database.from("whatsapp_messages").insert({
                tenant_id: tenantId,
                connection_id: connection.id,
                conversation_id: conversation.id,
                direction: "inbound",
                sender_type: "customer",
                chat_id: rawChatId,
                phone: formattedPhone,
                body: rawBody,
                status: "received",
                provider_message_id: messageId,
                idempotency_key: dedupId || messageId,
                is_demo: false,
                created_at: now,
                updated_at: now,
              });

              // 8. Grounded AI Auto-Reply Gate
              const isTakeoverActive =
                Boolean(conversation.human_takeover) ||
                Boolean(connection.human_takeover_enabled);

              // Preliminary Outbound Safety Gate Check (kill switch, allowlist, group, LID, takeover)
              const initialGate = evaluateOutboundWhatsAppGate({
                tenantId,
                chatId: rawChatId,
                recipientPhone: formattedPhone,
                messageType: "ai_auto_reply",
                fromMe: false,
                humanTakeoverActive: isTakeoverActive,
                connectionAutoReplyEnabled: connection.auto_reply_enabled,
                lastReplySentAt: conversation.last_message_at,
              });

              if (!initialGate.allowed) {
                console.info(
                  `[WhatsApp Auto-Reply Gate] Ingestion-only: reply to ${initialGate.sanitizedRecipient} blocked (${initialGate.code}): ${initialGate.reason}`
                );
                return json({
                  status: "ok",
                  messageReceived: true,
                  autoReplySent: false,
                  gateCode: initialGate.code,
                  reason: initialGate.reason,
                });
              }

              // Resolve tenant configuration
              const { data: tenant } = await insforgeServer.database
                .from("tenants")
                .select("id, name, branding_config")
                .eq("id", tenantId)
                .single();

              const branding = (tenant?.branding_config as TenantBrandingConfig | null) ?? null;
              const agentCfg = branding?.agent_config ?? {};
              const agentId = connection.agent_id || "00000000-0000-0000-0000-000000000001";

              // 9. Execute Grounded Knowledge Retrieval & Answer Synthesis
              const { generateGroundedAnswer } = await import("@/lib/rag/retrieval.server");
              const groundedResult = await generateGroundedAnswer({
                tenantId,
                agentId,
                query: rawBody,
                agentInstructions: agentCfg.instructions,
              });

              // Final Outbound Gate Check (enforcing groundedness and verification requirements)
              const finalGate = evaluateOutboundWhatsAppGate({
                tenantId,
                chatId: rawChatId,
                recipientPhone: formattedPhone,
                messageType: "ai_auto_reply",
                fromMe: false,
                humanTakeoverActive: isTakeoverActive,
                connectionAutoReplyEnabled: connection.auto_reply_enabled,
                grounded: groundedResult.grounded,
                needsHumanReview: groundedResult.needs_human_review,
                lastReplySentAt: conversation.last_message_at,
              });

              if (!finalGate.allowed) {
                console.info(
                  `[WhatsApp Auto-Reply Gate] Blocked reply to ${finalGate.sanitizedRecipient} (${finalGate.code}): ${finalGate.reason}`
                );

                // Hand off to human staff when knowledge is missing/uncertain so customer is not hallucinated to
                if (groundedResult.needs_human_review || !groundedResult.grounded) {
                  await insforgeServer.database
                    .from("whatsapp_conversations")
                    .update({ human_takeover: true, updated_at: now })
                    .eq("id", conversation.id);

                  await insforgeServer.database.from("approval_requests").insert({
                    tenant_id: tenantId,
                    request_type: "customer_inquiry_escalation",
                    status: "pending",
                    risk_level: "HIGH",
                    payload: {
                      query: rawBody,
                      conversation_id: conversation.id,
                      customer_phone: formattedPhone,
                      customer_name: senderName,
                      reason: "Ungrounded policy query: staff adjuster review required",
                    },
                  });
                }

                return json({
                  status: "ok",
                  messageReceived: true,
                  autoReplySent: false,
                  escalatedToStaff: true,
                  gateCode: finalGate.code,
                  reason: finalGate.reason,
                });
              }

              // Send grounded reply via OpenWA / Baileys
              const replyIdempotency = `reply_${Date.now()}_${messageId.slice(-6)}`;
              const sendRes = await defaultOpenWAAdapter.sendTextMessage(sessionId, {
                chatId: rawChatId,
                text: groundedResult.answer,
                idempotencyKey: replyIdempotency,
              });

              const replyTime = new Date().toISOString();

              // 10. Persist outbound reply with citations
              await insforgeServer.database.from("whatsapp_messages").insert({
                tenant_id: tenantId,
                connection_id: connection.id,
                conversation_id: conversation.id,
                direction: "outbound",
                sender_type: "ai_agent",
                chat_id: rawChatId,
                phone: formattedPhone,
                body: groundedResult.answer,
                status: "sent",
                provider_message_id: sendRes.messageId,
                idempotency_key: replyIdempotency,
                grounded_facts: groundedResult.citations,
                escalated: groundedResult.needs_human_review,
                is_demo: false,
                created_at: replyTime,
                updated_at: replyTime,
              });

              // Update conversation snippet with AI reply
              await insforgeServer.database
                .from("whatsapp_conversations")
                .update({
                  last_message_text: groundedResult.answer,
                  last_message_at: replyTime,
                  updated_at: replyTime,
                })
                .eq("id", conversation.id);

              return json({
                status: "ok",
                messageReceived: true,
                autoReplySent: true,
                grounded: groundedResult.grounded,
              });
            }

            default:
              return json({ status: "ok", ignoredEvent: event });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Internal webhook processing error";
          console.error("[WhatsApp Webhook Error]:", err);
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
