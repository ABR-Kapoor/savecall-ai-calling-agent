import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { insforgeServer } from "@/lib/insforge/client.server";
import { resolveCurrentTenantId } from "@/lib/insurance.functions";
import { DefaultTelephonyAdapter } from "./telephony/provider-adapter";
import { INDIAN_CARRIERS, normalizeE164, formatDisplayNumber } from "./telephony/indian-carriers";
import type {
  PhoneNumberRecord,
  TelephonyConnectionRecord,
} from "./telephony/types";

// ==========================================
// SCHEMAS & INPUT TYPES
// ==========================================

export const ScopedTelephonyInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});
export type ScopedTelephonyInput = z.infer<typeof ScopedTelephonyInput>;

export const CreatePhoneNumberInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
  phoneNumber: z.string().min(8, "Phone number must be at least 8 digits"),
  countryCode: z.string().default("+91"),
  connectionType: z.enum(["forwarding", "sip_trunk", "hosted_number", "porting"]).default("forwarding"),
  carrierId: z.string().default("airtel"),
  forwardingMode: z.enum(["busy_and_no_answer", "all_calls", "unreachable_only"]).default("busy_and_no_answer"),
  sipConfig: z
    .object({
      trunkProvider: z.string().default("Tata Tele Smartflo"),
      sipUri: z.string().default("sip:sip.insurcall.ai"),
      authUsername: z.string().optional(),
      outboundCliAuthorized: z.string().optional(),
      transport: z.enum(["udp", "tcp", "tls"]).default("tls"),
    })
    .optional(),
  agentId: z.string().uuid().optional(),
});
export type CreatePhoneNumberInput = z.infer<typeof CreatePhoneNumberInput>;

export const PhoneActionInput = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});
export type PhoneActionInput = z.infer<typeof PhoneActionInput>;

export const TestPhoneInput = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
  testCallerPhone: z.string().optional(),
});
export type TestPhoneInput = z.infer<typeof TestPhoneInput>;

export const DisconnectPhoneInput = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
  reason: z.string().optional(),
});
export type DisconnectPhoneInput = z.infer<typeof DisconnectPhoneInput>;

// ==========================================
// SERVER FUNCTIONS
// ==========================================

/**
 * Lists all configured phone numbers and telephony connections for the authenticated tenant.
 */
export const getPhoneNumbers = createServerFn({ method: "GET", strict: false })
  .validator((input?: ScopedTelephonyInput) => ScopedTelephonyInput.parse(input ?? {}))
  .handler(async ({ data: input }: { data: ScopedTelephonyInput }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
      if (!tenantId) {
        return {
          phoneNumbers: [] as PhoneNumberRecord[],
          connections: [] as TelephonyConnectionRecord[],
        };
      }

      const [phonesRes, connsRes] = await Promise.all([
        insforgeServer.database
          .from("phone_numbers")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        insforgeServer.database
          .from("telephony_connections")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
      ]);

      if (phonesRes.error) {
        throw new Error(phonesRes.error.message);
      }

      const phoneNumbers = (phonesRes.data || []) as PhoneNumberRecord[];
      const connections = (connsRes.data || []) as TelephonyConnectionRecord[];

      return {
        phoneNumbers,
        connections,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load phone numbers";
      console.error("getPhoneNumbers error:", msg);
      throw new Error(msg);
    }
  });

/**
 * Returns available Indian telecom carrier configurations and charge disclosures.
 */
export const getCarrierOptions = createServerFn({ method: "GET", strict: false }).handler(async () => {
  return Object.values(INDIAN_CARRIERS).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    chargeNotice: c.chargeNotice,
    supportsCliPreservation: c.supportsCliPreservation,
    notes: c.notes,
  }));
});

/**
 * Registers and initiates onboarding for a business phone number.
 */
