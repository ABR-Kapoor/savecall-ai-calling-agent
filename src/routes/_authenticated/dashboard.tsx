import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ShieldAlert,
  PhoneCall,
  CheckSquare,
  ShieldCheck,
  ArrowRight,
  Mic,
  AlertCircle,
  Bot,
  Zap,
  Users,
  Clock,
  Sparkles,
  BookOpen,
  CheckCircle2,
  PhoneIncoming,
  ChevronRight,
  Activity,
} from "lucide-react";
import { getDashboardMetrics, getTenantSettings } from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Operations Overview — SaveCall AI" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();

  const { data: tenant, isLoading: isTenantLoading } = useQuery({
    queryKey: ["tenant-settings"],
    queryFn: () => getTenantSettings(),
  });

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => getDashboardMetrics(),
  });

  // Redirect fresh users without an onboarded company to /onboarding
  useEffect(() => {
    if (!isTenantLoading) {
      if (!tenant || !(tenant.branding_config as any)?.onboarding_completed) {
        navigate({ to: "/onboarding" });
      }
    }
  }, [tenant, isTenantLoading, navigate]);

  const branding = (tenant?.branding_config as any) || {};
  const companyName = tenant?.name || "Your Company";
  const agentName = branding.agent_config?.name || "Anya";

  return (
    <AppShell
      title="Operations Overview"
      subtitle={`Autonomous AI Voice Receptionist & Command Center • ${companyName}`}
    >
      <div className="space-y-6">
        {/* Welcome & Live Status Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="hidden sm:grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-muted/30 p-1.5 shadow-2xs">
              <img
                src="/06_app_icon_rounded_safe_area_transparent.png"
                alt="InsurCall"
                className="size-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  LiveKit Assistant Active
                </span>
                <span className="text-xs text-muted-foreground">• {companyName}</span>
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                {agentName} is actively ready to answer customer calls
              </h2>
              <p className="text-xs text-muted-foreground max-w-xl">
                Handles coverage inquiries, claims intake, and customer questions using approved database knowledge. High-risk actions require staff approval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/onboarding">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-border">
                <Sparkles className="size-3.5 text-primary" /> Setup Guide
              </Button>
            </Link>
            <Link to="/voice">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium gap-1.5 shadow-xs">
                <Mic className="size-3.5" /> Launch Test Call
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              Database error:{" "}
              {(error as any)?.message?.includes("<html") || (error as any)?.message?.includes("<!doctype")
                ? "Unable to query tenant metrics. Please refresh the page or restart the dev server."
                : (error as any)?.message || "Failed to query tenant metrics"}
            </span>
          </div>
        )}

        {/* 4 Small-Business-First Headline Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Calls Handled */}
          <Card className="border border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">Calls Today</span>
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <PhoneCall className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? "..." : (metrics?.totalCalls ?? metrics?.sessionsCount ?? 0)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Recorded WebRTC calls</p>
            </CardContent>
          </Card>

          {/* 2. Handled by Assistant */}
          <Card className="border border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">Handled by Assistant</span>
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <Zap className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-emerald-700">
                {isLoading ? "..." : `${metrics?.automationRate ?? 100}%`}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Resolved without transfer</p>
            </CardContent>
          </Card>

          {/* 3. Needs Review */}
          <Card className="border border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">Needs Review</span>
              <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <CheckSquare className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-amber-700">
                {isLoading ? "..." : (metrics?.approvalsCount ?? 0)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Pending staff sign-offs</p>
            </CardContent>
          </Card>

          {/* 4. Claims & Inquiries */}
          <Card className="border border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-medium text-muted-foreground">Claims & Inquiries</span>
              <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <ShieldCheck className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? "..." : ((metrics?.claimsCount ?? 0) + (metrics?.leads ?? 0))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">FNOL filings & qualified leads</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid: Left 2/3 (Recent Calls) + Right 1/3 (Approvals & Queue) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Recent Calls */}
          <Card className="lg:col-span-2 border border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Recent Customer Calls</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Latest voice interactions handled by LiveKit and logged to tenant records
                </CardDescription>
              </div>
              <Link to="/calls">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary hover:text-primary/90">
                  View all <ChevronRight className="size-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Loading voice calls...</p>
              ) : metrics?.recentSessions?.length ? (
                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {metrics.recentSessions.map((session: any) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                          <PhoneIncoming className="size-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {session.caller_name || "Caller"}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                session.status === "completed"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]"
                                  : "bg-muted text-muted-foreground text-[10px]"
                              }
                            >
                              {session.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Duration: {session.duration_sec ? `${session.duration_sec}s` : "In progress"} • Room: {session.room_name?.slice(0, 18)}...
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-medium text-muted-foreground block">
                          {new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <Link to="/calls">
                          <span className="text-[10px] text-primary hover:underline font-medium cursor-pointer">
                            Inspect Transcript
                          </span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  <PhoneCall className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-medium text-foreground">No calls recorded yet</p>
                  <p className="mt-1 max-w-xs mx-auto">
                    Click <strong>Launch Test Call</strong> to start a browser call and verify your assistant in real-time.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column (1 Col): Pending Approvals / Attention Needed */}
          <Card className="border border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Pending Approvals</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  High-risk actions staged by the assistant
                </CardDescription>
              </div>
              <Link to="/change-requests">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary hover:text-primary/90">
                  Review <ChevronRight className="size-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Loading approvals...</p>
              ) : metrics?.recentApprovals?.length ? (
                <div className="space-y-3">
                  {metrics.recentApprovals.map((req: any) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl border border-border bg-muted/20 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                          {req.request_type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(req.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {typeof req.payload === "object" ? JSON.stringify(req.payload) : req.payload}
                      </p>
                      <div className="pt-1 flex justify-end">
                        <Link to="/change-requests">
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 text-primary border-primary/20">
                            Sign Off <ArrowRight className="size-2.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  <CheckCircle2 className="size-8 mx-auto text-emerald-600/40 mb-2" />
                  <p className="font-medium text-foreground">All caught up</p>
                  <p className="mt-1">0 pending change requests in queue.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Quick-Action Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <Link to="/train" className="block">
            <Card className="border border-border bg-card hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="size-4" />
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Business Knowledge</h4>
                  <p className="text-[11px] text-muted-foreground">Upload guidelines & FAQs</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/agent" className="block">
            <Card className="border border-border bg-card hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Assistant Studio</h4>
                  <p className="text-[11px] text-muted-foreground">Tune persona, greeting & voice</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/policies" className="block">
            <Card className="border border-border bg-card hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Policies ({metrics?.policiesCount ?? 0})</h4>
                  <p className="text-[11px] text-muted-foreground">Active policyholder records</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/claims" className="block">
            <Card className="border border-border bg-card hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-4" />
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Claims ({metrics?.claimsCount ?? 0})</h4>
                  <p className="text-[11px] text-muted-foreground">FNOL filings & settlement status</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

