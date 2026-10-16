import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { insforgeServer } from "@/lib/insforge/client.server";

const ChatInput = z.object({
  query: z.string().min(1),
  tenantId: z.string().uuid().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
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

const GROQ_API_KEY =
  process.env["GROQ_API_KEY"] ||
  "";
const GROQ_MODEL = process.env["GROQ_MODEL"] || "qwen/qwen3.8-27b";
const GROQ_BASE_URL =
  process.env["GROQ_BASE_URL"] || "https://api.groq.com/openai/v1";

const LOCAL_LLM_BASE_URL =
  process.env["LOCAL_LLM_BASE_URL"] ||
  process.env["LLM_BASE_URL"] ||
  "http://localhost:11434";
const LOCAL_LLM_MODEL = process.env["LLM_MODEL"] || "qwen2.5:7b";

const MODEL_MODE = (process.env["LLM_MODE"] || "hybrid").toLowerCase() as "groq" | "local" | "hybrid";

function cleanSpokenText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/[*_#`~>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-•*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}


async function executeInference(
  messages: Array<{ role: string; content: string }>,
  query: string
): Promise<{ reply: string; provider: "groq" | "local"; model: string }> {
  const tryGroq = async (): Promise<string | null> => {
    if (!GROQ_API_KEY) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
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
      console.warn("Groq inference error/timeout:", e.message);
      return null;
    }
  };

  const tryLocal = async (): Promise<string | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const url = `${LOCAL_LLM_BASE_URL.replace(/\/+$/, "")}/v1/chat/completions`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: LOCAL_LLM_MODEL,
          messages,
          temperature: 0.3,
          max_tokens: 250,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = await res.json();
      return cleanSpokenText(data.choices?.[0]?.message?.content || "") || null;
    } catch (e: any) {
      clearTimeout(timeout);
      console.warn("Local Ollama inference unreachable:", e.message);
      return null;
    }
  };

  // Hybrid Routing: Routine privacy/OTP checks can prefer local; complex reasoning uses Groq
  if (MODEL_MODE === "local") {
    const localRes = await tryLocal();
    if (localRes) return { reply: localRes, provider: "local", model: LOCAL_LLM_MODEL };
    const groqRes = await tryGroq();
    if (groqRes) return { reply: groqRes, provider: "groq", model: GROQ_MODEL };
  } else if (MODEL_MODE === "hybrid") {
    // If query has strict privacy/OTP context, try local first if available
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
    // Default: Groq primary with local fallback
    const groqRes = await tryGroq();
    if (groqRes) return { reply: groqRes, provider: "groq", model: GROQ_MODEL };
    const localRes = await tryLocal();
    if (localRes) return { reply: localRes, provider: "local", model: LOCAL_LLM_MODEL };
  }

  return {
    reply: "I am having trouble reaching our AI servers right now. Let me connect you with an agent.",
    provider: "groq",
    model: "none",
  };
}

/**
 * Dynamically builds the system prompt trained on the user's settings and company knowledge base
 */
