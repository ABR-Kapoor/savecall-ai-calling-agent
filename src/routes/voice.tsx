import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useRoomContext,
  useVoiceAssistant,
} from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  ChevronLeft,
  MessageSquare,
  Maximize2,
  Grid,
  UserCheck,
  Wifi,
  Battery,
  Clock,
  X,
  RotateCcw,
  CheckCircle2,
  Send,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [{ title: "InsurCall: Phone Call UI" }],
  }),
  component: VoiceCallPage,
});

/* =========================================================================
   VOICE CONNECTION STATE MACHINE
   ========================================================================= */
export type VoiceConnectionState =
  | "idle"
  | "requesting_microphone"
  | "connecting"
  | "connected"
  | "listening"
  | "processing"
  | "speaking"
  | "permission_denied"
  | "connection_failed"
  | "reconnecting"
  | "disconnected"
  | "ended";

/* =========================================================================
   SPEECH SYNTHESIS ENGINE (WITH GC RETENTION & WATCHDOG SAFETY)
   ========================================================================= */
let activeUtterance: SpeechSynthesisUtterance | null = null;
let speechWatchdogTimeout: any = null;

export function stopSpeaking() {
  if (speechWatchdogTimeout) {
    clearTimeout(speechWatchdogTimeout);
    speechWatchdogTimeout = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
  activeUtterance = null;
}

function speakAi(text: string, isSpeakerMuted: boolean, onEnd?: () => void) {
  stopSpeaking();

  if (isSpeakerMuted || typeof window === "undefined" || !("speechSynthesis" in window) || !text) {
    if (onEnd) onEnd();
    return;
  }

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const cleanText = text
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/[*_#`~>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterance = utterance;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang === "en-IN" || v.lang === "hi-IN") ||
      voices.find(
        (v) =>
          v.name.includes("India") ||
          v.name.includes("Neerja") ||
          v.name.includes("Swara") ||
          v.name.includes("Natural") ||
          v.name.includes("Jenny")
      ) ||
      voices.find((v) => v.lang.startsWith("en-")) ||
      voices[0];

    if (preferred) utterance.voice = preferred;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    let finished = false;
    const finalize = () => {
      if (finished) return;
      finished = true;
      if (speechWatchdogTimeout) {
        clearTimeout(speechWatchdogTimeout);
        speechWatchdogTimeout = null;
      }
      activeUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onend = finalize;
    utterance.onerror = (e) => {
      console.warn("Speech synthesis notice:", e);
      finalize();
    };

    const estimatedDurationMs = Math.max(3000, (cleanText.length / 14) * 1000 + 3000);
    speechWatchdogTimeout = setTimeout(() => {
      console.warn("Speech synthesis watchdog triggered state release");
      finalize();
    }, estimatedDurationMs);

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
    if (onEnd) onEnd();
  }
}

interface TranscriptMessage {
  id: string;
  role: "agent" | "user" | "system";
  text: string;
  time: string;
  citations?: Array<{
    sourceName: string;
    similarity: number;
    pageNumber?: number | null;
  }>;
  grounded?: boolean;
  escalated?: boolean;
}

class PhoneAudioFX {
  private static ctx: AudioContext | null = null;
  private static ringInterval: ReturnType<typeof setInterval> | null = null;

  private static getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  static playDialTone() {
    this.stopRinging();
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const playBurst = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.6);
        osc2.stop(now + 1.6);
      };

      playBurst();
      this.ringInterval = setInterval(playBurst, 3500);
    } catch (e) {
      console.warn("Audio dial tone notice:", e);
    }
  }

  static stopRinging() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  static playConnected() {
    this.stopRinging();
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn("Connected sound notice:", e);
    }
  }

  static playEndCall() {
    this.stopRinging();
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.linearRampToValueAtTime(260, now + 0.25);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {
      console.warn("End call sound notice:", e);
    }
  }

  static playBeep(freq = 697) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn("Beep notice:", e);
    }
  }
}

/* =========================================================================
   MAIN ROUTE CONTROLLER
   ========================================================================= */
