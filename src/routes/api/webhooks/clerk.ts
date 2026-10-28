import { createFileRoute } from "@tanstack/react-router";
import { insforgeServer } from "@/lib/insforge/client.server";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/webhooks/clerk")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = await request.json().catch(() => null);
          if (!payload) {
            return json({ error: "Invalid JSON payload" }, 400);
          }

          const eventType = payload.type || payload.event;
          const data = payload.data || {};

          // We handle user registration and update events
          if (
            eventType === "user.created" ||
            eventType === "user.updated" ||
            eventType === "session.created"
          ) {
            const clerkUserId = data.id || data.user_id;
            if (!clerkUserId) {
              return json({ error: "Missing clerk user ID" }, 400);
            }

            const email =
              data.email_addresses?.[0]?.email_address ||
              data.email ||
              data.primary_email_address?.email_address;
            const name =
              [data.first_name, data.last_name].filter(Boolean).join(" ") ||
              email?.split("@")[0] ||
              "Policyholder";
            const phone =
              data.phone_numbers?.[0]?.phone_number ||
              data.phone ||
              "+91 98765 43210";

            // 1. Check if member already exists
            const { data: existingMember } = await insforgeServer.database
              .from("tenant_members")
              .select("tenant_id")
              .eq("clerk_user_id", clerkUserId)
              .eq("status", "active")
              .maybeSingle();

            let tenantId = existingMember?.tenant_id;

            // 2. If tenant does not exist, provision new agency tenant
            if (!tenantId) {
              const orgName = name ? `${name}'s Agency` : "My Insurance Agency";
              const cleanSlug =
                "agency-" +
                (clerkUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toLowerCase() ||
                  Math.random().toString(36).slice(2, 8));

              const { data: newTenant, error: tErr } = await insforgeServer.database
                .from("tenants")
                .insert([
                  {
                    name: orgName,
                    slug: cleanSlug,
                    status: "active",
                    branding_config: {
                      onboarding_step: 0,
                      onboarding_completed: false,
                      organization_details: {
                        agency_name: orgName,
                        business_type: "Agency / Brokerage",
                        contact_name: name || "",
                        contact_email: email || "",
                        lines_of_insurance: ["Health Insurance", "Motor / Auto"],
                        preferred_language: "English",
                      },
                      agent_config: {
                        name: "",
                        voice_style: "",
                        greeting: "",
                        supported_languages: [],
                        tone: "",
                        instructions: "",
                      },
                      supported_workflows: [
                        "policy_enquiries",
                        "fnol_intake",
                        "claim_status",
                        "renewal_enquiries",
                        "document_collection",
                        "human_handoff",
                      ],
                      call_handling: {
                        channel: "browser_webrtc",
                        working_hours: "Monday - Saturday 9 AM - 8 PM IST",
                        after_hours_route: "emergency_voicemail",
                      },
                    },
                  },
                ])
                .select("id")
                .single();

              if (!tErr && newTenant?.id) {
                tenantId = newTenant.id;
                await insforgeServer.database.from("tenant_members").insert([
                  {
                    tenant_id: tenantId,
                    clerk_user_id: clerkUserId,
                    role: "owner",
                    status: "active",
                  },
                ]);
              }
            }

            // 3. Guarantee customer record and baseline policy exists
            if (tenantId) {
              const custNumber =
                "CUST-" + clerkUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();

              const { data: custRecord } = await insforgeServer.database
                .from("customers")
                .upsert(
                  [
                    {
                      tenant_id: tenantId,
                      clerk_user_id: clerkUserId,
                      customer_number: custNumber,
                      name,
                      email: email || "customer@example.com",
                      phone,
                      status: "active",
                    },
                  ],
                  { onConflict: "tenant_id,customer_number" }
                )
                .select("id")
                .single();

              if (custRecord?.id) {
                const polNumber = "POL-" + custNumber.replace("CUST-", "") + "-HLT";
                await insforgeServer.database.from("policies").upsert(
                  [
                    {
                      tenant_id: tenantId,
                      customer_id: custRecord.id,
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

            // 4. Also register in InsForge global users table
            if (email) {
              try {
                const { data: existingUser } = await insforgeServer.database
                  .from("users")
                  .select("id")
                  .eq("email", email)
                  .limit(1);

                if (!existingUser || existingUser.length === 0) {
                  await insforgeServer.database.from("users").insert([
                    {
                      id: crypto.randomUUID(),
                      email,
                      display_name: name || email.split("@")[0],
                      status: "active",
                    },
                  ]);
                }
              } catch (e: any) {
                console.warn("Webhook users table sync notice:", e?.message);
              }
            }

            return json({ received: true, clerkUserId, tenantId });
          }

          return json({ received: true, ignored: true });
        } catch (err: any) {
          console.error("Clerk webhook error:", err);
          return json({ error: err.message || "Webhook processing failed" }, 500);
        }
      },
    },
  },
});
