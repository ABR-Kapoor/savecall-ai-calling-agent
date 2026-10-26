import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  PhoneCall,
  Mic,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Lock,
  Headphones,
  CheckCircle2,
  LogIn,
  Clock,
  PhoneIncoming,
  Building2,
  FileText,
  AlertCircle,
  Briefcase,
  ChevronRight,
  Database,
  Radio,
  Award,
  Layers,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloatingAuthModal } from "@/components/floating-auth-modal";
import { FloatingNavbar } from "@/components/floating-navbar";
import { InsuranceHeroPanel } from "@/components/insurance-hero-panel";
import { SoundWaveMotif } from "@/components/sound-wave-motif";
import { InsuranceWorkflowShowcase } from "@/components/insurance-workflow-showcase";
import { InsuranceCapabilities } from "@/components/insurance-capabilities";
import HalftoneWordmarkFooter from "@/components/ui/halftone-wordmark-footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InsurCall: AI Voice Employee for Insurance Workflows" },
      {
        name: "description",
        content:
          "Make every insurance conversation clearer, faster to handle, and easier to follow. Autonomous AI voice employee for claims intake, policy enquiries, and human-in-the-loop approvals.",
      },
    ],
  }),
  component: LandingPage,
});

const INSURANCE_FOOTER_COLUMNS = [
  {
    title: "Operations",
    links: [
      { label: "Claims Intake & FNOL", href: "/claims" },
      { label: "Policy Portfolio", href: "/policies" },
      { label: "Staff Approvals Queue", href: "/change-requests" },
      { label: "Audit & Compliance Records", href: "/audit" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Insurance Voice Engine", href: "/voice" },
      { label: "Operations Dashboard", href: "/dashboard" },
      { label: "Assistant Studio", href: "/agent" },
      { label: "Policy Knowledge Store", href: "/train" },
    ],
  },
  {
    title: "Carrier Portal",
    links: [
      { label: "Guided Onboarding", href: "/onboarding" },
      { label: "Tenant Settings", href: "/settings" },
      { label: "Data Governance Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
];

function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("auth=true")) {
      setShowAuth(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#111827] flex flex-col justify-between selection:bg-[#087F8C]/20 font-sans">
      {/* 1. Refined Floating Navbar */}
      <FloatingNavbar onOpenAuth={() => setShowAuth(true)} />

      <main className="flex-1">
        {/* 2. Hero Section: Insurance First */}
        <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-28 sm:pt-36 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#087F8C]/25 bg-[#E6F6F7] px-3.5 py-1 text-xs font-semibold text-[#087F8C]">
              <ShieldCheck className="size-3.5" />
              <span>InsurTech AI Platform : Claims Intake & Policy Servicing</span>
            </div>

            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-[#111827] leading-[1.12]">
              Every insurance call deserves a clear next step.
            </h1>

            <p className="text-lg sm:text-xl font-medium text-[#172033] leading-snug">
              From policy questions to first notice of loss, bring every conversation into a workflow your team can follow.
            </p>

            <p className="text-sm sm:text-base text-[#475467] leading-relaxed max-w-2xl">
              InsurCall helps insurance teams understand policyholder enquiries, collect relevant information, retrieve authorised policy details, and organise follow-up for human review.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                asChild
                size="lg"
                className="bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold text-sm h-12 px-7 rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Link to="/voice">
                  <PhoneCall className="size-4 mr-2" />
                  Experience the insurance call demo
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-slate-200 bg-white hover:bg-slate-50 text-[#111827] text-sm h-12 px-6 rounded-xl font-medium"
              >
                <a href="#claims-workflow">
                  Explore the claims workflow
                  <ArrowRight className="size-4 ml-2" />
                </a>
              </Button>
            </div>

            {/* Three Compact Verified Capability Statements */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-8 mt-6">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                <span className="font-mono text-[10px] text-[#087F8C] uppercase font-bold tracking-wider block">
                  Capability 01
                </span>
                <h4 className="font-display text-sm font-bold text-slate-900 mt-1">
                  Policy Enquiries
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Authorised coverage lookups, sum insured limits, and hospital network checks.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                <span className="font-mono text-[10px] text-[#087F8C] uppercase font-bold tracking-wider block">
                  Capability 02
                </span>
                <h4 className="font-display text-sm font-bold text-slate-900 mt-1">
                  Claims Intake (FNOL)
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  First notice of loss capture, accident reports, and surveyor assignment queuing.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                <span className="font-mono text-[10px] text-[#087F8C] uppercase font-bold tracking-wider block">
                  Capability 03
                </span>
                <h4 className="font-display text-sm font-bold text-slate-900 mt-1">
                  Human-Reviewed Actions
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Mandatory sign-off for payouts, endorsements, and coverage disputes.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Dedicated Insurance Conversation Command Panel */}
          <div className="lg:col-span-5">
            <InsuranceHeroPanel />
          </div>
        </section>

        {/* Subtle Waveform Motif Divider */}
        <SoundWaveMotif variant="divider" />

        {/* 3. Trust and Product Status Statement */}
        <section className="py-14 bg-white border-y border-slate-200/80">
          <div className="max-w-5xl mx-auto px-6 text-center space-y-4">
            <span className="font-mono text-xs font-bold text-[#087F8C] tracking-widest uppercase">
              Operational Governance
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
              Built with care. Designed for real insurance conversations.
            </h2>
            <p className="text-sm sm:text-base text-[#475467] leading-relaxed max-w-3xl mx-auto">
              InsurCall is developed specifically to support insurance operations teams, claims adjusters, and brokers. Answers are strictly grounded in your approved policy schedules, policyholder identities are verified through OTP, and consequential actions remain subject to human supervisor review.
            </p>
          </div>
        </section>

        {/* 4. Signature Editorial Campaign Section (Image A) */}
        <section className="py-24 bg-[#172033] text-white relative overflow-hidden">
          <div className="absolute top-0 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[#087F8C]/15 rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              {/* Editorial Campaign Photography (Image A) */}
              <div className="lg:col-span-7">
                <div className="relative rounded-[32px] overflow-hidden border border-slate-700/80 shadow-2xl group">
                  <img
                    src="/insurance_hero_campaign.jpg"
                    alt="Indian insurance specialist calmly reviewing policy documents with a policyholder in natural daylight"
                    className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-xs text-slate-300 font-mono">
                    <span>Modern Indian Insurance Service Environment</span>
                    <span className="text-[#10A6AE]">Grounded Policy Intelligence</span>
                  </div>
                </div>
              </div>

              {/* Campaign Story Copy */}
              <div className="lg:col-span-5 space-y-6">
                <Badge
                  variant="outline"
                  className="border-[#10A6AE]/40 bg-[#10A6AE]/10 text-[#10A6AE] text-[11px] font-mono tracking-widest uppercase font-semibold"
                >
                  Insurance-Only Architecture
                </Badge>
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Built for the calls that protect Indian policyholders.
                </h2>
                <p className="text-base text-slate-300 leading-relaxed">
                  Technology designed around how Indian insurance operations actually work.
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  When a vehicle is damaged on a highway or a family arrives at a hospital reception, every second matters. InsurCall provides an autonomous voice employee that speaks with empathy, verifies policyholder identity, captures First Notice of Loss with precision, and escalates complex requests to human adjusters without losing context.
                </p>
                <div className="pt-2">
                  <Button
                    asChild
                    className="bg-[#087F8C] hover:bg-[#076C77] text-white font-mono text-xs tracking-wider uppercase h-11 px-6 rounded-xl shadow-xs"
                  >
                    <Link to="/voice">
                      <Mic className="size-3.5 mr-2 text-[#10A6AE]" />
                      TEST LIVE INSURANCE CALL
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Core Workflow Showcase (Section 6) */}
        <InsuranceWorkflowShowcase />

        {/* 6. Insurance Capabilities Showcase (Section 7) */}
        <InsuranceCapabilities />

        {/* 7. Image B & Image C Feature Narrative */}
        <section className="py-24 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
            {/* Row 1: Claims Intake & FNOL Journey (Image B) */}
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-5">
                <Badge variant="outline" className="text-[10px] font-mono uppercase bg-[#E6F6F7] text-[#087F8C] border-[#087F8C]/30">
                  Automated FNOL Pipeline
                </Badge>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                  From Incoming Distress Call to Structured Claims Docket
                </h3>
                <p className="text-sm leading-relaxed text-[#475467]">
                  The platform transforms caller speech into structured claims data: incident coordinates, vehicle or property damage assessments, and police report references.
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                  <div className="rounded-xl border border-slate-200 bg-[#FAF9F6] p-3">
                    <span className="font-mono text-[10px] text-[#087F8C] font-bold block">01 : Intake</span>
                    <span className="text-slate-700 text-[11px] block mt-1">Audio speech recognition tuned for Hinglish & dialects.</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-[#FAF9F6] p-3">
                    <span className="font-mono text-[10px] text-[#087F8C] font-bold block">02 : Output</span>
                    <span className="text-slate-700 text-[11px] block mt-1">Zod-validated schema stored in PostgreSQL claims table.</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-6">
                <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-md">
                  <img
                    src="/insurance_fnol_workflow.jpg"
                    alt="First notice of loss workflow illustration showing transition from audio wave to structured record"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Human Review & Document Verification (Image C) */}
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 order-2 lg:order-1">
                <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-md">
                  <img
                    src="/insurance_human_review.jpg"
                    alt="Human review and document verification illustration showing claims specialist inspecting case details"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
              <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
                <Badge variant="outline" className="text-[10px] font-mono uppercase bg-amber-50 text-amber-800 border-amber-300">
                  Regulatory Compliance
                </Badge>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                  AI Assists the Evidence. Humans Retain Authority.
                </h3>
                <p className="text-sm leading-relaxed text-[#475467]">
                  InsurCall strictly segregates read-only data extraction from consequential insurance commitments. Autonomous operations can never disburse settlement funds or deny coverage without human sign-off.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>Dual-control authorization matrix for high-risk endorsement changes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>Cryptographic audit event logs stored for insurance regulatory inspections</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Institutional Context (IIT Bhilai Incubated) */}
        <section className="py-12 bg-white border-b border-slate-200/80">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-[#FAF9F6] px-4 py-1.5 text-xs text-slate-700 shadow-2xs">
              <Award className="size-4 text-[#087F8C]" />
              <span className="font-semibold text-slate-900">IIT Bhilai-Backed Venture Building</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500 font-mono text-[11px]">Deep-Tech Voice AI & Insurance Governance Incubation</span>
            </div>
          </div>
        </section>

        {/* 9. Final CTA: Make Every Insurance Conversation Count */}
        <section className="py-24 bg-[#172033] text-white relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
            {/* Waveform connecting into nodes */}
            <SoundWaveMotif variant="nodes" />

            <div className="space-y-4 pt-4">
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Make every insurance conversation count.
              </h2>
              <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
                Give your policyholders a clearer path to the right answer.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold text-sm h-12 px-8 rounded-xl shadow-xs"
              >
                <Link to="/voice">
                  <PhoneCall className="size-4 mr-2 text-[#10A6AE]" />
                  Experience the insurance call demo
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowAuth(true)}
                className="border-slate-700 bg-transparent text-slate-200 hover:text-white hover:bg-slate-800 text-sm h-12 px-6 rounded-xl font-medium cursor-pointer"
              >
                <LogIn className="size-4 mr-2" />
                Sign in to Console
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Halftone Wordmark Interactive Footer */}
      <HalftoneWordmarkFooter
        wordmark="insurcall"
        label="InsurCall Platform"
        meta="2026 : Autonomous AI Voice Employee for Insurance Operations"
        columns={INSURANCE_FOOTER_COLUMNS}
        preset="paper"
        palette={{
          background: "#FAF9F6",
          ink: "#111827",
          warm: "#087F8C",
        }}
        height="500px"
      />

      {/* Floating Auth Modal Component */}
      <FloatingAuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
