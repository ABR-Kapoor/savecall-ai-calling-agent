/**
 * InsurCall WhatsApp Provider Interface
 * Abstraction layer keeping provider-specific API payloads behind a server-side adapter.
 * Allows seamless transition between OpenWA and future official Meta Cloud API.
 */

import type {
  OpenWASessionResponse,
  OpenWAQrResponse,
  OpenWASendTextResponse,
} from "./types";

export interface SendTextMessageParams {
  chatId: string;
  text: string;
  idempotencyKey?: string;
}

export interface RegisterWebhookParams {
  url: string;
  secret: string;
  events?: string[];
}

export interface CreateCallLinkParams {
  startTime: number;
}

export interface IWhatsAppProvider {
  /** Health check on underlying WhatsApp gateway service */
  checkHealth(): Promise<{ healthy: boolean; status: string; version?: string }>;

  /** Create a session record in the provider gateway */
  createSession(name: string): Promise<OpenWASessionResponse>;

  /** Start the engine and initialize WhatsApp connection for a session */
  startSession(sessionId: string): Promise<OpenWASessionResponse>;

  /** Retrieve the live QR code data URL from the engine */
  getQrCode(sessionId: string): Promise<OpenWAQrResponse>;

  /** Inspect the current status and linked phone of a session */
  getSession(sessionId: string): Promise<OpenWASessionResponse>;

  /** Stop a session and disconnect gracefully */
  stopSession(sessionId: string): Promise<{ success: boolean; status: string }>;

  /** Unlink device and delete session from provider */
  deleteSession(sessionId: string): Promise<void>;

  /** Send an outbound text message to a specific WhatsApp chat JID */
  sendTextMessage(
    sessionId: string,
    paramsOrChatId: SendTextMessageParams | string,
    text?: string
  ): Promise<OpenWASendTextResponse>;

  /** Register an external HTTP webhook for event notifications */
  registerWebhook(
    sessionId: string,
    params: RegisterWebhookParams
  ): Promise<{ webhookId: string; url: string }>;

  /** Reject a ringing incoming call (supported on Baileys engine) */
  rejectCall(sessionId: string, callId: string): Promise<{ success: boolean }>;

  /** Generate a shareable WhatsApp call link */
  createCallLink(sessionId: string, params: CreateCallLinkParams): Promise<{ link: string }>;
}
