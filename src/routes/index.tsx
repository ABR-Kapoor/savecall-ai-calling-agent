import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/20">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                SaveCall
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                Insurance AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white shadow">
              <Link to="/voice">
                <Mic className="size-3.5 mr-1.5" />
                Customer Voice Demo
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-medium text-cyan-400">
            <Sparkles className="size-3.5" />
            Next-Generation Insurance Voice Control Plane
          </div>
          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground leading-[1.1]">
            Real-Time AI Voice Agent for Insurance Operations.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Eliminate phone queues and manual claim intake. SaveCall connects directly to policyholder records via InsForge, verifies identities with 2FA OTP, and logs FNOL claims in real time.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow-lg shadow-cyan-600/20">
              <Link to="/dashboard">
                Enter Staff Command Center
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border hover:bg-card">
              <Link to="/voice">
                <Headphones className="size-4 mr-2 text-cyan-400" />
                Live Customer Voice UI
              </Link>
            </Button>
          </div>

          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-border/50 pt-8">
            <div>
              <dt className="font-display text-2xl font-bold text-cyan-400">&lt; 30ms</dt>
              <dd className="text-xs text-muted-foreground mt-1">Silero VAD Barge-In</dd>
            </div>
            <div>
              <dt className="font-display text-2xl font-bold text-foreground">100%</dt>
              <dd className="text-xs text-muted-foreground mt-1">Ground Truth DB</dd>
            </div>
            <div>
              <dt className="font-display text-2xl font-bold text-emerald-400">4-Tier</dt>
              <dd className="text-xs text-muted-foreground mt-1">Dual-Auth Security</dd>
            </div>
          </dl>
        </div>

        {/* Live Demo Action Card */}
        <div className="lg:col-span-5">
          <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card/60 shadow-2xl backdrop-blur-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-1">
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[11px]">
                  LiveKit WebRTC
                </Badge>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <CardTitle className="text-xl font-bold">Interactive Voice Assistant</CardTitle>
              <CardDescription className="text-xs">
                Speak directly with the SafeLife Insurance voice agent in full duplex.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-2.5">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Test Scenarios Available:
                </span>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-cyan-400 shrink-0" />
                    <span>Inquire about active Auto & Health coverage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-cyan-400 shrink-0" />
                    <span>File First Notice of Loss (bumper damage claim)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-cyan-400 shrink-0" />
                    <span>Request high-risk nominee updates (SMS OTP)</span>
                  </li>
                </ul>
              </div>

              <Button asChild size="lg" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold">
                <Link to="/voice">
                  <Mic className="size-4 mr-2" />
                  Launch Voice Call Session
                </Link>
              </Button>
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
                className="group rounded-2xl border border-border/60 bg-card/60 p-6 transition-all hover:border-cyan-500/40 hover:bg-card hover:shadow-lg"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-400 transition-colors group-hover:bg-cyan-600 group-hover:text-white">
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

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-8 text-center text-xs text-muted-foreground">
        <p>SaveCall Insurance AI • SafeLife Insurance Carrier Platform</p>
      </footer>
    </div>
  );
}
