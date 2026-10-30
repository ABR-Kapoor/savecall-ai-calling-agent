import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  LoaderCircle,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const suggestions = [
  "Car damage claim",
  "Deductible vs premium",
  "Cashless hospital admission",
  "Water leak damage",
];

export function InsuranceHeroPanel() {
  const { user } = useUser();

  // Chat message thread
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  // Full-Duplex Voice Call State
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");

  // Speech Recognition & Web Audio Refs
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAiSpeakingRef = useRef(false);
  const isCallActiveRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);

  isAiSpeakingRef.current = isAiSpeaking;
  isCallActiveRef.current = isCallActive;
  isMicMutedRef.current = isMicMuted;
  messagesRef.current = messages;

  // Auto-scroll message list
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isLoading, liveTranscript]);

  // Active call duration timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isCallActive) {
      interval = setInterval(() => setCallDuration((sec) => sec + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallActive]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Natural human speech synthesis playback
  const speakText = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (onDone) onDone();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`~>]/g, "").replace(/\n+/g, " ").trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.02;
      utterance.pitch = 1.0;

      const isHindi = /[\u0900-\u097F]|namaste|kya|hai|mera|kaise/i.test(text);
      utterance.lang = isHindi ? "hi-IN" : "en-IN";

      utterance.onstart = () => {
        setIsAiSpeaking(true);
        setIsInterrupted(false);
      };

      utterance.onend = () => {
        setIsAiSpeaking(false);
        setIsInterrupted(false);
        if (onDone) onDone();
      };

      utterance.onerror = () => {
        setIsAiSpeaking(false);
        if (onDone) onDone();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech playback notice:", e);
      setIsAiSpeaking(false);
      if (onDone) onDone();
    }
  }, []);

  // Send message to backend concierge endpoint
  const sendMessage = useCallback(
    async (value: string, shouldSpeak = false) => {
      const query = value.trim();
      if (!query || isLoading) return;

      setError(null);
      setLiveTranscript("");
      setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text: query }]);
      setDraft("");
      setIsLoading(true);

      try {
        const history = messagesRef.current.slice(-8).map((m) => ({
          role: m.role,
          content: m.text,
        }));

        const response = await fetch("/api/voice/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, history, isLandingDemo: true }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "The service is temporarily busy. Please retry.");
        const reply = typeof data.reply === "string" ? data.reply.trim() : "";
        if (!reply) throw new Error("Received an empty response. Please retry.");

        setMessages((prev) => [
          ...prev,
          {
            id: nextId.current++,
            role: "assistant",
            text: reply,
          },
        ]);

        if (shouldSpeak || isCallActive) {
          speakText(reply);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Service unavailable. Please retry.");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, isCallActive, speakText]
  );

  // Immediate barge-in interruption handler
  const handleBargeInInterruption = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.speaking || isAiSpeakingRef.current) {
        window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
        setIsInterrupted(true);
      }
    }
  }, []);

  // Start Voice Call
  const startVoiceCall = useCallback(async () => {
    setError(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Please allow microphone access in Chrome, Edge, or Safari.");
      return;
    }

    try {
      // 1. Microphone capture and real-time audio analyzer for visualizer aura
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] ?? 0;
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }

      // 2. Continuous speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onspeechstart = () => {
        handleBargeInInterruption();
      };

      recognition.onresult = (event: any) => {
        let interimText = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i]?.[0]?.transcript || "";
          if (event.results[i]?.isFinal) {
            finalChunk += transcript;
          } else {
            interimText += transcript;
          }
        }

        // Instant interruption upon user speech
        if (interimText.trim() || finalChunk.trim()) {
          handleBargeInInterruption();
        }

        const currentSaid = (finalChunk || interimText).trim();
        if (currentSaid) {
          setLiveTranscript(currentSaid);
        }

        if (finalChunk.trim()) {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            const queryToSend = finalChunk.trim();
            if (queryToSend) {
              void sendMessage(queryToSend, true);
            }
          }, 600);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn("Speech recognition notice:", event.error);
        }
      };

      recognition.onend = () => {
        if (isCallActiveRef.current && !isMicMutedRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsCallActive(true);
      setIsMicMuted(false);

      const welcome = "Hello, how can I help you with your insurance or claim today?";
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "assistant", text: welcome },
      ]);
      speakText(welcome);
    } catch (err: any) {
      console.error("Voice call startup error:", err);
      setError(err?.message || "Please allow microphone access to start voice call.");
      setIsCallActive(false);
    }
  }, [handleBargeInInterruption, isCallActive, isMicMuted, sendMessage, speakText]);

  // End active voice call
  const endVoiceCall = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsCallActive(false);
    setIsAiSpeaking(false);
    setIsInterrupted(false);
    setAudioLevel(0);
    setLiveTranscript("");
  }, []);

  // Mic mute toggle
  const toggleMic = () => {
    if (!isCallActive) return;
    const nextMute = !isMicMuted;
    setIsMicMuted(nextMute);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextMute;
      });
    }
    if (nextMute && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    } else if (!nextMute && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }
  };

  useEffect(() => {
    return () => {
      endVoiceCall();
    };
  }, [endVoiceCall]);

  return (
    <div className="w-full flex flex-col">
      {/* 1. Uplifted Main Card */}
      <div className="relative overflow-hidden rounded-[26px] border border-[#CFDFD8] bg-white/95 backdrop-blur-xl shadow-[0_24px_65px_-18px_rgba(8,127,140,0.18),0_10px_28px_-6px_rgba(15,61,57,0.06)] ring-1 ring-black/[0.02] transition-all">
        {/* Subtle top brand hairline */}
        <div className="h-1 w-full bg-gradient-to-r from-[#087F8C]/20 via-[#087F8C] to-[#10A6AE]/30" />

        {/* Top Clean Header */}
        <div className="flex items-center justify-between border-b border-[#E8EFEA] bg-[#FAFBF9]/90 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Real Official InsurCall Logo */}
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white border border-[#DCE6E1] p-2 shadow-2xs">
              <img
                src="/01_logo_only_transparent.png"
                alt="InsurCall"
                className="size-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#142D2B] leading-none">InsurCall</h3>
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-[#637A73] mt-1 font-medium">Policy & Claims AI Concierge</p>
            </div>
          </div>

          {/* Single Call Button */}
          {isCallActive ? (
            <button
              type="button"
              onClick={endVoiceCall}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs animate-pulse transition-all active:scale-95 cursor-pointer"
            >
              <PhoneOff className="size-3.5" />
              <span>End ({formatTimer(callDuration)})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startVoiceCall()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#087F8C] hover:bg-[#076C77] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_-2px_rgba(8,127,140,0.5)] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Phone className="size-3.5 fill-current" />
              <span>Call Now</span>
            </button>
          )}
        </div>

        {/* In-Call Active Strip */}
        {isCallActive && (
          <div className="flex items-center justify-between border-b border-[#D8E6E0] bg-[#EFF6F3] px-4 py-2 sm:px-5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {/* Visualizer Aura Indicator */}
              <div className="relative flex size-4 items-center justify-center">
                <span
                  className="absolute size-4 rounded-full bg-[#087F8C]/25 transition-transform"
                  style={{ transform: `scale(${1 + audioLevel * 0.015})` }}
                />
                <span className="size-2 rounded-full bg-[#087F8C] animate-pulse" />
              </div>
              <p className="truncate font-medium text-[#20453D]">
                {liveTranscript
                  ? `"${liveTranscript}"`
                  : isAiSpeaking
                  ? "Speaking (interrupt anytime)"
                  : isInterrupted
                  ? "Listening..."
                  : "Listening to you..."}
              </p>
            </div>

            <button
              type="button"
              onClick={toggleMic}
              className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all ${
                isMicMuted
                  ? "bg-rose-100 text-rose-700"
                  : "bg-white text-[#2B453E] border border-[#CFDDD7] hover:bg-slate-50"
              }`}
            >
              {isMicMuted ? <MicOff className="size-3 text-rose-600" /> : <Mic className="size-3" />}
              <span>{isMicMuted ? "Unmute" : "Mute"}</span>
            </button>
          </div>
        )}

        {/* Main Conversation Stream */}
        <div className="p-5 sm:p-6">
          <div
            ref={threadRef}
            role="log"
            aria-label="Conversation"
            className="max-h-[250px] min-h-[120px] space-y-3 overflow-y-auto overscroll-contain pr-1"
          >
            {messages.length === 0 ? (
              <div className="py-2.5">
                <h4 className="text-base sm:text-lg font-bold text-[#152F2C]">
                  Hi, how can we help you today?
                </h4>
                <p className="mt-1 text-xs sm:text-sm text-[#5B736B] leading-relaxed">
                  Ask a question below or tap Call Now to speak directly.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      message.role === "user"
                        ? "bg-[#143B39] text-white shadow-xs"
                        : "border border-[#DFECE6] bg-[#F7FAF8] text-[#243D36]"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="mb-1 flex items-center justify-between border-b border-[#E3EDE8] pb-1 text-[10px] font-medium text-[#4B7365]">
                        <span>InsurCall</span>
                        <button
                          type="button"
                          onClick={() => speakText(message.text)}
                          title="Listen"
                          className="p-0.5 text-[#52776A] hover:text-[#087F8C]"
                        >
                          <Volume2 className="size-3" />
                        </button>
                      </div>
                    )}
                    <p>{message.text}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#627770]">
                <LoaderCircle className="size-3.5 animate-spin text-[#087F8C]" /> Checking information...
              </div>
            )}
          </div>

          {/* Short Question Chips */}
          {messages.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Quick questions">
              {suggestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={isLoading}
                  onClick={() => void sendMessage(question, isCallActive)}
                  className="rounded-full border border-[#D5E3DD] bg-white hover:bg-[#EBF7F7] hover:border-[#087F8C]/40 hover:text-[#087F8C] px-3.5 py-1 text-left text-[11px] font-medium text-[#38514A] transition-all hover:-translate-y-0.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            className="mt-3.5 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(draft, isCallActive);
            }}
          >
            <label className="sr-only" htmlFor="hero-message-input">
              Ask a question
            </label>
            <input
              id="hero-message-input"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={350}
              placeholder={isCallActive ? "Type or speak naturally..." : "Ask about policies, deductibles, or claims..."}
              disabled={isLoading}
              className="h-10 min-w-0 flex-1 rounded-xl border border-[#D2E2DC] bg-[#FAFBF9] hover:bg-white focus:bg-white px-3.5 text-xs text-[#1B3630] outline-none placeholder:text-[#889B93] focus:border-[#087F8C] focus:ring-2 focus:ring-[#087F8C]/15 disabled:bg-[#F5F8F6] transition-all"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isLoading}
              aria-label="Send"
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#087F8C] text-white transition-all hover:bg-[#076C77] active:scale-95 disabled:cursor-not-allowed disabled:bg-[#B5C7C0] shadow-2xs"
            >
              <Send className="size-4" />
            </button>
          </form>
          {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E8EFEA] bg-[#FAFBF9] px-4 py-2.5 text-[11px] text-[#697D76] sm:px-5">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            Verified policy guidance
          </span>
          <Link
            to={user ? "/voice" : "/auth"}
            className="inline-flex items-center gap-1 font-semibold text-[#087F8C] hover:text-[#076C77] hover:underline"
          >
            <span>Dedicated Phone Line</span>
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* 2. Curvy Arrow & Catchy Onboarding CTA */}
      <div className="mt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 px-2 sm:px-3">
        {/* Catchy Onboarding Button */}
        <Link
          to={user ? "/onboarding" : "/auth"}
          className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#087F8C] via-[#098D9B] to-[#0AA0AE] hover:from-[#076C77] hover:to-[#087F8C] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-[0_8px_24px_-6px_rgba(8,127,140,0.55)] hover:shadow-[0_12px_30px_-6px_rgba(8,127,140,0.65)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shrink-0"
        >
          <Sparkles className="size-4 text-emerald-200 animate-pulse" />
          <span>Get This Agent For My Company</span>
          <div className="size-5 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="size-3 text-white" />
          </div>
        </Link>

        {/* Curvy arrow gesture pointing to button from right */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Exact loop arrow from user image: arcs up and loops counter-clockwise with arrowhead pointing down-left */}
          <svg
            className="w-10 h-10 text-[#087F8C] shrink-0 drop-shadow-xs"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Curving tail looping overhead from text down to button */}
            <path
              d="M 20 40 C 26 22, 45 14, 68 18 C 84 22, 92 36, 88 56 C 84 72, 70 82, 54 84"
              stroke="currentColor"
              strokeWidth="9"
              strokeLinecap="round"
            />
            {/* Arrowhead pointing down-left directly into button */}
            <polygon
              points="38,82 60,66 62,94"
              fill="currentColor"
            />
          </svg>
          <span className="text-[13px] font-semibold text-[#24433B] italic whitespace-nowrap select-none">
            Want this exact AI agent for your business?
          </span>
        </div>
      </div>
    </div>
  );
}
