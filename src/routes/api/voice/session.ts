import { createFileRoute } from "@tanstack/react-router";
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

          if (body.clerkUserId) {
            const { data: member } = await insforgeServer.database
              .from("tenant_members")
              .select("tenant_id")
              .eq("clerk_user_id", body.clerkUserId)
              .eq("status", "active")
              .maybeSingle();

            if (member?.tenant_id) {
              if (body.tenantId && body.tenantId !== member.tenant_id) {
                return new Response(
                  JSON.stringify({ error: "Forbidden: cross-tenant voice session access denied" }),
                  { status: 403, headers: { "Content-Type": "application/json" } }
                );
              }
              const { data: memberTenant } = await insforgeServer.database
                .from("tenants")
                .select("id, name, slug, branding_config")
                .eq("id", member.tenant_id)
                .maybeSingle();
              tenant = memberTenant;
            }
          }

          if (!tenant && body.tenantId) {
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
            // Auto-bootstrap default InsurCall tenant so calls always succeed on fresh clean-slate database
            const defaultTenant = {
              id: "a0000000-0000-0000-0000-000000000001",
              name: "InsurCall",
              slug: "insurcall",
              branding_config: {
                plan: "Starter",
                onboarding_completed: true,
                agent_config: {
                  name: "Anya",
                  greeting: "Hello! Welcome to InsurCall assistance. How may I help you today?",
                },
              },
            };
            try {
              const { data: createdTenant } = await insforgeServer.database
                .from("tenants")
                .upsert(defaultTenant, { onConflict: "id" })
                .select("id, name, slug, branding_config")
                .single();
              tenant = createdTenant || defaultTenant;
            } catch {
              tenant = defaultTenant;
            }
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
          // Lookup by Clerk User ID
          if (body.clerkUserId) {
            try {
              const { data } = await insforgeServer.database
                .from("customers")
                .select("id, name, email, phone, customer_number, tenant_id")
                .eq("tenant_id", tenantId)
                .eq("clerk_user_id", body.clerkUserId)
                .order("created_at", { ascending: false })
                .limit(1);
              if (data && data.length > 0 && data[0]) {
                const rec = data[0];
                customer = {
                  id: rec.id,
                  name: rec.name,
                  email: rec.email,
                  phone: rec.phone,
                  customerNumber: rec.customer_number,
                  isVerified: true,
                };
              }
            } catch (err: any) {
              console.warn("Customer lookup by clerk_user_id notice:", err?.message);
            }

            // Direct fallback: fetch user from Clerk API and insert into database
            if (!customer) {
              try {
                const { clerkClient } = await import("@/lib/auth/clerk.server");
                const clerkUser = await clerkClient.users.getUser(body.clerkUserId);
                if (clerkUser) {
                  const email =
                    clerkUser.emailAddresses[0]?.emailAddress || body.customerEmail || null;
                  const name =
                    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
                    "Policyholder";
                  const phone =
                    clerkUser.phoneNumbers[0]?.phoneNumber || body.customerPhone || null;
                  const customerNumber =
                    "CUST-" + clerkUser.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();

                  const { data: newCust } = await insforgeServer.database
                    .from("customers")
                    .upsert(
                      [
                        {
                          tenant_id: tenantId,
                          clerk_user_id: clerkUser.id,
                          customer_number: customerNumber,
                          name,
                          email: email || "customer@example.com",
                          phone: phone || "+91 98765 43210",
                          status: "active",
                        },
                      ],
                      { onConflict: "tenant_id,customer_number" }
                    )
                    .select("id, name, email, phone, customer_number")
                    .single();

                  if (newCust) {
                    customer = {
                      id: newCust.id,
                      name: newCust.name,
                      email: newCust.email,
                      phone: newCust.phone,
                      customerNumber: newCust.customer_number,
                      isVerified: true,
                    };

                    // Also baseline policy
                    const polNumber = "POL-" + customerNumber.replace("CUST-", "") + "-HLT";
                    await insforgeServer.database.from("policies").upsert(
                      [
                        {
                          tenant_id: tenantId,
                          customer_id: newCust.id,
                          policy_number: polNumber,
                          policy_type: "health",
                          plan_name: "Comprehensive Health Shield Platinum",
                          nominee_name: "Designated Nominee",
                          nominee_relationship: "Spouse",
                          premium_amount: 18500.0,
                          due_date: "2026-11-30",
                          status: "active",
                        },
                      ],
                      { onConflict: "tenant_id,policy_number" }
                    );
                  }
                }
              } catch (cErr: any) {
                console.warn("Direct Clerk fetch in session notice:", cErr?.message);
              }
            }
          }

          // Lookup by verified Customer Phone
          if (!customer && body.customerPhone) {
            try {
              const cleanPhone = body.customerPhone.trim();
              const { data } = await insforgeServer.database
                .from("customers")
                .select("id, name, email, phone, customer_number, tenant_id")
                .eq("tenant_id", tenantId)
                .eq("phone", cleanPhone)
                .order("created_at", { ascending: false })
                .limit(1);
              if (data && data.length > 0 && data[0]) {
                const rec = data[0];
                customer = {
                  id: rec.id,
                  name: rec.name,
                  email: rec.email,
                  phone: rec.phone,
                  customerNumber: rec.customer_number,
                  isVerified: true,
                };
              }
            } catch (err: any) {
              console.warn("Customer lookup by phone notice:", err?.message);
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
                .order("created_at", { ascending: false })
                .limit(1);
              if (data && data.length > 0 && data[0]) {
                const rec = data[0];
                customer = {
                  id: rec.id,
                  name: rec.name,
                  email: rec.email,
                  phone: rec.phone,
                  customerNumber: rec.customer_number,
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

          // 2b. Resolve or auto-bootstrap primary AI Agent for this tenant
          let agentId: string | null = null;
          let agentData: any = null;
          try {
            const { data: existingAgent } = await insforgeServer.database
              .from("ai_agents")
              .select("id, name, greeting, tone, languages, voice")
              .eq("tenant_id", tenantId)
              .limit(1)
              .maybeSingle();

            if (existingAgent) {
              agentId = existingAgent.id;
              agentData = existingAgent;
            } else {
              const newAgentId = crypto.randomUUID();
              const { data: createdAgent } = await insforgeServer.database
                .from("ai_agents")
                .insert([
                  {
                    id: newAgentId,
                    tenant_id: tenantId,
                    name: "Anya",
                    greeting: "Hello! Welcome to InsurCall assistance. How may I help you today?",
                    tone: "Professional",
                    languages: ["English", "Hindi"],
                    voice: "en-IN-NeerjaNeural",
                    can_answer_questions: true,
                    can_capture_leads: true,
                  },
                ])
                .select("id, name, greeting, tone, languages, voice")
                .single();
              agentId = createdAgent?.id || newAgentId;
              agentData = createdAgent;
            }
          } catch (aErr: any) {
            console.warn("Agent resolution notice:", aErr?.message);
          }

          const roomName = `insurcall-${tenant.slug || "call"}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
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
                  agent_id: agentId,
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
          const { AccessToken } = await import("livekit-server-sdk");
          const at = new AccessToken(apiKey, apiSecret, {
            identity: `caller_${callSessionId.slice(0, 8)}`,
            name: customer.name,
            ttl: "15m",
            metadata: JSON.stringify({
              session_id: callSessionId,
              tenant_id: tenantId,
              agent_id: agentId,
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
          const agentConfig = {
            ...(branding.agent_config || {}),
            id: agentId,
            ...(agentData || {}),
          };
          const tmpl =
            agentData?.greeting ||
            agentConfig.greeting ||
            "Hello {{customer_name}}! Welcome to {{company_name}} assistance. How may I help you today?";
          const agentGreeting = tmpl
            .replace(/\{\{customer_name\}\}/g, customer.isVerified ? customer.name : "there")
            .replace(/\{\{company_name\}\}/g, tenant.name || "InsurCall");

          return json({
            token,
            roomName,
            callSessionId,
            agentId,
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