export const createPhoneNumber = createServerFn({ method: "POST", strict: false })
  .validator((input: CreatePhoneNumberInput) => CreatePhoneNumberInput.parse(input))
  .handler(async ({ data: input }: { data: CreatePhoneNumberInput }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
      if (!tenantId) {
        throw new Error("403: Forbidden - Active tenant membership required");
      }

      const normalizedNumber = normalizeE164(input.phoneNumber);
      const displayNumber = formatDisplayNumber(normalizedNumber);
      const adapter = DefaultTelephonyAdapter.getInstance();

      // Check if number already registered under this tenant
      const { data: existing } = await insforgeServer.database
        .from("phone_numbers")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .eq("phone_number", normalizedNumber)
        .maybeSingle();

      if (existing) {
        throw new Error(`Phone number ${displayNumber} is already configured in this workspace`);
      }

      // Generate carrier forwarding instructions or SIP config
      let forwardingConfig: Record<string, unknown> = {};
      let sipConfig: Record<string, unknown> = {};

      if (input.connectionType === "forwarding") {
        const instructions = await adapter.generateForwardingInstructions(
          normalizedNumber,
          input.carrierId,
          input.forwardingMode
        );

        forwardingConfig = {
          carrierId: input.carrierId,
          carrierName: instructions.carrierName,
          routingDid: instructions.routingDid,
          mode: input.forwardingMode,
          activationMmi: instructions.activationMmi,
          deactivationMmi: instructions.deactivationMmi,
          statusCheckMmi: instructions.statusCheckMmi,
          callerIdPreserved: INDIAN_CARRIERS[input.carrierId]?.supportsCliPreservation ?? true,
          chargeNotice: instructions.chargeDisclosure,
        };
      } else if (input.connectionType === "sip_trunk" && input.sipConfig) {
        sipConfig = {
          trunkProvider: input.sipConfig.trunkProvider,
          sipUri: input.sipConfig.sipUri,
          authUsername: input.sipConfig.authUsername || `insurcall-${tenantId.slice(0, 8)}`,
          outboundCliAuthorized: input.sipConfig.outboundCliAuthorized || normalizedNumber,
          transport: input.sipConfig.transport,
          codecPriority: ["G.711u", "G.711a", "Opus"],
        };
      }

      // Insert phone number record
      const { data: phoneRecord, error: insertErr } = await insforgeServer.database
        .from("phone_numbers")
        .insert([
          {
            tenant_id: tenantId,
            agent_id: input.agentId || null,
            phone_number: normalizedNumber,
            display_number: displayNumber,
            country_code: input.countryCode,
            connection_type: input.connectionType,
            provider: input.connectionType === "sip_trunk" ? "enterprise_sip" : "inbound_did_gateway",
            status: "SETUP_PENDING",
            inbound_enabled: true,
            outbound_enabled: input.connectionType === "sip_trunk",
            forwarding_config: forwardingConfig,
            sip_config: sipConfig,
            verification_metadata: {
              method: input.connectionType === "forwarding" ? "manual_declaration" : "sip_ping",
              attemptsCount: 0,
              diagnostics: ["Initialized phone number onboarding wizard"],
            },
          },
        ])
        .select("*")
        .single();

      if (insertErr || !phoneRecord) {
        throw new Error(insertErr?.message || "Failed to create phone number record");
      }

      // Audit log entry
      await insforgeServer.database.from("audit_logs").insert([
        {
          tenant_id: tenantId,
          action: "PHONE_NUMBER_CONFIGURED",
          actor_type: "user",
          actor_id: input.clerkUserId || "authenticated-user",
          target_resource: `phone_numbers/${phoneRecord.id}`,
          payload: {
            phoneNumber: normalizedNumber,
            connectionType: input.connectionType,
            carrierId: input.carrierId,
          },
        },
      ]);

      return phoneRecord as PhoneNumberRecord;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register phone number";
      console.error("createPhoneNumber error:", msg);
      throw new Error(msg);
    }
  });

/**
 * Initiates carrier verification procedure.
 */
export const initiatePhoneVerification = createServerFn({ method: "POST", strict: false })
  .validator((input: PhoneActionInput) => PhoneActionInput.parse(input))
  .handler(async ({ data: input }: { data: PhoneActionInput }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
      if (!tenantId) {
        throw new Error("403: Forbidden - Tenant membership required");
      }

      const adapter = DefaultTelephonyAdapter.getInstance();
      const result = await adapter.initiateVerification(input.id, tenantId);

      await insforgeServer.database.from("audit_logs").insert([
        {
          tenant_id: tenantId,
          action: "PHONE_VERIFICATION_INITIATED",
          actor_type: "user",
          actor_id: input.clerkUserId || "authenticated-user",
          target_resource: `phone_numbers/${input.id}`,
          payload: { status: result.status },
        },
      ]);

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate verification";
      throw new Error(msg);
    }
  });

