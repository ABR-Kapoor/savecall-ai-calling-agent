import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  PhoneCall,
  Mic,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  LogIn,
  Award,
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
      { label: "Data Governance Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
  {
    title: "Legal & Compliance",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "AI Assistant Disclosure", href: "/ai-disclosure" },
      { label: "Data Processing", href: "/data-processing" },
      { label: "Subprocessors", href: "/subprocessors" },
      { label: "Data Rights", href: "/data-rights" },
      { label: "Grievance & Support", href: "/grievance" },
      { label: "Security", href: "/security" },
      { label: "Retention", href: "/retention" },
      { label: "Consent & Preferences", href: "/consent-preferences" },
      { label: "Insurance Disclosures", href: "/insurance-disclosures" },
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
    <div className="min-h-screen bg-[#FAF9F6] text-[#111827] flex flex-col justify-between selection:bg-[#087F8C]/20 font-sans landing">
      {/* 1. Refined Floating Navbar */}
      <FloatingNavbar onOpenAuth={() => setShowAuth(true)} />

      <main className="flex-1">
        {/* 2. Hero: Insurance conversations, made actionable */}
        <section className="relative isolate overflow-hidden bg-[#FAF9F6]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-48 top-8 size-[34rem] rounded-full bg-[#087F8C]/[0.07] blur-[110px]" />
            <div className="absolute -right-40 -top-48 size-[38rem] rounded-full bg-[#D9EBE8]/70 blur-[100px]" />
            <div className="absolute inset-0 opacity-[0.22] [background-image:radial-gradient(#9CAFA9_0.7px,transparent_0.7px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-28 sm:pt-32 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:pb-24 lg:pt-36">
            <div className="relative z-10 max-w-xl">
              <div className="landing-rise mb-7 inline-flex items-center gap-2.5 rounded-full border border-[#087F8C]/20 bg-white/80 px-3.5 py-2 text-[11px] font-semibold tracking-wide text-[#087F8C] shadow-sm backdrop-blur" style={{ animationDelay: "0ms" }}>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#087F8C]/45 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#087F8C]" />
                </span>
                VOICE AI, BUILT FOR INSURANCE
              </div>

              <h1 className="landing-rise text-balance-tight font-display text-[2.75rem] font-semibold leading-[1.06] tracking-[-0.055em] text-[#142B2D] sm:text-6xl lg:text-[4.2rem]" style={{ animationDelay: "120ms" }}>
                Every call can move a claim <span className="text-[#087F8C]">forward.</span>
              </h1>

              <p className="landing-rise mt-6 max-w-lg text-base leading-7 text-[#536466] sm:text-lg sm:leading-8" style={{ animationDelay: "240ms" }}>
                InsurCall helps insurance teams handle policy questions and capture claims details—then brings people in when a decision needs human review.
              </p>

              <div className="landing-rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "360ms" }}>
                <Button asChild size="lg" className="h-12 rounded-xl bg-[#087F8C] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(8,127,140,0.65)] transition-all hover:-translate-y-0.5 hover:bg-[#076C77] hover:shadow-[0_12px_24px_-8px_rgba(8,127,140,0.55)] active:translate-y-0">
                  <Link to="/voice">
                    <PhoneCall className="mr-2 size-4" />
                    Start a voice demo
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-[#D8E1DE] bg-white/70 px-5 text-sm font-semibold text-[#243B3D] transition-all hover:-translate-y-0.5 hover:border-[#087F8C]/40 hover:bg-white">
                  <a href="#claims-workflow">See how claims intake works <ArrowRight className="ml-2 size-4" /></a>
                </Button>
              </div>

              <div className="landing-rise mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#DCE4E0] pt-5 text-xs font-medium text-[#536466]" style={{ animationDelay: "480ms" }}>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#087F8C]" /> Answers grounded in approved information</span>
                <span className="inline-flex items-center gap-2"><UserCheck className="size-4 text-[#087F8C]" /> People review consequential actions</span>
              </div>
            </div>

            <div className="landing-rise relative z-10 mx-auto w-full max-w-[590px] lg:ml-auto" style={{ animationDelay: "220ms" }}>
              <div aria-hidden="true" className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-gradient-to-br from-[#CFE8E3]/70 via-white/20 to-[#E5EBDD]/60 blur-2xl" />
              <InsuranceHeroPanel />
            </div>
          </div>
        </section>

        {/* Subtle Waveform Motif Divider */}
        <SoundWaveMotif variant="divider" />

        {/* 3. Trust and Product Status Statement */}
        <section id="trust" className="py-14 bg-white border-y border-slate-200/80">
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
        <section className="py-24 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[#087F8C]/10 rounded-full blur-[140px] pointer-events-none" />

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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#172033]/70 via-transparent to-transparent pointer-events-none" />
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
                  className="border-[#087E8B]/30 bg-[#E6F5F6] text-[#087E8B] text-[11px] font-mono tracking-widest uppercase font-semibold"
                >
                  Insurance-Only Architecture
                </Badge>
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827] leading-tight">
                  Built for the calls that protect Indian policyholders.
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  Technology designed around how Indian insurance operations actually work.
                </p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  When a vehicle is damaged on a highway or a family arrives at a hospital reception, every second matters. InsurCall provides an autonomous voice employee that speaks with empathy, verifies policyholder identity, captures First Notice of Loss with precision, and escalates complex requests to human adjusters without losing context.
                </p>
                <div className="pt-2">
                  <Button
                    asChild
                    className="bg-[#087F8C] hover:bg-[#076C77] text-white font-mono text-xs tracking-wider uppercase h-11 px-6 rounded-xl shadow-xs"
                  >
                    <Link to="/voice">
                      <Mic className="size-3.5 mr-2 text-white" />
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
        <section className="py-24 bg-white relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
            {/* Waveform connecting into nodes */}
            <SoundWaveMotif variant="nodes" />

            <div className="space-y-4 pt-4">
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111827] leading-tight">
                Make every insurance conversation count.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
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
                  <PhoneCall className="size-4 mr-2 text-white" />
                  Experience the insurance call demo
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowAuth(true)}
                className="border-slate-200 bg-white text-[#111827] hover:bg-slate-50 hover:text-[#111827] text-sm h-12 px-6 rounded-xl font-medium cursor-pointer"
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
