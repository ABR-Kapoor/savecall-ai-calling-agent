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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [{ title: "SaveCall — Phone Call UI" }],
  }),
  component: VoiceCallPage,
});


function speakAi(text: string, isSpeakerMuted: boolean, onEnd?: () => void) {
  if (isSpeakerMuted || typeof window === "undefined" || !("speechSynthesis" in window) || !text) {
    if (onEnd) onEnd();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/[*_#`~>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang === "en-IN" || v.lang === "hi-IN") ||
      voices.find((v) => v.name.includes("India") || v.name.includes("Neerja") || v.name.includes("Swara") || v.name.includes("Natural") || v.name.includes("Jenny")) ||
      voices.find((v) => v.lang.startsWith("en-")) ||
      voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis notice:", err);
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
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
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

    const playPulse = () => {
      if (!this.ctx || this.ctx.state === "closed") return;
      try {
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Standard US telephone ringback tone: 440Hz + 480Hz
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);
        osc1.type = "sine";
        osc2.type = "sine";

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
        gain.gain.setValueAtTime(0.04, now + 1.5);
        gain.gain.linearRampToValueAtTime(0, now + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.8);
        osc2.stop(now + 1.8);
      } catch (e) {
        console.warn("Ring sound notice:", e);
      }
    };

    playPulse();
    this.ringInterval = setInterval(playPulse, 3800);
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
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn("Connect sound notice:", e);
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

function VoiceCallPage() {
  const { user } = useUser();
  const [session, setSession] = useState<{
    token: string;
    livekitUrl: string;
    roomName: string;
    callSessionId?: string | undefined;
    greeting?: string;
    agentConfig?: any;
    customer: { id: string | null; name: string; customerNumber: string | null; tenantId?: string; isVerified?: boolean };
  } | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callEndedStats, setCallEndedStats] = useState<{
    duration: number;
    turns: number;
  } | null>(null);

  const startVoiceCall = useCallback(async () => {
    setConnecting(true);
    setError(null);
    setCallEndedStats(null);
    PhoneAudioFX.playDialTone();

    try {
      const clerkEmail = user?.primaryEmailAddress?.emailAddress;
      const clerkName =
        user?.fullName ||
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
        clerkEmail?.split("@")[0] ||
        "Valued Policyholder";

      const res = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkUserId: user?.id,
          customerEmail: clerkEmail,
          customerName: clerkName,
          customerPhone: user?.primaryPhoneNumber?.phoneNumber,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to initialize session: ${res.statusText}`);
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
        customer: data.customer,
        greeting: data.greeting,
        agentConfig: data.agentConfig,
      });
    } catch (err: any) {
      PhoneAudioFX.stopRinging();
      console.error(err);
      setError(err.message || "Failed to start call");
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleEndCall = useCallback((stats?: { duration: number; turns: number }) => {
    PhoneAudioFX.playEndCall();
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
  }, [session]);

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
              onDismiss={() => setCallEndedStats(null)}
            />
          ) : (
            /* PRE-CALL / DIAL SCREEN */
            <PreCallDialerScreen
              connecting={connecting}
              error={error}
              onStartCall={startVoiceCall}
            />
          )
        ) : (
          /* ACTIVE PHONE CALL SCREEN */
          <LiveKitRoom
            serverUrl={session.livekitUrl}
            token={session.token}
            connect={true}
            audio={typeof navigator !== "undefined" && Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function")}
            video={false}
            onConnected={() => {
              PhoneAudioFX.stopRinging();
              PhoneAudioFX.playConnected();
            }}
            onError={(err) => {
              console.warn("LiveKit transport notice:", err?.message || err);
            }}
            onDisconnected={(reason) => {
              console.log("LiveKit disconnected notice:", reason, "- continuing in browser HD voice mode.");
            }}
            className="w-full h-full flex flex-col"
          >
            <ActivePhoneCallScreen
              callSessionId={session.callSessionId}
              customerName={session.customer.name}
              customerId={session.customer.id}
              tenantId={(session.customer as any).tenantId}
              customerNumber={session.customer.customerNumber}
              initialGreeting={(session as any).greeting}
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
  connecting,
  error,
  onStartCall,
}: {
  connecting: boolean;
  error: string | null;
  onStartCall: () => void;
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

        {/* Feature Highlights */}
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

        {error && (
          <div className="w-full rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-400">
            {error}
          </div>
        )}
      </div>

      {/* Start Phone Call Action */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={onStartCall}
          disabled={connecting}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-base shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
        >
          {connecting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
              Dialing SaveCall Line...
            </span>
          ) : (
            <span className="flex items-center gap-2.5">
              <Phone className="h-5 w-5 fill-slate-950" />
              Start Voice Call
            </span>
          )}
        </Button>
        <p className="text-[10px] text-slate-500">
          Encrypted WebRTC Audio Line • Bilingual English & Hindi
        </p>
      </div>
    </div>
  );
}

/* =========================================================================
   2. ACTIVE PHONE CALL SCREEN
   ========================================================================= */
function ActivePhoneCallScreen({
  callSessionId,
  customerName,
  customerId,
  tenantId,
  customerNumber,
  initialGreeting,
  onEnd,
}: {
  callSessionId?: string | undefined;
  customerName: string;
  customerId?: string | null;
  tenantId?: string;
  customerNumber?: string | null;
  initialGreeting?: string;
  onEnd: (stats?: { duration: number; turns: number }) => void;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { state: agentState } = useVoiceAssistant();
  const [localAgentState, setLocalAgentState] = useState<"listening" | "thinking" | "speaking">("speaking");

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [duration, setDuration] = useState(0);

  // Live transcript state
  const [messages, setMessages] = useState<TranscriptMessage[]>([
    {
      id: "initial-greeting",
      role: "agent",
      text: initialGreeting || `Hello ${customerName || "there"}! Welcome to SaveCall insurance assistance. How may I help you today?`,
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

  // Listen for real-time transcript data broadcasted by LiveKit agent
  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        if (data.type === "transcript" && data.text) {
          setMessages((prev) => {
            // Avoid duplicate identical immediate messages
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

  // Auto-enable microphone on connection
  useEffect(() => {
    if (room?.localParticipant && connectionState === "connected") {
      if (typeof navigator !== "undefined" && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
        room.localParticipant.setMicrophoneEnabled(true).catch((err) => {
          console.warn("Microphone auto-enable notice:", err);
        });
      }
    }
  }, [room, connectionState]);

  // Microphone toggle
  const toggleMute = useCallback(() => {
    if (room?.localParticipant) {
      const nextState = !isMuted;
      room.localParticipant.setMicrophoneEnabled(!nextState);
      setIsMuted(nextState);
      PhoneAudioFX.playBeep(nextState ? 440 : 880);
    }
  }, [room, isMuted]);

  // Speaker toggle (mute remote audio elements)
  const toggleSpeaker = useCallback(() => {
    const nextSpeakerState = !isSpeakerMuted;
    setIsSpeakerMuted(nextSpeakerState);
    PhoneAudioFX.playBeep(nextSpeakerState ? 350 : 700);

    // Mute/unmute all remote audio elements in DOM
    const audioEls = document.querySelectorAll("audio");
    audioEls.forEach((el) => {
      el.muted = nextSpeakerState;
    });
  }, [isSpeakerMuted]);

  // Speak the initial greeting upon connect
  useEffect(() => {
    PhoneAudioFX.stopRinging();
    const greeting = initialGreeting || `Hello ${customerName || "there"}! Welcome to SaveCall insurance assistance. How may I help you today?`;
    setLocalAgentState("speaking");
    const t = setTimeout(() => {
      speakAi(greeting, isSpeakerMuted, () => {
        setLocalAgentState("listening");
      });
    }, 500);
    return () => clearTimeout(t);
  }, [initialGreeting]);

  // Send a prompt to the AI agent & speak the response aloud
  const sendPrompt = useCallback(
    async (promptText: string) => {
      PhoneAudioFX.playBeep(587);
      setLocalAgentState("thinking");

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
            setLocalAgentState("speaking");
            speakAi(data.reply, isSpeakerMuted, () => {
              setLocalAgentState("listening");
            });
          } else {
            setLocalAgentState("listening");
          }
        } else {
          setLocalAgentState("listening");
        }
      } catch (err) {
        console.warn("AI chat response notice:", err);
        setLocalAgentState("listening");
      }
    },
    [room, duration, customerName, tenantId, customerId, isSpeakerMuted, messages]
  );

  // Native Speech Recognition for hands-free talking into microphone
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isMuted) return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let reco: any = null;
    let active = true;

    try {
      reco = new SpeechRecognition();
      reco.continuous = true;
      reco.interimResults = false;
      reco.lang = "en-IN";

      reco.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult && lastResult.isFinal) {
          const speechText = lastResult[0]?.transcript?.trim();
          if (speechText && !isMuted) {
            sendPrompt(speechText);
          }
        }
      };

      reco.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("Speech recognition event:", e.error);
        }
      };

      reco.onend = () => {
        if (active && !isMuted) {
          try { reco.start(); } catch {}
        }
      };

      if (!isMuted) {
        reco.start();
      }
    } catch (e) {
      console.warn("Speech recognition init:", e);
    }

    return () => {
      active = false;
      if (reco) {
        try { reco.stop(); } catch {}
      }
    };
  }, [isMuted, sendPrompt]);

  const isSpeaking = localAgentState === "speaking" || agentState === "speaking";

  return (
    <div className="flex-1 flex flex-col justify-between p-4 pt-11 pb-6 relative overflow-hidden bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950">
      {/* 1. TOP STATUS BAR (PHONE SYSTEM HEADER) */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5 border-b border-slate-800/40 pb-2">
        <div className="flex items-center gap-1.5 font-mono text-cyan-400 font-bold">
          <Clock className="h-3 w-3" />
          <span>{formatTimer(duration)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            HD Voice
          </span>
          <Wifi className="h-3 w-3 text-slate-400 ml-1" />
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

        {/* Speaking Status Badge & Equalizer Wave */}
        <div className="flex items-center gap-2 pt-0.5">
          <Badge
            variant="outline"
            className={`text-[10px] py-0.5 px-2.5 transition-all ${
              isSpeaking
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/15"
                : agentState === "thinking"
                ? "border-amber-400 text-amber-300 bg-amber-500/10"
                : "border-slate-800 text-slate-400 bg-slate-900/60"
            }`}
          >
            {isSpeaking
              ? "Speaking..."
              : localAgentState === "thinking" || agentState === "thinking"
              ? "Thinking..."
              : "Listening..."}
          </Badge>

          {/* Equalizer Waveform Bars */}
          <div className="flex items-center gap-0.5 h-3.5 px-1">
            <span
              className={`w-0.5 rounded-full transition-all duration-200 ${
                isSpeaking
                  ? "bg-cyan-400 h-3.5 animate-[pulse_0.4s_ease-in-out_infinite]"
                  : "bg-slate-600 h-1.5"
              }`}
            />
            <span
              className={`w-0.5 rounded-full transition-all duration-200 ${
                isSpeaking
                  ? "bg-cyan-400 h-4 animate-[pulse_0.7s_ease-in-out_infinite]"
                  : "bg-slate-600 h-2"
              }`}
            />
            <span
              className={`w-0.5 rounded-full transition-all duration-200 ${
                isSpeaking
                  ? "bg-cyan-300 h-2.5 animate-[pulse_0.3s_ease-in-out_infinite]"
                  : "bg-slate-600 h-1"
              }`}
            />
            <span
              className={`w-0.5 rounded-full transition-all duration-200 ${
                isSpeaking
                  ? "bg-cyan-400 h-4 animate-[pulse_0.6s_ease-in-out_infinite]"
                  : "bg-slate-600 h-2.5"
              }`}
            />
            <span
              className={`w-0.5 rounded-full transition-all duration-200 ${
                isSpeaking
                  ? "bg-cyan-400 h-3 animate-[pulse_0.5s_ease-in-out_infinite]"
                  : "bg-slate-600 h-1.5"
              }`}
            />
          </div>
        </div>
      </div>

      {/* 3. THE SMALL TRANSCRIPT (LIVE CAPTIONS HUD) */}
      {showTranscript && (
        <div className="my-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-md p-2.5 shadow-inner flex flex-col justify-between h-28 shrink-0 relative transition-all">
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

          {/* Subtitle stream (shows latest 2 spoken bubbles) */}
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
          onClick={() => sendPrompt("I want to update my nominee")}
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
          onClick={() => onEnd({ duration, turns: messages.length })}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 active:scale-90 text-white shadow-xl shadow-red-600/40 border-2 border-red-400/40 transition-all"
        >
          <PhoneOff className="h-7 w-7" />
        </button>
        <span className="text-[11px] font-semibold text-red-400 pt-1">
          End Call
        </span>
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
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                sendPrompt("What is the status of my health insurance policy?");
                setShowKeypad(false);
              }}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/40 text-left transition-all"
            >
              <div className="font-semibold text-white">📋 Policy Details</div>
              <div className="text-[10px] text-slate-400">Coverage & premium</div>
            </button>

            <button
              onClick={() => {
                sendPrompt("Check my latest claim settlement status");
                setShowKeypad(false);
              }}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/40 text-left transition-all"
            >
              <div className="font-semibold text-white">🛡️ Claim Status</div>
              <div className="text-[10px] text-slate-400">Track pending payout</div>
            </button>

            <button
              onClick={() => {
                sendPrompt("I need to update my policy nominee");
                setShowKeypad(false);
              }}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/40 text-left transition-all"
            >
              <div className="font-semibold text-white">👥 Update Nominee</div>
              <div className="text-[10px] text-slate-400">OTP-secured change</div>
            </button>

            <button
              onClick={() => {
                sendPrompt("Show network cashless hospitals near me");
                setShowKeypad(false);
              }}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/40 text-left transition-all"
            >
              <div className="font-semibold text-white">🏥 Network Hospitals</div>
              <div className="text-[10px] text-slate-400">Cashless claim tie-ups</div>
            </button>
          </div>
        </div>
      )}

      {/* SLIDE-UP DRAWER: POLICYHOLDER VERIFICATION DETAILS */}
      {showDetails && (
        <div className="absolute inset-x-3 bottom-24 z-40 rounded-3xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white">Verified Caller Identity</span>
            <button
              onClick={() => setShowDetails(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Policyholder:</span>
              <span className="font-semibold text-slate-200">{customerName}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Customer ID:</span>
              <span className="font-mono text-cyan-400">{customerNumber}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Security Tier:</span>
              <span className="text-emerald-400 font-medium">4-Tier Verified (OTP Safeguarded)</span>
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
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 pt-12 pb-8 text-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
      <div className="my-auto space-y-5">
        <div className="flex h-18 w-18 items-center justify-center rounded-full bg-slate-800/80 border-2 border-slate-700 mx-auto text-slate-400">
          <CheckCircle2 className="h-9 w-9 text-emerald-400" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Call Completed</h2>
          <p className="text-xs text-slate-400">SaveCall AI Assistant Session</p>
        </div>

        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5 text-xs text-slate-300">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Duration:</span>
            <span className="font-mono font-bold text-cyan-400">
              {formatTimer(stats.duration)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Conversation Turns:</span>
            <span className="font-semibold text-slate-200">{stats.turns} messages</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Security Safeguard:</span>
            <span className="text-emerald-400 font-medium">Logged to Audit Trail</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <Button
          onClick={onCallAgain}
          className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Call Again
        </Button>

        <Link to="/calls" className="block w-full">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-slate-800 text-slate-300 hover:text-white text-xs"
          >
            <FileText className="h-4 w-4 mr-2 text-cyan-400" />
            View in Session History
          </Button>
        </Link>
      </div>
    </div>
  );
}
