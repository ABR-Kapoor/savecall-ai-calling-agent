import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, FileText, Mic, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const callSteps = [
  { number: "01", title: "Understand the request", detail: "Policy question or claim intake", icon: FileText },
  { number: "02", title: "Use approved information", detail: "Keep the answer grounded", icon: ShieldCheck },
  { number: "03", title: "Route the next step", detail: "Bring a person in when needed", icon: UserRoundCheck },
];

/** Honest overview of the real voice demo and the workflow it is built to support. */
export function InsuranceHeroPanel() {
  return (
    <section
      aria-label="InsurCall voice demo"
      className="overflow-hidden rounded-[1.5rem] border border-[#D5E0DB] bg-white shadow-[0_28px_80px_-42px_rgba(20,43,45,0.48)]"
    >
      <div className="relative isolate overflow-hidden bg-[#123B3D] px-6 pb-6 pt-5 text-white sm:px-7 sm:pb-7 sm:pt-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_92%_8%,rgba(104,187,158,0.26),transparent_38%),linear-gradient(115deg,#123B3D_10%,#174947_100%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 -z-10 size-64 rounded-full border border-white/[0.08]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-4 -top-16 -z-10 size-40 rounded-full border border-white/[0.08]" />

        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#B5D8CB]">
            <span className="grid size-6 place-items-center rounded-md bg-white/10"><Mic className="size-3.5" /></span>
            InsurCall voice
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/10 px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-white/75">
            <span className="size-1.5 rounded-full bg-[#8BD7B7]" /> Browser demo
          </span>
        </div>

        <div className="mt-7 max-w-sm">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">A voice experience for insurance</p>
          <h2 className="mt-2 font-display text-[1.6rem] font-semibold leading-[1.12] tracking-[-0.035em] text-white sm:text-[1.85rem]">
            Start with a question. Leave with a next step.
          </h2>
        </div>

        <div aria-hidden="true" className="mt-6 flex h-9 items-center gap-[3px] opacity-75">
          {[9, 14, 20, 12, 27, 17, 31, 13, 22, 34, 16, 25, 12, 29, 18, 33, 13, 23, 10, 19, 29, 14, 21, 9, 16, 25, 12, 20, 8, 14, 23, 11, 17, 8, 13, 20, 10, 15, 7, 12].map((height, index) => (
            <span key={index} className="w-[3px] shrink-0 rounded-full bg-[#91D6B7]" style={{ height: `${height}px` }} />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.13em] text-white/45">
          <span>Voice in</span><span>Structured follow-through</span>
        </div>
      </div>

      <div className="bg-[linear-gradient(180deg,#FCFDFC_0%,#F8FAF8_100%)] px-5 py-5 sm:px-7 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#71807A]">What the call supports</p>
          <span className="text-[10px] font-medium text-[#89958F]">A guided live demo</span>
        </div>

        <ol className="relative space-y-1 before:absolute before:bottom-5 before:left-[15px] before:top-5 before:w-px before:bg-[#DCE6E0]">
          {callSteps.map(({ number, title, detail, icon: Icon }) => (
            <li key={number} className="relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-200 hover:bg-white">
              <span className="relative z-10 grid size-[30px] shrink-0 place-items-center rounded-full border border-[#DCE6E0] bg-[#F8FAF8] text-[#43806D]">
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-[#30423D]">{title}</span>
                <span className="mt-0.5 block text-[11px] text-[#78867F]">{detail}</span>
              </span>
              <span className="font-mono text-[9px] text-[#A8B2AC]">{number}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-col gap-3 border-t border-[#E5EBE7] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-[10px] leading-relaxed text-[#7E8B85]">
            <Mic className="mt-0.5 size-3.5 shrink-0 text-[#528271]" />
            <span>Your browser will ask before microphone access.</span>
          </div>
          <Button asChild className="h-10 shrink-0 rounded-xl bg-[#087F8C] px-4 text-xs font-semibold text-white shadow-[0_7px_18px_-9px_rgba(8,127,140,0.75)] transition-all hover:-translate-y-0.5 hover:bg-[#076C77] hover:shadow-[0_11px_22px_-10px_rgba(8,127,140,0.75)] active:translate-y-0">
            <Link to="/voice">Start voice demo <ArrowRight className="ml-2 size-3.5" /></Link>
          </Button>
        </div>
        <p className="mt-3 text-[10px] text-[#A0AAA4]">Live voice session · You control when it starts</p>
      </div>
    </section>
  );
}
