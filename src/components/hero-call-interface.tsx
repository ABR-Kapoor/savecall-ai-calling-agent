import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  PhoneCall,
  PhoneOff,
  Mic,
  Volume2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SoundWaveMotif } from "@/components/sound-wave-motif";

export function HeroCallInterface() {
  const [demoState, setDemoState] = useState<"idle" | "connecting" | "live" | "completed">("idle");
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (demoState === "live") {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [demoState]);

  const startDemo = () => {
    setDemoState("connecting");
    setTimerSeconds(0);
    setTimeout(() => {
      setDemoState("live");
    }, 600);
  };

  const endDemo = () => {
    setDemoState("completed");
  };

  const restartDemo = () => {
    setDemoState("connecting");
    setTimerSeconds(0);
    setTimeout(() => {
      setDemoState("live");
    }, 600);
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, "0");
    const secs = (s % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <div className="relative rounded-[32px] border border-slate-200/90 bg-white shadow-[0_24px_55px_-12px_rgba(8,127,140,0.14)] overflow-hidden transition-all duration-300 hover:shadow-[0_28px_65px_-10px_rgba(8,127,140,0.2)]">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-[#FAF9F6] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            {demoState === "live" && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex size-2.5 rounded-full ${
                demoState === "live"
                  ? "bg-emerald-500"
                  : demoState === "connecting"
                  ? "bg-amber-500 animate-pulse"
                  : demoState === "completed"
                  ? "bg-slate-400"
                  : "bg-teal-500"
              }`}
            />
          </span>
          <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-slate-800">
            {demoState === "live"
              ? "Interactive Demo: Active"
              : demoState === "connecting"
              ? "Connecting Line..."
              : demoState === "completed"
              ? "Demo Completed"
              : "Interactive Simulation"}
          </span>
        </div>

        <Badge
          variant="outline"
          className="border-[#087F8C]/30 bg-[#E6F6F7] text-[10px] font-mono tracking-wider text-[#087F8C] uppercase font-semibold"
        >
          {demoState === "idle" ? "Click to Test Demo" : "Simulation Only"}
        </Badge>
      </div>

      <div className="p-6 space-y-5">
        {/* Caller & Agent Identity Bar */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-[#FAF9F6] p-3.5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Sample Caller (Demo)
            </span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-slate-400" />
              <span className="text-xs font-bold text-slate-900">Priya Sharma</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">+91 98201 XXXXX</span>
          </div>

          <div className="border-l border-slate-200/80 pl-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              AI Voice Employee
            </span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#087F8C]" />
              <span className="text-xs font-bold text-[#087F8C]">AI Assistant (InsurCall)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">English + Hindi</span>
          </div>
        </div>

        {/* Audio Waveform & Status Indicator */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2">
            <Volume2 className="size-4 text-[#087F8C]" />
            <SoundWaveMotif variant="bar-pulse" active={demoState === "live"} />
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
            <Clock className="size-3 text-slate-500" />
            <span>{demoState === "live" ? formatTimer(timerSeconds) : "00:00"}</span>
          </div>
        </div>

        {/* Illustrative Transcript Dialogue */}
        <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-white p-4 text-xs shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>{demoState === "live" ? "Live Demo Dialogue (Simulated)" : "Preview Script (Illustrative)"}</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Grounded in FAQs
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 shrink-0 mt-0.5">
                Caller:
              </span>
              <p className="text-[12px] leading-relaxed text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                "Hi, I wanted to check your appointment availability for tomorrow afternoon."
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#087F8C] shrink-0 mt-0.5">
                Assistant:
              </span>
              <p className="text-[12px] leading-relaxed text-slate-900 bg-[#E6F6F7]/60 px-2.5 py-1.5 rounded-xl border border-[#087F8C]/20">
                "Of course, Priya. Dr. Sharma has open consultation slots tomorrow at 3:30 PM and 5:00 PM. Would 3:30 PM work for your visit?"
              </p>
            </div>
          </div>
        </div>

        {/* Compact Call Summary Result */}
        <div className="rounded-2xl border border-slate-100 bg-[#FAF9F6] p-3 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-mono text-[10px] uppercase tracking-wider">Identified Intent</span>
            <span className="font-semibold text-slate-900">Clinic Appointment Request</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-mono text-[10px] uppercase tracking-wider">Automated Action</span>
            <span className="font-semibold text-[#087F8C]">Slot Reserved & SMS Dispatched</span>
          </div>
        </div>

        {/* Demonstration Controls & Direct Voice Link */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {demoState === "idle" && (
            <Button
              type="button"
              variant="outline"
              onClick={startDemo}
              className="h-11 rounded-xl text-xs font-mono tracking-wider border-[#087F8C]/40 text-[#087F8C] bg-teal-50/50 hover:bg-teal-100/70 cursor-pointer"
            >
              <Play className="size-3.5 mr-1.5 text-[#087F8C]" />
              START DEMO
            </Button>
          )}

          {demoState === "connecting" && (
            <Button
              type="button"
              disabled
              variant="outline"
              className="h-11 rounded-xl text-xs font-mono tracking-wider border-amber-300 text-amber-700 bg-amber-50"
            >
              CONNECTING...
            </Button>
          )}

          {demoState === "live" && (
            <Button
              type="button"
              variant="outline"
              onClick={endDemo}
              className="h-11 rounded-xl text-xs font-mono tracking-wider border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 cursor-pointer"
            >
              <PhoneOff className="size-3.5 mr-1.5 text-rose-600" />
              END DEMO
            </Button>
          )}

          {demoState === "completed" && (
            <Button
              type="button"
              variant="outline"
              onClick={restartDemo}
              className="h-11 rounded-xl text-xs font-mono tracking-wider border-slate-200 text-slate-700 hover:text-black hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="size-3.5 mr-1.5 text-[#087F8C]" />
              REPLAY DEMO
            </Button>
          )}

          <Button
            asChild
            className="h-11 rounded-xl text-xs font-mono tracking-wider bg-[#087F8C] hover:bg-[#076C77] text-white shadow-xs"
          >
            <Link to="/voice">
              <Mic className="size-3.5 mr-1.5 text-[#10A6AE]" />
              FULL SIMULATOR
              <ArrowRight className="size-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
