/**
 * InsurCall WhatsApp Integration Types
 * Based on upstream OpenWA (rmyndharis/OpenWA v0.25.0) REST API and webhook specifications.
 */

export type WhatsAppSessionStatus =
  | "NOT_CONNECTED"
  | "STARTING"
  | "QR_READY"
  | "AUTHENTICATING"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "FAILED";

export type WhatsAppMessageDirection = "inbound" | "outbound";

export type WhatsAppSenderType = "customer" | "ai_agent" | "human_staff" | "system";

export type WhatsAppMessageDeliveryStatus =
  | "received"
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type WhatsAppConversationStatus = "open" | "human_takeover" | "resolved" | "archived";

export interface WhatsAppConnectionRecord {
  id: string;
  tenant_id: string;
  session_name: string;
  provider: string;
  provider_session_id: string | null;
  phone_number: string | null;
  status: WhatsAppSessionStatus;
  qr_code: string | null;
  qr_expires_at: string | null;
  webhook_id: string | null;
  webhook_secret: string | null;
  auto_reply_enabled: boolean;
  human_takeover_enabled: boolean;
  agent_id: string | null;
  metadata: Record<string, unknown>;
  connected_at: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConversationRecord {
  id: string;
  tenant_id: string;
  connection_id: string;
  customer_id: string | null;
  chat_id: string;
  customer_phone: string;
  customer_name: string | null;
  status: WhatsAppConversationStatus;
  human_takeover: boolean;
  human_takeover_by: string | null;
  human_takeover_at: string | null;
  last_message_text: string | null;
  last_message_at: string;
  unread_count: number;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessageRecord {
  id: string;
  tenant_id: string;
  connection_id: string;
  conversation_id: string;
  direction: WhatsAppMessageDirection;
  sender_type: WhatsAppSenderType;
  chat_id: string;
  phone: string;
  body: string;
  status: WhatsAppMessageDeliveryStatus;
  provider_message_id: string | null;
  idempotency_key: string | null;
  grounded_facts: Array<{ title: string; content: string; score?: number }>;
  escalated: boolean;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppDiagnosticsResponse {
  gatewayReachable: boolean;
  socketOpen: boolean;
  sessionStatus: string;
  authenticated: boolean;
  phone: string | null;
  name: string | null;
  lastConnectedAt: string | null;
  lastDisconnectAt: string | null;
  lastDisconnectReason: string | null;
  historySync: {
    status: "idle" | "in_progress" | "completed" | "unsupported" | "syncing" | "failed";
    lastSyncAt: string | null;
    chatsCount: number;
    contactsCount: number;
    messagesCount: number;
    syncId?: string | null;
    processedBatches?: number;
    totalBatches?: number;
    processedMessages?: number;
    lastError?: string | null;
  };
  liveInboundCount: number;
  lastInboundAt: string | null;
  webhookHealth: {
    url: string | null;
    lastDispatchedAt: string | null;
    lastError: string | null;
    totalDispatched: number;
    totalFailed: number;
  };
}

export interface OpenWASessionResponse {
  id: string;
  name: string;
  status: string;
  engine?: string;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
  success?: boolean;
  session?: {
    id: string;
    name?: string;
    status: string;
    phone?: string | null;
  };
}

export interface OpenWAQrResponse {
  qr: string;
  raw?: string;
  status: string;
  success?: boolean;
  attempts?: number;
}

export interface OpenWASendTextResponse {
  messageId: string;
  timestamp: number;
  success?: boolean;
}

export interface OpenWAWebhookDelivery {
  event: string;
  timestamp: string;
  sessionId: string;
  idempotencyKey?: string;
  deliveryId?: string;
  data: {
    id?: string;
    from?: string;
    to?: string;
    chatId?: string;
    body?: string;
    type?: string;
    timestamp?: number;
    fromMe?: boolean;
    isGroup?: boolean;
    call?: {
      id?: string;
      video?: boolean;
      missed?: boolean;
    };
    [key: string]: unknown;
  };
}

export interface WhatsAppHistorySyncMeta {
  sync_id?: string | null;
  status?: "idle" | "in_progress" | "completed" | "syncing" | "failed";
  batch_index?: number;
  total_batches?: number;
  total_messages?: number;
  synced_messages_count?: number;
  last_synced_at?: string | null;
  last_error?: string | null;
}
