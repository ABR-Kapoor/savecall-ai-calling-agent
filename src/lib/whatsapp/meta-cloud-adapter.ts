/**
 * InsurCall Official Meta WhatsApp Cloud API Provider Adapter
 * Implements Meta WhatsApp Business Platform Graph API (v21.0)
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
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

export interface MetaCloudConfig {
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  appSecret?: string;
  verifyToken?: string;
  apiVersion?: string;
}

export interface MetaCloudSetupStatus {
  hasAccessToken: boolean;
  hasPhoneNumberId: boolean;
  hasBusinessAccountId: boolean;
  hasAppSecret: boolean;
  hasVerifyToken: boolean;
  state: "ready" | "missing_credentials" | "unverified_business" | "misconfigured";
  missingFields: string[];
}

export class MetaWhatsAppAdapter implements IWhatsAppProvider {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly businessAccountId: string;
  private readonly appSecret: string;
  private readonly verifyToken: string;
  private readonly apiVersion: string;
  private readonly graphBaseUrl: string;

  constructor(config?: MetaCloudConfig) {
    this.accessToken =
      config?.accessToken ||
      process.env["META_WHATSAPP_ACCESS_TOKEN"] ||
      process.env["WHATSAPP_CLOUD_ACCESS_TOKEN"] ||
      "";
    this.phoneNumberId =
      config?.phoneNumberId ||
      process.env["META_WHATSAPP_PHONE_NUMBER_ID"] ||
      process.env["WHATSAPP_CLOUD_PHONE_NUMBER_ID"] ||
      "";
    this.businessAccountId =
      config?.businessAccountId ||
      process.env["META_WHATSAPP_BUSINESS_ACCOUNT_ID"] ||
      process.env["WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID"] ||
      "";
    this.appSecret =
      config?.appSecret ||
      process.env["META_APP_SECRET"] ||
      process.env["WHATSAPP_CLOUD_APP_SECRET"] ||
      "";
    this.verifyToken =
      config?.verifyToken ||
      process.env["META_WHATSAPP_VERIFY_TOKEN"] ||
      process.env["WHATSAPP_CLOUD_VERIFY_TOKEN"] ||
      "";
    this.apiVersion = config?.apiVersion || "v21.0";
    this.graphBaseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  getSetupStatus(): MetaCloudSetupStatus {
    const missing: string[] = [];
    if (!this.accessToken) missing.push("META_WHATSAPP_ACCESS_TOKEN");
    if (!this.phoneNumberId) missing.push("META_WHATSAPP_PHONE_NUMBER_ID");
    if (!this.businessAccountId) missing.push("META_WHATSAPP_BUSINESS_ACCOUNT_ID");
    if (!this.appSecret) missing.push("META_APP_SECRET");
    if (!this.verifyToken) missing.push("META_WHATSAPP_VERIFY_TOKEN");

    let state: MetaCloudSetupStatus["state"] = "ready";
    if (!this.accessToken || !this.phoneNumberId) {
      state = "missing_credentials";
    } else if (!this.businessAccountId || !this.appSecret) {
      state = "unverified_business";
    } else if (missing.length > 0) {
      state = "misconfigured";
    }

    return {
      hasAccessToken: Boolean(this.accessToken),
      hasPhoneNumberId: Boolean(this.phoneNumberId),
      hasBusinessAccountId: Boolean(this.businessAccountId),
      hasAppSecret: Boolean(this.appSecret),
      hasVerifyToken: Boolean(this.verifyToken),
      state,
      missingFields: missing,
    };
  }

  async checkHealth(): Promise<{ healthy: boolean; status: string; version?: string }> {
    const setup = this.getSetupStatus();
    if (setup.state !== "ready") {
      return {
        healthy: false,
        status: setup.state,
        version: `meta-cloud-api-${this.apiVersion}`,
      };
    }

    try {
      const res = await fetch(`${this.graphBaseUrl}/${this.phoneNumberId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        return {
          healthy: false,
          status: `HTTP_${res.status}`,
          version: `meta-cloud-api-${this.apiVersion}`,
        };
      }

      const data = (await res.json()) as Record<string, unknown>;
      return {
        healthy: true,
        status: String(data["verified_name"] ? "verified" : "connected"),
        version: `meta-cloud-api-${this.apiVersion}`,
      };
    } catch (err: unknown) {
      return {
        healthy: false,
        status: err instanceof Error ? err.message : "unreachable",
        version: `meta-cloud-api-${this.apiVersion}`,
      };
    }
  }

  async createSession(name: string): Promise<OpenWASessionResponse> {
    const setup = this.getSetupStatus();
    return {
      id: this.phoneNumberId || name,
      name,
      status: setup.state === "ready" ? "ready" : setup.state,
      phone: this.phoneNumberId || null,
      success: setup.state === "ready",
      session: {
        id: this.phoneNumberId || name,
        name,
        status: setup.state === "ready" ? "ready" : setup.state,
        phone: this.phoneNumberId || null,
      },
    };
  }

  async startSession(sessionId: string): Promise<OpenWASessionResponse> {
    return this.createSession(sessionId);
  }

  async getQrCode(_sessionId: string): Promise<OpenWAQrResponse> {
    return {
      qr: "",
      raw: "",
      status: "CLOUD_API_NO_QR_REQUIRED",
      success: true,
      attempts: 0,
    };
  }

  async getSession(sessionId: string): Promise<OpenWASessionResponse> {
    return this.createSession(sessionId);
  }

  async stopSession(_sessionId: string): Promise<{ success: boolean; status: string }> {
    return { success: true, status: "cloud_api_active" };
  }

  async deleteSession(_sessionId: string): Promise<void> {
    // Cloud API credentials reside in server configuration, no local session files to delete
  }

  async sendTextMessage(
    _sessionId: string,
    paramsOrChatId: SendTextMessageParams | string,
    textParam?: string
  ): Promise<OpenWASendTextResponse> {
    const setup = this.getSetupStatus();
    if (setup.state !== "ready") {
      throw new Error(`Meta Cloud API not ready: ${setup.state} (${setup.missingFields.join(", ")})`);
    }

    const allowOutbound = process.env["ALLOW_OUTBOUND_WHATSAPP"] === "true";
    if (!allowOutbound) {
      const target = typeof paramsOrChatId === "string" ? paramsOrChatId : paramsOrChatId.chatId;
      console.warn(`[Meta Cloud Adapter] Outbound send suppressed by safety guard. Target: ${target}`);
      return {
        messageId: `wamid.meta_suppressed_${Date.now()}`,
        timestamp: Date.now(),
        success: true,
      };
    }

    let toPhone = "";
    let bodyText = "";

    if (typeof paramsOrChatId === "string") {
      toPhone = paramsOrChatId;
      bodyText = textParam || "";
    } else {
      toPhone = paramsOrChatId.chatId;
      bodyText = paramsOrChatId.text;
    }

    const cleanTo = toPhone.replace(/[^0-9]/g, "");
    const url = `${this.graphBaseUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanTo,
      type: "text",
      text: {
        preview_url: false,
        body: bodyText,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Meta Cloud API error HTTP ${res.status}: ${errBody}`);
    }

    const data = (await res.json()) as { messages?: Array<{ id: string }> };
    const wamid = data?.messages?.[0]?.id || `wamid.meta_${Date.now()}`;

    return {
      messageId: wamid,
      timestamp: Date.now(),
      success: true,
    };
  }

  async registerWebhook(
    _sessionId: string,
    params: RegisterWebhookParams
  ): Promise<{ webhookId: string; url: string }> {
    return {
      webhookId: `meta_cloud_webhook_${this.phoneNumberId || "default"}`,
      url: params.url,
    };
  }

  async rejectCall(_sessionId: string, _callId: string): Promise<{ success: boolean }> {
    return { success: false };
  }

  async createCallLink(_sessionId: string, _params: CreateCallLinkParams): Promise<{ link: string }> {
    throw new Error("Meta Cloud API does not support programmatic WhatsApp Call link generation without Meta Calling API enablement.");
  }

  verifyWebhookChallenge(mode: string | null, token: string | null, challenge: string | null): string | null {
    if (mode === "subscribe" && token === this.verifyToken && challenge) {
      return challenge;
    }
    return null;
  }

  verifyPayloadSignature(rawPayload: string | Buffer, signatureHeader: string | null | undefined): boolean {
    if (!signatureHeader || !this.appSecret) return false;
    try {
      const rawSig = signatureHeader.startsWith("sha256=")
        ? signatureHeader.slice(7).trim()
        : signatureHeader.trim();
      const computed = crypto.createHmac("sha256", this.appSecret).update(rawPayload).digest("hex");
      const sigBuf = Buffer.from(rawSig, "utf8");
      const compBuf = Buffer.from(computed, "utf8");
      if (sigBuf.length !== compBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, compBuf);
    } catch {
      return false;
    }
  }

  async getDiagnostics(sessionId: string): Promise<WhatsAppDiagnosticsResponse> {
    const setup = this.getSetupStatus();
    const health = await this.checkHealth();

    return {
      gatewayReachable: health.healthy,
      socketOpen: health.healthy,
      sessionStatus: setup.state === "ready" ? "ready" : setup.state,
      authenticated: health.healthy,
      phone: this.phoneNumberId || null,
      name: "Meta Official Cloud API",
      lastConnectedAt: health.healthy ? new Date().toISOString() : null,
      lastDisconnectAt: null,
      lastDisconnectReason: health.healthy ? null : health.status,
      historySync: {
        status: "completed",
        lastSyncAt: null,
        chatsCount: 0,
        contactsCount: 0,
        messagesCount: 0,
      },
      liveInboundCount: 0,
      lastInboundAt: null,
      webhookHealth: {
        url: "/api/webhooks/whatsapp",
        lastDispatchedAt: null,
        lastError: null,
        totalDispatched: 0,
        totalFailed: 0,
      },
    };
  }
}

export const defaultMetaWhatsAppAdapter = new MetaWhatsAppAdapter();
