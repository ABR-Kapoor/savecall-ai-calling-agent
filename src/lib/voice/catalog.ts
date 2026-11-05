/**
 * AI4Bharat Indic-TTS Voice Model Catalog
 * Specialized high-fidelity Hindi neural synthesis personas
 */

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  gender: "female" | "male";
  accent: string;
  sampleText: string;
  isDefault?: boolean;
}

export const AI4BHARAT_VOICE_CATALOG: VoiceOption[] = [
  {
    id: "ai4bharat-hi-female",
    name: "Swara (Hindi - Female)",
    language: "Hindi (हिन्दी)",
    languageCode: "hi",
    gender: "female",
    accent: "Natural Conversational Hindi",
    sampleText: "नमस्ते! इन्श्योरकॉल सहायता केंद्र में आपका स्वागत है। मैं आपकी क्या मदद कर सकती हूँ?",
    isDefault: true,
  },
  {
    id: "ai4bharat-hi-male",
    name: "Kabir (Hindi - Male)",
    language: "Hindi (हिन्दी)",
    languageCode: "hi",
    gender: "male",
    accent: "Professional Authoritative Hindi",
    sampleText: "नमस्कार! मैं इन्श्योरकॉल से कबीर हूँ। आपकी पॉलिसी और क्लेम से जुड़े प्रश्नों में मैं सहायता कर सकता हूँ।",
  },
  {
    id: "ai4bharat-hinglish-female",
    name: "Pooja (Bilingual Hinglish - Female)",
    language: "Hinglish (Hindi + English)",
    languageCode: "hinglish",
    gender: "female",
    accent: "Natural Urban Indian Hinglish",
    sampleText: "Hello! InsurCall support me aapka welcome hai. Aapki policy details ya claim status check karne me help karu?",
  },
];

export function getVoiceById(voiceId?: string): VoiceOption {
  if (!voiceId) return AI4BHARAT_VOICE_CATALOG[0];
  const found = AI4BHARAT_VOICE_CATALOG.find((v) => v.id === voiceId);
  return found || AI4BHARAT_VOICE_CATALOG[0];
}

export function getDefaultVoice(languageCode = "hi", gender: "female" | "male" = "female"): VoiceOption {
  const match = AI4BHARAT_VOICE_CATALOG.find(
    (v) => (v.languageCode === languageCode || v.gender === gender)
  );
  return match || AI4BHARAT_VOICE_CATALOG[0];
}

export const VOICE_CATALOG = AI4BHARAT_VOICE_CATALOG;
