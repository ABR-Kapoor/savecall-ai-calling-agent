import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  PhoneCall,
  CheckSquare,
  ShieldCheck,
  Mic,
  AlertCircle,
  Bot,
  Zap,
  ChevronRight,
  Radio,
  Database,
  ArrowRight,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { getDashboardMetrics, getTenantSettings } from "@/lib/insurance.functions";
import { InsurCallLoadingScreen } from "@/components/loading-screen";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Insurance Operations Command Center: InsurCall AI" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useUser();

  const { data: tenant, isLoading: isTenantLoading } = useQuery({
    queryKey: ["tenant-settings", user?.id],
    queryFn: () =>
      getTenantSettings({
        data: {
          clerkUserId: user?.id,
          userEmail: user?.primaryEmailAddress?.emailAddress,
          userName: user?.fullName || undefined,
        },
      }),
    enabled: !!user?.id,
  });

  const { data: metrics, isLoading: isMetricsLoading, error } = useQuery({
    queryKey: ["dashboard-metrics", tenant?.id, user?.id],
    queryFn: () =>
      getDashboardMetrics({
        data: {
          tenantId: tenant?.id,
          clerkUserId: user?.id,
        },
      }),
    enabled: !!tenant?.id,
  });

  useEffect(() => {
    if (!isTenantLoading) {
      const isCompleted = Boolean((tenant?.branding_config as any)?.onboarding_completed);
      if (!tenant || !isCompleted) {
        navigate({ to: "/onboarding" });
      }
    }
  }, [tenant, isTenantLoading, navigate]);

  if (isTenantLoading) {
    return (
      <InsurCallLoadingScreen
        message="Loading insurance command center..."
        submessage="Connecting to your carrier workspace and verifying onboarding state."
      />
    );
  }

  const branding = (tenant?.branding_config as any) || {};
  const companyName = tenant?.name || "Carrier Operations";
  const agentName = branding.agent_config?.name || "Anya";
  const totalCalls = metrics?.totalCalls ?? 0;
  const approvalsCount = metrics?.approvalsCount ?? 0;
  const recentApprovals = metrics?.recentApprovals ?? [];

  return (
    <AppShell
      title="Insurance Operations Command Center"
      subtitle={`AI Voice Employee & Compliance Console : ${companyName}`}
    >
      <div className="space-y-6">
        {/* Welcome & Live Status Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="hidden sm:grid size-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-[#FAF9F6] p-2 shadow-2xs">
              <img
                src="/01_logo_only_transparent.png"
                alt="InsurCall Emblem"
                className="size-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Voice Agent Ready
                </span>
                <span className="text-xs font-mono text-slate-500">{companyName}</span>
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
                {agentName} is ready to answer policyholder calls
              </h2>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                Autonomous intake for claims, coverage verifications, and cashless inquiries. High-risk nominee changes and payouts are queued for staff adjuster review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/claims">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 font-mono">
                <ShieldCheck className="size-3.5 text-[#087F8C]" /> Claims Intake
              </Button>
            </Link>
            <Link to="/voice">
              <Button size="sm" className="bg-[#087F8C] text-white hover:bg-[#076C77] text-xs font-mono gap-1.5 shadow-xs">
                <Mic className="size-3.5 text-[#10A6AE]" /> Test Voice Call
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              Database connection notice:{" "}
              {(error as any)?.message?.includes("<html") || (error as any)?.message?.includes("<!doctype")
                ? "Connecting to database..."
                : (error as any)?.message || "Failed to query tenant metrics"}
            </span>
          </div>
        )}

        {/* 4 Insurance Headline Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Inbound Calls Handled */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                Policy Calls
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-[#E6F6F7] text-[#087F8C]">
                <PhoneCall className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display tracking-tight text-slate-900">
                {isMetricsLoading ? "..." : totalCalls}
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">Recorded WebRTC & SIP calls</p>
            </CardContent>
          </Card>

          {/* 2. Automated Resolution Rate */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                First-Call Resolution
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <Zap className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display tracking-tight text-emerald-700">
                {isMetricsLoading ? "..." : totalCalls > 0 ? `${metrics?.automationRate ?? 0}%` : "N/A"}
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">
                {totalCalls > 0 ? "Resolved without caller wait" : "No calls recorded yet"}
              </p>
            </CardContent>
          </Card>

          {/* 3. Claims Intakes (FNOL) */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                Active Claims
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <ShieldAlert className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display tracking-tight text-slate-900">
                {isMetricsLoading ? "..." : (metrics?.claimsCount ?? 0)}
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">FNOL dockets in progress</p>
            </CardContent>
          </Card>

          {/* 4. Human Review & Approvals */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                Staff Review Queue
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <CheckSquare className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display tracking-tight text-blue-700">
                {isMetricsLoading ? "..." : approvalsCount}
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">Requires adjuster sign-off</p>
            </CardContent>
          </Card>
        </div>

        {/* Operational Modules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Priority Staff Approvals Queue */}
          <div className="lg:col-span-7">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    High-Risk Approvals Queue
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Operations that require dual-control verification before updating carrier records.
                  </CardDescription>
                </div>
                <Link to="/change-requests">
                  <Button variant="ghost" size="sm" className="text-xs text-[#087F8C] hover:text-[#076C77] gap-1 font-mono">
                    View All <ChevronRight className="size-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                {recentApprovals.length > 0 ? (
                  <div className="space-y-3">
                    {recentApprovals.map((req: any) => (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-slate-100 bg-[#FAF9F6] p-4 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {req.request_type?.replace(/_/g, " ").toUpperCase() || "Change Request"}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono text-amber-800 bg-amber-50 border-amber-200 font-semibold"
                          >
                            {req.status?.toUpperCase() || "PENDING"}
                          </Badge>
                        </div>
                        <p className="text-slate-600 text-[11.5px] leading-relaxed">
                          {req.payload?.description || req.payload?.reason || "Pending staff adjuster authorization."}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-mono">
                          <span>Status: {req.status}</span>
                          <Link to="/change-requests" className="text-[#087F8C] font-semibold hover:underline">
                            Review & Authorize
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-[#FAF9F6] p-8 text-center space-y-3 my-auto">
                    <div className="grid size-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-500 mx-auto shadow-2xs">
                      <CheckSquare className="size-5 text-[#087F8C]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-slate-900">No Pending Approvals</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        High-risk operations like nominee benefit changes or cashless pre-authorizations requiring dual-control verification will appear here automatically.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Link to="/train">
                        <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 font-mono">
                          <BookOpen className="size-3.5 text-[#087F8C]" /> Manage Knowledge Store
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Real-time Insurance Voice System Health */}
          <div className="lg:col-span-5">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl h-full flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                  <span>Carrier System Health</span>
                  <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Live status across voice channels, database RLS, and model routing.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-[#FAF9F6]">
                  <div className="flex items-center gap-2.5">
                    <Radio className="size-4 text-[#087F8C]" />
                    <div>
                      <span className="font-semibold text-slate-900 block">LiveKit Media Server</span>
                      <span className="text-[10px] font-mono text-slate-400">WebRTC audio streaming port 7880</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200">
                    Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-[#FAF9F6]">
                  <div className="flex items-center gap-2.5">
                    <Database className="size-4 text-[#087F8C]" />
                    <div>
                      <span className="font-semibold text-slate-900 block">PostgreSQL Database</span>
                      <span className="text-[10px] font-mono text-slate-400">Multi-tenant RLS active</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200">
                    Connected
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-[#FAF9F6]">
                  <div className="flex items-center gap-2.5">
                    <Bot className="size-4 text-[#087F8C]" />
                    <div>
                      <span className="font-semibold text-slate-900 block">Python Agent Worker</span>
                      <span className="text-[10px] font-mono text-slate-400">Groq / Ollama sub-second routing</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200">
                    Registered
                  </Badge>
                </div>

                <div className="pt-2">
                  <Button asChild variant="outline" className="w-full text-xs font-mono h-10 rounded-xl border-slate-200">
                    <Link to="/audit">INSPECT REGULATORY COMPLIANCE TRAIL</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