/**
 * Verifies that the carrier forwarding code or SIP connection is in place.
 */
export const verifyPhoneNumber = createServerFn({ method: "POST", strict: false })
  .validator((input: PhoneActionInput) => PhoneActionInput.parse(input))
  .handler(async ({ data: input }: { data: PhoneActionInput }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
      if (!tenantId) {
        throw new Error("403: Forbidden - Tenant membership required");
      }

      const adapter = DefaultTelephonyAdapter.getInstance();
      const result = await adapter.verifyConnection(input.id, tenantId);

      await insforgeServer.database.from("audit_logs").insert([
        {
          tenant_id: tenantId,
          action: "PHONE_VERIFICATION_CONFIRMED",
          actor_type: "user",
          actor_id: input.clerkUserId || "authenticated-user",
          target_resource: `phone_numbers/${input.id}`,
          payload: { verified: result.verified, status: result.status },
        },
      ]);

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify phone number";
      throw new Error(msg);
    }
  });

/**
 * Runs a simulated inbound test call to verify audio synthesis, agent greeting, and RAG retrieval.
 */
export const testPhoneNumber = createServerFn({ method: "POST", strict: false })
  .validator((input: TestPhoneInput) => TestPhoneInput.parse(input))
  .handler(async ({ data: input }: { data: TestPhoneInput }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
      if (!tenantId) {
        throw new Error("403: Forbidden - Tenant membership required");
      }

      const adapter = DefaultTelephonyAdapter.getInstance();
      const result = await adapter.simulateTestCall(input.id, tenantId, input.testCallerPhone);

      await insforgeServer.database.from("audit_logs").insert([
        {
          tenant_id: tenantId,
          action: "PHONE_TEST_CALL_COMPLETED",
          actor_type: "user",
          actor_id: input.clerkUserId || "authenticated-user",
          target_resource: `phone_numbers/${input.id}`,
          payload: {
            callSessionId: result.callSessionId,
            latencyMs: result.latencyMs,
            success: result.success,
          },
        },
      ]);

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to run test call";
      throw new Error(msg);
    }
  });

/**
 * Activates the verified phone number for live production calls.
 */
export const activatePhoneNumber = createServerFn({ method: "POST", strict: false })
  .validator((input: PhoneActionInput) => PhoneActionInput.parse(input))
  .handler(async ({ data: input }: { data: PhoneActionInput }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
      if (!tenantId) {
        throw new Error("403: Forbidden - Tenant membership required");
      }

      const adapter = DefaultTelephonyAdapter.getInstance();
      const result = await adapter.activateNumber(input.id, tenantId);

      await insforgeServer.database.from("audit_logs").insert([
        {
          tenant_id: tenantId,
          action: "PHONE_NUMBER_ACTIVATED",
          actor_type: "user",
          actor_id: input.clerkUserId || "authenticated-user",
          target_resource: `phone_numbers/${input.id}`,
          payload: { status: result.status },
        },
      ]);

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to activate phone number";
      throw new Error(msg);
    }
  });

/**
 * Disconnects the phone number and provides carrier rollback codes (e.g. ##002# or *402).
 */
export const disconnectPhoneNumber = createServerFn({ method: "POST", strict: false })
  .validator((input: DisconnectPhoneInput) => DisconnectPhoneInput.parse(input))
  .handler(async ({ data: input }: { data: DisconnectPhoneInput }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
      if (!tenantId) {
        throw new Error("403: Forbidden - Tenant membership required");
      }

      const adapter = DefaultTelephonyAdapter.getInstance();
      const result = await adapter.disconnectNumber(input.id, tenantId, input.reason);

      await insforgeServer.database.from("audit_logs").insert([
        {
          tenant_id: tenantId,
          action: "PHONE_NUMBER_DISCONNECTED",
          actor_type: "user",
          actor_id: input.clerkUserId || "authenticated-user",
          target_resource: `phone_numbers/${input.id}`,
          payload: { reason: input.reason || "User requested disconnection" },
        },
      ]);

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to disconnect phone number";
      throw new Error(msg);
    }
  });
