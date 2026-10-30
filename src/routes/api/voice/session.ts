import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { insforgeServer } from "@/lib/insforge/client.server";
import { extractAuthUserFromRequest } from "@/lib/auth/clerk.server";
import { getCloudAIStatus } from "@/lib/ai/inference.server";

const apiKey = process.env["LIVEKIT_API_KEY"];
const apiSecret = process.env["LIVEKIT_API_SECRET"];
const defaultLivekitUrl = process.env["LIVEKIT_URL"] || process.env["VITE_LIVEKIT_URL"];
const agentCallbackUrl = process.env["SAVECALL_API_URL"] || process.env["PUBLIC_API_BASE_URL"] || "";
const agentInternalSecret = process.env["AGENT_INTERNAL_SECRET"] || "";

const SessionInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
  publicDemo: z.boolean().optional().default(false),
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
          if (!apiKey || !apiSecret || !defaultLivekitUrl?.startsWith("wss://")) {
            return json({ error: "LiveKit Cloud is not configured on this server." }, 503);
          }

          const cloudAI = getCloudAIStatus();
          if (!cloudAI.groqConfigured) {
            return json({ error: "Groq Cloud is required for voice transcription. Configure GROQ_API_KEY on the server." }, 503);
          }

          const body = SessionInput.parse(await request.json().catch(() => ({})));
          const auth = await extractAuthUserFromRequest(request);
          if (body.clerkUserId && body.clerkUserId !== auth?.userId) {
            return json({ error: "The signed-in identity could not be verified." }, 403);
          }

          let tenant: any = null;

          // 1. Resolve tenant for authenticated users
          if (auth) {
            const { data: member } = await insforgeServer.database
              .from("tenant_members")
              .select("tenant_id")
              .eq("clerk_user_id", auth.userId)
              .eq("status", "active")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!member?.tenant_id) return json({ error: "No active insurance organisation is linked to this account." }, 403);
            if (body.tenantId && body.tenantId !== member.tenant_id) {
              return json({ error: "Cross-tenant voice sessions are not allowed." }, 403);
            }
            const { data: memberTenant } = await insforgeServer.database
              .from("tenants")
              .select("id, name, slug, branding_config")
              .eq("id", member.tenant_id)
              .maybeSingle();
            tenant = memberTenant;
          } else if (body.publicDemo || !auth) {
            const { data: demoTenants } = await insforgeServer.database
              .from("tenants")
              .select("id, name, slug, branding_config")
              .eq("status", "active")
              .eq("branding_config->>public_demo", "true")
              .limit(1);

            if (demoTenants && demoTenants.length > 0) {
              tenant = demoTenants[0];
            } else {
              const { data: defaultTenant } = await insforgeServer.database
                .from("tenants")
                .select("id, name, slug, branding_config")
                .eq("id", "a0000000-0000-0000-0000-000000000001")
                .maybeSingle();
              tenant = defaultTenant;
            }
          } else {
            return json({ error: "Sign in to start an organisation voice session." }, 401);
          }

          if (!tenant) return json({ error: "The configured organisation is unavailable." }, 503);

          const tenantId = tenant.id;

          // 3. Resolve customer metadata
          let customer = {
            id: null as string | null,
            name: auth ? "Policyholder" : "Public Demo Caller",
            email: null as string | null,
            phone: null as string | null,
            customerNumber: null as string | null,
            isVerified: false,
          };

          if (auth) {
            const { data: customerRecord } = await insforgeServer.database
              .from("customers")
              .select("id, name, email, phone, customer_number")
              .eq("tenant_id", tenantId)
              .eq("clerk_user_id", auth.userId)
              .maybeSingle();

            if (customerRecord) {
              customer = {
                id: customerRecord.id,
                name: customerRecord.name,
                email: customerRecord.email,
                phone: customerRecord.phone,
                customerNumber: customerRecord.customer_number,
                isVerified: true,
              };
            }
          }

          if (!customer.id) {
            const { data: defaultCustomer } = await insforgeServer.database
              .from("customers")
              .select("id, name, email, phone, customer_number")
              .eq("tenant_id", tenantId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (defaultCustomer) {
              customer = {
                id: defaultCustomer.id,
                name: defaultCustomer.name,
                email: defaultCustomer.email,
                phone: defaultCustomer.phone,
                customerNumber: defaultCustomer.customer_number,
                isVerified: false,
              };
            } else {
              const guestId = crypto.randomUUID();
              const guestNum = `CUST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
              await insforgeServer.database.from("customers").insert([
                {
                  id: guestId,
                  tenant_id: tenantId,
                  customer_number: guestNum,
                  name: "Guest Caller",
                  phone: "+91 98765 43210",
                  status: "active",
                },
              ]);
              customer = {
                id: guestId,
                name: "Guest Caller",
                email: null,
                phone: "+91 98765 43210",
                customerNumber: guestNum,
                isVerified: false,
              };
            }
          }

          // 4. Resolve AI agent configuration
          const { data: agentData, error: agentError } = await insforgeServer.database
            .from("ai_agents")
            .select("id, name, greeting, tone, languages, voice")
            .eq("tenant_id", tenantId)
            .limit(1)
            .maybeSingle();
          if (agentError || !agentData?.id) {
            return json({ error: "No configured assistant is available for this organisation." }, 503);
          }

          const agentId: string = agentData.id;

          let ragAvailable = false;
          try {
            const { data: approvedSources } = await insforgeServer.database
              .from("knowledge_sources")
              .select("id")
              .eq("tenant_id", tenantId)
              .eq("status", "done")
              .eq("approved_for_rag", true)
              .limit(1);
            ragAvailable = Boolean(approvedSources?.length);
          } catch (ragStatusError) {
            console.warn("RAG readiness lookup notice:", ragStatusError);
          }

          const roomName = `insurcall-${tenant.slug || "call"}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const generatedSessionId = crypto.randomUUID();
          const callSessionId = generatedSessionId;

          // 6. Persist call session record in database
          const { error: sessionError } = await insforgeServer.database
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
                  metadata: {
                    public_demo: !auth,
                    rag_available: ragAvailable,
                    general_model: !ragAvailable,
                  },
              },
            ]);
          if (sessionError) throw new Error("Could not create the voice session record.");

          // 7. Generate LiveKit Access Token
          const { AccessToken } = await import("livekit-server-sdk");
          const at = new AccessToken(apiKey, apiSecret, {
            identity: `caller_${callSessionId.slice(0, 8)}`,
            name: customer.name,
            ttl: "30m",
            metadata: JSON.stringify({
              session_id: callSessionId,
              tenant_id: tenantId,
              agent_id: agentId,
              is_authenticated: customer.isVerified,
              rag_available: ragAvailable,
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
          const livekitUrl = defaultLivekitUrl;

          // 8. Try to provision LiveKit Cloud room with optional agent dispatch
          try {
            const { RoomServiceClient } = await import("livekit-server-sdk");
            const httpUrl = livekitUrl.replace("wss://", "https://").replace("ws://", "http://");
            const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
            const agentName = process.env["LIVEKIT_WHATSAPP_AGENT_NAME"] || "insurcall-voice-agent";

            const { RoomAgentDispatch } = await import("@livekit/protocol");
            const agentDispatch = new RoomAgentDispatch({
              agentName,
              metadata: JSON.stringify({
                session_id: callSessionId,
                tenant_id: tenantId,
                agent_id: agentId,
                customer_id: customer.id,
                public_demo: !auth,
                rag_available: ragAvailable,
              }),
            });

            await roomService.createRoom({
                name: roomName,
                emptyTimeout: 300,
                departureTimeout: 20,
                agents: [agentDispatch],
              });
          } catch (rErr: any) {
            console.warn("LiveKit Cloud room creation notice:", rErr?.message);
            await insforgeServer.database
              .from("call_sessions")
              .update({ status: "failed", ended_at: new Date().toISOString() })
              .eq("id", callSessionId)
              .eq("tenant_id", tenantId);
            return json({ error: "The LiveKit Cloud voice agent could not be started. Please retry." }, 502);
          }

          return json({
            token,
            roomName,
            callSessionId,
            livekitUrl,
            agentName: agentData.name,
            tenantName: tenant.name,
            ragAvailable,
            isGeneralModel: !ragAvailable,
            cloudAI: getCloudAIStatus(),
            customer: {
              id: customer.id,
              name: customer.name,
              customerNumber: customer.customerNumber,
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
