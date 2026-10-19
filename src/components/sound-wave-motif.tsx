import React from "react";

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
      <div className={`relative w-full max-w-2xl mx-auto py-6 ${className}`}>
        <div className="flex items-center justify-between relative">
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-[#087F8C]/20 via-[#10A6AE] to-[#087F8C]/20" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="size-10 rounded-full border-2 border-[#10A6AE] bg-[#172033] flex items-center justify-center text-xs font-mono font-bold text-[#10A6AE] shadow-[0_0_15px_rgba(16,166,174,0.3)]">
              01
            </div>
            <span className="mt-2 text-[11px] font-mono tracking-wider text-slate-300 uppercase">Incoming Call</span>
          </div>

          <div className="relative z-10 hidden sm:flex items-center gap-1 bg-[#172033] px-3 py-1 rounded-full border border-[#087F8C]/40">
            {[12, 22, 16, 26, 14].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-[#10A6AE] rounded-full"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="size-10 rounded-full border-2 border-[#087F8C] bg-[#172033] flex items-center justify-center text-xs font-mono font-bold text-white shadow-[0_0_15px_rgba(8,127,140,0.4)]">
              02
            </div>
            <span className="mt-2 text-[11px] font-mono tracking-wider text-slate-300 uppercase">Anya Receptionist</span>
          </div>

          <div className="relative z-10 hidden sm:flex items-center gap-1 bg-[#172033] px-3 py-1 rounded-full border border-[#087F8C]/40">
            {[14, 26, 18, 22, 12].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-[#10A6AE] rounded-full"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="size-10 rounded-full border-2 border-emerald-400 bg-[#172033] flex items-center justify-center text-xs font-mono font-bold text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              03
            </div>
            <span className="mt-2 text-[11px] font-mono tracking-wider text-slate-300 uppercase">Booked & Verified</span>
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
