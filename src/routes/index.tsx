import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  FileText,
  Languages,
  Mic,
  PhoneCall,
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
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingAuthModal } from "@/components/floating-auth-modal";
import { FloatingNavbar } from "@/components/floating-navbar";
import HalftoneWordmarkFooter from "@/components/ui/halftone-wordmark-footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InsurCall: AI Voice Receptionist for Indian Businesses" },
      {
        name: "description",
        content:
          "Give your business an AI receptionist that answers enquiries, captures customer intent, and helps your team stay on top of conversations in English, Hindi, and Hinglish.",
      },
    ],
  }),
  component: Landing,
});

const USE_CASES = [
  {
    icon: Stethoscope,
    tag: "Healthcare & Clinics",
    title: "Patient Appointments & Timings",
    desc: "Answers patient inquiries about doctor consultation hours, schedules appointments, and confirms clinic location details.",
    example: '"Namaste, Dr. Sharma clinic se baat kar raha hoon. Kal subah 10 baje appointment available hai."',
  },
  {
    icon: Scissors,
    tag: "Salons & Wellness",
    title: "Service Bookings & Rescheduling",
    desc: "Handles inbound booking requests, provides transparent treatment pricing, and manages rescheduling without interrupting stylists.",
    example: '"Welcome to Glow Studio! Hair spa and styling slots are open today at 4 PM. May I reserve your slot?"',
  },
  {
    icon: ShieldCheck,
    tag: "Insurance & Finance",
    title: "Policy Status & Claim Assistance",
    desc: "Retrieves active coverage details, guides policyholders through initial claims, and routes complex requests with staff verification.",
    example: '"Your health policy covers cashless hospitalization across 8 network hospitals in your city."',
  },
  {
    icon: Briefcase,
    tag: "Local Service Providers",
    title: "Customer Inquiries & Urgent Callbacks",
    desc: "Captures customer requirement details, collects service addresses, and flags urgent service requests for immediate team callback.",
    example: '"I have recorded your plumbing repair request. Our technician will reach out within 30 minutes."',
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Configure Your Receptionist",
    desc: "Select your assistant name, choose from natural Indian voices, and set whether it speaks English, Hindi, or conversational Hinglish.",
  },
  {
    step: "02",
    title: "Add Business Knowledge",
    desc: "Upload your services, price list, clinic hours, or policy FAQs. The agent strictly answers from your approved company data.",
  },
  {
    step: "03",
    title: "Test In Your Browser",
    desc: "Try interactive voice calls directly in your browser. Verify voice tone, answer accuracy, and appointment capture in real time.",
  },
  {
    step: "04",
    title: "Connect Calling Channel",
    desc: "Forward your existing business telephone number or link your dedicated calling line to handle incoming customer calls.",
  },
  {
    step: "05",
    title: "Review Call Insights",
    desc: "Read complete transcripts, inspect captured customer intent, and review automated action logs in your operations console.",
  },
];

const PRICING_TIERS = [
  {
    name: "Starter Trial",
    price: "₹0",
    period: "15 min trial",
    desc: "Ideal for testing interactive voice conversations and verifying business FAQ accuracy.",
    features: [
      "15 minutes voice trial",
      "Interactive browser test calls",
      "English & Hindi support",
      "Basic business FAQ ingestion",
      "Call transcript view",
    ],
    cta: "Try Free Now",
    primary: false,
    link: "/voice",
  },
  {
    name: "Growth",
    price: "₹2,499",
    period: "per month",
    desc: "Perfect for single-location clinics, salons, and local professional practices.",
    features: [
      "300 minutes inbound calling",
      "Custom business knowledge base",
      "Hinglish conversation tuning",
      "Appointment & lead capture",
      "WhatsApp & SMS call summaries",
      "Standard support",
    ],
    cta: "Start with Growth",
    primary: true,
    link: "/onboarding",
  },
  {
    name: "Business",
    price: "₹6,999",
    period: "per month",
    desc: "For growing organizations and insurance teams handling continuous daily call volume.",
    features: [
      "1,200 minutes inbound calling",
      "Multi-agent configurations",
      "Staff approval queues for high-risk actions",
      "CRM & webhook integration",
      "Priority latency routing",
      "Dedicated account manager",
    ],
    cta: "Choose Business",
    primary: false,
    link: "/onboarding",
  },
];

