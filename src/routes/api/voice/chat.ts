import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { insforgeServer } from "@/lib/insforge/client.server";

// Security P0: Reject client-supplied 'system' roles to prevent prompt injection
const ChatInput = z.object({
  query: z.string().min(1).max(1500),
  callSessionId: z.string().uuid().optional().nullable(),
  tenantId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().max(100).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      })
    )
    .optional()
    .default([]),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function cleanSpokenText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/[*_#`~>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-•*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

const GROQ_API_KEY = process.env["GROQ_API_KEY"] || "";
const GROQ_MODEL = process.env["GROQ_MODEL"] || "qwen/qwen3.8-27b";
const GROQ_BASE_URL = process.env["GROQ_BASE_URL"] || "https://api.groq.com/openai/v1";

const LOCAL_LLM_BASE_URL =
  process.env["LOCAL_LLM_BASE_URL"] ||
  process.env["LLM_BASE_URL"] ||
  "http://localhost:11434";
const LOCAL_LLM_MODEL = process.env["LLM_MODEL"] || "qwen2.5:7b";

const MODEL_MODE = (process.env["LLM_MODE"] || "hybrid").toLowerCase() as "groq" | "local" | "hybrid";

async function executeInference(
  messages: Array<{ role: string; content: string }>,
  query: string
): Promise<{ reply: string; provider: "groq" | "local"; model: string }> {
  const tryGroq = async (): Promise<string | null> => {
    if (!GROQ_API_KEY) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      let res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.3,
          max_tokens: 200,
        }),
        signal: controller.signal,
      });

      if (!res.ok && GROQ_MODEL !== "openai/gpt-oss-120b") {
        res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages,
            temperature: 0.3,
            max_tokens: 200,
          }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeout);
      if (!res.ok) {
        console.warn("Groq inference returned status:", res.status);
        return null;
      }
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || "";
      return cleanSpokenText(raw) || null;
    } catch (e: any) {
      clearTimeout(timeout);
      console.warn("Groq inference notice:", e?.message);
      return null;
    }
  };

  const tryLocal = async (): Promise<string | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const url = `${LOCAL_LLM_BASE_URL.replace(/\/+$/, "")}/v1/chat/completions`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: LOCAL_LLM_MODEL,
          messages,
          temperature: 0.3,
          max_tokens: 200,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = await res.json();
      return cleanSpokenText(data.choices?.[0]?.message?.content || "") || null;
    } catch (e: any) {
      clearTimeout(timeout);
      console.warn("Local Ollama notice:", e?.message);
      return null;
    }
  };

  // Hybrid Routing: Routine privacy/OTP checks can prefer local; complex conversational turns use Groq
  if (MODEL_MODE === "local") {
    const localRes = await tryLocal();
    if (localRes) return { reply: localRes, provider: "local", model: LOCAL_LLM_MODEL };
    const groqRes = await tryGroq();
    if (groqRes) return { reply: groqRes, provider: "groq", model: GROQ_MODEL };
  } else if (MODEL_MODE === "hybrid") {
    const isSensitive = /otp|nominee|change|password|secret/i.test(query);
    if (isSensitive) {
      const localRes = await tryLocal();
      if (localRes) return { reply: localRes, provider: "local", model: LOCAL_LLM_MODEL };
    }
    const groqRes = await tryGroq();
    if (groqRes) return { reply: groqRes, provider: "groq", model: GROQ_MODEL };
    const localFallback = await tryLocal();
    if (localFallback) return { reply: localFallback, provider: "local", model: LOCAL_LLM_MODEL };
  } else {
    const groqRes = await tryGroq();
    if (groqRes) return { reply: groqRes, provider: "groq", model: GROQ_MODEL };
    const localRes = await tryLocal();
    if (localRes) return { reply: localRes, provider: "local", model: LOCAL_LLM_MODEL };
  }

  return {
    reply: "I am having trouble reaching our AI servers right now. Please allow me a moment or let me connect you with an agent.",
    provider: "groq",
    model: "none",
  };
}

/**
 * Dynamically builds the system prompt trained strictly within the authorized tenant's boundary
 */
