import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  PhoneCall,
  PhoneOff,
  Mic,
  Volume2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  AlertCircle,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SoundWaveMotif } from "@/components/sound-wave-motif";

export function InsuranceHeroPanel() {
  const [callState, setCallState] = useState<"idle" | "connecting" | "live" | "completed">("live");
  const [callTimer, setCallTimer] = useState(38);

  useEffect(() => {
    let interval: any;
    if (callState === "live") {
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const toggleCall = () => {
    if (callState === "live") {
      setCallState("completed");
    } else {
      setCallState("connecting");
      setTimeout(() => {
        setCallState("live");
        setCallTimer(0);
      }, 700);
    }
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, "0");
    const secs = (s % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <div className="relative rounded-[32px] border border-slate-200/90 bg-white shadow-[0_24px_55px_-12px_rgba(8,127,140,0.16)] overflow-hidden transition-all duration-300 hover:shadow-[0_28px_65px_-10px_rgba(8,127,140,0.22)]">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-[#FAF9F6] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            {callState === "live" && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex size-2.5 rounded-full ${
                callState === "live"
                  ? "bg-emerald-500"
                  : callState === "connecting"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-slate-400"
              }`}
            />
          </span>
          <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-slate-800">
            {callState === "live"
              ? "Live Insurance Call"
              : callState === "connecting"
              ? "Connecting Carrier Line"
              : "Call Completed"}
          </span>
        </div>

        <Badge
          variant="outline"
          className="border-[#087F8C]/30 bg-[#E6F6F7] text-[10px] font-mono tracking-wider text-[#087F8C] uppercase font-semibold"
        >
          Interactive Simulation
        </Badge>
      </div>

      <div className="p-6 space-y-4">
        {/* Caller, Policy & Assistant Context */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-[#FAF9F6] p-3.5 text-xs">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Policyholder
            </span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-slate-400" />
              <span className="font-bold text-slate-900">Vikramaditya Sen</span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
              <span>POL-MOT-2024-8842</span>
            </div>
          </div>

          <div className="border-l border-slate-200/80 pl-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              AI Operations Voice
            </span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#087F8C]" />
              <span className="font-bold text-[#087F8C]">Anya (Claims Specialist)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">English + Hindi</span>
          </div>
        </div>

        {/* Real-time Audio Waveform & Status */}
        <div className="flex items-center justify-between px-2 py-0.5">
          <div className="flex items-center gap-2">
            <Volume2 className="size-4 text-[#087F8C]" />
            <SoundWaveMotif variant="bar-pulse" active={callState === "live"} />
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
            <Clock className="size-3 text-slate-500" />
            <span>{callState === "live" ? formatTimer(callTimer) : "01:14"}</span>
          </div>
        </div>

        {/* Illustrative Verbatim Transcript */}
        <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-white p-4 text-xs shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Illustrative Dialogue</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <UserCheck className="size-3" /> Identity OTP Verified
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 shrink-0 mt-0.5">
                Policyholder:
              </span>
              <p className="text-[11.5px] leading-relaxed text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                "I submitted my motor claim last week. Can you check what happens next?"
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#087F8C] shrink-0 mt-0.5">
                InsurCall:
              </span>
              <p className="text-[11.5px] leading-relaxed text-slate-900 bg-[#E6F6F7]/70 px-3 py-1.5 rounded-xl border border-[#087F8C]/20">
                "I can help check the available claim status. I will first verify the relevant policy or claim reference."
              </p>
            </div>
          </div>
        </div>

        {/* Structured Workflow Tracking Output */}
        <div className="rounded-2xl border border-slate-200/90 bg-[#FAF9F6] p-3 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-mono text-[10px] uppercase tracking-wider">Detected Intent:</span>
            <span className="font-semibold text-slate-900">Motor Claim Status Enquiry</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-mono text-[10px] uppercase tracking-wider">Claim Reference:</span>
            <span className="font-mono font-semibold text-[#087F8C]">CLM-2026-0914</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-mono text-[10px] uppercase tracking-wider">Workflow Stage:</span>
            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
              Surveyor Assessment Completed
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={toggleCall}
            className="h-11 rounded-xl text-xs font-mono tracking-wider border-slate-200 text-slate-700 hover:text-black hover:bg-slate-100 cursor-pointer"
          >
            {callState === "live" ? (
              <>
                <PhoneOff className="size-3.5 mr-1.5 text-rose-600" />
                END CALL
              </>
            ) : (
              <>
                <PhoneCall className="size-3.5 mr-1.5 text-[#087F8C]" />
                RESTART CALL
              </>
            )}
          </Button>

          <Button
            asChild
            className="h-11 rounded-xl text-xs font-mono tracking-wider bg-[#087F8C] hover:bg-[#076C77] text-white shadow-xs"
          >
            <Link to="/voice">
              <Mic className="size-3.5 mr-1.5 text-[#10A6AE]" />
              LAUNCH SIMULATOR
              <ArrowRight className="size-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
