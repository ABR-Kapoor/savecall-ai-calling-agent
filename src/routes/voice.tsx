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
  Clock,
  X,
  RotateCcw,
  CheckCircle2,
  Send,
  AlertTriangle,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VOICE_CATALOG, getVoiceById, getDefaultVoice } from "@/lib/voice/catalog";

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

type TranscriptMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  time: string;
  citations?: Array<{ sourceName: string; pageNumber?: number; similarity?: number }>;
  escalated?: boolean;
  provider?: string;
  model?: string;
  modelType?: string;
};

/* =========================================================================
   SPEECH SYNTHESIS ENGINE (WITH GC RETENTION & WATCHDOG SAFETY)
   ========================================================================= */
class PhoneAudioFX {
  private static ctx: AudioContext | null = null;
  private static ringInterval: ReturnType<typeof setInterval> | null = null;
  private static currentSource: AudioBufferSourceNode | null = null;

  public static getContext(): AudioContext | null {
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

  static stopNeuralAudio() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }
  }

  static async playNeuralAudio(
    audioUrl: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    try {
      this.stopNeuralAudio();
      const ctx = this.getContext();
      if (!ctx) throw new Error("AudioContext not supported");
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }

      const res = await fetch(audioUrl);
      if (!res.ok) {
        throw new Error(`TTS audio download failed with HTTP ${res.status}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      this.currentSource = source;

      if (onStart) onStart();

      source.onended = () => {
        if (this.currentSource === source) {
          this.currentSource = null;
        }
        if (onEnd) onEnd();
      };

      source.start(0);
    } catch (err) {
      console.warn("[Neural Audio Engine Notice]:", err);
      if (onEnd) onEnd();
    }
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

  static speakText(text: string, onEnd?: () => void) {
    if (typeof window === "undefined") {
      if (onEnd) onEnd();
      return;
    }
    const clean = text.replace(/[*_#`~>]/g, "").replace(/\n+/g, " ").trim();
    if (!clean) {
      if (onEnd) onEnd();
      return;
    }

    const isHindi = /[\u0900-\u097F]|namaste|kya|hai|mera|kaise/i.test(text);
    const langCode = isHindi ? "hi" : "en-IN";
    const voiceId = isHindi ? "ai4bharat-hi-female" : "ai4bharat-hinglish-female";
    const audioUrl = `/api/voice/tts?text=${encodeURIComponent(clean)}&language=${langCode}&gender=female&voiceId=${voiceId}&speed=1.0`;

    void this.playNeuralAudio(audioUrl, undefined, onEnd);
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
    ragAvailable: boolean;
    isGeneralModel?: boolean;
    cloudAI?: { activeProvider?: string };
    agentName?: string;
    tenantName?: string;
    customer: { name: string; customerNumber: string | null; isVerified?: boolean };
    micStream?: MediaStream | null | undefined;
    skipMic: boolean;
  } | null>(null);

  const startVoiceCall = useCallback(
    async (skipMic = false) => {
      setError(null);
      setCallEndedStats(null);

      // Pre-unlock HTML5 audio context on user gesture
      if (typeof window !== "undefined") {
        try {
          const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
          silentAudio.play().catch(() => {});
        } catch {}
      }

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
        let res: Response;
        try {
          const sessionAbort = new AbortController();
          const sessionTimeout = setTimeout(() => sessionAbort.abort(), 25000);

          res = await fetch("/api/voice/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clerkUserId: user?.id,
              publicDemo: !user?.id,
            }),
            signal: sessionAbort.signal,
          });

          clearTimeout(sessionTimeout);
        } catch (fetchErr: any) {
          console.warn("Initial session fetch paused, retrying...", fetchErr?.message);
          await new Promise((r) => setTimeout(r, 1200));
          const retryAbort = new AbortController();
          const retryTimeout = setTimeout(() => retryAbort.abort(), 25000);

          res = await fetch("/api/voice/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clerkUserId: user?.id,
              publicDemo: !user?.id,
            }),
            signal: retryAbort.signal,
          });

          clearTimeout(retryTimeout);
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to initialize session (${res.status})`);
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Always prioritize the official LiveKit Cloud WebSocket URL from server or env
        const resolvedLivekitUrl = data.livekitUrl;
        if (!resolvedLivekitUrl?.startsWith("wss://")) {
          throw new Error("The server did not return a configured LiveKit Cloud URL.");
        }

        setSession({
          token: data.token,
          livekitUrl: resolvedLivekitUrl,
          roomName: data.roomName,
          callSessionId: data.callSessionId,
          ragAvailable: data.ragAvailable === true,
          isGeneralModel: data.isGeneralModel === true,
          cloudAI: data.cloudAI,
          agentName: data.agentName,
          tenantName: data.tenantName,
          customer: data.customer,
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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#FAF9F6] p-3 sm:p-6 text-[#111827] antialiased overflow-y-auto selection:bg-[#087F8C]/20">
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
      <div className="w-full max-w-[380px] h-[760px] max-h-[92vh] mx-auto relative z-20 flex flex-col rounded-[46px] border-[5px] border-[#CBD5E1] bg-white shadow-[0_24px_60px_-10px_rgba(8,127,140,0.2)] ring-1 ring-slate-200 overflow-hidden text-[#111827] shrink-0">
        {/* Phone Dynamic Island Top Notch */}
        <div className="absolute top-2.5 inset-x-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="flex items-center justify-between w-28 h-6 bg-black rounded-full px-2.5 shadow-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <span className="h-1 w-1 rounded-full bg-[#10A6AE]" />
            </span>
            <span className="h-1 w-6 rounded-full bg-slate-800" />
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
              // Only fail if we haven't connected yet
              if (connectionState === "connecting") {
                setConnectionState("connection_failed");
                setError(
                  "Connection notice: " + (err?.message || "Please check your network and try again.")
                );
              }
            }}
            onDisconnected={() => {
              // Only mark disconnected if we didn't intentionally end
              if (connectionState !== "ended") {
                setConnectionState("disconnected");
              }
            }}
            options={{
              disconnectOnPageLeave: true,
              adaptiveStream: true,
              dynacast: true,
            }}
            className="w-full h-full flex flex-col"
          >
            <RoomAudioRenderer />
            <ActivePhoneCallScreen
              connectionState={connectionState}
              setConnectionState={setConnectionState}
              customerName={session.customer.name}
              customerNumber={session.tenantName ? session.customer.customerNumber : null}
              agentName={session.tenantName ? (session.agentName || "InsurCall Agent") : "InsurCall Agent"}
              tenantName={session.tenantName || ""}
              ragAvailable={session.ragAvailable}
              callSessionId={session.callSessionId}
              micStream={session.micStream}
              onEnd={handleEndCall}
            />
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
        <span className="text-[10px] font-medium text-[#667085]">Cloud voice simulator</span>
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

        <div className="space-y-1.5 flex flex-col items-center text-center">
          <h1 className="text-xl font-bold font-display text-[#111827] tracking-tight">
            Insur<span className="text-[#087F8C]">Call</span>
          </h1>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF5F0] px-3 py-1 text-[11px] font-semibold text-[#186F4D]">
            <ShieldCheck className="size-3 text-[#2E8B4E]" /> Encrypted voice line
          </div>
          <h2 className="text-xs font-bold text-[#087F8C] tracking-wide">
            Insurance support assistant
          </h2>
          <p className="text-[11px] text-[#667085] max-w-[300px] mx-auto pt-0.5 leading-relaxed">
            Policy-specific answers depend on approved organisation information. Use text if voice is unavailable.
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
              Cloud voice assistant
            </div>
            <div className="space-y-1.5 text-[11px] text-[#344054]">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Approved organisation knowledge is used when connected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Policy-specific answers require matching approved evidence</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#087F8C]" />
                <span>Account actions use existing verification and review workflows</span>
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
            ? "Connecting to Voice Line..."
            : connectionState === "permission_denied"
            ? "No microphone required • Listen & Type enabled"
            : "Autonomous Voice Network · Real-time conversation"}
        </p>
        <p className="max-w-[310px] text-[9px] leading-relaxed text-[#7B8790]">
          Your voice audio is securely processed in real time. Avoid sharing personal passwords or payment details.
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
  customerName,
  customerNumber,
  agentName,
  tenantName,
  ragAvailable,
  callSessionId,
  micStream,
  onEnd,
}: {
  connectionState: VoiceConnectionState;
  setConnectionState: React.Dispatch<React.SetStateAction<VoiceConnectionState>>;
  customerName: string;
  customerNumber?: string | null;
  agentName?: string;
  tenantName?: string;
  ragAvailable: boolean;
  callSessionId: string;
  micStream?: MediaStream | null | undefined;
  onEnd: (stats?: { duration: number; turns: number }) => void;
}) {
  const room = useRoomContext();
  const roomConnectionState = useConnectionState();
  let agentState: string = "connecting";
  try {
    const va = useVoiceAssistant();
    agentState = va.state;
  } catch {
    // VoiceAssistant not available yet — agent hasn't joined
  }

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState(0);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("ai4bharat-hi-female");
  const selectedVoiceIdRef = useRef(selectedVoiceId);
  useEffect(() => {
    selectedVoiceIdRef.current = selectedVoiceId;
  }, [selectedVoiceId]);

  // Full-Duplex real-time state: two concurrent, decoupled pipelines
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const agentSpeakingRef = useRef(false);
  const agentSpeechStartTimeRef = useRef(0);

  const [messages, setMessages] = useState<TranscriptMessage[]>([]);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const fullTranscriptEndRef = useRef<HTMLDivElement>(null);
  const pendingCitationsRef = useRef<TranscriptMessage["citations"]>([]);
  const recognitionRef = useRef<any>(null);
  const speechDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpokenGreetingRef = useRef(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Pipeline 2: Speech Output (Mouth) — asynchronous, non-blocking, interruptible
  const speakAssistantText = useCallback(
    (text: string, voiceOverride?: string) => {
      if (typeof window === "undefined" || isSpeakerMuted) {
        setIsAgentSpeaking(false);
        agentSpeakingRef.current = false;
        return;
      }

      // Stop any prior playback immediately
      PhoneAudioFX.stopNeuralAudio();
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current.src = "";
          activeAudioRef.current = null;
        } catch {}
      }

      // Silence any rogue browser speech
      if ("speechSynthesis" in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }

      const clean = text.replace(/[*_#`~>]/g, "").replace(/\n+/g, " ").trim();
      if (!clean) {
        agentSpeakingRef.current = false;
        setIsAgentSpeaking(false);
        return;
      }

      const currentVoiceId = voiceOverride || selectedVoiceIdRef.current || "ai4bharat-hi-female";
      const activeVoice = getVoiceById(currentVoiceId) || getDefaultVoice();
      const langCode = activeVoice.languageCode;
      const voiceId = activeVoice.id;
      const voiceGender = activeVoice.gender;

      const audioUrl = `/api/voice/tts?text=${encodeURIComponent(clean)}&language=${langCode}&gender=${voiceGender}&voiceId=${voiceId}&speed=1.0`;

      void PhoneAudioFX.playNeuralAudio(
        audioUrl,
        () => {
          agentSpeakingRef.current = true;
          agentSpeechStartTimeRef.current = Date.now();
          setIsAgentSpeaking(true);
        },
        () => {
          agentSpeakingRef.current = false;
          setIsAgentSpeaking(false);
        }
      );
    },
    [isSpeakerMuted]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (roomConnectionState === "connected" && !hasSpokenGreetingRef.current) {
      hasSpokenGreetingRef.current = true;
      setConnectionState("connected");
      // If LiveKit remote agent is in the room, it handles its own greeting over WebRTC
      const remoteCount = room?.remoteParticipants?.size || 0;
      if (remoteCount > 0) {
        return;
      }
      const initialGreeting = tenantName
        ? `Namaste! Welcome to ${tenantName}. I am your AI insurance concierge. How may I assist you with your policy or claims today?`
        : `Namaste! Welcome to InsurCall. I am your AI insurance concierge. How may I assist you with your policy or claims today?`;
      setMessages([
        {
          id: `greeting-${Date.now()}`,
          role: "agent",
          text: initialGreeting,
          time: "00:00",
        },
      ]);
      speakAssistantText(initialGreeting);
    }
  }, [roomConnectionState, agentName, tenantName, speakAssistantText, room, setConnectionState]);

  // Cleanup all audio/speech resources on unmount
  useEffect(() => {
    return () => {
      agentSpeakingRef.current = false;
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current.src = "";
          activeAudioRef.current = null;
        } catch {}
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      if (speechDebounceRef.current) {
        clearTimeout(speechDebounceRef.current);
        speechDebounceRef.current = null;
      }
      if (speakCooldownRef.current) {
        clearTimeout(speakCooldownRef.current);
        speakCooldownRef.current = null;
      }
    };
  }, []);

  // Sync LiveKit agent state with full-duplex voice activity flags
  useEffect(() => {
    if (agentSpeakingRef.current) return; // Our local TTS is active, don't override
    if (agentState === "speaking") {
      setIsAgentSpeaking(true);
      setIsThinking(false);
    } else if (agentState === "thinking") {
      setIsThinking(true);
      setIsAgentSpeaking(false);
    } else if (agentState === "listening") {
      setIsAgentSpeaking(false);
      setIsThinking(false);
    }
  }, [agentState]);

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
        if (data.type === "sources" && Array.isArray(data.citations)) {
          pendingCitationsRef.current = data.citations.filter(
            (citation: { sourceName?: unknown }) =>
              typeof citation?.sourceName === "string" && citation.sourceName.trim().length > 0,
          );
          return;
        }
        if (data.type === "transcript" && data.text) {
          const role = data.role === "user" ? "user" : "agent";
          setMessages((prev) => {
            if (prev.length > 0 && prev[prev.length - 1]?.text === data.text) {
              return prev;
            }
            return [
              ...prev,
              {
                id: `${Date.now()}-${Math.random()}`,
                role,
                text: data.text,
                time: formatTimer(duration),
                ...(role === "agent" && pendingCitationsRef.current?.length
                  ? { citations: pendingCitationsRef.current }
                  : {}),
              },
            ];
          });
          if (role === "agent") pendingCitationsRef.current = [];
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
    if (room?.localParticipant && isMuted) {
      room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
    }
  }, [room, isMuted]);

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

  const sendPrompt = useCallback(
    async (promptText: string) => {
      setSendError(null);
      setIsThinking(true);
      PhoneAudioFX.playBeep(587);
      PhoneAudioFX.stopNeuralAudio();
      setIsAgentSpeaking(false);
      agentSpeakingRef.current = false;

      // Stop any current audio playback immediately on user input
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current.src = "";
          activeAudioRef.current = null;
        } catch {}
      }

      // 1. If LiveKit WebRTC agent is connected in the room, send via WebRTC DataChannel!
      const remoteCount = room?.remoteParticipants?.size || 0;
      if (remoteCount > 0 && room?.localParticipant) {
        try {
          const packet = new TextEncoder().encode(JSON.stringify({ type: "user_query", text: promptText }));
          await room.localParticipant.publishData(packet, { reliable: true });
          setMessages((previous) => [
            ...previous,
            { id: `${Date.now()}-${Math.random()}`, role: "user", text: promptText, time: formatTimer(duration) },
          ]);
          setIsThinking(false);
          return true;
        } catch (err) {
          console.warn("LiveKit data publish notice:", err);
        }
      }

      // 2. Cloud inference fallback
      try {
        const history = messages.slice(-8).map((m) => ({
          role: m.role === "agent" ? "assistant" : "user",
          content: m.text,
        }));

        const response = await fetch("/api/voice/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: promptText, callSessionId, history }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "The cloud assistant could not answer. Please retry.");
        const reply = typeof data.reply === "string" ? data.reply.trim() : "";
        if (!reply) throw new Error("The cloud assistant returned an empty response. Please retry.");
        const citations = Array.isArray(data.citations)
          ? data.citations.filter((item: unknown) =>
              !!item && typeof item === "object" &&
              typeof (item as { sourceName?: unknown }).sourceName === "string" &&
              Boolean((item as { sourceName: string }).sourceName.trim())
            )
          : [];
        setMessages((previous) => [
          ...previous,
          { id: `${Date.now()}-${Math.random()}`, role: "user", text: promptText, time: formatTimer(duration) },
          {
            id: `${Date.now()}-assistant`, role: "agent", text: reply, time: formatTimer(duration), citations,
            ...(data.provider === "groq" || data.provider === "gemini" ? { provider: data.provider } : {}),
            ...(typeof data.model === "string" ? { model: data.model } : {}),
            ...(typeof data.modelType === "string" ? { modelType: data.modelType } : {}),
          },
        ]);
        setIsThinking(false);
        speakAssistantText(reply);
        return true;
      } catch (err: any) {
        console.warn("Cloud text prompt notice:", err);
        setSendError(err?.message || "The cloud voice assistant is unavailable. Please retry.");
        setIsThinking(false);
        return false;
      }
    },
    [duration, callSessionId, speakAssistantText, room, messages]
  );

  // Pipeline 1: Always-On Continuous Ear Pipeline with Full-Duplex Instant Barge-In
  useEffect(() => {
    // If LiveKit remote agent is in the room, it handles server-side WebRTC audio
    const remoteCount = room?.remoteParticipants?.size || 0;
    if (remoteCount > 0) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      return;
    }

    if (connectionState === "ended" || isMuted) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      setIsUserSpeaking(false);
      return;
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    let isDisposed = false;
    let recognitionInstance: any = null;

    const startRecognitionPipeline = () => {
      if (isDisposed || isMuted || connectionState === "ended") return;
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN";
        recognition.maxAlternatives = 1;

        recognition.onspeechstart = () => {
          setIsUserSpeaking(true);
          // FULL-DUPLEX BARGE-IN: If the agent is speaking and user speaks, silence agent immediately!
          if (agentSpeakingRef.current && Date.now() - agentSpeechStartTimeRef.current > 350) {
            PhoneAudioFX.stopNeuralAudio();
            agentSpeakingRef.current = false;
            setIsAgentSpeaking(false);
          }
        };

        recognition.onspeechend = () => {
          setIsUserSpeaking(false);
        };

        recognition.onresult = (event: any) => {
          // Interrupt agent immediately if user started speaking words
          if (agentSpeakingRef.current) {
            PhoneAudioFX.stopNeuralAudio();
            agentSpeakingRef.current = false;
            setIsAgentSpeaking(false);
          }

          let finalChunk = "";
          let interimChunk = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i]?.[0]?.transcript || "";
            if (event.results[i]?.isFinal) {
              finalChunk += transcript;
            } else {
              interimChunk += transcript;
            }
          }

          if (interimChunk.trim()) {
            setIsUserSpeaking(true);
          }

          if (finalChunk.trim()) {
            setIsUserSpeaking(false);
            if (speechDebounceRef.current) clearTimeout(speechDebounceRef.current);
            speechDebounceRef.current = setTimeout(() => {
              void sendPrompt(finalChunk.trim());
            }, 450);
          }
        };

        recognition.onerror = (e: any) => {
          if (e.error !== "no-speech" && e.error !== "aborted") {
            console.warn("Speech recognition notice:", e.error);
          }
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            setIsUserSpeaking(false);
          }
        };

        recognition.onend = () => {
          setIsUserSpeaking(false);
          // Continuous loop: Keep listening uninterrupted while call is active
          if (!isDisposed && !isMuted && connectionState !== "ended") {
            setTimeout(() => {
              if (!isDisposed && !isMuted && connectionState !== "ended") {
                startRecognitionPipeline();
              }
            }, 100);
          }
        };

        recognition.start();
        recognitionInstance = recognition;
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn("Speech recognition start notice:", err);
      }
    };

    startRecognitionPipeline();

    return () => {
      isDisposed = true;
      if (recognitionInstance) {
        try { recognitionInstance.stop(); } catch {}
      }
      recognitionRef.current = null;
    };
  }, [connectionState, isMuted, sendPrompt, room]);

  const handleSendText = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = textInput.trim();
      if (!trimmed || isThinking) return;
      void sendPrompt(trimmed).then((sent) => {
        if (sent) setTextInput("");
      });
    },
    [textInput, isThinking, sendPrompt]
  );

  const isSpeaking = isAgentSpeaking;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 pt-11 pb-5 relative overflow-hidden bg-gradient-to-b from-[#F2F8F8] via-[#FAF9F6] to-[#FAF9F6] text-[#111827]">
      {/* 1. Minimal In-Call Header */}
      <div className="flex items-center justify-between text-xs pt-2 pb-1 px-2 z-10 shrink-0">
        <div className="flex items-center gap-1.5 font-mono text-[#087F8C] font-semibold text-[11px]">
          <span className="relative flex h-2 w-2 mr-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>{formatTimer(duration)}</span>
          <span className="text-slate-400 font-normal ml-0.5">• Duplex Line</span>
        </div>

        {/* Minimalist Voice Persona Selector */}
        <div className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-full px-2.5 py-0.5 transition-all">
          <Volume2 className="w-3 h-3 text-[#087F8C] shrink-0" />
          <select
            value={selectedVoiceId}
            onChange={(e) => {
              const newId = e.target.value;
              setSelectedVoiceId(newId);
              selectedVoiceIdRef.current = newId;
              const v = getVoiceById(newId) || getDefaultVoice();
              speakAssistantText(v.sampleText, newId);
            }}
            className="bg-transparent text-[10px] font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            {VOICE_CATALOG.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Minimal Center Emblem & Identity */}
      <div className="flex flex-col items-center justify-center text-center my-auto px-4 space-y-2 shrink-0">
        <div className="relative flex items-center justify-center my-1">
          {isSpeaking && (
            <>
              <div className="absolute h-28 w-28 rounded-full border border-[#087F8C]/30 animate-ping duration-1000" />
              <div className="absolute h-24 w-24 rounded-full border-2 border-[#10A6AE]/40 animate-pulse" />
            </>
          )}

          <div
            className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 p-3.5 ${
              isSpeaking
                ? "bg-white border-2 border-[#087F8C] shadow-[0_0_30px_rgba(8,127,140,0.3)] scale-105"
                : "bg-white border border-slate-200 shadow-xs"
            }`}
          >
            <img
              src="/01_logo_only_transparent.png"
              alt="InsurCall Emblem"
              className={`h-full w-full object-contain transition-transform ${
                isSpeaking ? "scale-110" : "opacity-95"
              }`}
            />
          </div>
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            {tenantName ? (agentName || "InsurCall Concierge") : "InsurCall AI Concierge"}
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            24/7 Policy & Claims Voice Desk
          </p>
        </div>

        {/* Full-Duplex Real-Time Voice Activity Status */}
        <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full px-2.5 py-0.5 shadow-2xs">
          <span
            className={`text-[10px] font-semibold ${
              isUserSpeaking
                ? "text-emerald-700"
                : isAgentSpeaking
                ? "text-[#087F8C]"
                : isThinking
                ? "text-amber-700"
                : "text-slate-600"
            }`}
          >
            {isUserSpeaking
              ? "You speaking..."
              : isAgentSpeaking
              ? "Agent speaking..."
              : isThinking
              ? "Thinking..."
              : "Live Line • Listening..."}
          </span>
          <div className="flex items-center gap-0.5 h-3">
            {[0.7, 1.2, 0.9, 1.3, 0.8].map((mult, i) => {
              const height = isAgentSpeaking
                ? i % 2 === 0
                  ? "11px"
                  : "15px"
                : isUserSpeaking || micVolume > 10
                ? `${Math.max(4, Math.min(14, 4 + Math.round((micVolume / 100) * 11 * mult)))}px`
                : "3px";
              return (
                <span
                  key={i}
                  style={{ height }}
                  className={`w-0.5 rounded-full transition-all duration-100 ${
                    isAgentSpeaking
                      ? "bg-[#087F8C] animate-pulse"
                      : isUserSpeaking || micVolume > 10
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-slate-300"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Floating Live Captions Bubble (Zero Overflow, No Horizontal Scrollbars) */}
      {showTranscript && (
        <div className="mx-2 my-1 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs p-2.5 transition-all flex flex-col justify-between max-h-32 shrink-0">
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Live Captions</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  PhoneAudioFX.playBeep(520);
                  setIsTranscriptExpanded(true);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-[#087F8C] transition-colors cursor-pointer"
                title="Expand full chatbox"
              >
                <Maximize2 className="h-2.5 w-2.5" />
                <span>Full</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTranscript(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Hide captions"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto space-y-1 text-[11px] leading-tight max-h-16 scrollbar-none pr-0.5">
            {messages.slice(-2).map((m) => (
              <div key={m.id} className={m.role === "user" ? "text-emerald-800" : "text-slate-900"}>
                <span className="font-bold text-[10px] mr-1">{m.role === "user" ? "You:" : "AI:"}</span>
                <span>{m.text}</span>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
          <form onSubmit={handleSendText} className="mt-1 flex items-center gap-1.5 pt-1 border-t border-slate-100">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type message..."
              disabled={isThinking}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#087F8C]"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isThinking}
              className="h-6 w-6 rounded-lg bg-[#087F8C] hover:bg-[#076C77] text-white flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer shrink-0"
            >
              <Send className="h-3 w-3" />
            </button>
          </form>
        </div>
      )}

      {/* 3.1 Quick Click-To-Fill Inquiry Chips (Clean Non-Scrollable Grid) */}
      <div className="grid grid-cols-3 gap-1.5 px-3 py-1 shrink-0 w-full">
        <button
          type="button"
          onClick={() => {
            PhoneAudioFX.playBeep(520);
            void sendPrompt("Check my policy details and coverage status").then((sent) => {
              if (sent) setTextInput("");
            });
          }}
          disabled={isThinking}
          className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-full border border-blue-200/90 bg-blue-50/70 hover:bg-blue-100/80 text-[10px] font-semibold text-blue-900 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
        >
          <span className="shrink-0 text-xs">📋</span>
          <span className="truncate">Policy Status</span>
        </button>
        <button
          type="button"
          onClick={() => {
            PhoneAudioFX.playBeep(520);
            void sendPrompt("What is the status of my claim?").then((sent) => {
              if (sent) setTextInput("");
            });
          }}
          disabled={isThinking}
          className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-full border border-amber-200/90 bg-amber-50/70 hover:bg-amber-100/80 text-[10px] font-semibold text-amber-900 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
        >
          <span className="shrink-0 text-xs">🛡️</span>
          <span className="truncate">Claim Update</span>
        </button>
        <button
          type="button"
          onClick={() => {
            PhoneAudioFX.playBeep(520);
            void sendPrompt("I want to update my policy nominee").then((sent) => {
              if (sent) setTextInput("");
            });
          }}
          disabled={isThinking}
          className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/70 hover:bg-emerald-100/80 text-[10px] font-semibold text-emerald-900 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
        >
          <span className="shrink-0 text-xs">👤</span>
          <span className="truncate">Change Nominee</span>
        </button>
      </div>

      {/* 4. Minimalist Dialer Controls (Clean 3x2 Grid with Prominent End Call) */}
      <div className="pb-4 pt-1 px-4 shrink-0">
        <div className="grid grid-cols-3 gap-y-3 gap-x-4 place-items-center">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
              isMuted ? "bg-amber-400 text-slate-900 shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}>
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </div>
            <span className="text-[10px] font-medium text-slate-600">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* Keypad */}
          <button
            onClick={() => { PhoneAudioFX.playBeep(520); setShowKeypad(!showKeypad); }}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
              showKeypad ? "bg-[#087F8C] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}>
              <Grid className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium text-slate-600">Keypad</span>
          </button>

          {/* Speaker */}
          <button
            onClick={toggleSpeaker}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
              isSpeakerMuted ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}>
              {isSpeakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </div>
            <span className="text-[10px] font-medium text-slate-600">Speaker</span>
          </button>

          {/* Captions */}
          <button
            onClick={() => { PhoneAudioFX.playBeep(600); setShowTranscript(!showTranscript); }}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
              showTranscript ? "bg-[#087F8C]/15 text-[#087F8C]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}>
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium text-slate-600">{showTranscript ? "Hide Text" : "Captions"}</span>
          </button>

          {/* End Call Button (Prominent Center) */}
          <button
            onClick={() => {
              PhoneAudioFX.stopNeuralAudio();
              onEnd({
                duration,
                turns: messages.filter((m) => m.role === "user").length,
              });
            }}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
            aria-label="End call"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30">
              <PhoneOff className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold text-red-600">End</span>
          </button>

          {/* Details */}
          <button
            onClick={() => { PhoneAudioFX.playBeep(450); setShowDetails(!showDetails); }}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
              showDetails ? "bg-[#087F8C] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}>
              <UserCheck className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium text-slate-600">Details</span>
          </button>
        </div>
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
                      {m.citations.map((c: { sourceName: string; similarity?: number }, ci: number) => (
                        <span
                          key={ci}
                          className="inline-flex items-center text-[9px] font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5"
                        >
                          Source: {c.sourceName}{typeof c.similarity === "number" ? ` (${(c.similarity * 100).toFixed(0)}%)` : ""}
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

          {sendError && <p role="alert" className="text-xs leading-relaxed text-rose-700">{sendError}</p>}

          {/* Quick Inquiry Chips */}
          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#E4E7EC] mb-2 w-full shrink-0">
            <button
              type="button"
              onClick={() => {
                PhoneAudioFX.playBeep(520);
                void sendPrompt("Check my policy details and coverage status").then((sent) => {
                  if (sent) setTextInput("");
                });
              }}
              disabled={isThinking}
              className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-full border border-blue-200/90 bg-blue-50/70 hover:bg-blue-100/80 text-[10px] font-semibold text-blue-900 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <span className="shrink-0 text-xs">📋</span>
              <span className="truncate">Policy Status</span>
            </button>
            <button
              type="button"
              onClick={() => {
                PhoneAudioFX.playBeep(520);
                void sendPrompt("What is the status of my claim?").then((sent) => {
                  if (sent) setTextInput("");
                });
              }}
              disabled={isThinking}
              className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-full border border-amber-200/90 bg-amber-50/70 hover:bg-amber-100/80 text-[10px] font-semibold text-amber-900 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <span className="shrink-0 text-xs">🛡️</span>
              <span className="truncate">Claim Update</span>
            </button>
            <button
              type="button"
              onClick={() => {
                PhoneAudioFX.playBeep(520);
                void sendPrompt("I want to update my policy nominee").then((sent) => {
                  if (sent) setTextInput("");
                });
              }}
              disabled={isThinking}
              className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/70 hover:bg-emerald-100 text-[10px] font-semibold text-emerald-900 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <span className="shrink-0 text-xs">👤</span>
              <span className="truncate">Change Nominee</span>
            </button>
          </div>

          <form
            onSubmit={handleSendText}
            className="flex items-center gap-2 mb-3 pt-1"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Can't use microphone? Type here..."
              disabled={isThinking}
              className="flex-1 bg-[#FAF9F6] border border-[#E4E7EC] rounded-xl px-3 py-2 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#087F8C] transition-colors"
            />
            <Button
              type="submit"
              disabled={!textInput.trim() || isThinking}
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
              <span className="text-[#667085]">Voice service</span>
              <span className="text-[#344054] font-medium">Autonomous Voice Line</span>
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
        <span>Session ended</span>
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
            <span className="text-[#667085]">Session record</span>
            <span className="text-emerald-700 font-semibold">Created</span>
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
