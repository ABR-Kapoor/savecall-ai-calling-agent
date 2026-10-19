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
  Stethoscope,
  Scissors,
  Briefcase,
  ChevronRight,
  Database,
  Radio,
  Award,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloatingAuthModal } from "@/components/floating-auth-modal";
import { FloatingNavbar } from "@/components/floating-navbar";
import { HeroCallInterface } from "@/components/hero-call-interface";
import { SoundWaveMotif } from "@/components/sound-wave-motif";
import { CapabilitiesStory } from "@/components/capabilities-story";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InsurCall: AI Voice Receptionist for Indian Businesses" },
      {
        name: "description",
        content:
          "Give your business an AI receptionist that can answer enquiries, capture customer intent, and help your team stay on top of conversations in English, Hindi, and Hinglish.",
      },
    ],
  }),
  component: LandingPage,
});

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Set up your receptionist",
    desc: "Choose your assistant name, select natural tone, and configure English, Hindi, or conversational Hinglish.",
  },
  {
    step: "02",
    title: "Add your business knowledge",
    desc: "Provide relevant FAQs, service catalogs, and approved operating hours through the guided ingestion console.",
  },
  {
    step: "03",
    title: "Test a conversation",
    desc: "Run an interactive browser-based test call to hear voice quality, intonation, and answer accuracy in real time.",
  },
  {
    step: "04",
    title: "Connect your calling channel",
    desc: "Forward your existing business telephone number or link your dedicated calling line to start taking calls.",
  },
];