const FOOTER_COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "Voice Engine", href: "/voice" },
      { label: "Operations Dashboard", href: "/dashboard" },
      { label: "Assistant Studio", href: "/agent" },
      { label: "Knowledge Base", href: "/train" },
    ],
  },
  {
    title: "Workflows",
    links: [
      { label: "Policy Management", href: "/policies" },
      { label: "Claims & Inquiries", href: "/claims" },
      { label: "Staff Approvals", href: "/change-requests" },
      { label: "Audit & Records", href: "/audit" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Guided Onboarding", href: "/onboarding" },
      { label: "Workspace Settings", href: "/settings" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
];

function Landing() {
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("auth=true")) {
      setShowAuth(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#111827] flex flex-col justify-between selection:bg-[#087F8C]/20">
      {/* 1. Interactive Floating Navbar (Scroll Responsive) */}
      <FloatingNavbar onOpenAuth={() => setShowAuth(true)} />

      {/* 2. Hero Section */}
      <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-28 sm:pt-36 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#087F8C]/25 bg-[#E6F6F7] px-3.5 py-1 text-xs font-semibold text-[#087F8C]">
            <Sparkles className="size-3.5" />
            Built for the calls that keep India moving • Bilingual English & Hindi
          </div>

          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-[#111827] leading-[1.12]">
            Every missed call is a customer you may never get back.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-[#344054] leading-relaxed max-w-2xl">
            Give your business an AI receptionist that can answer enquiries, capture customer intent, and help your team stay on top of conversations.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              className="bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold shadow-sm text-sm h-12 px-6 rounded-xl"
            >
              <Link to="/voice">
                <PhoneCall className="size-4 mr-2" />
                Try your AI receptionist free
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[#E4E7EC] bg-white hover:bg-[#FAF9F6] text-[#111827] text-sm h-12 px-6 rounded-xl font-medium"
            >
              <a href="#how-it-works">
                See how it works
                <ArrowRight className="size-4 ml-2" />
              </a>
            </Button>
          </div>

          {/* Real, Honest Metrics */}
          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-[#E4E7EC] pt-8">
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

        {/* Hero Interactive Call Simulation Preview */}
        <div className="lg:col-span-5">
          <Card className="overflow-hidden border border-[#E4E7EC] shadow-lg bg-white rounded-3xl">
            <CardHeader className="border-b border-[#E4E7EC] bg-[#FAF9F6] pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <CardTitle className="text-sm font-semibold text-[#111827]">
                    Live Incoming Call Simulation
                  </CardTitle>
                </div>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-800">
                  Active Line
                </Badge>
              </div>
              <CardDescription className="text-xs text-[#667085] mt-1">
                Real-time preview of caller interaction and intent recognition.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
              {/* Agent & Caller Details */}
              <div className="rounded-2xl border border-[#E4E7EC] bg-[#FAF9F6] p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between text-[#667085]">
                  <span>AI Receptionist</span>
                  <span className="font-semibold text-[#111827]">Anya (Bilingual Assistant)</span>
                </div>
                <div className="flex items-center justify-between text-[#667085]">
                  <span>Caller Intent</span>
                  <span className="font-semibold text-[#087F8C]">Appointment Scheduling</span>
                </div>
                <div className="flex items-center justify-between text-[#667085]">
                  <span>Call Duration</span>
                  <span className="font-mono text-[#111827] font-semibold">01:24</span>
                </div>
              </div>

              {/* Sample Natural Conversation Stream */}
              <div className="space-y-2 rounded-2xl border border-[#E4E7EC] bg-white p-3.5 text-xs">
                <div className="flex items-start gap-2 text-[#344054]">
                  <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider shrink-0 mt-0.5">
                    Caller:
                  </span>
                  <p className="text-[11px] leading-snug">
                    "Namaste! Mujhe kal shaam 5 baje Dr. Sharma ke paas appointment book karna hai."
                  </p>
                </div>
                <div className="flex items-start gap-2 text-[#087F8C] pt-1 border-t border-[#E4E7EC]/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5">
                    Anya:
                  </span>
                  <p className="text-[11px] leading-snug text-[#111827]">
                    "Namaste! Kal shaam 5 baje slot available hai. Please apna naam aur contact number share karein taaki main confirm kar sakoon."
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  asChild
                  className="w-full gap-2 bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold text-xs h-11 rounded-xl shadow-xs"
                >
                  <Link to="/voice">
                    <Mic className="size-4" /> Try Interactive Test Call Now
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAuth(true)}
                  className="w-full gap-2 border-[#E4E7EC] text-xs text-[#344054] hover:text-[#111827] hover:bg-[#FAF9F6] h-10 rounded-xl cursor-pointer"
                >
                  <LogIn className="size-3.5" /> Enter Workspace Console
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. Brand Story Banner: Technology Built for Indian Businesses */}
      <section className="border-y border-[#E4E7EC] bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <Badge variant="outline" className="border-[#087F8C]/30 text-[#087F8C] bg-[#E6F6F7] text-xs mb-3 font-semibold">
            Made with Indian Businesses in Mind
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] max-w-3xl mx-auto leading-snug">
            Technology built around how Indian businesses actually work.
          </h2>
          <p className="mt-4 text-sm text-[#344054] max-w-2xl mx-auto leading-relaxed">
            From neighborhood clinics and salons to insurance teams and local service providers, customer conversations move fast. InsurCall ensures every caller receives an immediate, respectful, and helpful response without long hold times.
          </p>
        </div>
      </section>

      {/* 4. Industry Use Cases */}
      <section id="use-cases" className="py-20 bg-[#FAF9F6]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111827]">
              Tailored for Real Business Conversations
            </h2>
            <p className="mt-3 text-sm text-[#344054]">
              See how InsurCall handles everyday phone interactions across core service industries.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-[#E4E7EC] bg-white p-6 shadow-xs hover:border-[#087F8C]/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="grid size-11 place-items-center rounded-xl bg-[#E6F6F7] text-[#087F8C] transition-colors group-hover:bg-[#087F8C] group-hover:text-white">
                    <item.icon className="size-5" />
                  </span>
                  <span className="text-[10px] font-bold text-[#087F8C] uppercase tracking-wider block mt-4">
                    {item.tag}
                  </span>
                  <h3 className="mt-1 font-display text-base font-bold text-[#111827]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#667085]">{item.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E4E7EC]/70 bg-[#FAF9F6] p-2.5 rounded-xl text-[11px] italic text-[#344054]">
                  {item.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section id="how-it-works" className="py-20 bg-white border-t border-[#E4E7EC]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="border-[#087F8C]/30 text-[#087F8C] bg-[#E6F6F7] text-xs mb-2 font-semibold">
              Simple 5-Step Workflow
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111827]">
              How InsurCall Works
            </h2>
            <p className="mt-3 text-sm text-[#344054]">
              Get your autonomous voice receptionist up and running in minutes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {WORKFLOW_STEPS.map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-[#E4E7EC] bg-[#FAF9F6] p-5 relative flex flex-col justify-between"
              >
                <div>
                  <span className="font-display text-2xl font-black text-[#087F8C]/40">
                    {s.step}
                  </span>
                  <h3 className="mt-2 font-display text-sm font-bold text-[#111827]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#667085]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Honest Pricing Section */}
      <section id="pricing" className="py-20 bg-[#FAF9F6] border-t border-[#E4E7EC]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111827]">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-3 text-sm text-[#344054]">
              Start free with included trial minutes. Choose a plan that matches your business call volume.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-3xl p-7 flex flex-col justify-between transition-all ${
                  tier.primary
                    ? "bg-white border-2 border-[#087F8C] shadow-xl relative"
                    : "bg-white border border-[#E4E7EC] shadow-sm hover:border-[#087F8C]/40"
                }`}
              >
                {tier.primary && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#087F8C] text-white px-3.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow-xs">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="font-display text-lg font-bold text-[#111827]">{tier.name}</h3>
                  <p className="text-xs text-[#667085] mt-1">{tier.desc}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#111827] font-display">
                      {tier.price}
                    </span>
                    <span className="text-xs text-[#667085]">/ {tier.period}</span>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-[#344054]">
                    {tier.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-[#087F8C] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-[#E4E7EC]">
                  <Button
                    asChild
                    className={`w-full h-11 rounded-xl text-xs font-semibold ${
                      tier.primary
                        ? "bg-[#087F8C] hover:bg-[#076C77] text-white shadow-xs"
                        : "bg-[#111827] hover:bg-[#1E293B] text-white"
                    }`}
                  >
                    <Link to={tier.link}>{tier.cta}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Halftone Wordmark Interactive Footer */}
      <HalftoneWordmarkFooter
        wordmark="insurcall"
        label="InsurCall Platform"
        meta="©2026 · AI Voice Employee"
        columns={FOOTER_COLUMNS}
        preset="paper"
        palette={{
          background: "#FFFFFF",
          ink: "#172033",
          warm: "#087E8B",
        }}
        height="500px"
      />

      {/* 8. Floating Auth Modal */}
      <FloatingAuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />

      {/* Persistent Floating Auth Trigger in bottom-right corner */}
      <div className="fixed bottom-6 right-6 z-30">
        <Button
          onClick={() => setShowAuth(true)}
          className="gap-2 rounded-full px-4 py-2.5 bg-[#087F8C] hover:bg-[#076C77] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all text-xs font-semibold cursor-pointer border border-white/20"
        >
          <Lock className="size-3.5" />
          <span>Floating Sign In</span>
        </Button>
      </div>
    </div>
  );
}
