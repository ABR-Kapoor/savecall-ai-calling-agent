import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { getVoiceById, getDefaultVoice } from "@/lib/voice/catalog";

const SynthesisInput = z.object({
  text: z.string().min(1).max(2000),
  voiceId: z.string().optional(),
  language: z.string().optional(),
  gender: z.enum(["female", "male"]).optional(),
  speed: z.number().min(0.5).max(2.0).optional().default(1.0),
});

// In-memory cache for fast recurring audio phrases
const audioCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
const MAX_CACHE_ENTRIES = 150;

// High-fidelity neural voice mappings for Hindi & Hinglish
const VOICE_MAP: Record<string, string> = {
  "ai4bharat-hi-female": "hi-IN-SwaraNeural",
  "ai4bharat-hi-male": "hi-IN-MadhurNeural",
  "ai4bharat-hinglish-female": "hi-IN-SwaraNeural",
};

/**
 * Pure Node.js Indic Neural speech synthesizer (Vercel Serverless Ready)
 */
async function generateAudio(
  text: string,
  _language: string,
  _gender: "female" | "male",
  speed: number,
  voiceId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const targetVoice = VOICE_MAP[voiceId] || "hi-IN-SwaraNeural";
  const clean = text.replace(/[*_#`~>]/g, "").replace(/\n+/g, " ").trim();
  if (!clean) return null;

  const ratePercent = Math.round((speed - 1.0) * 100);
  const rateArg = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

  return new Promise((resolve) => {
    let tts: InstanceType<typeof MsEdgeTTS> | null = null;
    let timer: NodeJS.Timeout | null = null;
    let resolved = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (tts) {
        try {
          tts.close();
        } catch {}
      }
    };

    timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(null);
      }
    }, 12000);

    (async () => {
      try {
        tts = new MsEdgeTTS();
        await tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const { audioStream } = tts.toStream(clean, { rate: rateArg });
        const chunks: Buffer[] = [];

        audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        audioStream.on("end", () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 500) {
              resolve({
                buffer,
                contentType: "audio/mpeg",
              });
            } else {
              resolve(null);
            }
          }
        });
        audioStream.on("error", () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(null);
          }
        });
      } catch {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(null);
        }
      }
    })();
  });
}

export const Route = createFileRoute("/api/voice/tts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const text = url.searchParams.get("text") || "";
          const voiceId = url.searchParams.get("voiceId") || undefined;
          const language = url.searchParams.get("language") || undefined;
          const gender = (url.searchParams.get("gender") as "female" | "male") || undefined;
          const speed = parseFloat(url.searchParams.get("speed") || "1.0");

          if (!text.trim()) {
            return new Response(JSON.stringify({ error: "Missing text parameter" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const resolvedVoice = voiceId ? getVoiceById(voiceId) : getDefaultVoice(language, gender);
          const targetLang = language || resolvedVoice.languageCode;
          const targetGender = gender || resolvedVoice.gender;

          const cacheKey = `${resolvedVoice.id}:${targetLang}:${targetGender}:${speed}:${text.trim()}`;
          const cached = audioCache.get(cacheKey);
          if (cached) {
            return new Response(new Uint8Array(cached.buffer), {
              status: 200,
              headers: {
                "Content-Type": cached.contentType,
                "Content-Length": String(cached.buffer.length),
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=86400",
                "X-Voice-Engine": "indic-neural-node",
              },
            });
          }

          const result = await generateAudio(
            text,
            targetLang,
            targetGender,
            speed,
            resolvedVoice.id
          );

          if (result) {
            if (audioCache.size >= MAX_CACHE_ENTRIES) {
              const oldestKey = audioCache.keys().next().value;
              if (oldestKey) audioCache.delete(oldestKey);
            }
            audioCache.set(cacheKey, {
              buffer: result.buffer,
              contentType: result.contentType,
              timestamp: Date.now(),
            });

            return new Response(new Uint8Array(result.buffer), {
              status: 200,
              headers: {
                "Content-Type": result.contentType,
                "Content-Length": String(result.buffer.length),
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=86400",
                "X-Voice-Engine": "indic-neural-node",
              },
            });
          }

          return new Response(JSON.stringify({ error: "Speech synthesis failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || "Synthesis failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      POST: async ({ request }) => {
        try {
          const body = SynthesisInput.parse(await request.json().catch(() => ({})));
          const resolvedVoice = body.voiceId
            ? getVoiceById(body.voiceId)
            : getDefaultVoice(body.language, body.gender);
          const targetLang = body.language || resolvedVoice.languageCode;
          const targetGender = body.gender || resolvedVoice.gender;

          const cacheKey = `${resolvedVoice.id}:${targetLang}:${targetGender}:${body.speed}:${body.text.trim()}`;
          const cached = audioCache.get(cacheKey);
          if (cached) {
            return new Response(new Uint8Array(cached.buffer), {
              status: 200,
              headers: {
                "Content-Type": cached.contentType,
                "Content-Length": String(cached.buffer.length),
                "Accept-Ranges": "bytes",
                "X-Voice-Engine": "indic-neural-node",
              },
            });
          }

          const result = await generateAudio(
            body.text,
            targetLang,
            targetGender,
            body.speed,
            resolvedVoice.id
          );

          if (result) {
            if (audioCache.size >= MAX_CACHE_ENTRIES) {
              const oldestKey = audioCache.keys().next().value;
              if (oldestKey) audioCache.delete(oldestKey);
            }
            audioCache.set(cacheKey, {
              buffer: result.buffer,
              contentType: result.contentType,
              timestamp: Date.now(),
            });

            return new Response(new Uint8Array(result.buffer), {
              status: 200,
              headers: {
                "Content-Type": result.contentType,
                "Content-Length": String(result.buffer.length),
                "Accept-Ranges": "bytes",
                "X-Voice-Engine": "indic-neural-node",
              },
            });
          }

          return new Response(JSON.stringify({ error: "Speech synthesis failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || "Synthesis failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
