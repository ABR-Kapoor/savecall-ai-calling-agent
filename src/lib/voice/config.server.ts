import { insforgeServer } from "@/lib/insforge/client.server";

export interface ResolvedVoiceConfig {
  provider: string;
  model: string;
  language: string;
  gender: "female" | "male";
  voice_id: string;
  speed: number;
}

export const DEFAULT_AI4BHARAT_VOICE: ResolvedVoiceConfig = {
  provider: "ai4bharat",
  model: "indic-tts",
  language: "hi",
  gender: "female",
  voice_id: "ai4bharat-hi-female",
  speed: 1.0,
};

export async function getTenantVoiceConfig(tenantId?: string | null): Promise<ResolvedVoiceConfig> {
  if (!tenantId) return DEFAULT_AI4BHARAT_VOICE;

  try {
    const { data: agentData } = await insforgeServer.database
      .from("ai_agents")
      .select("voice, languages")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();

    const { data: tenantData } = await insforgeServer.database
      .from("tenants")
      .select("branding_config")
      .eq("id", tenantId)
      .maybeSingle();

    const bCfg = (tenantData?.branding_config || {}) as Record<string, any>;
    const aCfg = (bCfg["agent_config"] || {}) as Record<string, any>;

    const voiceId = agentData?.voice || aCfg["voice_id"] || aCfg["voice_style"] || DEFAULT_AI4BHARAT_VOICE.voice_id;
    const gender = voiceId.includes("male") && !voiceId.includes("female") ? "male" : "female";
    const language =
      aCfg["language"] ||
      (Array.isArray(agentData?.languages)
        ? agentData.languages[0]
        : typeof agentData?.languages === "string"
        ? agentData.languages.split(",")[0]
        : DEFAULT_AI4BHARAT_VOICE.language);
    const speed = typeof aCfg["voice_speed"] === "number" ? aCfg["voice_speed"] : 1.0;

    return {
      provider: "ai4bharat",
      model: "indic-tts",
      language: language || DEFAULT_AI4BHARAT_VOICE.language,
      gender,
      voice_id: voiceId,
      speed,
    };
  } catch (e) {
    console.warn("Could not resolve tenant voice config:", e);
    return DEFAULT_AI4BHARAT_VOICE;
  }
}
