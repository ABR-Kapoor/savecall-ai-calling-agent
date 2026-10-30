import React from "react";
import { PhoneCall, Brain, ShieldCheck } from "lucide-react";

interface SoundWaveMotifProps {
  variant?: "hero" | "divider" | "nodes" | "bar-pulse";
  className?: string;
  active?: boolean;
}

export function SoundWaveMotif({
  variant = "hero",
  className = "",
  active = true,
}: SoundWaveMotifProps) {
  if (variant === "bar-pulse") {
    const bars = [16, 28, 44, 20, 36, 52, 28, 40, 24, 48, 32, 20];
    return (
      <div className={`flex items-center gap-1 h-8 ${className}`}>
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-[#087F8C] transition-all duration-300"
            style={{
              height: active ? `${Math.max(6, Math.sin((i + 1) * 0.8) * 16 + 18)}px` : "6px",
              opacity: active ? 0.75 + (i % 3) * 0.12 : 0.3,
              animation: active ? `pulseWave 1.4s ease-in-out infinite ${i * 0.08}s` : "none",
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "divider") {
    return (
      <div className={`relative w-full overflow-hidden py-4 ${className}`}>
        <svg
          viewBox="0 0 1200 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-8 text-[#087F8C]/25"
          preserveAspectRatio="none"
        >
          <path
            d="M0 24C150 24 200 4 350 4C500 4 550 44 700 44C850 44 900 12 1050 12C1120 12 1160 24 1200 24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <path
            d="M0 24C180 24 240 38 420 38C600 38 660 10 840 10C1020 10 1080 24 1200 24"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.6"
          />
        </svg>
      </div>
    );
  }

  if (variant === "nodes") {
    return (
      <div className={`relative w-full max-w-2xl mx-auto py-4 sm:py-6 px-2 ${className}`}>
        <div className="flex items-center justify-between relative">
          {/* Animated Connecting Line */}
          <div className="absolute inset-x-10 sm:inset-x-12 top-6 h-0.5 bg-gradient-to-r from-[#087F8C]/30 via-[#10A6AE] to-emerald-500/50" />

          {/* Node 1: Inbound Call */}
          <div className="relative z-10 flex flex-col items-center group">
            <div className="relative size-12 sm:size-14 rounded-2xl border-2 border-[#10A6AE] bg-white flex items-center justify-center text-[#087E8B] shadow-[0_6px_20px_rgba(8,127,140,0.22)] transition-transform group-hover:scale-105">
              <PhoneCall className="size-5 sm:size-6 text-[#087E8B]" />
              <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-[#087F8C] text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-xs">
                01
              </span>
            </div>
            <span className="mt-2.5 text-[10px] sm:text-xs font-bold text-slate-800 tracking-tight">
              Inbound Call
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono hidden sm:block">
              WebRTC / Cellular
            </span>
          </div>

          {/* Mini Sound Bars */}
          <div className="relative z-10 hidden sm:flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border border-[#087F8C]/25 shadow-2xs">
            {[10, 18, 14, 22, 12].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-[#087F8C] rounded-full animate-pulse"
                style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>

          {/* Node 2: AI Receptionist */}
          <div className="relative z-10 flex flex-col items-center group">
            <div className="relative size-12 sm:size-14 rounded-2xl border-2 border-[#087E8B] bg-gradient-to-br from-[#087F8C] to-[#0AA0AE] flex items-center justify-center text-white shadow-[0_8px_24px_rgba(8,127,140,0.35)] transition-transform group-hover:scale-105">
              <Brain className="size-5 sm:size-6 text-white" />
              <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-white text-[#087F8C] text-[9px] font-mono font-bold flex items-center justify-center shadow-xs border border-[#087F8C]/20">
                02
              </span>
            </div>
            <span className="mt-2.5 text-[10px] sm:text-xs font-bold text-[#087F8C] tracking-tight">
              AI Concierge
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono hidden sm:block">
              Grounded RAG
            </span>
          </div>

          {/* Mini Sound Bars */}
          <div className="relative z-10 hidden sm:flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border border-emerald-500/25 shadow-2xs">
            {[12, 20, 16, 24, 10].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-emerald-600 rounded-full animate-pulse"
                style={{ height: `${h}px`, animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>

          {/* Node 3: Booked & Verified */}
          <div className="relative z-10 flex flex-col items-center group">
            <div className="relative size-12 sm:size-14 rounded-2xl border-2 border-emerald-500 bg-white flex items-center justify-center text-emerald-700 shadow-[0_6px_20px_rgba(16,185,129,0.22)] transition-transform group-hover:scale-105">
              <ShieldCheck className="size-5 sm:size-6 text-emerald-600" />
              <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-emerald-600 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-xs">
                03
              </span>
            </div>
            <span className="mt-2.5 text-[10px] sm:text-xs font-bold text-slate-800 tracking-tight">
              Verified Action
            </span>
            <span className="text-[9px] sm:text-[10px] text-emerald-700 font-mono hidden sm:block">
              Audit Persisted
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 800 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-16 text-[#087F8C]"
      >
        <path
          d="M0 60 C 100 20, 150 100, 250 60 C 350 20, 400 95, 500 60 C 600 25, 650 90, 750 60 C 780 50, 795 55, 800 60"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.3"
        />
        <path
          d="M0 60 C 80 40, 180 80, 280 60 C 380 40, 480 80, 580 60 C 680 40, 750 70, 800 60"
          stroke="#10A6AE"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.5"
        />
      </svg>
    </div>
  );
}
