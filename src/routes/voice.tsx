import { createFileRoute, Link } from "@tanstack/react-router";
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
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  MessageSquare,
  Maximize2,
  Minimize2,
  Grid,
  UserCheck,
  Pause,
  Play,
  Wifi,
  Battery,
  Clock,
  Radio,
  X,
  RotateCcw,
  CheckCircle2,
  FileText,
  Send,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [{ title: "SaveCall — Phone Call UI" }],
  }),
  component: VoiceCallPage,
});

/* =========================================================================
   VOICE CONNECTION STATE MACHINE
   idle -> requesting_microphone -> connecting -> connected -> listening -> processing -> speaking -> listening
   Error / Recovery states: permission_denied, connection_failed, reconnecting, disconnected, ended
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
    activeUtterance = utterance; // Prevent garbage collection bug in Chrome

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

    // Watchdog timer: If browser speech synthesis gets stuck, auto-release after expected duration + buffer
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
}

// Realistic Web Audio API Sound Synthesizer for Phone Calls
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
    greeting?: string;
    agentConfig?: any;
    customer: { id: string | null; name: string; customerNumber: string | null; tenantId?: string; isVerified?: boolean };
    micStream?: MediaStream | null | undefined;
  } | null>(null);

  const startVoiceCall = useCallback(async () => {
    setError(null);
    setCallEndedStats(null);
    setConnectionState("requesting_microphone");

    // 1. Explicitly prompt and acquire user microphone first
    let mediaStream: MediaStream | null = null;
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
          "Microphone permission was denied. Please allow microphone access in your browser to speak with SaveCall AI."
        );
      } else if (micErr.name === "NotFoundError" || micErr.name === "DevicesNotFoundError") {
        setConnectionState("permission_denied");
        setError("No microphone detected. Please plug in or enable a microphone device.");
      } else {
        setConnectionState("permission_denied");
        setError(`Microphone error: ${micErr.message || "Failed to acquire audio input"}`);
      }
      return;
    }

    // 2. Transition to connecting and play dial tone
    setConnectionState("connecting");
    PhoneAudioFX.playDialTone();

    // 3. Request LiveKit session credentials from server with 10s timeout
    try {
      const clerkEmail = user?.primaryEmailAddress?.emailAddress;
      const clerkName =
        user?.fullName ||
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
        clerkEmail?.split("@")[0] ||
        "Valued Policyholder";

      const sessionAbort = new AbortController();
      const sessionTimeout = setTimeout(() => sessionAbort.abort(), 10000);

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
        throw new Error(`Failed to initialize session (${res.status}: ${res.statusText})`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Route through Vite's /rtc proxy on current origin to eliminate mixed content
      const resolvedLivekitUrl =
        typeof window !== "undefined" ? window.location.origin : data.livekitUrl;

      setSession({
        token: data.token,
        livekitUrl: resolvedLivekitUrl,
        roomName: data.roomName,
        callSessionId: data.callSessionId,
        customer: data.customer,
        greeting: data.greeting,
        agentConfig: data.agentConfig,
        micStream: mediaStream,
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
  }, [user]);

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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 p-2 sm:p-4 text-slate-100 antialiased overflow-hidden selection:bg-cyan-500/30">
      {/* Ambient background lighting */}
      <div className="absolute top-1/4 -left-40 h-[450px] w-[450px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 h-[450px] w-[450px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Top Navigation */}
      <div className="absolute top-4 left-4 z-30">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-full bg-slate-900/80 border border-slate-800 shadow-md backdrop-blur-md"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
      </div>

      {/* SMARTPHONE DEVICE CONTAINER */}
      <div className="w-full max-w-[390px] h-[780px] max-h-[92vh] relative z-20 flex flex-col rounded-[44px] sm:rounded-[48px] border-[5px] sm:border-[6px] border-slate-800/90 bg-slate-950 shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(8,145,178,0.15)] ring-1 ring-white/10 overflow-hidden">
        {/* Phone Speaker & Dynamic Island Top Notch */}
        <div className="absolute top-2.5 inset-x-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="flex items-center justify-between w-28 h-6 bg-black rounded-full px-2.5 border border-white/5 shadow-inner">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <span className="h-1 w-1 rounded-full bg-cyan-500/80" />
            </span>
            {session ? (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-mono font-medium text-emerald-400">REC</span>
              </span>
            ) : (
              <span className="h-1 w-6 rounded-full bg-slate-800" />
            )}
          </div>
        </div>

        {/* Content View: Dial / Active / Ended */}
        {!session ? (
          callEndedStats ? (
            /* CALL ENDED SUMMARY SCREEN */
            <CallEndedScreen
              stats={callEndedStats}
              onCallAgain={startVoiceCall}
              onDismiss={() => {
                setCallEndedStats(null);
                setConnectionState("idle");
              }}
            />
          ) : (
            /* PRE-CALL / DIAL SCREEN */
            <PreCallDialerScreen
              connectionState={connectionState}
              error={error}
              onStartCall={startVoiceCall}
              onRetry={startVoiceCall}
            />
          )
        ) : (
          /* ACTIVE PHONE CALL SCREEN */
          <LiveKitRoom
            serverUrl={session.livekitUrl}
            token={session.token}
            connect={true}
            audio={true}
            video={false}
            onConnected={() => {
              PhoneAudioFX.stopRinging();
              PhoneAudioFX.playConnected();
              setConnectionState("connected");
            }}
            onError={(err) => {
              console.warn("LiveKit transport notice:", err?.message || err);
              if (connectionState === "connecting") {
                setConnectionState("connection_failed");
                setError(
                  "LiveKit gateway connection notice: " + (err?.message || "Verify WebRTC network")
                );
              }
            }}
            onDisconnected={(reason) => {
              console.log("LiveKit disconnected notice:", reason);
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
          <div className="w-32 h-1 bg-slate-700/60 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   1. PRE-CALL / DIALER SCREEN
   ========================================================================= */
function PreCallDialerScreen({
  connectionState,
  error,
  onStartCall,
  onRetry,
}: {
  connectionState: VoiceConnectionState;
  error: string | null;
  onStartCall: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col justify-between p-6 pt-11 pb-8 text-center bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950">
      {/* Status Bar */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
        <span className="font-semibold text-slate-300">SaveCall 5G</span>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Wifi className="h-3 w-3" />
          <Battery className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      </div>

      {/* Main Calling Contact Info */}
      <div className="flex flex-col items-center my-auto space-y-4">
        {/* Caller Avatar with Glowing Ring */}
        <div className="relative my-2 flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-cyan-500/20 to-slate-900 border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
            <Sparkles className="h-10 w-10 text-cyan-300" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-white font-display">
            SaveCall AI Assistant
          </h1>
          <p className="text-xs font-mono text-cyan-400">
            +1 (800) 555-SAVE • 24/7 Helpline
          </p>
          <p className="text-[11px] text-slate-400 max-w-[260px] mx-auto pt-1">
            Official policyholder voice assistant for claims, policy checks & nominee service.
          </p>
        </div>

        {/* Dynamic Diagnostics or Feature Highlights */}
        {connectionState === "permission_denied" ? (
          <div className="w-full rounded-2xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-left text-xs space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-[11px]">
              <MicOff className="h-4 w-4 shrink-0 text-rose-400" />
              <span>Microphone Access Required</span>
            </div>
            <p className="text-[11px] text-rose-300/90 leading-relaxed">
              {error ||
                "SaveCall needs microphone access so the AI assistant can hear you speak. Please click the permissions icon in your browser address bar and enable microphone access."}
            </p>
            <div className="pt-1">
              <Button
                onClick={onRetry}
                size="sm"
                className="w-full h-8 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Grant Microphone & Retry
              </Button>
            </div>
          </div>
        ) : connectionState === "connection_failed" ? (
          <div className="w-full rounded-2xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-left text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-[11px]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Connection Notice</span>
            </div>
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              {error ||
                "Unable to establish real-time voice connection to the gateway. Please verify your connection or try again."}
            </p>
            <div className="pt-1">
              <Button
                onClick={onRetry}
                size="sm"
                className="w-full h-8 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-semibold rounded-xl"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Retry Connection
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3.5 text-left text-xs space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5" />
              4-Tier Verified Risk Engine
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Instant Policy Benefit & Expiry Lookup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Real-Time Claim Status & Payout Updates</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span>Nominee Updates with OTP Safeguards</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Start Phone Call Action */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={onStartCall}
          disabled={connectionState === "requesting_microphone" || connectionState === "connecting"}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-base shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
        >
          {connectionState === "requesting_microphone" ? (
            <span className="flex items-center gap-2">
              <Mic className="h-5 w-5 animate-pulse text-slate-950" />
              Allow Microphone Access...
            </span>
          ) : connectionState === "connecting" ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-slate-950" />
              Connecting to SaveCall Network...
            </span>
          ) : (
            <span className="flex items-center gap-2.5">
              <Phone className="h-5 w-5 fill-slate-950" />
              Start Voice Call
            </span>
          )}
        </Button>
        <p className="text-[10px] text-slate-500">
          {connectionState === "requesting_microphone"
            ? "Please click 'Allow' on the browser microphone prompt"
            : connectionState === "connecting"
            ? "Negotiating encrypted WebRTC audio session..."
            : "Encrypted WebRTC Audio Line • Bilingual English & Hindi"}
        </p>
      </div>
    </div>
  );
}

/* =========================================================================
   2. ACTIVE PHONE CALL SCREEN
   ========================================================================= */
function ActivePhoneCallScreen({
  connectionState,
  setConnectionState,
  callSessionId,
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
  const { state: agentState } = useVoiceAssistant();

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [micVolume, setMicVolume] = useState(0);

  // Live transcript state
  const [messages, setMessages] = useState<TranscriptMessage[]>([
    {
      id: "initial-greeting",
      role: "agent",
      text:
        initialGreeting ||
        `Hello ${customerName || "there"}! Welcome to SaveCall insurance assistance. How may I help you today?`,
      time: "00:00",
    },
  ]);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const fullTranscriptEndRef = useRef<HTMLDivElement>(null);

  // Call duration counter
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

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    fullTranscriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTranscriptExpanded]);

  // Real-time Audio Analyzer for Microphone Volume Reaction
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

  // Listen for real-time transcript data broadcasted by LiveKit agent
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

  // Auto-publish microphone to LiveKit room on connection
  useEffect(() => {
    if (room?.localParticipant && roomConnectionState === "connected") {
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
  }, [room, roomConnectionState]);

  // Microphone toggle
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

  // Speaker toggle (mute remote audio elements)
  const toggleSpeaker = useCallback(() => {
    const nextSpeakerState = !isSpeakerMuted;
    setIsSpeakerMuted(nextSpeakerState);
    PhoneAudioFX.playBeep(nextSpeakerState ? 350 : 700);

    const audioEls = document.querySelectorAll("audio");
    audioEls.forEach((el) => {
      el.muted = nextSpeakerState;
    });
  }, [isSpeakerMuted]);

  // Speak initial greeting upon successful connection
  useEffect(() => {
    if (connectionState !== "connected") return;
    PhoneAudioFX.stopRinging();
    const greeting =
      initialGreeting ||
      `Hello ${customerName || "there"}! Welcome to SaveCall insurance assistance. How may I help you today?`;

    setConnectionState("speaking");
    const t = setTimeout(() => {
      speakAi(greeting, isSpeakerMuted, () => {
        setConnectionState("listening");
      });
    }, 400);

    return () => clearTimeout(t);
  }, [connectionState, initialGreeting, customerName, isSpeakerMuted, setConnectionState]);

  // Send a prompt to the AI agent & vocalize the response
  const sendPrompt = useCallback(
    async (promptText: string) => {
      stopSpeaking();
      PhoneAudioFX.playBeep(587);
      setConnectionState("processing");

      // Append user turn to transcript
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          role: "user",
          text: promptText,
          time: formatTimer(duration),
        },
      ]);

      // Publish packet to agent over LiveKit data channel
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

      // Query real-time voice chat endpoint & speak aloud
      try {
        const res = await fetch("/api/voice/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: promptText,
            callSessionId,
            tenantId,
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

  // Send a typed text message (fallback when microphone is silent or unavailable)
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

  // Native Speech Recognition with Barge-in and Interim Tracking
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
            // Barge-in: if AI is currently speaking and user speaks, stop AI speech immediately
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
    <div className="flex-1 flex flex-col justify-between p-4 pt-11 pb-6 relative overflow-hidden bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950">
      {/* 1. TOP STATUS BAR (PHONE SYSTEM HEADER) */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5 border-b border-slate-800/40 pb-2">
        <div className="flex items-center gap-1.5 font-mono text-cyan-400 font-bold">
          <Clock className="h-3 w-3" />
          <span>{formatTimer(duration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            HD Voice
          </span>
          <Wifi className="h-3 w-3 text-slate-400" />
          <Battery className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      </div>

      {/* 2. CALLER PROFILE & ANIMATED VOICE AURA */}
      <div className="flex flex-col items-center text-center my-auto space-y-2 py-1">
        {/* Caller Avatar with Expanding Ripple Waves */}
        <div className="relative flex items-center justify-center my-2">
          {/* Active speaking pulsating rings */}
          {isSpeaking && (
            <>
              <div className="absolute h-28 w-28 rounded-full border border-cyan-400/30 animate-ping duration-1000" />
              <div className="absolute h-24 w-24 rounded-full border-2 border-cyan-400/50 animate-pulse" />
            </>
          )}

          <div
            className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 shadow-xl ${
              isSpeaking
                ? "bg-gradient-to-b from-cyan-400 to-teal-600 border-2 border-cyan-300 shadow-[0_0_35px_rgba(6,182,212,0.5)] scale-105"
                : "bg-gradient-to-b from-cyan-500/20 to-slate-900 border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            }`}
          >
            <Sparkles
              className={`h-9 w-9 transition-colors ${
                isSpeaking ? "text-slate-950 animate-pulse" : "text-cyan-300"
              }`}
            />
          </div>
        </div>

        {/* Caller Identity */}
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight font-display">
            SaveCall AI Assistant
          </h2>
          <p className="text-[11px] text-slate-400">
            {customerName} • {customerNumber || "Guest Caller"}
          </p>
        </div>

        {/* Speaking Status Badge & Real Microphone Reactivity Equalizer */}
        <div className="flex items-center gap-2 pt-0.5">
          <Badge
            variant="outline"
            className={`text-[10px] py-0.5 px-2.5 transition-all ${
              connectionState === "speaking"
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/15"
                : connectionState === "processing"
                ? "border-amber-400 text-amber-300 bg-amber-500/10"
                : connectionState === "listening"
                ? "border-emerald-400 text-emerald-300 bg-emerald-500/15"
                : connectionState === "connected"
                ? "border-cyan-500/40 text-cyan-300 bg-cyan-500/10"
                : connectionState === "reconnecting"
                ? "border-rose-400 text-rose-300 bg-rose-500/10"
                : "border-slate-800 text-slate-400 bg-slate-900/60"
            }`}
          >
            {connectionState === "speaking"
              ? "Speaking..."
              : connectionState === "processing"
              ? "Thinking..."
              : connectionState === "listening"
              ? "Listening..."
              : connectionState === "connected"
              ? "Preparing AI..."
              : connectionState === "reconnecting"
              ? "Reconnecting..."
              : "Connecting..."}
          </Badge>

          {/* Equalizer Waveform Bars with dynamic microphone volume reactivity */}
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
                      ? "bg-cyan-400 animate-pulse"
                      : micVolume > 10
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                      : "bg-slate-600"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. THE SMALL TRANSCRIPT (LIVE CAPTIONS HUD) */}
      {showTranscript && (
        <div className="my-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md p-2.5 shadow-inner flex flex-col justify-between h-36 shrink-0 relative transition-all">
          {/* Header */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/60 mb-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
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
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 text-[10px] flex items-center gap-0.5 transition-colors"
              >
                <Maximize2 className="h-3 w-3" />
                <span className="text-[9px]">Full</span>
              </button>
              <button
                onClick={() => setShowTranscript(false)}
                title="Hide Captions"
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 text-[10px] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Subtitle stream */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 text-[11px] leading-tight select-text scrollbar-thin">
            {messages.slice(-3).map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-1.5 ${
                  m.role === "user" ? "text-emerald-300" : "text-slate-200"
                }`}
              >
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                    m.role === "user"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  }`}
                >
                  {m.role === "user" ? "You" : "AI"}
                </span>
                <p className="line-clamp-2 text-[11px] leading-snug">{m.text}</p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          {/* Text Message Input (when caller cannot use microphone) */}
          <form
            onSubmit={handleSendText}
            className="mt-1 flex items-center gap-1.5 pt-1.5 border-t border-slate-800/80"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Can't use mic? Type message..."
              disabled={connectionState === "processing"}
              className="flex-1 min-w-0 bg-slate-950/90 border border-slate-700/70 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-colors"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || connectionState === "processing"}
              title="Send text message"
              className="h-6 w-6 shrink-0 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:hover:bg-cyan-600 text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
            >
              <Send className="h-3 w-3" />
            </button>
          </form>
        </div>
      )}

      {/* Quick Prompts Bar (Chips to speak topic with 1-tap) */}
      <div className="py-1 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => sendPrompt("Check my policy details")}
          className="text-[10px] whitespace-nowrap bg-slate-900/90 hover:bg-cyan-950/70 border border-slate-800 hover:border-cyan-500/40 text-slate-300 px-2 py-1 rounded-full transition-all active:scale-95"
        >
          📋 Policy Status
        </button>
        <button
          onClick={() => sendPrompt("What is the status of my claim?")}
          className="text-[10px] whitespace-nowrap bg-slate-900/90 hover:bg-cyan-950/70 border border-slate-800 hover:border-cyan-500/40 text-slate-300 px-2 py-1 rounded-full transition-all active:scale-95"
        >
          🛡️ Claim Update
        </button>
        <button
          onClick={() => sendPrompt("I want to update my policy nominee")}
          className="text-[10px] whitespace-nowrap bg-slate-900/90 hover:bg-cyan-950/70 border border-slate-800 hover:border-cyan-500/40 text-slate-300 px-2 py-1 rounded-full transition-all active:scale-95"
        >
          👤 Change Nominee
        </button>
      </div>

      {/* 4. CLASSIC 2x3 SMARTPHONE IN-CALL KEYPAD */}
      <div className="pt-2 pb-1 grid grid-cols-3 gap-y-3.5 gap-x-4 place-items-center">
        {/* 1. Mute Toggle */}
        <button
          onClick={toggleMute}
          className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
        >
          <div
            className={`flex h-13 w-13 items-center justify-center rounded-full transition-all ${
              isMuted
                ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30 scale-105"
                : "bg-slate-800/80 border border-slate-700/80 text-slate-200 hover:bg-slate-700/80"
            }`}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </div>
          <span className="text-[10px] font-medium text-slate-300">
            {isMuted ? "Unmute" : "Mute"}
          </span>
        </button>

        {/* 2. Keypad / Quick Prompts Drawer */}
        <button
          onClick={() => {
            PhoneAudioFX.playBeep(520);
            setShowKeypad(!showKeypad);
          }}
          className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
        >
          <div
            className={`flex h-13 w-13 items-center justify-center rounded-full transition-all ${
              showKeypad
                ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
                : "bg-slate-800/80 border border-slate-700/80 text-slate-200 hover:bg-slate-700/80"
            }`}
          >
            <Grid className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium text-slate-300">Keypad</span>
        </button>

        {/* 3. Speaker Toggle */}
        <button
          onClick={toggleSpeaker}
          className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
        >
          <div
            className={`flex h-13 w-13 items-center justify-center rounded-full transition-all ${
              isSpeakerMuted
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                : "bg-slate-800/80 border border-slate-700/80 text-slate-200 hover:bg-slate-700/80"
            }`}
          >
            {isSpeakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </div>
          <span className="text-[10px] font-medium text-slate-300">
            {isSpeakerMuted ? "Speaker Off" : "Speaker"}
          </span>
        </button>

        {/* 4. Captions Toggle */}
        <button
          onClick={() => {
            PhoneAudioFX.playBeep(600);
            setShowTranscript(!showTranscript);
          }}
          className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
        >
          <div
            className={`flex h-13 w-13 items-center justify-center rounded-full transition-all ${
              showTranscript
                ? "bg-slate-800/80 border border-cyan-500/50 text-cyan-300"
                : "bg-slate-900 border border-slate-800 text-slate-500"
            }`}
          >
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium text-slate-300">
            {showTranscript ? "Captions" : "Show Text"}
          </span>
        </button>

        {/* 5. Policyholder Details */}
        <button
          onClick={() => {
            PhoneAudioFX.playBeep(450);
            setShowDetails(!showDetails);
          }}
          className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
        >
          <div
            className={`flex h-13 w-13 items-center justify-center rounded-full transition-all ${
              showDetails
                ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
                : "bg-slate-800/80 border border-slate-700/80 text-slate-200 hover:bg-slate-700/80"
            }`}
          >
            <UserCheck className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium text-slate-300">Details</span>
        </button>

        {/* 6. Security / OTP Status */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-13 w-13 items-center justify-center rounded-full bg-slate-800/80 border border-emerald-500/40 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium text-emerald-400">4-Tier Safe</span>
        </div>
      </div>

      {/* 5. BIG RED PHONE HANGUP BUTTON */}
      <div className="pt-2 flex flex-col items-center">
        <button
          onClick={() => {
            onEnd({
              duration,
              turns: messages.filter((m) => m.role === "user").length,
            });
          }}
          className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/40 active:scale-95 transition-all"
        >
          <div className="absolute -inset-1 rounded-full bg-red-500/30 blur-md group-hover:bg-red-500/50 transition-all" />
          <PhoneOff className="h-7 w-7 relative z-10 transition-transform group-hover:rotate-12" />
        </button>
        <span className="text-[10px] font-medium text-slate-400 mt-1">End Call</span>
      </div>

      {/* SLIDE-UP DRAWER: FULL TRANSCRIPT HISTORY MODAL */}
      {isTranscriptExpanded && (
        <div className="absolute inset-x-2 inset-y-12 z-50 rounded-3xl border border-slate-700 bg-slate-950/95 backdrop-blur-2xl p-4 shadow-2xl flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Full Call Transcript</span>
            </div>
            <button
              onClick={() => setIsTranscriptExpanded(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-emerald-600/30 border border-emerald-500/40 text-emerald-100 rounded-br-none"
                      : "bg-cyan-950/60 border border-cyan-500/30 text-cyan-100 rounded-bl-none"
                  }`}
                >
                  <div className="text-[9px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider">
                    {m.role === "user" ? "You" : "SaveCall AI"}
                  </div>
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-500 px-1 mt-0.5">{m.time}</span>
              </div>
            ))}
            <div ref={fullTranscriptEndRef} />
          </div>

          {/* Send text in full transcript */}
          <form
            onSubmit={handleSendText}
            className="flex items-center gap-2 mb-3 pt-2 border-t border-slate-800"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Can't use microphone? Type here..."
              disabled={connectionState === "processing"}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-colors"
            />
            <Button
              type="submit"
              disabled={!textInput.trim() || connectionState === "processing"}
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-3 h-8 shadow-sm"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Send
            </Button>
          </form>

          <Button
            onClick={() => setIsTranscriptExpanded(false)}
            variant="outline"
            className="w-full rounded-xl border-slate-700 text-xs text-slate-300"
          >
            Close Transcript
          </Button>
        </div>
      )}

      {/* SLIDE-UP DRAWER: KEYPAD / QUICK TOPICS */}
      {showKeypad && (
        <div className="absolute inset-x-3 bottom-24 z-40 rounded-3xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white">Tap to Ask Topic</span>
            <button
              onClick={() => setShowKeypad(false)}
              className="text-xs text-slate-400 hover:text-white"
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
                className="justify-start text-xs border-slate-800 bg-slate-950/80 hover:bg-cyan-950/60 hover:border-cyan-500/40 text-slate-200"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* SLIDE-UP DRAWER: POLICYHOLDER PROFILE */}
      {showDetails && (
        <div className="absolute inset-x-3 bottom-24 z-40 rounded-3xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white">Authenticated Profile</span>
            <button
              onClick={() => setShowDetails(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 pt-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Caller Name</span>
              <span className="text-white font-medium">{customerName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Policyholder ID</span>
              <span className="text-cyan-400 font-mono">
                {customerNumber || "GUEST-UNVERIFIED"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Audio Quality</span>
              <span className="text-emerald-400 font-medium">Opus 48kHz HD</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Security Tier</span>
              <span className="text-emerald-400 font-medium">Tier-4 Encrypted</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   3. CALL ENDED SUMMARY SCREEN
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
    <div className="flex-1 flex flex-col justify-between p-6 pt-12 pb-8 text-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
      <div className="flex items-center justify-center text-xs text-slate-400">
        <span>Call Disconnected</span>
      </div>

      <div className="my-auto space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 border border-slate-800 shadow-xl">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white font-display">Call Summary</h2>
          <p className="text-xs text-slate-400">Thank you for contacting SaveCall.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Call Duration</span>
            <span className="text-white font-mono font-bold">
              {formatTimer(stats.duration)}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Turns Exchanged</span>
            <span className="text-white font-medium">{stats.turns} conversational turns</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Resolution Status</span>
            <span className="text-emerald-400 font-semibold">Logged to Audit Trail</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <Button
          onClick={onCallAgain}
          className="w-full h-12 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/30"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Call Again
        </Button>
        <Button
          onClick={onDismiss}
          variant="outline"
          className="w-full h-12 rounded-2xl border-slate-800 text-slate-300 text-xs hover:bg-slate-900"
        >
          Return to Dialer
        </Button>
      </div>
    </div>
  );
}