async function buildTrainedSystemPrompt(
  tenantId?: string,
  customerId?: string,
  fallbackCustomerName?: string
): Promise<{ systemPrompt: string; agentName: string; voiceId: string }> {
  // 1. Fetch Tenant and user's saved Agent Settings & Knowledge Base
  let tenant: any = null;
  try {
    const query = insforgeServer.database
      .from("tenants")
      .select("id, name, slug, branding_config");

    if (tenantId) {
      const { data } = await query.eq("id", tenantId).maybeSingle();
      tenant = data;
    }
    if (!tenant) {
      const { data } = await insforgeServer.database
        .from("tenants")
        .select("id, name, slug, branding_config")
        .limit(1)
        .maybeSingle();
      tenant = data;
    }
  } catch (err: any) {
    console.warn("Notice loading tenant settings for prompt training:", err?.message);
  }

  const companyName = tenant?.name || "SafeLife Insurance Co. Ltd.";
  const branding = (tenant?.branding_config as any) || {};
  const agentCfg = branding.agent_config || {};

  const agentName = agentCfg.agent_name || "SaveCall AI Assistant";
  const tone = agentCfg.tone || "Professional, empathetic, and ultra-responsive";
  const language = agentCfg.language || "English, Hindi, and Hinglish";
  const voiceId = agentCfg.voice_id || "en-IN-NeerjaNeural";
  const userInstructions = agentCfg.system_prompt || "You are SaveCall AI, a trusted voice assistant for policyholders.";
  const knowledgeBase = agentCfg.knowledge_base || `COMPANY: ${companyName}\nPOLICY COVERAGES:\n1. Health Shield: Up to Rs 15,00,000 cashless cover at 8,500+ network hospitals.\n2. Motor Secure Drive: Comprehensive bumper-to-bumper with spot claim settlement.\n3. Term Life Protection: Financial security for designated nominee.\nVERIFICATION RULES:\n- Sensitive changes (phone/email/nominee) require OTP verification.`;

  // 1b. Fetch Approved Knowledge Items from Database
  let approvedKnowledgeText = "";
  try {
    const { data: ki } = await insforgeServer.database
      .from("knowledge_items")
      .select("question, answer, category")
      .eq("approved", true)
      .limit(60);

    if (ki && ki.length > 0) {
      approvedKnowledgeText = ki
        .map((k: any) => `Topic: ${k.category || "General"}\nQ: ${k.question}\nA: ${k.answer}`)
        .join("\n\n");
    }
  } catch (kErr: any) {
    console.warn("Notice loading approved knowledge items:", kErr?.message);
  }

  // 2. Fetch Customer Context (Policies, Claims, Profile)
  let customerInfo = `Caller Name: ${fallbackCustomerName || "Valued Customer"}`;
  let policiesText = "No active policies found on record.";
  let claimsText = "No active claims on record.";

  if (customerId) {
    try {
      const [{ data: cust }, { data: policies }, { data: claims }] = await Promise.all([
        insforgeServer.database
          .from("customers")
          .select("name, customer_number, phone, email")
          .eq("id", customerId)
          .maybeSingle(),
        insforgeServer.database
          .from("policies")
          .select("policy_number, policy_type, sum_insured, status, nominee_name, nominee_relationship")
          .eq("customer_id", customerId),
        insforgeServer.database
          .from("claims")
          .select("claim_number, claim_amount, status, incident_type, hospital_garage_name")
          .eq("customer_id", customerId),
      ]);

      if (cust) {
        customerInfo = `Caller Name: ${cust.name}\nCustomer ID: ${cust.customer_number || "CUST-883921"}\nPhone: ${cust.phone || "On File"}\nEmail: ${cust.email || "On File"}`;
      }

      if (policies && policies.length > 0) {
        policiesText = policies
          .map(
            (p: any) =>
              `- Policy #${p.policy_number} (${p.policy_type.toUpperCase()}): Sum Insured ₹${Number(p.sum_insured).toLocaleString("en-IN")}, Status: ${p.status}, Nominee: ${p.nominee_name || "Family Nominee"} (${p.nominee_relationship || "Spouse"})`
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
      console.warn("Notice fetching customer policies for prompt training:", err?.message);
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
- Spoken Style: Keep answers concise, natural, and direct (1 to 3 short sentences per turn) because this is a live spoken phone call.

USER'S CUSTOM SYSTEM PROMPT INSTRUCTIONS:
${userInstructions}

TRAINED TALKING KNOWLEDGE DATABASE (COMPANY POLICIES, FAQS & PROCEDURES):
${knowledgeBase}
${approvedKnowledgeText ? `\n\nADDITIONAL VERIFIED KNOWLEDGE BASE (FROM WEBSITE & DOCUMENT TRAINING):\n${approvedKnowledgeText}` : ""}

AUTHENTICATED CALLER CONTEXT:
${customerInfo}

ACTIVE POLICIES ON FILE:
${policiesText}

RECENT CLAIMS:
${claimsText}

SECURITY RULE:
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

          // Build dynamic trained system prompt from user's settings and knowledge base
          const { systemPrompt, agentName } = await buildTrainedSystemPrompt(
            body.tenantId,
            body.customerId,
            body.customerName
          );

          const messages = [
            { role: "system", content: systemPrompt },
            ...body.history.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: body.query },
          ];

          const result = await executeInference(messages, body.query);
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