async function buildTrainedSystemPrompt(
  tenantId?: string,
  customerId?: string | null,
  fallbackCustomerName?: string
): Promise<{ systemPrompt: string; agentName: string; voiceId: string }> {
  // 1. Resolve Tenant branding and agent instructions
  let tenant: any = null;
  if (tenantId) {
    try {
      const { data } = await insforgeServer.database
        .from("tenants")
        .select("id, name, slug, branding_config")
        .eq("id", tenantId)
        .maybeSingle();
      tenant = data;
    } catch (err: any) {
      console.warn("Tenant load notice:", err?.message);
    }
  }

  const companyName = tenant?.name || "SaveCall AI";
  const branding = (tenant?.branding_config as any) || {};
  const agentCfg = branding.agent_config || {};

  const agentName = agentCfg.agent_name || "SaveCall AI Assistant";
  const tone = agentCfg.tone || "Professional, empathetic, and ultra-responsive";
  const language = agentCfg.language || "English, Hindi, and Hinglish";
  const voiceId = agentCfg.voice_id || "en-IN-NeerjaNeural";
  const userInstructions = agentCfg.system_prompt || "You are SaveCall AI, a trusted voice assistant for policyholders.";
  const knowledgeBase =
    agentCfg.knowledge_base ||
    `COMPANY: ${companyName}\nPOLICY COVERAGES:\n1. Comprehensive customer support and claims guidance.\n2. Sensitive changes (phone/email/nominee) require OTP verification.`;

  // 1b. Fetch Approved Knowledge Items (CRITICAL P0: Strictly scoped to tenant_id)
  let approvedKnowledgeText = "";
  if (tenant?.id) {
    try {
      const { data: ki } = await insforgeServer.database
        .from("knowledge_items")
        .select("question, answer, category")
        .or(`tenant_id.eq.${tenant.id},business_id.eq.${tenant.id}`)
        .eq("approved", true)
        .limit(50);

      if (ki && ki.length > 0) {
        approvedKnowledgeText = ki
          .map((k: any) => `Topic: ${k.category || "General"}\nQ: ${k.question}\nA: ${k.answer}`)
          .join("\n\n");
      }
    } catch (kErr: any) {
      console.warn("Knowledge base load notice:", kErr?.message);
    }
  }

  // 2. Fetch Customer Context strictly within the authorized tenant
  let customerInfo = `Caller Name: ${fallbackCustomerName || "Guest Caller"}`;
  let policiesText = "No active policies found on record for this caller.";
  let claimsText = "No active claims on record.";

  if (customerId && tenant?.id) {
    try {
      const [{ data: cust }, { data: policies }, { data: claims }] = await Promise.all([
        insforgeServer.database
          .from("customers")
          .select("name, customer_number, phone, email")
          .eq("id", customerId)
          .eq("tenant_id", tenant.id)
          .maybeSingle(),
        insforgeServer.database
          .from("policies")
          .select("policy_number, policy_type, sum_insured, status, nominee_name, nominee_relationship")
          .eq("customer_id", customerId)
          .eq("tenant_id", tenant.id),
        insforgeServer.database
          .from("claims")
          .select("claim_number, claim_amount, status, incident_type, hospital_garage_name")
          .eq("customer_id", customerId)
          .eq("tenant_id", tenant.id),
      ]);

      if (cust) {
        customerInfo = `Caller Name: ${cust.name}\nCustomer ID: ${cust.customer_number || "CUST-VERIFIED"}\nPhone: ${cust.phone || "On File"}\nEmail: ${cust.email || "On File"}`;
      }

      if (policies && policies.length > 0) {
        policiesText = policies
          .map(
            (p: any) =>
              `- Policy #${p.policy_number} (${p.policy_type.toUpperCase()}): Sum Insured ₹${Number(p.sum_insured).toLocaleString("en-IN")}, Status: ${p.status}, Nominee: ${p.nominee_name || "Family Nominee"}`
          )
          .join("\n");
      }

      if (claims && claims.length > 0) {
        claimsText = claims
          .map(
            (c: any) =>
              `- Claim #${c.claim_number}: ₹${Number(c.claim_amount).toLocaleString("en-IN")}, Status: ${c.status.toUpperCase()}, Provider: ${c.hospital_garage_name || "Network Provider"}`
          )
          .join("\n");
      }
    } catch (err: any) {
      console.warn("Customer policy fetch notice:", err?.message);
    }
  }

  // 3. Assemble Trained Master System Prompt
  const systemPrompt = `
You are ${agentName}, representing ${companyName}.
You are in a live phone call with a customer.

YOUR PERSONA & SPEAKING STYLE:
- Tone: ${tone}
- Spoken Language Preference: ${language}.
  * If the caller speaks Hindi, reply naturally in clean Hindi.
  * If the caller speaks English, reply in English.
  * If the caller speaks Hinglish, reply in Hinglish.
- Spoken Style: Keep answers concise, natural, and direct (1 to 2 short sentences per turn) because this is a live spoken phone call.

USER'S CUSTOM SYSTEM PROMPT INSTRUCTIONS:
${userInstructions}

TRAINED TALKING KNOWLEDGE DATABASE:
${knowledgeBase}
${approvedKnowledgeText ? `\n\nADDITIONAL VERIFIED KNOWLEDGE BASE:\n${approvedKnowledgeText}` : ""}

AUTHENTICATED CALLER CONTEXT:
${customerInfo}

ACTIVE POLICIES ON FILE:
${policiesText}

RECENT CLAIMS:
${claimsText}

SECURITY RULES:
- If caller is a Guest / Unverified and asks for policy or claim details, politely ask them to provide their registered policy number or phone number so you can verify their file.
- If the customer requests to change sensitive information (e.g. nominee, registered phone, or address), inform them that a 6-digit OTP has been sent for security verification.
`;

  return { systemPrompt, agentName, voiceId };
}

export const Route = createFileRoute("/api/voice/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = ChatInput.parse(
            await request.json().catch(() => ({}))
          );

          // Build dynamic trained system prompt strictly within authorized tenant boundary
          const { systemPrompt, agentName } = await buildTrainedSystemPrompt(
            body.tenantId,
            body.customerId,
            body.customerName
          );

          // Build conversation turns (guaranteed free of untrusted system messages)
          const messages = [
            { role: "system", content: systemPrompt },
            ...body.history.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: body.query },
          ];

          const result = await executeInference(messages, body.query);

          // Asynchronously persist timeline messages for audit & retention
          if (body.callSessionId) {
            Promise.all([
              insforgeServer.database.from("messages").insert({
                call_session_id: body.callSessionId,
                role: "user",
                content: body.query,
              }),
              insforgeServer.database.from("messages").insert({
                call_session_id: body.callSessionId,
                role: "assistant",
                content: result.reply,
              }),
            ]).catch((mErr) => console.warn("Notice persisting call messages:", mErr?.message));
          }

          return json({
            reply: result.reply,
            agentName,
            provider: result.provider,
            model: result.model,
          });
        } catch (error: any) {
          console.error("Voice chat handler error:", error);
          return json(
            {
              reply:
                "I can verify your active policy details or check your recent claim status. What would you like to know?",
            },
            200
          );
        }
      },
    },
  },
});