const USE_CASES_DATA = [
  {
    image: "/usecase_clinic.jpg",
    tag: "Healthcare & Clinics",
    title: "Help patients find the right next step.",
    desc: "Answers patient inquiries about doctor consultation hours, confirms appointments, and explains clinic location details politely.",
    sample: "Can I check appointment availability for tomorrow afternoon?",
  },
  {
    image: "/usecase_salon.jpg",
    tag: "Salons & Wellness",
    title: "Make booking enquiries easier to manage.",
    desc: "Handles incoming booking requests, explains treatment pricing transparently, and coordinates reschedules without interrupting stylists.",
    sample: "I would like to book a hair spa slot for 4 PM today.",
  },
  {
    image: "/usecase_insurance.jpg",
    tag: "Insurance & Advisory",
    title: "Help organise policy and service enquiries.",
    desc: "Retrieves active coverage specifics, guides policyholders through initial claims, and flags complex requests for staff review.",
    sample: "What is my cashless coverage limit for dental treatment?",
  },
  {
    image: "/usecase_services.jpg",
    tag: "Local Service Providers",
    title: "Keep customer requests from getting lost.",
    desc: "Captures customer requirement specifics, confirms service addresses, and logs urgent dispatch requests for team callback.",
    sample: "Need an emergency technician at my clinic by 6 PM.",
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
        {/* 2. Hero Section */}
        <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-28 sm:pt-36 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#087F8C]/25 bg-[#E6F6F7] px-3.5 py-1 text-xs font-semibold text-[#087F8C]">
              <Sparkles className="size-3.5" />
              <span>Built for Indian business conversations : Bilingual English & Hindi</span>
            </div>

            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-[#111827] leading-[1.12]">
              Every missed call is a customer you may never get back.
            </h1>

            <p className="text-base sm:text-lg text-[#344054] leading-relaxed max-w-2xl">
              Give your business an AI receptionist that can answer enquiries, capture customer intent, and help your team stay on top of conversations.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                asChild
                size="lg"
                className="bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold text-sm h-12 px-7 rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Link to="/voice">
                  <PhoneCall className="size-4 mr-2" />
                  Try an interactive demo
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-slate-200 bg-white hover:bg-slate-50 text-[#111827] text-sm h-12 px-6 rounded-xl font-medium"
              >
                <a href="#how-it-works">
                  See how it works
                  <ArrowRight className="size-4 ml-2" />
                </a>
              </Button>
            </div>

            {/* Factual, Verified Value Metrics */}
            <dl className="grid grid-cols-3 gap-6 border-t border-slate-200 pt-8 mt-8">
              <div>
                <dt className="font-display text-2xl font-bold text-[#087F8C]">24 / 7</dt>
                <dd className="text-xs text-[#667085] mt-1 font-medium">Instant Call Response</dd>
              </div>
              <div>
                <dt className="font-display text-2xl font-bold text-[#111827]">EN + HI</dt>
                <dd className="text-xs text-[#667085] mt-1 font-medium">English, Hindi & Hinglish</dd>
              </div>
              <div>
                <dt className="font-display text-2xl font-bold text-emerald-700">100%</dt>
                <dd className="text-xs text-[#667085] mt-1 font-medium">Approved Knowledge Facts</dd>
              </div>
            </dl>
          </div>

          {/* Right Column: Hero Interactive Call Interface */}
          <div className="lg:col-span-5">
            <HeroCallInterface />
          </div>
        </section>

        {/* Subtle Waveform Motif Divider */}
        <SoundWaveMotif variant="divider" />

        {/* 3. Trust and Value Statement */}
        <section className="py-14 bg-white border-y border-slate-200/80">
          <div className="max-w-5xl mx-auto px-6 text-center space-y-4">
            <span className="font-mono text-xs font-bold text-[#087F8C] tracking-widest uppercase">
              Trust & Realism
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
              Built with care. Designed for real conversations.
            </h2>
            <p className="text-sm sm:text-base text-[#475467] leading-relaxed max-w-3xl mx-auto">
              InsurCall is developed to support customer-call workflows for real Indian businesses. Answers are strictly grounded in your approved company documents, customer requests are systematically recorded, and calls can be transferred to human staff at any moment.
            </p>
          </div>
        </section>

        {/* 4. Signature Indian Brand Story Section */}
        <section className="py-24 bg-[#172033] text-white relative overflow-hidden">
          {/* Subtle Ambient Teal Radial Glow */}
          <div className="absolute top-0 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[#087F8C]/15 rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              {/* Editorial Campaign Photography */}
              <div className="lg:col-span-7">
                <div className="relative rounded-[32px] overflow-hidden border border-slate-700/80 shadow-2xl group">
                  <img
                    src="/campaign_indian_business.jpg"
                    alt="Indian small business receptionist calmly handling customer calls in natural morning light"
                    className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-xs text-slate-300 font-mono">
                    <span>Contemporary Indian Service Environment</span>
                    <span className="text-[#10A6AE]">Natural Response Flow</span>
                  </div>
                </div>
              </div>

              {/* Campaign Story Copy */}
              <div className="lg:col-span-5 space-y-6">
                <Badge
                  variant="outline"
                  className="border-[#10A6AE]/40 bg-[#10A6AE]/10 text-[#10A6AE] text-[11px] font-mono tracking-widest uppercase font-semibold"
                >
                  Made for India
                </Badge>
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Built for the calls that keep India moving.
                </h2>
                <p className="text-base text-slate-300 leading-relaxed">
                  Technology designed around how Indian businesses actually work.
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  From neighborhood health clinics and appointment salons to insurance advisory desks and emergency service contractors, every conversation counts. InsurCall provides an autonomous voice employee that speaks with warmth, listens with patience, and never leaves a customer hanging on hold.
                </p>
                <div className="pt-2">
                  <Button
                    asChild
                    className="bg-[#087F8C] hover:bg-[#076C77] text-white font-mono text-xs tracking-wider uppercase h-11 px-6 rounded-xl shadow-xs"
                  >
                    <Link to="/voice">
                      <Mic className="size-3.5 mr-2 text-[#10A6AE]" />
                      EXPERIENCE IN YOUR BROWSER
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Core Product Capabilities (Varied Layout Story) */}
        <CapabilitiesStory />

        {/* 6. How It Works (Sequence Timeline) */}
        <section id="how-it-works" className="py-24 bg-[#FAF9F6]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <div className="max-w-3xl mb-16">
              <Badge
                variant="outline"
                className="border-[#087F8C]/30 bg-[#E6F6F7] text-[#087F8C] text-[11px] font-mono tracking-wider uppercase mb-3 font-semibold"
              >
                Clear Implementation Path
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827]">
                From setup to your first conversation.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[#344054] leading-relaxed">
                A simple four-step workflow to get your AI receptionist taking live customer calls.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
              {HOW_IT_WORKS_STEPS.map((s, idx) => (
                <div
                  key={s.step}
                  className="rounded-[28px] border border-slate-200/90 bg-white p-7 shadow-xs hover:shadow-md hover:border-[#087F8C]/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-[#087F8C] tracking-wider uppercase block">
                      Step {s.step}
                    </span>
                    <h3 className="mt-3 font-display text-lg font-bold text-[#111827]">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-xs leading-relaxed text-[#667085]">
                      {s.desc}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                    <span>Phase {idx + 1} of 4</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Industry Use Cases with High-End Editorial Visuals */}
        <section id="use-cases" className="py-24 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <div className="max-w-3xl mb-16">
              <Badge
                variant="outline"
                className="border-[#087F8C]/30 bg-[#E6F6F7] text-[#087F8C] text-[11px] font-mono tracking-wider uppercase mb-3 font-semibold"
              >
                Locally Relevant
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827]">
                Made for the businesses behind everyday life.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[#344054] leading-relaxed">
                See how InsurCall manages conversations across essential Indian appointment and enquiry sectors.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {USE_CASES_DATA.map((u) => (
                <div
                  key={u.tag}
                  className="group rounded-[28px] border border-slate-200/90 bg-[#FAF9F6] overflow-hidden shadow-xs hover:shadow-md hover:border-[#087F8C]/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Visual: Photography */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      <img
                        src={u.image}
                        alt={u.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="rounded-full bg-white/90 backdrop-blur-md px-3 py-1 font-mono text-[10px] font-bold text-slate-900 shadow-xs uppercase tracking-wider">
                          {u.tag}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="font-display text-base font-bold text-[#111827] leading-snug">
                        {u.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-[#667085]">
                        {u.desc}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-700 italic">
                      <span className="font-mono text-[10px] not-italic text-[#087F8C] font-semibold block mb-0.5">
                        Typical Enquiry:
                      </span>
                      "{u.sample}"
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Interactive Demo Deep-Dive */}
        <section className="py-24 bg-[#FAF9F6]">
          <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
            <Badge
              variant="outline"
              className="border-[#087F8C]/30 bg-[#E6F6F7] text-[#087F8C] text-[11px] font-mono tracking-wider uppercase font-semibold"
            >
              Interactive Product Preview
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827]">
              Hear how a better first response feels.
            </h2>
            <p className="text-base text-[#475467] max-w-2xl mx-auto leading-relaxed">
              Launch our voice simulator directly inside your browser. Speak naturally, ask clinic or policy questions, and observe automated intent extraction with real-time audio playback.
            </p>

            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold text-sm h-12 px-8 rounded-xl shadow-xs"
              >
                <Link to="/voice">
                  <Mic className="size-4 mr-2" />
                  Launch Voice Simulator
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowAuth(true)}
                className="border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm h-12 px-6 rounded-xl font-medium cursor-pointer"
              >
                <LogIn className="size-4 mr-2" />
                Open Workspace Console
              </Button>
            </div>
          </div>
        </section>

        {/* 9. Institutional Context: Text-only, restrained */}
        <section className="py-12 bg-white border-t border-slate-200/80">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs text-slate-700">
              <Award className="size-4 text-[#087F8C]" />
              <span className="font-semibold text-slate-900">IIT Bhilai-Backed Venture Building</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500 font-mono text-[11px]">Deep-Tech Voice & AI Incubation</span>
            </div>
          </div>
        </section>

        {/* 10. Final CTA with Connected Waveform Nodes */}
        <section className="py-24 bg-[#172033] text-white relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
            {/* Waveform connecting into nodes */}
            <SoundWaveMotif variant="nodes" />

            <div className="space-y-4 pt-4">
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Make every conversation count.
              </h2>
              <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
                Give your customers a clearer path to the right answer.
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
                  Try an interactive demo
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

      {/* 11. Complete, Quietly Confident Footer */}
      <footer className="border-t border-slate-200 bg-[#FAF9F6] py-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-slate-200">
            {/* Brand column */}
            <div className="col-span-2 space-y-4">
              <Link to="/" className="flex items-center gap-2.5">
                <img
                  src="/01_logo_only_transparent.png"
                  alt="InsurCall Logo"
                  className="h-8 w-auto object-contain"
                />
                <span className="font-display text-lg font-extrabold tracking-tight text-[#111827]">
                  Insur<span className="text-[#087F8C]">Call</span>
                </span>
              </Link>
              <p className="text-xs text-[#667085] leading-relaxed max-w-sm">
                Autonomous AI voice receptionist platform helping Indian healthcare, appointment, and service businesses answer customer calls, capture intent, and streamline follow-up.
              </p>
              <span className="inline-block font-mono text-[11px] text-[#087F8C] font-semibold">
                Built for Indian business conversations.
              </span>
            </div>

            {/* Platform Links */}
            <div>
              <span className="font-mono text-xs font-bold text-slate-900 tracking-wider uppercase block mb-3">
                Platform
              </span>
              <ul className="space-y-2 text-xs text-[#475467]">
                <li>
                  <Link to="/voice" className="hover:text-[#087F8C] transition-colors">
                    Voice Engine
                  </Link>
                </li>
                <li>
                  <Link to="/agent" className="hover:text-[#087F8C] transition-colors">
                    Assistant Studio
                  </Link>
                </li>
                <li>
                  <Link to="/train" className="hover:text-[#087F8C] transition-colors">
                    Knowledge Base
                  </Link>
                </li>
                <li>
                  <Link to="/audit" className="hover:text-[#087F8C] transition-colors">
                    Audit Records
                  </Link>
                </li>
              </ul>
            </div>

            {/* Workflows Links */}
            <div>
              <span className="font-mono text-xs font-bold text-slate-900 tracking-wider uppercase block mb-3">
                Workflows
              </span>
              <ul className="space-y-2 text-xs text-[#475467]">
                <li>
                  <a href="#use-cases" className="hover:text-[#087F8C] transition-colors">
                    Clinics & Health
                  </a>
                </li>
                <li>
                  <a href="#use-cases" className="hover:text-[#087F8C] transition-colors">
                    Salons & Wellness
                  </a>
                </li>
                <li>
                  <a href="#use-cases" className="hover:text-[#087F8C] transition-colors">
                    Insurance Advisory
                  </a>
                </li>
                <li>
                  <a href="#use-cases" className="hover:text-[#087F8C] transition-colors">
                    Service Providers
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal / Company */}
            <div>
              <span className="font-mono text-xs font-bold text-slate-900 tracking-wider uppercase block mb-3">
                Company
              </span>
              <ul className="space-y-2 text-xs text-[#475467]">
                <li>
                  <Link to="/onboarding" className="hover:text-[#087F8C] transition-colors">
                    Guided Onboarding
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-[#087F8C] transition-colors">
                    Workspace Console
                  </Link>
                </li>
                <li>
                  <span className="text-slate-400">Privacy Policy</span>
                </li>
                <li>
                  <span className="text-slate-400">Terms of Service</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#667085]">
            <p> 2026 InsurCall Platform. All rights reserved.</p>
            <p className="font-mono text-[11px]">Designed with pride for Indian businesses.</p>
          </div>
        </div>
      </footer>

      {/* Floating Auth Modal Component */}
      <FloatingAuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
