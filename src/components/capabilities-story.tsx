import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Mic,
  Database,
  CalendarCheck,
  FileCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SoundWaveMotif } from "@/components/sound-wave-motif";

export function CapabilitiesStory() {
  return (
    <section id="capabilities" className="py-24 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <Badge
            variant="outline"
            className="border-[#087F8C]/30 bg-[#E6F6F7] text-[#087F8C] text-[11px] font-mono tracking-wider uppercase mb-3 font-semibold"
          >
            Core Capabilities
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827]">
            More than answering a call.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#344054] leading-relaxed">
            Help turn customer conversations into organised, useful next steps for your team.
          </p>
        </div>

        {/* Narrative A: Wide Interface Showcase - Natural Voice Conversations */}
        <div className="rounded-[32px] border border-slate-200/90 bg-[#FAF9F6] p-8 sm:p-12 shadow-sm mb-12">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="font-mono text-xs font-bold text-[#087F8C] tracking-wider uppercase">
                01 : Natural Voice Flow
              </span>
              <h3 className="font-display text-2xl font-bold text-[#111827]">
                Make conversations feel natural.
              </h3>
              <p className="text-sm leading-relaxed text-[#475467]">
                Callers speak in everyday English, Hindi, or conversational Hinglish. Anya listens, recognizes intent in realtime, and responds politely with natural intonation.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-[#344054]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#087F8C] shrink-0" />
                  <span>Real-time speech synthesis tuned for Indian phone accents</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#087F8C] shrink-0" />
                  <span>Low-turn latency with polite turn-taking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#087F8C] shrink-0" />
                  <span>Immediate fallback to human staff when caller requests help</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-xs font-bold text-slate-800">Listening to Caller</span>
                  </div>
                  <SoundWaveMotif variant="bar-pulse" active={true} />
                </div>
                <div className="space-y-3 font-sans text-xs">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                      Caller (Hindi-English mix)
                    </span>
                    <p className="text-slate-800 font-medium">
                      "Namaste, mujhe mere cashless claim ka status check karna tha. Policy number 90214."
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#E6F6F7]/70 border border-[#087F8C]/20 p-3">
                    <span className="font-mono text-[10px] text-[#087F8C] uppercase tracking-wider block mb-1">
                      Anya (Voice Assistant)
                    </span>
                    <p className="text-slate-900 font-medium">
                      "Namaste! Policy number 90214 par cashless claim actively processed ho chuka hai. Main aapko summary SMS par bhej rahi hoon."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Narrative B & C: Asymmetric Split Grid */}
        <div className="grid lg:grid-cols-12 gap-8 mb-12">
          {/* Narrative B: Business Knowledge Grounding (7 cols) */}
          <div className="lg:col-span-7 rounded-[32px] border border-slate-200/90 bg-[#FAF9F6] p-8 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <span className="font-mono text-xs font-bold text-[#087F8C] tracking-wider uppercase">
                02 : Grounded Intelligence
              </span>
              <h3 className="font-display text-2xl font-bold text-[#111827]">
                Answer from your business knowledge.
              </h3>
              <p className="text-sm leading-relaxed text-[#475467]">
                Upload your clinic consultation hours, price list, or insurance FAQs. The assistant strictly references your verified business documents before answering.
              </p>

              {/* Visual: Knowledge Source Panel beside conversation */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs mt-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Database className="size-3.5 text-[#087F8C]" /> Verified Knowledge Store
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200">
                    42 Ingested Documents
                  </Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                      Approved Fact #14
                    </span>
                    <p className="text-slate-800 font-medium text-[11px] mt-1">
                      Doctor consultation slots run Mon-Sat from 10:00 AM to 7:00 PM. Sunday by appointment only.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#087F8C]/20 bg-[#E6F6F7]/50 p-3">
                    <span className="font-mono text-[10px] text-[#087F8C] uppercase tracking-wider block">
                      Assistant Query Answer
                    </span>
                    <p className="text-slate-900 font-medium text-[11px] mt-1">
                      "Dr. Sharma is available until 7 PM today. Would you like me to reserve the 5:30 PM slot?"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button asChild variant="outline" size="sm" className="rounded-xl border-slate-200 text-xs font-mono">
                <Link to="/train">
                  EXPLORE KNOWLEDGE INGESTION <ArrowRight className="size-3 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Narrative C: Structured Enquiry Capture (5 cols) */}
          <div className="lg:col-span-5 rounded-[32px] border border-slate-200/90 bg-[#FAF9F6] p-8 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <span className="font-mono text-xs font-bold text-[#087F8C] tracking-wider uppercase">
                03 : Actionable Data
              </span>
              <h3 className="font-display text-2xl font-bold text-[#111827]">
                Turn conversations into useful next steps.
              </h3>
              <p className="text-sm leading-relaxed text-[#475467]">
                Never let valuable details slip away. Every enquiry automatically captures the customer's intent, requested service, and preferred contact time.
              </p>

              {/* Structured enquiry summary card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5 shadow-xs mt-4 text-xs">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 block border-b border-slate-100 pb-1.5">
                  Extracted Customer Ticket
                </span>
                <div className="flex justify-between py-1 border-b border-slate-100/70">
                  <span className="text-slate-500 font-mono text-[11px]">Caller:</span>
                  <span className="font-semibold text-slate-900">Rajesh Verma</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100/70">
                  <span className="text-slate-500 font-mono text-[11px]">Requested Service:</span>
                  <span className="font-semibold text-[#087F8C]">Health Cover Renewal</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100/70">
                  <span className="text-slate-500 font-mono text-[11px]">Preferred Time:</span>
                  <span className="font-semibold text-slate-900">Tomorrow at 11:30 AM</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-mono text-[11px]">Follow-up Status:</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Queued for Advisor
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <span className="text-[11px] font-mono text-slate-500">Auto-synced with CRM & operations webhook</span>
            </div>
          </div>
        </div>

        {/* Narrative D: Call Summaries & Records */}
        <div className="rounded-[32px] border border-slate-200/90 bg-[#172033] text-white p-8 sm:p-10 shadow-md">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="font-mono text-xs font-bold text-[#10A6AE] tracking-wider uppercase">
                04 : Complete Auditability
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Keep the important details within reach.
              </h3>
              <p className="text-sm leading-relaxed text-slate-300">
                Review call recordings, exact verbatim transcripts, and risk evaluations in one unified dashboard. Your staff maintains complete oversight of every client exchange.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Button asChild size="sm" className="bg-[#087F8C] hover:bg-[#076C77] text-white font-mono text-xs rounded-xl">
                  <Link to="/audit">VIEW AUDIT CONSOLE</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="border-slate-700 bg-transparent text-slate-200 hover:text-white hover:bg-slate-800 font-mono text-xs rounded-xl">
                  <Link to="/dashboard">OPEN DASHBOARD</Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-700 bg-[#111827] p-5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span>Call Session #CS-84910</span>
                  <span className="text-emerald-400">STATUS: COMPLETED</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">DURATION</span>
                    <span className="text-white font-semibold">02m 14s</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">LANGUAGE</span>
                    <span className="text-white font-semibold">Hindi/Hinglish</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">OUTCOME</span>
                    <span className="text-emerald-400 font-semibold">Verified</span>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-slate-300 text-[11px]">
                  <span className="text-slate-500 block text-[10px] mb-1">CONCISE SUMMARY</span>
                  "Caller requested clarification regarding dental rider coverage. Assistant confirmed ₹15,000 yearly benefit and sent network clinic list via SMS."
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
