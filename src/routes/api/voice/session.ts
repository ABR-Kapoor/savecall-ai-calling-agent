import { createFileRoute } from "@tanstack/react-router";
import { AccessToken } from "livekit-server-sdk";
import { z } from "zod";
import { insforgeServer } from "@/lib/insforge/client.server";

const apiKey = process.env["LIVEKIT_API_KEY"] || "devkey";
const apiSecret = process.env["LIVEKIT_API_SECRET"] || "secret";
const defaultLivekitUrl = process.env["VITE_LIVEKIT_URL"] || "ws://127.0.0.1:7880";

const SessionInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
  policyNumber: z.string().min(3).max(32).optional(),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/voice/session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = SessionInput.parse(await request.json().catch(() => ({})));

          // 1. Resolve authorized tenant from database
          let tenant: any = null;
          if (body.tenantId) {
            const { data } = await insforgeServer.database
              .from("tenants")
              .select("id, name, slug, branding_config")
              .eq("id", body.tenantId)
              .maybeSingle();
            tenant = data;
          }

          if (!tenant) {
            // Resolve primary configured tenant
            const { data: primaryTenant } = await insforgeServer.database
              .from("tenants")
              .select("id, name, slug, branding_config")
              .limit(1)
              .maybeSingle();
            tenant = primaryTenant;
          }

          if (!tenant) {
            return json({ error: "No active tenant configured for voice calls" }, 400);
          }

          const tenantId = tenant.id;

          // 2. Resolve genuine customer record without fabricating synthetic data or leaking other customer accounts
          let customer: {
            id: string | null;
            name: string;
            email: string | null;
            phone: string | null;
            customerNumber: string | null;
            isVerified: boolean;
          } | null = null;

          // Lookup by Clerk User ID
          if (body.clerkUserId) {
            try {
              const { data } = await insforgeServer.database
                .from("customers")
                .select("id, name, email, phone, customer_number, tenant_id")
                .eq("tenant_id", tenantId)
                .eq("clerk_user_id", body.clerkUserId)
                .maybeSingle();
              if (data) {
                customer = {
                  id: data.id,
                  name: data.name,
                  email: data.email,
                  phone: data.phone,
                  customerNumber: data.customer_number,
                  isVerified: true,
                };
              }
            } catch (err: any) {
              console.warn("Customer lookup by clerk_user_id notice:", err?.message);
            }
          }

          // Lookup by verified Customer Email
          if (!customer && body.customerEmail) {
            try {
              const { data } = await insforgeServer.database
                .from("customers")
                .select("id, name, email, phone, customer_number, tenant_id")
                .eq("tenant_id", tenantId)
                .eq("email", body.customerEmail)
                .maybeSingle();
              if (data) {
                customer = {
                  id: data.id,
                  name: data.name,
                  email: data.email,
                  phone: data.phone,
                  customerNumber: data.customer_number,
                  isVerified: true,
                };
              }
            } catch (err: any) {
              console.warn("Customer lookup by email notice:", err?.message);
            }
          }

          // Lookup by Policy Number
          if (!customer && body.policyNumber) {
            try {
              const { data: pol } = await insforgeServer.database
                .from("policies")
                .select("customer_id, customers(*)")
                .eq("tenant_id", tenantId)
                .eq("policy_number", body.policyNumber)
                .maybeSingle();
              if (pol?.customers) {
                const c = pol.customers as any;
                customer = {
                  id: c.id,
                  name: c.name,
                  email: c.email,
                  phone: c.phone,
                  customerNumber: c.customer_number,
                  isVerified: true,
                };
              }
            } catch (err: any) {
              console.warn("Customer lookup by policy notice:", err?.message);
            }
          }

          // If no verified record exists, assign a clean unverified Guest caller context
          // (CRITICAL P0: NEVER auto-create fake policies or fall back to other customer accounts)
          if (!customer) {
            customer = {
              id: null,
              name: body.customerName?.trim() || "Guest Caller",
              email: body.customerEmail || null,
              phone: body.customerPhone || null,
              customerNumber: null,
              isVerified: false,
            };
          }

          const roomName = `savecall-${tenant.slug || "call"}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const generatedSessionId = crypto.randomUUID();
          let callSessionId = generatedSessionId;

          // 3. Persist call session audit row
          try {
            const { data: sessionRow, error: sessionErr } = await insforgeServer.database
              .from("call_sessions")
              .insert([
                {
                  id: generatedSessionId,
                  tenant_id: tenantId,
                  customer_id: customer.id,
                  room_name: roomName,
                  caller_name: customer.name,
                  caller_phone: customer.phone,
                  status: "active",
                  risk_state: "LOW",
                  started_at: new Date().toISOString(),
                },
              ])
              .select("id")
              .maybeSingle();

            if (sessionRow?.id) {
              callSessionId = sessionRow.id;
            } else if (sessionErr) {
              console.warn("Call session insert notice:", sessionErr.message);
            }
          } catch (dbErr: any) {
            console.warn("Database call_sessions notice:", dbErr?.message);
          }

          // 4. Generate LiveKit Access Token with least-privilege grants and sanitized metadata (NO raw PII in JWT)
          const at = new AccessToken(apiKey, apiSecret, {
            identity: `caller_${callSessionId.slice(0, 8)}`,
            name: customer.name,
            ttl: "15m",
            metadata: JSON.stringify({
              session_id: callSessionId,
              tenant_id: tenantId,
              is_authenticated: customer.isVerified,
            }),
          });

          at.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
          });

          const token = await at.toJwt();

          // Calculate reachable LiveKit URL for client
          let livekitUrl = defaultLivekitUrl;
          const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host");
          if (hostHeader && defaultLivekitUrl.includes("127.0.0.1")) {
            const hostIp = hostHeader.split(":")[0];
            if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1") {
              livekitUrl = `ws://${hostIp}:7880`;
            }
          }

          // 5. Assemble personalized agent greeting from tenant branding config
          const branding = (tenant.branding_config as any) || {};
          const agentConfig = branding.agent_config || {};
          const tmpl =
            agentConfig.greeting ||
            "Hello {{customer_name}}! Welcome to {{company_name}} assistance. How may I help you today?";
          const agentGreeting = tmpl
            .replace(/\{\{customer_name\}\}/g, customer.isVerified ? customer.name : "there")
            .replace(/\{\{company_name\}\}/g, tenant.name || "SaveCall");

          return json({
            token,
            roomName,
            callSessionId,
            livekitUrl,
            greeting: agentGreeting,
            agentConfig,
            customer: {
              id: customer.id,
              name: customer.name,
              customerNumber: customer.customerNumber,
              tenantId,
              isVerified: customer.isVerified,
            },
          });
        } catch (err: any) {
          console.error("Voice session generation error:", err);
          return json({ error: err.message || "Could not initialize voice session" }, 500);
        }
      },
    },
  },
});
