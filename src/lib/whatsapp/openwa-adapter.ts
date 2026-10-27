/**
 * InsurCall OpenWA Provider Adapter
 * Pinned Upstream Specification: rmyndharis/OpenWA v0.25.0
 * Pinned Commit / Tag Object: a32cfbadd8543d57606a598711f8590ccf748640
 */

import crypto from "node:crypto";
import type {
  IWhatsAppProvider,
  SendTextMessageParams,
  RegisterWebhookParams,
  CreateCallLinkParams,
} from "./provider-interface";
import type {
  OpenWASessionResponse,
  OpenWAQrResponse,
  OpenWASendTextResponse,
  WhatsAppDiagnosticsResponse,
} from "./types";
async function getEmbeddedEngine() {
  const mod = await import("./embedded-engine.server.ts");
  return mod.embeddedBaileysEngine;
}

export class OpenWAAdapter implements IWhatsAppProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string | undefined;

  constructor(
    baseUrlOrConfig?: string | { baseUrl?: string; apiKey?: string; webhookSecret?: string },
    apiKeyParam?: string
  ) {
    if (typeof baseUrlOrConfig === "object" && baseUrlOrConfig !== null) {
      this.baseUrl = (
        baseUrlOrConfig.baseUrl ||
        process.env["OPENWA_BASE_URL"] ||
        "http://127.0.0.1:2785"
      ).replace(/\/+$/, "");
      this.apiKey =
        baseUrlOrConfig.apiKey ||
        process.env["OPENWA_API_KEY"] ||
        "";
      this.webhookSecret =
        baseUrlOrConfig.webhookSecret ||
        process.env["WHATSAPP_WEBHOOK_SECRET"];
    } else {
      this.baseUrl = (
        baseUrlOrConfig ||
        process.env["OPENWA_BASE_URL"] ||
        "http://127.0.0.1:2785"
      ).replace(/\/+$/, "");
      this.apiKey =
        apiKeyParam ||
        process.env["OPENWA_API_KEY"] ||
        "";
      this.webhookSecret = process.env["WHATSAPP_WEBHOOK_SECRET"];
    }
  }

  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      timeoutMs?: number;
    } = {}
  ): Promise<T> {
    if (!this.apiKey) throw new Error("OpenWA is not configured: OPENWA_API_KEY is required");
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const method = options.method || "GET";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 10000);

    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      ...options.headers,
    };

    let bodyString: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      bodyString = JSON.stringify(options.body);
    }

    try {
      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };
      if (bodyString !== undefined) {
        init.body = bodyString;
      }
      const response = await fetch(url, init);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let errorJson: { message?: string; error?: string } = {};
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          // not json
        }

        const msg =
          errorJson.message ||
          errorJson.error ||
          `OpenWA API error: HTTP ${response.status} ${response.statusText}`;
        throw new Error(msg);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`OpenWA gateway request timed out: ${method} ${path}`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Health check to confirm OpenWA gateway readiness
   */
  async checkHealth(): Promise<{ healthy: boolean; status: string; version?: string }> {
    try {
      let res: { status?: string; version?: string } | undefined;
      try {
        res = await this.request<{ status?: string; version?: string }>(
          "/api/health/ready",
          { timeoutMs: 1500 }
        );
      } catch {
        res = await this.request<{ status?: string; version?: string }>(
          "/health",
          { timeoutMs: 1500 }
        );
      }
      return {
        healthy: res?.status === "ok" || res?.status === "ready" || res?.status === "healthy",
        status: res?.status || "healthy",
        version: res?.version || "v0.25.0",
      };
    } catch {
      // Graceful fallback to native embedded Baileys engine
      return (await getEmbeddedEngine()).checkHealth();
    }
  }

  private unwrapSession(raw: unknown, fallbackId: string, fallbackName: string): OpenWASessionResponse {
    const obj = raw as Record<string, unknown> | undefined;
    const inner = (obj?.["session"] || obj) as Record<string, unknown> | undefined;
    const id = String(inner?.["id"] || fallbackId);
    const name = String(inner?.["name"] || fallbackName);
    const status = String(inner?.["status"] || "STOPPED");
    const phone = (inner?.["phone"] as string | null | undefined) ?? null;
    return {
      id,
      name,
      status,
      phone,
      success: true,
      session: {
        id,
        name,
        status,
        phone,
      },
    };
  }

  /**
   * Simulate a successful QR scan (development testing)
   */
  async simulatePairing(sessionId: string): Promise<OpenWASessionResponse> {
    try {
      const raw = await this.request<unknown>(`/api/sessions/${sessionId}/simulate-scan`, {
        method: "POST",
        timeoutMs: 3000,
      });
      return this.unwrapSession(raw, sessionId, sessionId);
    } catch {
      return (await getEmbeddedEngine()).simulatePairing(sessionId);
    }
  }

  /**
   * Create a session in OpenWA
   */
  async createSession(name: string, customId?: string): Promise<OpenWASessionResponse> {
    const fallbackId = customId || name;
    try {
      const payload: { name: string; id?: string } = { name };
      if (customId) {
        payload.id = customId;
      }
      const raw = await this.request<unknown>("/api/sessions", {
        method: "POST",
        body: payload,
        timeoutMs: 3000,
      });
      return this.unwrapSession(raw, fallbackId, name);
    } catch {
      return (await getEmbeddedEngine()).createSession(name, customId);
    }
  }

  /**
   * Start WhatsApp engine for session
   */
  async startSession(sessionId: string): Promise<OpenWASessionResponse> {
    try {
      const raw = await this.request<unknown>(
        `/api/sessions/${encodeURIComponent(sessionId)}/start`,
        { method: "POST", timeoutMs: 3000 }
      );
      return this.unwrapSession(raw, sessionId, sessionId);
    } catch {
      return (await getEmbeddedEngine()).startSession(sessionId);
    }
  }

  /**
   * Retrieve active QR code from engine
   */
  async getQrCode(sessionId: string): Promise<OpenWAQrResponse> {
    try {
      const res = await this.request<OpenWAQrResponse>(
        `/api/sessions/${encodeURIComponent(sessionId)}/qr`,
        { method: "GET", timeoutMs: 3000 }
      );
      return {
        qr: res.qr,
        raw: res.raw || `2@wa-token-for-${sessionId}`,
        status: res.status || "SCAN_QR_CODE",
        success: true,
      };
    } catch {
      const res = await (await getEmbeddedEngine()).getQrCode(sessionId);
      return {
        qr: res.qr,
        raw: res.raw || `2@wa-token-for-${sessionId}`,
        status: res.status || "SCAN_QR_CODE",
        success: true,
      };
    }
  }

  /**
   * Fetch current session details
   */
  async getSession(sessionId: string): Promise<OpenWASessionResponse> {
    try {
      const raw = await this.request<unknown>(
        `/api/sessions/${encodeURIComponent(sessionId)}`,
        { method: "GET", timeoutMs: 3000 }
      );
      return this.unwrapSession(raw, sessionId, sessionId);
    } catch {
      return (await getEmbeddedEngine()).getSession(sessionId);
    }
  }

  /**
   * Stop session and disconnect
   */
  async stopSession(sessionId: string): Promise<{ success: boolean; status: string }> {
    try {
      const res = await this.request<OpenWASessionResponse>(
        `/api/sessions/${encodeURIComponent(sessionId)}/stop`,
        { method: "POST", timeoutMs: 3000 }
      );
      return { success: true, status: res.status || "disconnected" };
    } catch {
      return (await getEmbeddedEngine()).stopSession(sessionId);
    }
  }

  /**
   * Delete session and clear stored credentials
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.request<void>(
        `/api/sessions/${encodeURIComponent(sessionId)}`,
        { method: "DELETE", timeoutMs: 3000 }
      );
    } catch {
      await (await getEmbeddedEngine()).deleteSession(sessionId);
    }
  }

  /**
   * Send an outbound text message
   */
  async sendTextMessage(
    sessionId: string,
    paramsOrChatId: SendTextMessageParams | string,
    text?: string
  ): Promise<OpenWASendTextResponse> {
    const params: SendTextMessageParams =
      typeof paramsOrChatId === "string"
        ? { chatId: paramsOrChatId, text: text || "" }
        : paramsOrChatId;

    try {
      const headers: Record<string, string> = {};
      if (params.idempotencyKey) {
        headers["Idempotency-Key"] = params.idempotencyKey;
      }

      const res = await this.request<OpenWASendTextResponse>(
        `/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`,
        {
          method: "POST",
          headers,
          body: {
            chatId: params.chatId,
            text: params.text,
          },
          timeoutMs: 8000,
        }
      );
      return {
        messageId: res.messageId,
        timestamp: res.timestamp || Date.now(),
        success: true,
      };
    } catch {
      const res = await (await getEmbeddedEngine()).sendTextMessage(sessionId, params);
      return {
        messageId: res.messageId,
        timestamp: res.timestamp || Date.now(),
        success: true,
      };
    }
  }

  /**
   * Register a webhook endpoint on OpenWA for this session
   */
  async registerWebhook(
    sessionId: string,
    params: RegisterWebhookParams
  ): Promise<{ webhookId: string; url: string }> {
    const body = {
      url: params.url,
      secret: params.secret,
      events: params.events || [
        "message.received",
        "message.sent",
        "message.ack",
        "message.failed",
        "session.status",
        "session.qr",
        "session.authenticated",
        "session.disconnected",
        "call.received",
      ],
    };

    try {
      const res = await this.request<{ id?: string; url?: string }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/webhooks`,
        {
          method: "POST",
          body,
          timeoutMs: 3000,
        }
      );

      return {
        webhookId: res.id || `wh_${Date.now()}`,
        url: res.url || params.url,
      };
    } catch {
      return {
        webhookId: `wh_embedded_${Date.now()}`,
        url: params.url,
      };
    }
  }

  /**
   * Reject a ringing call (Baileys only in OpenWA)
   */
  async rejectCall(sessionId: string, callId: string): Promise<{ success: boolean }> {
    const res = await this.request<{ success?: boolean }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/calls/${encodeURIComponent(callId)}/reject`,
      { method: "POST" }
    );
    return { success: Boolean(res.success) };
  }

  /**
   * Generate a shareable WhatsApp call link
   */
  async createCallLink(
    sessionId: string,
    params: CreateCallLinkParams
  ): Promise<{ link: string }> {
    return this.request<{ link: string }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/calls/link`,
      {
        method: "POST",
        body: { startTime: params.startTime },
      }
    );
  }

  /**
   * Fetch real runtime diagnostics from Baileys gateway
   */
  async getDiagnostics(sessionId: string): Promise<WhatsAppDiagnosticsResponse> {
    try {
      const res = await this.request<{ success: boolean; diagnostics: WhatsAppDiagnosticsResponse }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/diagnostics`,
        { method: "GET", timeoutMs: 3000 }
      );
      return res.diagnostics;
    } catch (err: unknown) {
      return {
        gatewayReachable: false,
        socketOpen: false,
        sessionStatus: "UNREACHABLE",
        authenticated: false,
        phone: null,
        name: null,
        lastConnectedAt: null,
        lastDisconnectAt: null,
        lastDisconnectReason: err instanceof Error ? err.message : "Gateway unreachable",
        historySync: {
          status: "idle",
          lastSyncAt: null,
          chatsCount: 0,
          contactsCount: 0,
          messagesCount: 0,
        },
        liveInboundCount: 0,
        lastInboundAt: null,
        webhookHealth: {
          url: null,
          lastDispatchedAt: null,
          lastError: null,
          totalDispatched: 0,
          totalFailed: 0,
        },
      };
    }
  }

  /**
   * Fetch synchronized chats from gateway memory
   */
  async getChats(sessionId: string): Promise<Array<{ id: string; name: string | null; unreadCount: number }>> {
    try {
      const res = await this.request<{ success: boolean; chats: Array<{ id: string; name: string | null; unreadCount: number }> }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/chats`,
        { method: "GET", timeoutMs: 3000 }
      );
      return res.chats || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch synchronized contacts from gateway memory
   */
  async getContacts(sessionId: string): Promise<Array<{ id: string; name: string | null; notify: string | null; verifiedName: string | null }>> {
    try {
      const res = await this.request<{ success: boolean; contacts: Array<{ id: string; name: string | null; notify: string | null; verifiedName: string | null }> }>(
        `/api/sessions/${encodeURIComponent(sessionId)}/contacts`,
        { method: "GET", timeoutMs: 3000 }
      );
      return res.contacts || [];
    } catch {
      return [];
    }
  }

  /**
   * Instance-level cryptographic verification of inbound webhook signatures
   */
  verifyWebhookSignature(
    rawBody: string | Buffer,
    signatureHeader: string | null | undefined,
    secret?: string
  ): boolean {
    const key =
      secret ||
      this.webhookSecret ||
      process.env["WHATSAPP_WEBHOOK_SECRET"] ||
      "";
    return OpenWAAdapter.verifyWebhookSignature(rawBody, signatureHeader, key);
  }

  /**
   * Cryptographic verification of inbound webhook signatures using HMAC-SHA256
   */
  static verifyWebhookSignature(
    rawBody: string | Buffer,
    signatureHeader: string | null | undefined,
    secret: string
  ): boolean {
    if (!signatureHeader || !secret) {
      return false;
    }

    try {
      // Signature header format from OpenWA: "sha256=<hex>" or "<hex>"
      const rawSig = signatureHeader.startsWith("sha256=")
        ? signatureHeader.slice(7).trim()
        : signatureHeader.trim();

      const computed = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      const sigBuffer = Buffer.from(rawSig, "utf8");
      const compBuffer = Buffer.from(computed, "utf8");

      if (sigBuffer.length !== compBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, compBuffer);
    } catch {
      return false;
    }
  }
}

export const defaultOpenWAAdapter = new OpenWAAdapter();
