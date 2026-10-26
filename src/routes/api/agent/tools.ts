import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { insforgeServer } from "@/lib/insforge/client.server";
import { evaluateToolSecurity, TOOL_POLICIES } from "@/lib/risk/risk-engine";
import { createAndSendOtp, verifyOtpCode } from "@/lib/risk/otp.server";
import { retrieveAgentKnowledge, generateGroundedAnswer } from "@/lib/rag/retrieval.server";

const internalSecret = process.env["AGENT_INTERNAL_SECRET"] || "insurcall_agent_secret_2026_dev";

const ExecuteInput = z.object({
  call_session_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  tool_name: z.string(),
  arguments: z.record(z.unknown()).default({}),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/agent/tools")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Verify internal Agent authorization
        const authHeader = request.headers.get("x-agent-secret");
        if (authHeader !== internalSecret) {
          return json({ error: "401: Unauthorized Agent RPC" }, 401);
        }

        const bodyParse = ExecuteInput.safeParse(await request.json().catch(() => null));
        if (!bodyParse.success) {
          return json({ error: bodyParse.error.issues[0]?.message ?? "Invalid tool execution payload" }, 400);
        }

        const { call_session_id, tenant_id, customer_id, tool_name, arguments: args } = bodyParse.data;

        // 2. Fetch call session to verify active state & OTP status
        const { data: session, error: sessErr } = await insforgeServer.database
          .from("call_sessions")
          .select("id, tenant_id, customer_id, risk_state, otp_verified_until, status, agent_id")
          .eq("id", call_session_id)
          .maybeSingle();

        if (sessErr || !session || session.status !== "active") {
          return json({ error: "403: Call session is inactive or invalid" }, 403);
        }

        // 3. Prevent cross-tenant / cross-customer access
        if (session.tenant_id !== tenant_id || session.customer_id !== customer_id) {
          // Log security breach attempt
          await insforgeServer.database.from("audit_logs").insert({
            tenant_id,
            customer_id,
            call_session_id,
            actor_type: "ai_agent",
            actor_id: "agent_worker",
            action: "cross_tenant_violation_blocked",
            resource_type: "session",
            risk_level: "HIGH",
            status: "denied",
            metadata: { attempted_tool: tool_name },
          });
          return json({ error: "403: Forbidden - Identity mismatch" }, 403);
        }

        // 4. Authoritative Risk Engine Evaluation
        const security = evaluateToolSecurity(tool_name, {
          riskState: session.risk_state,
          otpVerifiedUntil: session.otp_verified_until,
        });

        if (!security.allowed) {
          await insforgeServer.database.from("tool_executions").insert({
            call_session_id,
            tenant_id,
            customer_id,
            tool_name,
            arguments: args,
            result_status: "denied",
            risk_level: security.policy.riskLevel,
          });
          return json({ ok: false, error: security.reason, requires_otp: security.policy.requiresOtp }, 400);
        }

        // 5. Execute Authorized Tool
        let result: any = null;
        try {
          switch (tool_name) {
            case "get_agent_config": {
              const { data: tenant } = await insforgeServer.database
                .from("tenants")
                .select("id, name, slug, branding_config")
                .eq("id", tenant_id)
                .maybeSingle();

              const { data: customer } = await insforgeServer.database
                .from("customers")
                .select("id, name, email, phone, customer_number")
                .eq("id", customer_id)
                .maybeSingle();

              result = {
                ok: true,
                company_name: tenant?.name || "SafeLife Insurance",
                branding_config: tenant?.branding_config || {},
                customer: customer || null,
              };
              break;
            }

            case "get_policy": {
              const polNum = String(args["policy_number"] || "");
              const query = insforgeServer.database
                .from("policies")
                .select("id, policy_number, plan_name, policy_type, premium_amount, due_date, status, nominee_name")
                .eq("tenant_id", tenant_id)
                .eq("customer_id", customer_id);

              const { data } = polNum
                ? await query.eq("policy_number", polNum).maybeSingle()
                : await query.limit(5);

              result = { ok: true, policies: data ? (Array.isArray(data) ? data : [data]) : [] };
              break;
            }

            case "get_claim_status": {
              const claimNum = String(args["claim_number"] || "");
              const query = insforgeServer.database
                .from("claims")
                .select("id, claim_number, status, amount, submitted_at, description")
                .eq("tenant_id", tenant_id)
                .eq("customer_id", customer_id);

              const { data } = claimNum
                ? await query.eq("claim_number", claimNum).maybeSingle()
                : await query.limit(5);

              result = { ok: true, claims: data ? (Array.isArray(data) ? data : [data]) : [] };
              break;
            }

            case "send_otp": {
              const purpose = (args["purpose"] as any) || "update_contact_details";
              const otpRes = await createAndSendOtp({
                callSessionId: call_session_id,
                customerId: customer_id,
                purpose,
              });
              result = { ok: true, message: otpRes.message, destination: otpRes.maskedDestination };
              break;
            }

            case "verify_otp": {
              const code = String(args["otp_code"] || args["code"] || "");
              const verified = await verifyOtpCode({
                callSessionId: call_session_id,
                customerId: customer_id,
                code,
              });
              result = verified;
              break;
            }

            case "update_contact_details": {
              const newEmail = args["email"] ? String(args["email"]).trim() : undefined;
              const newPhone = args["phone"] ? String(args["phone"]).trim() : undefined;

              const updates: Record<string, string> = {};
              if (newEmail) updates["email"] = newEmail;
              if (newPhone) updates["phone"] = newPhone;

              if (Object.keys(updates).length > 0) {
                await insforgeServer.database
                  .from("customers")
                  .update(updates)
                  .eq("id", customer_id)
                  .eq("tenant_id", tenant_id);
              }

              result = { ok: true, message: "Contact information successfully updated." };
              break;
            }

            case "change_nominee": {
              // High-Risk: Never direct update! Insert into policy_change_requests
              const policyNumber = String(args["policy_number"] || "");
              const nomineeName = String(args["nominee_name"] || "");
              const relationship = String(args["relationship"] || "");

              const { data: pol } = await insforgeServer.database
                .from("policies")
                .select("id")
                .eq("tenant_id", tenant_id)
                .eq("customer_id", customer_id)
                .eq("policy_number", policyNumber)
                .maybeSingle();

              const { data: req } = await insforgeServer.database
                .from("policy_change_requests")
                .insert({
                  tenant_id,
                  customer_id,
                  policy_id: pol?.id ?? null,
                  change_type: "nominee_change",
                  requested_payload: { nominee_name: nomineeName, relationship, policy_number: policyNumber },
                  risk_level: "HIGH",
                  status: "pending",
                  requested_by_session: call_session_id,
                })
                .select("id")
                .maybeSingle();

              result = {
                ok: true,
                message: `Nominee update request for ${nomineeName} (${relationship}) submitted for human review. Request ID: ${req?.id}`,
                request_id: req?.id,
              };
              break;
            }

            case "cancel_policy": {
              // Very High-Risk: Staging table
              const policyNumber = String(args["policy_number"] || "");
              const reason = String(args["reason"] || "Customer requested cancellation");

              const { data: pol } = await insforgeServer.database
                .from("policies")
                .select("id")
                .eq("tenant_id", tenant_id)
                .eq("customer_id", customer_id)
                .eq("policy_number", policyNumber)
                .maybeSingle();

              const { data: req } = await insforgeServer.database
                .from("policy_change_requests")
                .insert({
                  tenant_id,
                  customer_id,
                  policy_id: pol?.id ?? null,
                  change_type: "cancellation",
                  requested_payload: { reason, policy_number: policyNumber },
                  risk_level: "VERY_HIGH",
                  status: "pending",
                  requested_by_session: call_session_id,
                })
                .select("id")
                .maybeSingle();

              result = {
                ok: true,
                message: `Policy surrender request submitted to our senior retention officer. Reference ID: ${req?.id}`,
                request_id: req?.id,
              };
              break;
            }

            case "file_claim": {
              const policyNumber = String(args["policy_number"] || "");
              const description = String(args["description"] || "Accident / incident reported via voice receptionist");
              const estimatedAmount = Number(args["estimated_amount"] || args["amount"] || 0);

              let policyId: string | null = null;
              if (policyNumber) {
                const { data: pol } = await insforgeServer.database
                  .from("policies")
                  .select("id")
                  .eq("tenant_id", tenant_id)
                  .eq("customer_id", customer_id)
                  .eq("policy_number", policyNumber)
                  .maybeSingle();
                policyId = pol?.id || null;
              }

              const claimNumber = "CLM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
              const isHighRisk = estimatedAmount > 50000;

              const { data: claim } = await insforgeServer.database
                .from("claims")
                .insert({
                  tenant_id,
                  customer_id,
                  policy_id: policyId,
                  claim_number: claimNumber,
                  description,
                  amount: estimatedAmount,
                  status: "in_review",
                  risk_score: isHighRisk ? 85 : 20,
                })
                .select("id, claim_number")
                .single();

              if (isHighRisk && claim?.id) {
                await insforgeServer.database.from("approval_requests").insert({
                  tenant_id,
                  customer_id,
                  policy_id: policyId,
                  request_type: "claim_escalation",
                  risk_level: "HIGH",
                  reason: `High value claim filing (₹${estimatedAmount.toLocaleString("en-IN")}) reported via voice`,
                  payload: { claim_number: claimNumber, estimated_amount: estimatedAmount, description },
                  status: "pending",
                });
              }

              result = {
                ok: true,
                message: `Claim registered with number ${claimNumber}. Status: In Review. Staff review: ${isHighRisk ? "Escalated for senior approval" : "Standard assessment"}.`,
                claim_number: claimNumber,
                is_high_risk: isHighRisk,
              };
              break;
            }

            case "search_policy_docs": {
              const query = String(args["query"] || "").trim();
              if (!query) {
                result = { ok: false, error: "Search query is required" };
                break;
              }

              let targetAgentId = String(args["agent_id"] || (session as any).agent_id || "");
              if (!targetAgentId) {
                const { data: ag } = await insforgeServer.database
                  .from("ai_agents")
                  .select("id")
                  .eq("tenant_id", tenant_id)
                  .limit(1)
                  .maybeSingle();
                targetAgentId = ag?.id || "";
              }

              if (!targetAgentId) {
                result = { ok: false, error: "No AI agent configured for this tenant" };
                break;
              }

              const groundedRes = await generateGroundedAnswer({
                tenantId: tenant_id,
                agentId: targetAgentId,
                query,
              });

              if (!groundedRes.grounded) {
                await insforgeServer.database
                  .from("call_sessions")
                  .update({
                    escalated: true,
                    escalation_reason: groundedRes.reason || "Low similarity or ungrounded policy inquiry",
                  })
                  .eq("id", call_session_id);
              }

              result = {
                ok: true,
                answer: groundedRes.answer,
                grounded: groundedRes.grounded,
                citations: groundedRes.citations,
                needs_human_review: groundedRes.needs_human_review,
                reason: groundedRes.reason,
                model_used: groundedRes.model_used,
              };
              break;
            }

            case "request_human_escalation": {
              const reason = String(args["reason"] || "Caller requested human supervisor or inquiry ungrounded");
              const callerNotes = String(args["caller_notes"] || args["notes"] || "");

              await insforgeServer.database
                .from("call_sessions")
                .update({
                  escalated: true,
                  escalation_reason: reason,
                  caller_notes: callerNotes || undefined,
                })
                .eq("id", call_session_id);

              const { data: appReq } = await insforgeServer.database
                .from("approval_requests")
                .insert({
                  tenant_id,
                  customer_id,
                  request_type: "human_handoff",
                  risk_level: "MEDIUM",
                  reason,
                  payload: { call_session_id, caller_notes: callerNotes },
                  status: "pending",
                })
                .select("id")
                .maybeSingle();

              result = {
                ok: true,
                escalated: true,
                escalation_id: appReq?.id || null,
                message: "Call has been escalated to our human claims desk. A representative will be with you shortly.",
              };
              break;
            }

            default:
              result = { ok: false, error: "Tool implementation not found" };
          }

          // 6. Record Audit Log & Tool Execution
          await Promise.all([
            insforgeServer.database.from("tool_executions").insert({
              call_session_id,
              tenant_id,
              customer_id,
              tool_name,
              arguments: args,
              result_status: result?.ok ? "success" : "error",
              risk_level: security.policy.riskLevel,
            }),
            insforgeServer.database.from("audit_logs").insert({
              tenant_id,
              customer_id,
              call_session_id,
              actor_type: "ai_agent",
              actor_id: "insurcall_agent_worker",
              action: `tool:${tool_name}`,
              resource_type: "insurance_tool",
              risk_level: security.policy.riskLevel,
              status: result?.ok ? "success" : "failed",
              metadata: { tool_name, result_ok: result?.ok },
            }),
          ]);

          return json(result);
        } catch (err: any) {
          console.error(`Tool execution failure (${tool_name}):`, err);
          return json({ ok: false, error: err.message || "Tool execution failed" }, 500);
        }
      },
    },
  },
});
