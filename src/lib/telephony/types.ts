/**
 * Telephony & Phone Number Onboarding Domain Models & Types
 * InsurCall AI Voice Receptionist
 */

export type PhoneNumberConnectionType = "forwarding" | "sip_trunk" | "hosted_number" | "porting";

export type PhoneNumberStatus =
  | "NOT_CONFIGURED"
  | "SETUP_PENDING"
  | "VERIFICATION_PENDING"
  | "CONFIGURED"
  | "TESTING"
  | "ACTIVE"
  | "FAILED"
  | "DISCONNECTED"
  | "SUSPENDED";

export interface IndianCarrierInfo {
  id: string;
  name: string;
  type: "mobile" | "enterprise";
  conditionalBusyCode: string;
  conditionalNoAnswerCode: string;
  conditionalUnreachableCode: string;
  unconditionalForwardCode: string;
  deactivateAllCode: string;
  statusCheckCode: string;
  chargeNotice: string;
  supportsCliPreservation: boolean;
  notes: string;
}

export interface ForwardingConfig {
  carrierId: string;
  carrierName: string;
  routingDid: string;
  mode: "busy_and_no_answer" | "all_calls" | "unreachable_only";
  activationMmi: string;
  deactivationMmi: string;
  callerIdPreserved: boolean;
  notes?: string;
}

export interface SipTrunkConfig {
  trunkProvider: string;
  sipUri: string;
  authUsername?: string;
  outboundCliAuthorized?: string;
  ipWhitelist?: string[];
  transport: "udp" | "tcp" | "tls";
  codecPriority: string[];
}

export interface VerificationMetadata {
  method: "test_call" | "sms_otp" | "manual_declaration" | "sip_ping";
  attemptsCount: number;
  lastAttemptAt?: string;
  verificationCodeMasked?: string;
  carrierDetected?: string;
  diagnostics?: string[];
  failureReason?: string;
}

export interface PhoneNumberRecord {
  id: string;
  tenant_id: string;
  agent_id: string | null;
  phone_number: string;
  display_number: string;
  country_code: string;
  connection_type: PhoneNumberConnectionType;
  provider: string;
  status: PhoneNumberStatus;
  inbound_enabled: boolean;
  outbound_enabled: boolean;
  forwarding_config: ForwardingConfig | Record<string, unknown>;
  sip_config: SipTrunkConfig | Record<string, unknown>;
  verification_metadata: VerificationMetadata | Record<string, unknown>;
  verified_at: string | null;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TelephonyConnectionRecord {
  id: string;
  tenant_id: string;
  phone_number_id: string | null;
  provider_name: string;
  provider_connection_id: string | null;
  webhook_secret: string | null;
  health_status: "healthy" | "degraded" | "offline";
  capabilities: {
    inbound_voice?: boolean;
    outbound_voice?: boolean;
    forwarding_ingest?: boolean;
    sip_trunking?: boolean;
    sms_fallback?: boolean;
    recording?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface TelephonyProviderAdapter {
  listAvailableMethods(): Promise<Array<{
    type: PhoneNumberConnectionType;
    title: string;
    description: string;
    recommended: boolean;
    availableInCountry: boolean;
  }>>;

  generateForwardingInstructions(
    phoneNumber: string,
    carrierId: string,
    mode: "busy_and_no_answer" | "all_calls" | "unreachable_only"
  ): Promise<{
    routingDid: string;
    activationMmi: string;
    deactivationMmi: string;
    statusCheckMmi: string;
    chargeDisclosure: string;
    carrierName: string;
  }>;

  initiateVerification(
    phoneNumberId: string,
    tenantId: string
  ): Promise<{
    success: boolean;
    status: PhoneNumberStatus;
    instructions: string;
    verificationToken?: string;
  }>;

  verifyConnection(
    phoneNumberId: string,
    tenantId: string,
    verificationCode?: string
  ): Promise<{
    verified: boolean;
    status: PhoneNumberStatus;
    error?: string;
  }>;

  simulateTestCall(
    phoneNumberId: string,
    tenantId: string,
    callerPhone?: string
  ): Promise<{
    success: boolean;
    callSessionId?: string;
    roomName?: string;
    logs: string[];
    latencyMs: number;
    error?: string;
  }>;

  activateNumber(
    phoneNumberId: string,
    tenantId: string
  ): Promise<{
    success: boolean;
    status: PhoneNumberStatus;
    error?: string;
  }>;

  disconnectNumber(
    phoneNumberId: string,
    tenantId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    status: PhoneNumberStatus;
    rollbackInstructions?: string;
  }>;
}
