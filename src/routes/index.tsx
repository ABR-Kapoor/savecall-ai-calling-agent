import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  FileText,
  Languages,
  Mic,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Lock,
  Headphones,
  CheckCircle2,
  LogIn,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingAuthModal } from "@/components/floating-auth-modal";
import HalftoneWordmarkFooter from "@/components/ui/halftone-wordmark-footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SaveCall — AI Insurance Voice Assistant" },
      {
        name: "description",
        content:
          "Enterprise AI voice agent for insurance operations. Real-time WebRTC conversational AI for policy queries, FNOL claims, and 2FA verification.",
      },
    ],
  }),
  component: Landing,
});

const CAPABILITIES = [
  {
    icon: PhoneCall,
    title: "Instant Voice Response",
    body: "Sub-30ms Silero VAD barge-in. Natural, low-latency conversational full-duplex voice.",
  },
  {
    icon: Languages,
    title: "Multilingual & Dialects",
    body: "Seamlessly interacts in English, Hindi, and regional dialects with tone adaptation.",
  },
  {
    icon: FileText,
    title: "Live Policy Lookups",
    body: "Ground-truth retrieval from InsForge PostgreSQL for active auto, health, and life coverage.",
  },
  {
    icon: ShieldAlert,
    title: "First Notice of Loss (FNOL)",
    body: "Captures and files incident reports, damage summaries, and police DDRs automatically.",
  },
  {
    icon: Lock,
    title: "4-Tier Risk Engine",
    body: "SMS OTP authentication for high-risk modifications and dual human approval workflows.",
  },
  {
    icon: ShieldCheck,
    title: "Full Compliance Trail",
    body: "Every tool invocation and verification event is immutably recorded in audit logs.",
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
    title: "Insurance Ops",
    links: [
      { label: "Policy Management", href: "/policies" },
      { label: "Claims & FNOL", href: "/claims" },
      { label: "Human Approvals", href: "/change-requests" },
      { label: "Audit & Compliance", href: "/audit" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Guided Onboarding", href: "/onboarding" },
      { label: "Workspace Settings", href: "/settings" },
      { label: "Security & Tenancy", href: "#" },
      { label: "Carrier Integrations", href: "#" },
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
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/02_logo_with_InsurCall_light_transparent.png"
              alt="InsurCall — AI Voice Employee Platform"
              className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAuth(true)}
              className="text-muted-foreground hover:text-foreground text-xs font-medium cursor-pointer"
            >
              Sign In
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium shadow-xs">
              <Link to="/voice">
                <Mic className="size-3.5 mr-1.5" />
                Interactive Test Call
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Enterprise AI Voice Employee Platform • 15 Free Minutes
          </div>
          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground leading-[1.1]">
            Your Autonomous AI Voice Employee for Inbound Calls.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Eliminate missed calls and long hold queues. SaveCall answers incoming customer calls, verifies policies, schedules appointments, and intakes claims in fluent English, Hindi, and Hinglish.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs">
              <Link to="/dashboard">
                Enter Workspace
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border hover:bg-muted text-foreground">
              <Link to="/voice">
                <Headphones className="size-4 mr-2 text-primary" />
                Live Browser Test Call
              </Link>
            </Button>
          </div>

          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-border pt-8">
            <div>
              <dt className="font-display text-2xl font-bold text-primary">&lt; 30ms</dt>
              <dd className="text-xs text-muted-foreground mt-1">Silero VAD Barge-In</dd>
            </div>
            <div>
              <dt className="font-display text-2xl font-bold text-foreground">Zero</dt>
              <dd className="text-xs text-muted-foreground mt-1">Hallucinations via RAG</dd>
            </div>
            <div>
              <dt className="font-display text-2xl font-bold text-emerald-700">15 Mins</dt>
              <dd className="text-xs text-muted-foreground mt-1">Free Trial Allowance</dd>
            </div>
          </dl>
        </div>

        {/* Live Demo Action Card */}
        <div className="lg:col-span-5">
          <Card className="overflow-hidden border border-border shadow-xs bg-card">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <CardTitle className="font-display text-sm font-semibold text-foreground">
                    InsurCall WebRTC Engine
                  </CardTitle>
                </div>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-800">
                  LiveKit Ready
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Sub-second audio pipeline connected to local Ollama & Groq Cloud LLM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2.5 rounded-xl border border-border bg-muted/30 p-3.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Voice Agent Persona</span>
                  <span className="font-semibold text-foreground">Anya (Claims Specialist)</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Telephony Protocols</span>
                  <span className="font-mono text-foreground font-semibold">WebRTC Opus + SIP Trunk</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Ground-Truth Source</span>
                  <span className="font-semibold text-primary">InsForge PostgreSQL</span>
                </div>
              </div>

              <div className="space-y-2">
                <Link to="/voice" className="block">
                  <Button className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs">
                    <Mic className="size-4" /> Start Interactive Test Call
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setShowAuth(true)}
                  className="w-full gap-2 border-border text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <LogIn className="size-3.5" /> Sign In to Workspace Console
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="border-t border-border/50 bg-card/30 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Enterprise Insurance Engine
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Designed from the ground up to prevent hallucination, enforce strict caller authentication, and maintain complete audit compliance.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-border/60 bg-card/60 p-6 transition-all hover:border-primary/40 hover:bg-card hover:shadow-xs"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <item.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Halftone Wordmark Interactive Footer */}
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

      {/* Floating Auth Modal */}
      <FloatingAuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
      />

      {/* Persistent Floating Auth Trigger in bottom-right corner */}
      <div className="fixed bottom-6 right-6 z-30">
        <Button
          onClick={() => setShowAuth(true)}
          className="gap-2 rounded-full px-4 py-2.5 bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all text-xs font-semibold cursor-pointer border border-white/20"
        >
          <Lock className="size-3.5" />
          <span>Floating Sign In</span>
        </Button>
      </div>
    </div>
  );
}
