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
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
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

          // Resolve tenant (defaulting to primary tenant)
          let tenantId = body.tenantId;
          if (!tenantId) {
            try {
              const { data: defaultTenant } = await insforgeServer.database
                .from("tenants")
                .select("id")
                .limit(1)
                .maybeSingle();
              tenantId = defaultTenant?.id ?? "a0000000-0000-0000-0000-000000000001";
            } catch (err: any) {
              console.warn("InsForge tenant fetch warning:", err?.message);
              tenantId = "a0000000-0000-0000-0000-000000000001";
            }
          }

          // Dynamically resolve customer from Clerk or DB
          let customer: any = null;

          // 1. By Clerk User ID
          if (body.clerkUserId) {
            try {
              const { data } = await insforgeServer.database
                .from("customers")
                .select("id, name, email, phone, customer_number, tenant_id")
                .eq("tenant_id", tenantId)
                .eq("clerk_user_id", body.clerkUserId)
                .maybeSingle();
              customer = data;
            } catch (err: any) {
              console.warn("Customer lookup by clerk_user_id warning:", err?.message);
            }
          }

          // 2. By Customer Email
          if (!customer && body.customerEmail) {
            try {
              const { data } = await insforgeServer.database
                .from("customers")
                .select("id, name, email, phone, customer_number, tenant_id")
                .eq("tenant_id", tenantId)
                .eq("email", body.customerEmail)
                .maybeSingle();
              customer = data;

              // If found by email but clerk_user_id wasn't linked, update it
              if (customer && body.clerkUserId) {
                await insforgeServer.database
                  .from("customers")
                  .update({ clerk_user_id: body.clerkUserId })
                  .eq("id", customer.id);
              }
            } catch (err: any) {
              console.warn("Customer lookup by email warning:", err?.message);
            }
          }

          // 3. By Policy Number
          if (!customer && body.policyNumber) {
            try {
              const { data: pol } = await insforgeServer.database
                .from("policies")
                .select("customer_id, customers(*)")
                .eq("tenant_id", tenantId)
                .eq("policy_number", body.policyNumber)
                .maybeSingle();
              customer = pol?.customers;
            } catch (err: any) {
              console.warn("Customer lookup by policy warning:", err?.message);
            }
          }

          // 4. If user is signed in with Clerk but not in DB yet, auto-create their customer profile & active policies!
          if (!customer && (body.clerkUserId || body.customerEmail)) {
            try {
              const custNumber = "CUST-" + (body.clerkUserId ? body.clerkUserId.slice(-6).toUpperCase() : Math.random().toString(36).substring(2, 8).toUpperCase());
              const resolvedName = body.customerName?.trim() || (body.customerEmail ? body.customerEmail.split("@")[0] : "Policyholder");

              const { data: newCust, error: createErr } = await insforgeServer.database
                .from("customers")
                .insert([
                  {
                    tenant_id: tenantId,
                    clerk_user_id: body.clerkUserId || null,
                    name: resolvedName,
                    email: body.customerEmail || "user@example.com",
                    phone: body.customerPhone || "+91 98765 43210",
                    customer_number: custNumber,
                    status: "active",
                  },
                ])
                .select()
                .single();

              if (!createErr && newCust) {
                customer = newCust;

                // Provision active policy records for this real user
                await insforgeServer.database
                  .from("policies")
                  .insert([
                    {
                      tenant_id: tenantId,
                      customer_id: customer.id,
                      policy_number: `POL-HLTH-${custNumber.replace("CUST-", "")}`,
                      policy_type: "health",
                      sum_insured: 1500000,
                      premium_amount: 18500,
                      start_date: new Date().toISOString().split("T")[0],
                      end_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
                      status: "active",
                      nominee_name: "Family Nominee",
                      nominee_relationship: "Spouse",
                    },
                    {
                      tenant_id: tenantId,
                      customer_id: customer.id,
                      policy_number: `POL-AUTO-${custNumber.replace("CUST-", "")}`,
                      policy_type: "motor",
                      sum_insured: 950000,
                      premium_amount: 12400,
                      start_date: new Date().toISOString().split("T")[0],
                      end_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
                      status: "active",
                      nominee_name: "Family Nominee",
                      nominee_relationship: "Spouse",
                    },
                  ]);
              }
            } catch (err: any) {
              console.warn("Auto-provision customer notice:", err?.message);
            }
          }

          // 5. Fallback: Find most recently active customer in tenant
          if (!customer) {
            try {
              const { data: latestCust } = await insforgeServer.database
                .from("customers")
                .select("id, name, email, customer_number")
                .eq("tenant_id", tenantId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              customer = latestCust;
            } catch (err: any) {
              console.warn("Latest customer fetch warning:", err?.message);
            }
          }

          if (!customer) {
            customer = {
              id: "c0000000-0000-0000-0000-000000000001",
              name: body.customerName || "Policyholder",
              email: body.customerEmail || "customer@safelife.com",
              customer_number: "CUST-883921",
            };
          }

          const roomName = `savecall-session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const generatedSessionId = crypto.randomUUID();
          let callSessionId = generatedSessionId;

          // Create call_sessions row in InsForge
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
                  caller_phone: customer.phone || body.customerPhone || null,
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
              console.warn("InsForge call_sessions insert notice:", sessionErr.message);
            }
          } catch (dbErr: any) {
            console.warn("InsForge database operation notice:", dbErr?.message);
          }

          // Generate LiveKit Access Token
          const at = new AccessToken(apiKey, apiSecret, {
            identity: `customer_${customer.id}`,
            name: customer.name,
            ttl: "15m",
            metadata: JSON.stringify({
              voice_session_id: callSessionId,
              tenant_id: tenantId,
              customer_id: customer.id,
              customer_name: customer.name,
              customer_number: customer.customer_number,
              customer_email: customer.email,
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

          // Load user's trained agent config and personalized greeting
          let agentGreeting = `Hello ${customer.name || "there"}! Welcome to SaveCall insurance assistance. How may I help you today?`;
          let agentConfig: any = {};
          try {
            const { data: tData } = await insforgeServer.database
              .from("tenants")
              .select("name, branding_config")
              .eq("id", tenantId)
              .maybeSingle();

            if (tData) {
              const b = (tData.branding_config as any) || {};
              agentConfig = b.agent_config || {};
              const tmpl = agentConfig.greeting || "Hello {{customer_name}}! Welcome to {{company_name}} assistance. How may I help you today?";
              agentGreeting = tmpl
                .replace(/\{\{customer_name\}\}/g, customer.name || "there")
                .replace(/\{\{company_name\}\}/g, tData.name || "SaveCall");
            }
          } catch (tErr: any) {
            console.warn("Tenant greeting fetch notice:", tErr?.message);
          }

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
              customerNumber: customer.customer_number,
              tenantId,
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