function VoiceCallPage() {
  const { user } = useUser();
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [callEndedStats, setCallEndedStats] = useState<{
    duration: number;
    turns: number;
  } | null>(null);

  const [session, setSession] = useState<{
    token: string;
    livekitUrl: string;
    roomName: string;
    callSessionId: string;
    agentId?: string;
    greeting?: string;
    agentConfig?: any;
    customer: { id: string | null; name: string; customerNumber: string | null; tenantId?: string; isVerified?: boolean };
    micStream?: MediaStream | null | undefined;
    skipMic: boolean;
  } | null>(null);

  const startVoiceCall = useCallback(
    async (skipMic = false) => {
      setError(null);
      setCallEndedStats(null);

      let mediaStream: MediaStream | null = null;

      if (!skipMic) {
        setConnectionState("requesting_microphone");
        try {
          if (
            typeof navigator === "undefined" ||
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices.getUserMedia !== "function"
          ) {
            throw new Error("Your browser does not support microphone capture.");
          }
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch (micErr: any) {
          console.warn("Microphone access error:", micErr);
          if (micErr.name === "NotAllowedError" || micErr.name === "PermissionDeniedError") {
            setConnectionState("permission_denied");
            setError(
              "Microphone permission was denied. Please allow microphone access or continue using text captions."
            );
          } else if (micErr.name === "NotFoundError" || micErr.name === "DevicesNotFoundError") {
            setConnectionState("permission_denied");
            setError("No microphone detected. Please plug in a microphone or continue in text mode.");
          } else {
            setConnectionState("permission_denied");
            setError(`Microphone notice: ${micErr.message || "Failed to acquire audio input"}`);
          }
          return;
        }
      }

      setConnectionState("connecting");
      PhoneAudioFX.playDialTone();

      try {
        const clerkEmail = user?.primaryEmailAddress?.emailAddress;
        const clerkName =
          user?.fullName ||
          `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
          clerkEmail?.split("@")[0] ||
          "Valued Policyholder";

        const sessionAbort = new AbortController();
        const sessionTimeout = setTimeout(() => sessionAbort.abort(), 12000);

        const res = await fetch("/api/voice/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkUserId: user?.id,
            customerEmail: clerkEmail,
            customerName: clerkName,
            customerPhone: user?.primaryPhoneNumber?.phoneNumber,
          }),
          signal: sessionAbort.signal,
        });

        clearTimeout(sessionTimeout);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to initialize session (${res.status})`);
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Always prioritize the official LiveKit Cloud WebSocket URL from server or env
        const resolvedLivekitUrl =
          data.livekitUrl ||
          (typeof window !== "undefined" && (window as any).__LIVEKIT_URL__) ||
          "wss://insurcall-agent-11ucbvws.livekit.cloud";

        setSession({
          token: data.token,
          livekitUrl: resolvedLivekitUrl,
          roomName: data.roomName,
          callSessionId: data.callSessionId,
          agentId: data.agentId,
          customer: data.customer,
          greeting: data.greeting,
          agentConfig: data.agentConfig,
          micStream: mediaStream,
          skipMic,
        });
      } catch (err: any) {
        PhoneAudioFX.stopRinging();
        console.error("Session connection error:", err);
        if (mediaStream) {
          mediaStream.getTracks().forEach((t) => t.stop());
        }
        setConnectionState("connection_failed");
        setError(
          err.name === "AbortError"
            ? "Voice server connection timed out. Please try again."
            : err.message || "Failed to establish voice session."
        );
      }
    },
    [user]
  );

  const handleEndCall = useCallback(
    (stats?: { duration: number; turns: number }) => {
      stopSpeaking();
      PhoneAudioFX.playEndCall();

      if (session?.micStream) {
        session.micStream.getTracks().forEach((t) => t.stop());
      }

      if (stats) {
        setCallEndedStats(stats);
        if (session?.callSessionId) {
          fetch("/api/voice/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callSessionId: session.callSessionId,
              durationSeconds: stats.duration,
              turnsCount: stats.turns,
            }),
          }).catch((e) => console.warn("Call end sync notice:", e));
        }
      }

      setSession(null);
      setConnectionState("ended");
    },
    [session]
  );

  const handleBack = () => {
    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/";
      }
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#FAF9F6] p-2 sm:p-4 text-[#111827] antialiased overflow-hidden selection:bg-[#087F8C]/20">
      {/* Subtle Warm Theme Background Lighting */}
      <div className="absolute top-1/4 -left-32 h-[420px] w-[420px] rounded-full bg-[#087F8C]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 h-[420px] w-[420px] rounded-full bg-[#10A6AE]/5 blur-[120px] pointer-events-none" />

      {/* Top Navigation: Simple Back Button Only */}
      <div className="absolute top-5 left-5 z-30">
        <button
          type="button"
          onClick={handleBack}
          className="group flex items-center gap-1.5 text-xs font-medium text-[#344054] hover:text-[#111827] transition-all py-2 px-3.5 rounded-full bg-white/90 hover:bg-white border border-[#E4E7EC] shadow-xs backdrop-blur-md active:scale-95 cursor-pointer"
          aria-label="Go back"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 text-[#087F8C]" />
          <span>Back</span>
        </button>
      </div>

      {/* SMARTPHONE DEVICE CONTAINER (FOLLOWS CURRENT THEME) */}
      <div className="w-full max-w-[390px] h-[780px] max-h-[92vh] relative z-20 flex flex-col rounded-[48px] border-[5px] border-[#CBD5E1] bg-white shadow-[0_28px_65px_-12px_rgba(8,127,140,0.18)] ring-1 ring-slate-200/90 overflow-hidden text-[#111827]">
        {/* Phone Dynamic Island Top Notch */}
        <div className="absolute top-2.5 inset-x-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="flex items-center justify-between w-28 h-6 bg-black rounded-full px-2.5 shadow-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <span className="h-1 w-1 rounded-full bg-[#10A6AE]" />
            </span>
            {session ? (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-mono font-medium text-emerald-400">LIVE</span>
              </span>
            ) : (
              <span className="h-1 w-6 rounded-full bg-slate-800" />
            )}
          </div>
        </div>

        {/* Content View: Dial / Active / Ended */}
        {!session ? (
          callEndedStats ? (
            <CallEndedScreen
              stats={callEndedStats}
              onCallAgain={() => startVoiceCall(false)}
              onDismiss={() => {
                setCallEndedStats(null);
                setConnectionState("idle");
              }}
            />
          ) : (
            <PreCallDialerScreen
              connectionState={connectionState}
              error={error}
              onStartCall={() => startVoiceCall(false)}
              onRetry={() => startVoiceCall(false)}
              onContinueWithoutMic={() => startVoiceCall(true)}
            />
          )
        ) : (
          <LiveKitRoom
            serverUrl={session.livekitUrl}
            token={session.token}
            connect={true}
            audio={!session.skipMic}
            video={false}
            onConnected={() => {
              PhoneAudioFX.stopRinging();
              PhoneAudioFX.playConnected();
              setConnectionState("connected");
            }}
            onError={(err) => {
              console.warn("Audio connection notice:", err?.message || err);
              if (connectionState === "connecting") {
                setConnectionState("connection_failed");
                setError(
                  "Connection notice: " + (err?.message || "Please check your network and try again.")
                );
              }
            }}
            onDisconnected={() => {
              if (connectionState !== "ended") {
                setConnectionState("disconnected");
              }
            }}
            className="w-full h-full flex flex-col"
          >
            <ActivePhoneCallScreen
              connectionState={connectionState}
              setConnectionState={setConnectionState}
              callSessionId={session.callSessionId}
              agentId={session.agentId}
              customerName={session.customer.name}
              customerId={session.customer.id}
              tenantId={(session.customer as any).tenantId}
              customerNumber={session.customer.customerNumber}
              initialGreeting={(session as any).greeting}
              micStream={session.micStream}
              onEnd={handleEndCall}
            />
            <RoomAudioRenderer />
          </LiveKitRoom>
        )}

        {/* Phone Bottom Home Indicator Bar */}
        <div className="absolute bottom-1.5 inset-x-0 flex justify-center pointer-events-none z-40">
          <div className="w-32 h-1 bg-slate-300 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   1. PRE-CALL / DIALER SCREEN (THEME ALIGNED)
   ========================================================================= */
function PreCallDialerScreen({
  connectionState,
  error,
  onStartCall,
  onRetry,
  onContinueWithoutMic,
}: {
  connectionState: VoiceConnectionState;
  error: string | null;
  onStartCall: () => void;
  onRetry: () => void;
  onContinueWithoutMic: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col justify-between p-6 pt-11 pb-7 text-center bg-gradient-to-b from-[#F2F8F8] via-[#FAF9F6] to-[#FAF9F6] text-[#111827]">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between text-[11px] text-[#344054] px-1 pt-1 font-medium">
        <span className="font-bold text-[#111827] tracking-tight">InsurCall</span>
        <div className="flex items-center gap-1.5 text-[#667085]">
          <Wifi className="h-3 w-3" />
          <Battery className="h-3.5 w-3.5 text-emerald-600" />
        </div>
      </div>

      {/* Main Calling Contact Info: Single Official Logo / Emblem */}
      <div className="flex flex-col items-center my-auto space-y-3.5">
        {/* Assistant Avatar with Brand Pulse */}
        <div className="relative my-1 flex items-center justify-center">
          <div className="absolute -inset-3 rounded-full bg-[#087F8C]/15 blur-lg animate-pulse" />
          <div className="relative flex h-22 w-22 items-center justify-center rounded-full bg-white border-2 border-[#087F8C]/30 shadow-md p-3.5">
            <img
              src="/01_logo_only_transparent.png"
              alt="InsurCall Assistant Emblem"
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="space-y-1 flex flex-col items-center">
          <h1 className="text-xl font-bold font-display text-[#111827] tracking-tight">
            Insur<span className="text-[#087F8C]">Call</span>
          </h1>
          <p className="text-xs font-semibold text-[#087F8C] tracking-wide">
            SafeLife 24/7 AI Voice Line
          </p>
          <p className="text-[11px] text-[#667085] max-w-[270px] mx-auto pt-0.5 leading-relaxed">
            Policyholder voice assistant for benefits, claim status, and nominee service.
          </p>
        </div>

        {/* Dynamic Diagnostics or Feature Highlights */}
        {connectionState === "permission_denied" ? (
          <div className="w-full rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-left text-xs space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-rose-800 font-semibold text-[11px]">
              <MicOff className="h-4 w-4 shrink-0 text-rose-600" />
              <span>Microphone Access Required</span>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed">
              {error ||
                "InsurCall needs microphone access so the assistant can hear you. Enable permissions in your browser or continue in text mode."}
            </p>
            <div className="pt-1 flex flex-col gap-1.5">
              <Button
                onClick={onRetry}
                size="sm"
                className="w-full h-8.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Grant Microphone & Retry
              </Button>
              <button
                type="button"
                onClick={onContinueWithoutMic}
                className="w-full py-1 text-[11px] text-[#344054] hover:text-[#111827] font-semibold underline-offset-2 hover:underline transition-colors text-center"
              >
                Continue without Mic (Type & Listen)
              </button>
            </div>
          </div>
        ) : connectionState === "connection_failed" ? (
          <div className="w-full rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-left text-xs space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-[11px]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Connection Notice</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              {error || "Unable to establish voice connection. Please check your network and try again."}
            </p>
            <div className="pt-1">
              <Button
                onClick={onRetry}
                size="sm"
                className="w-full h-8.5 bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-semibold rounded-xl"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Retry Connection
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-[#E4E7EC] bg-white p-4 text-left text-xs space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-[#087F8C] font-semibold text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Policy Assistant
            </div>
            <div className="space-y-1.5 text-[11px] text-[#344054]">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Instant Policy Benefit & Expiry Lookup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Real-Time Claim Status & Payout Updates</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#087F8C]" />
                <span>Nominee Updates with OTP Safeguards</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Start Phone Call Action */}
      <div className="space-y-2.5 pt-2">
        <Button
          onClick={connectionState === "permission_denied" ? onContinueWithoutMic : onStartCall}
          disabled={connectionState === "requesting_microphone" || connectionState === "connecting"}
          className="w-full h-13 rounded-2xl bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold text-sm shadow-md shadow-[#087F8C]/20 transition-all active:scale-[0.98] cursor-pointer"
        >
          {connectionState === "requesting_microphone" ? (
            <span className="flex items-center gap-2">
              <Mic className="h-4.5 w-4.5 animate-pulse text-white" />
              Allow Microphone Access...
            </span>
          ) : connectionState === "connecting" ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
              Connecting to Assistant...
            </span>
          ) : connectionState === "permission_denied" ? (
            <span className="flex items-center gap-2">
              <Volume2 className="h-4.5 w-4.5 text-white" />
              Start in Listen & Type Mode
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Phone className="h-4.5 w-4.5 fill-white" />
              Start Voice Call
            </span>
          )}
        </Button>
        <p className="text-[10px] text-[#667085] font-medium">
          {connectionState === "requesting_microphone"
            ? "Click 'Allow' on the browser microphone prompt"
            : connectionState === "connecting"
            ? "Connecting to secure voice line..."
            : connectionState === "permission_denied"
            ? "No microphone required • Listen & Type enabled"
            : "Secure Voice Line • English & Hindi"}
        </p>
      </div>
    </div>
  );
}

/* =========================================================================
   2. ACTIVE PHONE CALL SCREEN (THEME ALIGNED)
   ========================================================================= */
function ActivePhoneCallScreen({
  connectionState,
  setConnectionState,
  callSessionId,
  agentId,
  customerName,
  customerId,
  tenantId,
  customerNumber,
  initialGreeting,
  micStream,
  onEnd,
}: {
  connectionState: VoiceConnectionState;
  setConnectionState: React.Dispatch<React.SetStateAction<VoiceConnectionState>>;
  callSessionId?: string | undefined;
  agentId?: string | undefined;
  customerName: string;
  customerId?: string | null;
  tenantId?: string;
  customerNumber?: string | null;
  initialGreeting?: string;
  micStream?: MediaStream | null | undefined;
  onEnd: (stats?: { duration: number; turns: number }) => void;
}) {
  const room = useRoomContext();
  const roomConnectionState = useConnectionState();
  const { state: _agentState } = useVoiceAssistant();

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [micVolume, setMicVolume] = useState(0);

  const [messages, setMessages] = useState<TranscriptMessage[]>([
    {
      id: "initial-greeting",
      role: "agent",
      text:
        initialGreeting ||
        `Hello ${customerName || "there"}! Welcome to InsurCall insurance assistance. How may I help you today?`,
      time: "00:00",
    },
  ]);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const fullTranscriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    fullTranscriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTranscriptExpanded]);

  useEffect(() => {
    if (!micStream || isMuted) {
      setMicVolume(0);
      return;
    }

    let animationFrameId: number;
    let audioCtx: AudioContext | null = null;
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioContextClass();
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
      const source = audioCtx.createMediaStreamSource(micStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] ?? 0;
        }
        const avg = sum / dataArray.length;
        setMicVolume(Math.min(100, Math.round(avg * 1.5)));
        animationFrameId = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (e) {
      console.warn("Audio meter setup notice:", e);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [micStream, isMuted]);

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        if (data.type === "transcript" && data.text) {
          setMessages((prev) => {
            if (prev.length > 0 && prev[prev.length - 1]?.text === data.text) {
              return prev;
            }
            return [
              ...prev,
              {
                id: `${Date.now()}-${Math.random()}`,
                role: data.role === "user" ? "user" : "agent",
                text: data.text,
                time: formatTimer(duration),
              },
            ];
          });
        }
      } catch (err) {
        console.warn("Data parse error:", err);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, duration]);

  useEffect(() => {
    if (room?.localParticipant && roomConnectionState === "connected" && micStream) {
      room.localParticipant
        .setMicrophoneEnabled(true, {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        })
        .catch((err) => {
          console.warn("Microphone auto-enable notice:", err);
        });
    }
  }, [room, roomConnectionState, micStream]);

  const toggleMute = useCallback(() => {
    if (room?.localParticipant) {
      const nextState = !isMuted;
      room.localParticipant.setMicrophoneEnabled(!nextState);
      setIsMuted(nextState);
      PhoneAudioFX.playBeep(nextState ? 440 : 880);
    } else {
      setIsMuted(!isMuted);
    }
  }, [room, isMuted]);

  const toggleSpeaker = useCallback(() => {
    const nextSpeakerState = !isSpeakerMuted;
    setIsSpeakerMuted(nextSpeakerState);
    PhoneAudioFX.playBeep(nextSpeakerState ? 350 : 700);

    const audioEls = document.querySelectorAll("audio");
    audioEls.forEach((el) => {
      el.muted = nextSpeakerState;
    });
  }, [isSpeakerMuted]);

  // Watchdog fallback: auto-promote to connected state within 1.2s so greeting speaks immediately
  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (connectionState === "connecting") {
      fallbackTimer = setTimeout(() => {
        PhoneAudioFX.stopRinging();
        PhoneAudioFX.playConnected();
        setConnectionState("connected");
      }, 1200);
    }
    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [connectionState, setConnectionState]);

  useEffect(() => {
    if (connectionState !== "connected") return;
    PhoneAudioFX.stopRinging();
    const greeting =
      initialGreeting ||
      `Hello ${customerName || "there"}! Welcome to InsurCall insurance assistance. How may I help you today?`;

    setConnectionState("speaking");
    const t = setTimeout(() => {
      speakAi(greeting, isSpeakerMuted, () => {
        setConnectionState("listening");
      });
    }, 400);

    return () => clearTimeout(t);
  }, [connectionState, initialGreeting, customerName, isSpeakerMuted, setConnectionState]);

  const sendPrompt = useCallback(
    async (promptText: string) => {
      stopSpeaking();
      PhoneAudioFX.playBeep(587);
      setConnectionState("processing");

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          role: "user",
          text: promptText,
          time: formatTimer(duration),
        },
      ]);

      if (room?.localParticipant) {
        try {
          const packet = new TextEncoder().encode(
            JSON.stringify({ type: "user_query", text: promptText })
          );
          room.localParticipant.publishData(packet);
        } catch (e) {
          console.error("Failed to send prompt data:", e);
        }
      }

      try {
        const res = await fetch("/api/voice/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: promptText,
            callSessionId,
            tenantId,
            agentId,
            customerId,
            customerName,
            history: messages.slice(-4).map((m) => ({
              role: m.role === "agent" ? "assistant" : "user",
              content: m.text,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.reply) {
            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${Math.random()}`,
                role: "agent",
                text: data.reply,
                time: formatTimer(duration),
                citations: data.citations || [],
                grounded: data.grounded,
                escalated: data.escalated,
              },
            ]);
            setConnectionState("speaking");
            speakAi(data.reply, isSpeakerMuted, () => {
              setConnectionState("listening");
            });
          } else {
            setConnectionState("listening");
          }
        } else {
          setConnectionState("listening");
        }
      } catch (err) {
        console.warn("AI chat response notice:", err);
        setConnectionState("listening");
      }
    },
    [
      room,
      duration,
      customerName,
      tenantId,
      customerId,
      isSpeakerMuted,
      messages,
      callSessionId,
      setConnectionState,
    ]
  );

  const handleSendText = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = textInput.trim();
      if (!trimmed || connectionState === "processing") return;
      sendPrompt(trimmed);
      setTextInput("");
    },
    [textInput, connectionState, sendPrompt]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isMuted || connectionState === "processing") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let reco: any = null;
    let active = true;

    try {
      reco = new SpeechRecognition();
      reco.continuous = true;
      reco.interimResults = true;
      reco.lang = "en-IN";

      reco.onresult = (event: any) => {
        if (!active) return;
        const lastResult = event.results[event.results.length - 1];
        if (lastResult) {
          const speechText = lastResult[0]?.transcript?.trim();
          if (speechText) {
            if (connectionState === "speaking") {
              stopSpeaking();
              setConnectionState("listening");
            }
            if (lastResult.isFinal) {
              sendPrompt(speechText);
            }
          }
        }
      };

      reco.onerror = (e: any) => {
        if (e.error === "not-allowed") {
          setConnectionState("permission_denied");
        } else if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("Speech recognition notice:", e.error);
        }
      };

      reco.onend = () => {
        if (active && !isMuted && connectionState === "listening") {
          try {
            reco.start();
          } catch {}
        }
      };

      try {
        reco.start();
      } catch (err) {
        console.warn("Speech recognition start notice:", err);
      }
    } catch (e) {
      console.warn("Speech recognition init notice:", e);
    }

    return () => {
      active = false;
      if (reco) {
        try {
          reco.stop();
        } catch {}
      }
    };
  }, [isMuted, connectionState, sendPrompt, setConnectionState]);

  const isSpeaking = connectionState === "speaking";

  return (
    <div className="flex-1 flex flex-col justify-between p-4 pt-11 pb-5 relative overflow-hidden bg-gradient-to-b from-[#F2F8F8] via-[#FAF9F6] to-[#FAF9F6] text-[#111827]">
      {/* 1. Top Status Bar */}
      <div className="flex items-center justify-between text-[11px] text-[#344054] px-1 pt-0.5 border-b border-[#E4E7EC] pb-2 font-medium">
        <div className="flex items-center gap-1.5 font-mono text-[#087F8C] font-semibold">
          <Clock className="h-3 w-3" />
          <span>{formatTimer(duration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Clear Audio
          </span>
          <Wifi className="h-3 w-3 text-[#667085]" />
          <Battery className="h-3.5 w-3.5 text-emerald-600" />
        </div>
      </div>

      {/* 2. Caller Profile & Voice Aura */}
      <div className="flex flex-col items-center text-center my-auto space-y-2 py-1">
        <div className="relative flex items-center justify-center my-1.5">
          {isSpeaking && (
            <>
              <div className="absolute h-28 w-28 rounded-full border border-[#087F8C]/40 animate-ping duration-1000" />
              <div className="absolute h-24 w-24 rounded-full border-2 border-[#10A6AE]/50 animate-pulse" />
            </>
          )}

          <div
            className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 shadow-md p-3.5 ${
              isSpeaking
                ? "bg-white border-2 border-[#087F8C] shadow-[0_0_30px_rgba(8,127,140,0.35)] scale-105"
                : "bg-white border-2 border-[#087F8C]/30 shadow-xs"
            }`}
          >
            <img
              src="/01_logo_only_transparent.png"
              alt="InsurCall Assistant Emblem"
              className={`h-full w-full object-contain transition-transform ${
                isSpeaking ? "scale-110" : "opacity-90"
              }`}
            />
          </div>
        </div>

        <div>
          <h2 className="text-base font-bold text-[#111827] tracking-tight">
            InsurCall AI Assistant
          </h2>
          <p className="text-[11px] text-[#667085] pt-0.5">
            {customerName} {customerNumber ? `• ${customerNumber}` : ""}
          </p>
        </div>

        {/* Speaking Status Badge & Real Audio Reactive Equalizer */}
        <div className="flex items-center gap-2 pt-0.5">
          <Badge
            variant="outline"
            className={`text-[10px] py-0.5 px-2.5 transition-all font-semibold ${
              connectionState === "speaking"
                ? "border-[#087F8C]/40 text-[#087F8C] bg-[#E6F6F7]"
                : connectionState === "processing"
                ? "border-amber-300 text-amber-800 bg-amber-50"
                : connectionState === "listening"
                ? "border-emerald-300 text-emerald-800 bg-emerald-50"
                : connectionState === "connected"
                ? "border-[#087F8C]/30 text-[#087F8C] bg-[#E6F6F7]"
                : connectionState === "reconnecting"
                ? "border-rose-300 text-rose-800 bg-rose-50"
                : "border-[#E4E7EC] text-[#667085] bg-white"
            }`}
          >
            {connectionState === "speaking"
              ? "Speaking..."
              : connectionState === "processing"
              ? "Thinking..."
              : connectionState === "listening"
              ? "Listening..."
              : connectionState === "connected"
              ? "Ready..."
              : connectionState === "reconnecting"
              ? "Reconnecting..."
              : "Connecting..."}
          </Badge>

          <div className="flex items-center gap-1 h-4 px-1">
            {[0.7, 1.2, 0.9, 1.3, 0.8].map((mult, i) => {
              const height =
                connectionState === "speaking"
                  ? i % 2 === 0
                    ? "14px"
                    : "18px"
                  : connectionState === "listening"
                  ? `${Math.max(4, Math.min(18, 4 + Math.round((micVolume / 100) * 14 * mult)))}px`
                  : "4px";
              return (
                <span
                  key={i}
                  style={{ height }}
                  className={`w-0.5 rounded-full transition-all duration-100 ${
                    connectionState === "speaking"
                      ? "bg-[#087F8C] animate-pulse"
                      : micVolume > 10
                      ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
                      : "bg-slate-300"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Live Captions & Inline Text Chat (Light Theme) */}
      {showTranscript && (
        <div className="my-2 rounded-2xl border border-[#E4E7EC] bg-white/95 shadow-xs p-2.5 flex flex-col justify-between h-36 shrink-0 relative transition-all">
          <div className="flex items-center justify-between pb-1 border-b border-[#E4E7EC]/70 mb-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#344054]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>LIVE CAPTIONS</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsTranscriptExpanded(true)}
                title="Expand Transcript"
                className="text-[#667085] hover:text-[#111827] p-1 rounded-md hover:bg-slate-100 text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <Maximize2 className="h-3 w-3" />
                <span className="text-[9px]">Full</span>
              </button>
              <button
                onClick={() => setShowTranscript(false)}
                title="Hide Captions"
                className="text-[#667085] hover:text-[#111827] p-1 rounded-md hover:bg-slate-100 text-[10px] transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 text-[11px] leading-tight select-text scrollbar-thin">
            {messages.slice(-3).map((m) => (
              <div
                key={m.id}
                className={`flex flex-col items-start gap-0.5 ${
                  m.role === "user" ? "text-emerald-900" : "text-[#111827]"
                }`}
              >
                <div className="flex items-start gap-1.5 w-full">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                      m.role === "user"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-[#E6F6F7] text-[#087F8C] border border-[#087F8C]/30"
                    }`}
                  >
                    {m.role === "user" ? "You" : "AI"}
                  </span>
                  <p className="line-clamp-2 text-[11px] leading-snug flex-1">{m.text}</p>
                </div>
                {m.citations && m.citations.length > 0 && (
                  <span className="text-[9px] text-teal-700 bg-teal-50 border border-teal-200/80 rounded px-1.5 py-0.2 ml-7">
                    Grounded in: {m.citations[0]?.sourceName}
                  </span>
                )}
                {m.escalated && (
                  <span className="text-[9px] text-amber-800 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.2 ml-7 font-semibold">
                    Escalated to human supervisor
                  </span>
                )}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          <form
            onSubmit={handleSendText}
            className="mt-1 flex items-center gap-1.5 pt-1.5 border-t border-[#E4E7EC]"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Can't speak? Type message..."
              disabled={connectionState === "processing"}
              className="flex-1 min-w-0 bg-[#FAF9F6] border border-[#E4E7EC] rounded-lg px-2.5 py-1 text-[11px] text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#087F8C] transition-colors"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || connectionState === "processing"}
              title="Send message"
              className="h-6 w-6 shrink-0 rounded-lg bg-[#087F8C] hover:bg-[#076C77] disabled:opacity-30 disabled:hover:bg-[#087F8C] text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <Send className="h-3 w-3" />
            </button>
          </form>
        </div>
      )}

      {/* Quick Topic Chips */}
      <div className="py-1 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => sendPrompt("Check my policy details")}
          className="text-[10px] whitespace-nowrap bg-white hover:bg-[#E6F6F7] border border-[#E4E7EC] hover:border-[#087F8C]/40 text-[#344054] hover:text-[#087F8C] px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          📋 Policy Status
        </button>
        <button
          onClick={() => sendPrompt("What is the status of my claim?")}
          className="text-[10px] whitespace-nowrap bg-white hover:bg-[#E6F6F7] border border-[#E4E7EC] hover:border-[#087F8C]/40 text-[#344054] hover:text-[#087F8C] px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          🛡️ Claim Update
        </button>
        <button
          onClick={() => sendPrompt("I want to update my policy nominee")}
          className="text-[10px] whitespace-nowrap bg-white hover:bg-[#E6F6F7] border border-[#E4E7EC] hover:border-[#087F8C]/40 text-[#344054] hover:text-[#087F8C] px-2.5 py-1 rounded-full transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          👤 Change Nominee
        </button>
      </div>

      {/* 4. In-Call Keypad / Controls (Light Theme) */}
      <div className="pt-2 pb-1 grid grid-cols-3 gap-y-3.5 gap-x-4 place-items-center">
        {/* Mute */}
        <button
          onClick={toggleMute}
          className="flex flex-col items-center gap-1 group active:scale-95 transition-transform cursor-pointer"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              isMuted
                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 scale-105"
                : "bg-white border border-[#E4E7EC] text-[#344054] hover:bg-[#FAF9F6] shadow-2xs"
            }`}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </div>
          <span className="text-[10px] font-medium text-[#344054]">
            {isMuted ? "Unmute" : "Mute"}
          </span>
        </button>

        {/* Keypad */}
        <button
          onClick={() => {
            PhoneAudioFX.playBeep(520);
            setShowKeypad(!showKeypad);
          }}
          className="flex flex-col items-center gap-1 group active:scale-95 transition-transform cursor-pointer"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              showKeypad
                ? "bg-[#087F8C] text-white shadow-md shadow-[#087F8C]/30"
                : "bg-white border border-[#E4E7EC] text-[#344054] hover:bg-[#FAF9F6] shadow-2xs"
            }`}
          >
            <Grid className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium text-[#344054]">Keypad</span>
        </button>

        {/* Speaker */}
        <button
          onClick={toggleSpeaker}
          className="flex flex-col items-center gap-1 group active:scale-95 transition-transform cursor-pointer"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              isSpeakerMuted
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-white border border-[#E4E7EC] text-[#344054] hover:bg-[#FAF9F6] shadow-2xs"
            }`}
          >
            {isSpeakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </div>
          <span className="text-[10px] font-medium text-[#344054]">
            {isSpeakerMuted ? "Speaker Off" : "Speaker"}
          </span>
        </button>

        {/* Captions Toggle */}
        <button
          onClick={() => {
            PhoneAudioFX.playBeep(600);
            setShowTranscript(!showTranscript);
          }}
          className="flex flex-col items-center gap-1 group active:scale-95 transition-transform cursor-pointer"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              showTranscript
                ? "bg-[#E6F6F7] border border-[#087F8C]/50 text-[#087F8C]"
                : "bg-white border border-[#E4E7EC] text-[#667085] hover:bg-[#FAF9F6] shadow-2xs"
            }`}
          >
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium text-[#344054]">
            {showTranscript ? "Captions" : "Show Text"}
          </span>
        </button>

        {/* Details */}
        <button
          onClick={() => {
            PhoneAudioFX.playBeep(450);
            setShowDetails(!showDetails);
          }}
          className="flex flex-col items-center gap-1 group active:scale-95 transition-transform cursor-pointer"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              showDetails
                ? "bg-[#087F8C] text-white shadow-md shadow-[#087F8C]/30"
                : "bg-white border border-[#E4E7EC] text-[#344054] hover:bg-[#FAF9F6] shadow-2xs"
            }`}
          >
            <UserCheck className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium text-[#344054]">Details</span>
        </button>

        {/* Verified Safe */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold text-emerald-700">Verified Safe</span>
        </div>
      </div>

      {/* 5. End Call Button */}
      <div className="pt-2 flex flex-col items-center">
        <button
          onClick={() => {
            onEnd({
              duration,
              turns: messages.filter((m) => m.role === "user").length,
            });
          }}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 active:scale-95 transition-all cursor-pointer"
        >
          <PhoneOff className="h-6 w-6 relative z-10 transition-transform group-hover:rotate-12" />
        </button>
        <span className="text-[10px] font-medium text-[#667085] mt-1">End Call</span>
      </div>

      {/* Full Transcript Modal */}
      {isTranscriptExpanded && (
        <div className="absolute inset-x-2 inset-y-12 z-50 rounded-3xl border border-[#E4E7EC] bg-white/98 backdrop-blur-2xl p-4 shadow-2xl flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC]">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#087F8C]" />
              <span className="text-xs font-bold text-[#111827]">Full Call Transcript</span>
            </div>
            <button
              onClick={() => setIsTranscriptExpanded(false)}
              className="p-1 rounded-full text-[#667085] hover:text-[#111827] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs select-text">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-2xs ${
                    m.role === "user"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-br-none"
                      : "bg-[#E6F6F7] border border-[#087F8C]/30 text-[#111827] rounded-bl-none"
                  }`}
                >
                  <div className="text-[9px] font-bold text-[#667085] mb-0.5 uppercase tracking-wider">
                    {m.role === "user" ? "You" : "InsurCall AI"}
                  </div>
                  <div>{m.text}</div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-1.5 pt-1 border-t border-[#087F8C]/20 flex flex-wrap gap-1">
                      {m.citations.map((c, ci) => (
                        <span
                          key={ci}
                          className="inline-flex items-center text-[9px] font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5"
                        >
                          Source: {c.sourceName} ({(c.similarity * 100).toFixed(0)}%)
                        </span>
                      ))}
                    </div>
                  )}
                  {m.escalated && (
                    <div className="mt-1 text-[9px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5">
                      Escalated to Human Review
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-[#667085] px-1 mt-0.5">{m.time}</span>
              </div>
            ))}
            <div ref={fullTranscriptEndRef} />
          </div>

          <form
            onSubmit={handleSendText}
            className="flex items-center gap-2 mb-3 pt-2 border-t border-[#E4E7EC]"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Can't use microphone? Type here..."
              disabled={connectionState === "processing"}
              className="flex-1 bg-[#FAF9F6] border border-[#E4E7EC] rounded-xl px-3 py-2 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#087F8C] transition-colors"
            />
            <Button
              type="submit"
              disabled={!textInput.trim() || connectionState === "processing"}
              size="sm"
              className="bg-[#087F8C] hover:bg-[#076C77] text-white rounded-xl px-3 h-8 shadow-xs cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Send
            </Button>
          </form>

          <Button
            onClick={() => setIsTranscriptExpanded(false)}
            variant="outline"
            className="w-full rounded-xl border-[#E4E7EC] text-xs text-[#344054] cursor-pointer"
          >
            Close Transcript
          </Button>
        </div>
      )}

      {/* Keypad Drawer */}
      {showKeypad && (
        <div className="absolute inset-x-3 bottom-24 z-40 rounded-3xl border border-[#E4E7EC] bg-white/98 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC]">
            <span className="text-xs font-bold text-[#111827]">Tap to Ask Topic</span>
            <button
              onClick={() => setShowKeypad(false)}
              className="text-xs text-[#667085] hover:text-[#111827] cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-3">
            {[
              { label: "Policy Coverage", query: "What does my policy cover?" },
              { label: "Check Claims", query: "What is the status of my claim?" },
              { label: "Cashless Network", query: "Which hospitals are cashless?" },
              { label: "Change Nominee", query: "I want to change my nominee." },
              { label: "Renewal Due Date", query: "When is my renewal date?" },
              { label: "Download Certificate", query: "Can you email my policy document?" },
            ].map((item, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowKeypad(false);
                  sendPrompt(item.query);
                }}
                className="justify-start text-xs border-[#E4E7EC] bg-[#FAF9F6] hover:bg-[#E6F6F7] hover:border-[#087F8C]/40 text-[#344054] cursor-pointer"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Profile Details Drawer */}
      {showDetails && (
        <div className="absolute inset-x-3 bottom-24 z-40 rounded-3xl border border-[#E4E7EC] bg-white/98 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EC]">
            <span className="text-xs font-bold text-[#111827]">Caller Details</span>
            <button
              onClick={() => setShowDetails(false)}
              className="text-xs text-[#667085] hover:text-[#111827] cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 pt-3 text-xs">
            <div className="flex justify-between py-1 border-b border-[#E4E7EC]/70">
              <span className="text-[#667085]">Caller Name</span>
              <span className="text-[#111827] font-semibold">{customerName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E4E7EC]/70">
              <span className="text-[#667085]">Policyholder ID</span>
              <span className="text-[#087F8C] font-mono font-semibold">
                {customerNumber || "GUEST"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E4E7EC]/70">
              <span className="text-[#667085]">Audio Line</span>
              <span className="text-emerald-700 font-medium">Clear Audio</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E4E7EC]/70">
              <span className="text-[#667085]">Security</span>
              <span className="text-emerald-700 font-medium">Private & Encrypted</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   3. CALL ENDED SUMMARY SCREEN (THEME ALIGNED)
   ========================================================================= */
function CallEndedScreen({
  stats,
  onCallAgain,
  onDismiss,
}: {
  stats: { duration: number; turns: number };
  onCallAgain: () => void;
  onDismiss: () => void;
}) {
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 pt-12 pb-7 text-center bg-gradient-to-b from-[#F2F8F8] via-[#FAF9F6] to-[#FAF9F6] text-[#111827]">
      <div className="flex items-center justify-center text-xs text-[#667085] font-medium">
        <span>Call Completed</span>
      </div>

      <div className="my-auto space-y-4">
        <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-white border border-[#E4E7EC] shadow-md">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#111827] tracking-tight">Call Summary</h2>
          <p className="text-xs text-[#667085] pt-0.5">Thank you for speaking with InsurCall.</p>
        </div>

        <div className="rounded-2xl border border-[#E4E7EC] bg-white p-4 space-y-2 text-xs shadow-xs">
          <div className="flex justify-between py-1 border-b border-[#E4E7EC]">
            <span className="text-[#667085]">Call Duration</span>
            <span className="text-[#111827] font-mono font-bold">
              {formatTimer(stats.duration)}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E4E7EC]">
            <span className="text-[#667085]">Turns Exchanged</span>
            <span className="text-[#111827] font-medium">{stats.turns} conversational turns</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#667085]">Call Log</span>
            <span className="text-emerald-700 font-semibold">Saved to Call Records</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <Button
          onClick={onCallAgain}
          className="w-full h-12 rounded-2xl bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold text-sm shadow-md shadow-[#087F8C]/20 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Call Again
        </Button>
        <Button
          onClick={onDismiss}
          variant="outline"
          className="w-full h-12 rounded-2xl border-[#E4E7EC] bg-white text-[#344054] text-xs hover:bg-[#FAF9F6] cursor-pointer"
        >
          Return to Phone
        </Button>
      </div>
    </div>
  );
}
