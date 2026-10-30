/**
 * Dual Cloud AI Inference Engine (Groq + Google Gemini)
 * High-speed speech, conversational voice synthesis, and multi-turn text reasoning.
 */

export type CloudAIProvider = "groq" | "gemini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface InferenceOptions {
  preferredProvider?: CloudAIProvider | "auto";
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface InferenceResult {
  reply: string;
  provider: CloudAIProvider;
  model: string;
  latencyMs: number;
}

export function cleanSpokenText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/[*_#`~>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

const GROQ_API_KEY = () => process.env["GROQ_API_KEY"] || "";
const GROQ_BASE_URL = () => process.env["GROQ_BASE_URL"] || "https://api.groq.com/openai/v1";
const GROQ_MODEL = () => process.env["GROQ_MODEL"] || "openai/gpt-oss-120b";

const GEMINI_API_KEY = () => process.env["GEMINI_API_KEY"] || "";
const GEMINI_BASE_URL = () => process.env["GEMINI_BASE_URL"] || "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = () => process.env["GEMINI_MODEL"] || "gemini-1.5-flash";

const DEFAULT_AI_PROVIDER = () => (process.env["AI_PROVIDER"] as CloudAIProvider | "auto") || "auto";

export function getCloudAIStatus(): {
  groqConfigured: boolean;
  geminiConfigured: boolean;
  activeProvider: string;
  groqModel: string;
  geminiModel: string;
} {
  const hasGroq = Boolean(GROQ_API_KEY());
  const hasGemini = Boolean(GEMINI_API_KEY());
  const pref = DEFAULT_AI_PROVIDER();

  let active = "none";
  if (pref === "gemini" && hasGemini) active = "gemini";
  else if (pref === "groq" && hasGroq) active = "groq";
  else if (hasGroq && hasGemini) active = "groq+gemini";
  else if (hasGroq) active = "groq";
  else if (hasGemini) active = "gemini";

  return {
    groqConfigured: hasGroq,
    geminiConfigured: hasGemini,
    activeProvider: active,
    groqModel: GROQ_MODEL(),
    geminiModel: GEMINI_MODEL(),
  };
}

/**
 * Executes inference on Groq Cloud using OpenAI-compatible completions
 */
async function callGroq(
  messages: ChatMessage[],
  options: InferenceOptions = {}
): Promise<{ reply: string; model: string }> {
  const apiKey = GROQ_API_KEY();
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const primaryModel = options.model || GROQ_MODEL();
  const fallbackModel = primaryModel === "qwen/qwen3.8-27b" ? "openai/gpt-oss-120b" : "qwen/qwen3.8-27b";
  const timeoutMs = options.timeoutMs || 10000;
  const temperature = options.temperature ?? 0.3;
  // Reasoning models require sufficient token budget so reasoning doesn't consume all tokens
  const maxTokens = Math.max(options.maxTokens ?? 350, 350);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res = await fetch(`${GROQ_BASE_URL()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: primaryModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    let usedModel = primaryModel;
    let data: any = res.ok ? await res.json().catch(() => null) : null;
    let raw = data?.choices?.[0]?.message?.content || "";

    // Retry once with fallback model on non-success or empty content
    if (!res.ok || !raw.trim()) {
      console.warn(`Groq primary model (${primaryModel}) status ${res.status} or empty content. Attempting fallback (${fallbackModel}).`);
      res = await fetch(`${GROQ_BASE_URL()}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: fallbackModel,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });
      usedModel = fallbackModel;
      data = res.ok ? await res.json().catch(() => null) : null;
      raw = data?.choices?.[0]?.message?.content || "";
    }

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Groq cloud request failed (${res.status}): ${errText}`);
    }

    const clean = cleanSpokenText(raw);
    if (!clean) throw new Error("Groq returned empty text response.");

    return { reply: clean, model: usedModel };
  } catch (err: any) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Executes inference on Google Gemini Cloud
 * Supports both native generateContent and OpenAI-compatible endpoints
 */
async function callGemini(
  messages: ChatMessage[],
  options: InferenceOptions = {}
): Promise<{ reply: string; model: string }> {
  const apiKey = GEMINI_API_KEY();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const model = options.model || GEMINI_MODEL();
  const timeoutMs = options.timeoutMs || 10000;
  const temperature = options.temperature ?? 0.3;
  const maxTokens = options.maxTokens ?? 350;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 1. First attempt Gemini native generateContent API
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystemMsgs = messages.filter((m) => m.role !== "system");

    const contents = nonSystemMsgs.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const nativePayload: any = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    if (systemMsg) {
      nativePayload.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    const nativeUrl = `${GEMINI_BASE_URL()}/models/${model}:generateContent?key=${apiKey}`;
    let res = await fetch(nativeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nativePayload),
      signal: controller.signal,
    });

    if (res.ok) {
      clearTimeout(timer);
      const data: any = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = cleanSpokenText(rawText);
      if (clean) return { reply: clean, model };
    }

    // 2. If native returned non-OK, attempt OpenAI-compatible Gemini endpoint
    const compatUrl = `${GEMINI_BASE_URL()}/openai/chat/completions`;
    res = await fetch(compatUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini cloud request failed (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    const rawText = data.choices?.[0]?.message?.content || "";
    const clean = cleanSpokenText(rawText);
    if (!clean) throw new Error("Gemini returned empty text response.");

    return { reply: clean, model };
  } catch (err: any) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Unified Dual Cloud Inference
 * Orchestrates Groq and Google Gemini with automatic fallback
 */
export async function executeDualCloudInference(
  messages: ChatMessage[],
  options: InferenceOptions = {}
): Promise<InferenceResult> {
  const start = Date.now();
  const hasGroq = Boolean(GROQ_API_KEY());
  const hasGemini = Boolean(GEMINI_API_KEY());

  if (!hasGroq && !hasGemini) {
    throw new Error("Neither GROQ_API_KEY nor GEMINI_API_KEY is configured in the environment.");
  }

  const preference = options.preferredProvider || DEFAULT_AI_PROVIDER();

  // Determine provider trial order
  const providersToTry: CloudAIProvider[] = [];
  if (preference === "gemini") {
    if (hasGemini) providersToTry.push("gemini");
    if (hasGroq) providersToTry.push("groq");
  } else if (preference === "groq") {
    if (hasGroq) providersToTry.push("groq");
    if (hasGemini) providersToTry.push("gemini");
  } else {
    // "auto": prioritize Groq for speed if available, or Gemini
    if (hasGroq) providersToTry.push("groq");
    if (hasGemini) providersToTry.push("gemini");
  }

  let lastError: any = null;

  for (const provider of providersToTry) {
    try {
      if (provider === "groq") {
        const result = await callGroq(messages, options);
        return {
          reply: result.reply,
          provider: "groq",
          model: result.model,
          latencyMs: Date.now() - start,
        };
      } else if (provider === "gemini") {
        const result = await callGemini(messages, options);
        return {
          reply: result.reply,
          provider: "gemini",
          model: result.model,
          latencyMs: Date.now() - start,
        };
      }
    } catch (err: any) {
      console.warn(`[DualCloudAI] ${provider.toUpperCase()} provider failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw new Error(`Dual Cloud AI inference failed across all available providers: ${lastError?.message || "Unknown error"}`);
}
