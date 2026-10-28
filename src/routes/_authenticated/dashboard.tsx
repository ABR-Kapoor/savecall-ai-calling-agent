import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  CheckSquare,
  AlertCircle,
  Bot,
  ChevronRight,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Clock,
  PhoneCall,
  Mic,
  FileText,
  User,
  Radio,
} from "lucide-react";
import { getDashboardMetrics, getTenantSettings } from "@/lib/insurance.functions";
import { InsurCallLoadingScreen } from "@/components/loading-screen";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Overview: InsurCall Insurance Operations" }],
  }),
  component: DashboardPage,
});

interface BrandingConfig {
  onboarding_completed?: boolean;
  agent_config?: {
    name?: string;
  };
  [key: string]: unknown;
}

interface ApprovalPayload {
  description?: string;
  reason?: string;
  customerName?: string;
  customer_name?: string;
  policyNumber?: string;
  policy_number?: string;
  query?: string;
  [key: string]: unknown;
}

interface ApprovalRecord {
  id: string;
  request_type?: string;
  status?: string;
  created_at?: string;
  payload?: ApprovalPayload;
}

interface CallSessionSummary {
  id: string;
  room_name?: string;
  caller_name?: string;
  caller_phone?: string;
  status?: string;
  duration_seconds?: number;
  started_at?: string;
  risk_state?: string;
}

function formatDuration(seconds?: number): string {
  if (!seconds && seconds !== 0) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
}

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
      const branding = (tenant?.branding_config as BrandingConfig | null) || {};
      const isCompleted = Boolean(branding.onboarding_completed);
      if (!tenant || !isCompleted) {
        navigate({ to: "/onboarding" });
      }
    }
  }, [tenant, isTenantLoading, navigate]);

  if (isTenantLoading) {
    return (
      <InsurCallLoadingScreen
        message="Loading operational overview..."
        submessage="Connecting to your insurance workspace and verifying operational status."
      />
    );
  }

  const branding = (tenant?.branding_config as BrandingConfig | null) || {};
  const agentCfg = (branding.agent_config as Record<string, unknown> | undefined) || {};
  const companyName = tenant?.name || "Workspace";
  const agentName =
    (typeof agentCfg["name"] === "string" ? agentCfg["name"] : "") ||
    (typeof agentCfg["agent_name"] === "string" ? agentCfg["agent_name"] : "");

  const waStatus = metrics?.whatsappStatus || "DISCONNECTED";
  const isWaConnected = waStatus === "ready" || waStatus === "CONNECTED";
  const isWaScanning = waStatus === "SCAN_QR_CODE";
  const waPhone = metrics?.whatsappPhone || "";

  const totalConversations = metrics?.totalConversations ?? 0;
  const takeoverCount = metrics?.takeoverCount ?? 0;
  const totalMessages = metrics?.totalMessages ?? 0;
  const aiReplies = metrics?.aiRepliesCount ?? 0;
  const totalCalls = metrics?.totalCalls ?? 0;
  const pendingClaimsCount = metrics?.pendingClaimsCount ?? 0;
  const approvedKnowledge = metrics?.approvedKnowledgeCount ?? 0;
  const pendingKnowledge = metrics?.pendingKnowledgeCount ?? 0;
  const pendingApprovals = metrics?.approvalsCount ?? 0;
  const recentApprovals = (metrics?.recentApprovals as ApprovalRecord[] | undefined) ?? [];
  const recentSessions = (metrics?.recentSessions as CallSessionSummary[] | undefined) ?? [];

  return (
    <AppShell
      title="Operations Overview"
      subtitle={`Customer Voice Calls, WhatsApp Messaging & Policy Operations: ${companyName}`}
    >
      <div className="space-y-6">
        {/* Welcome & Multi-Channel Status Banner */}
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
              <div className="flex flex-wrap items-center gap-2">
                {/* WhatsApp Status Badge */}
                {isWaConnected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    WhatsApp Live {waPhone ? `(${waPhone})` : ""}
                  </span>
                ) : isWaScanning ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                    <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                    WhatsApp: Scan QR Code
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                    <span className="size-2 rounded-full bg-slate-400" />
                    WhatsApp Standby
                  </span>
                )}

                {/* AI Voice Agent Badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-[#087F8C] border border-teal-200">
                  <Mic className="size-3 text-[#087F8C]" />
                  Voice Agent Ready
                </span>

                <span className="text-xs text-slate-500 font-medium">{companyName}</span>
              </div>

              <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
                {agentName
                  ? `${agentName} is managing your customer voice & WhatsApp communications`
                  : "Your AI Operations Assistant is managing your customer voice & WhatsApp communications"}
              </h2>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                Policy assistance and claims intake grounded in approved insurance guidelines. High-risk beneficiary updates and claim approvals require staff authorization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/voice">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 border-teal-200 bg-teal-50/50 text-[#087F8C] hover:bg-teal-100/60 font-medium rounded-xl">
                <Mic className="size-3.5 text-[#087F8C]" /> Launch Voice Call
              </Button>
            </Link>
            <Link to="/whatsapp">
              <Button size="sm" className="bg-[#087F8C] text-white hover:bg-[#076C77] text-xs font-medium gap-1.5 shadow-2xs rounded-xl">
                <MessageSquare className="size-3.5 text-white" /> WhatsApp Inbox
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              {error instanceof Error ? error.message : "Database notice: unable to synchronize metrics"}
            </span>
          </div>
        )}

        {/* 6 Authentic Operational Headline Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* 1. WhatsApp Conversations */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                WhatsApp Chats
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-[#E6F6F7] text-[#087F8C]">
                <MessageSquare className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold font-display tracking-tight text-slate-900">
                {isMetricsLoading ? "..." : totalConversations}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {totalMessages} messages ({aiReplies} AI replies)
              </p>
            </CardContent>
          </Card>

          {/* 2. Voice Calls Handled */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Voice Calls
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-teal-50 text-[#087F8C]">
                <PhoneCall className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold font-display tracking-tight text-slate-900">
                {isMetricsLoading ? "..." : totalCalls}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                LiveKit WebRTC voice sessions
              </p>
            </CardContent>
          </Card>

          {/* 3. Claims Awaiting Review */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Claims in Review
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-purple-50 text-purple-700">
                <ShieldCheck className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold font-display tracking-tight text-purple-900">
                {isMetricsLoading ? "..." : pendingClaimsCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                FNOL intake awaiting review
              </p>
            </CardContent>
          </Card>

          {/* 4. Staff Takeovers & Enquiries */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Staff Takeover
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <ShieldAlert className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`text-2xl font-bold font-display tracking-tight ${takeoverCount > 0 ? "text-amber-700" : "text-slate-900"}`}>
                {isMetricsLoading ? "..." : takeoverCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {takeoverCount > 0 ? "Active staff threads" : "All chats automated"}
              </p>
            </CardContent>
          </Card>

          {/* 5. Dual-Control Approvals */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Staff Approvals
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <CheckSquare className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold font-display tracking-tight text-blue-700">
                {isMetricsLoading ? "..." : pendingApprovals}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                Dual-control actions pending
              </p>
            </CardContent>
          </Card>

          {/* 6. Approved Knowledge Store */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Knowledge Store
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold font-display tracking-tight text-emerald-700">
                {isMetricsLoading ? "..." : `${approvedKnowledge}`}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {pendingKnowledge > 0 ? `${pendingKnowledge} awaiting approval` : "Approved policy docs"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Operational Modules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dual-Control Approvals Queue */}
          <div className="lg:col-span-7">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Dual-Control Staff Approvals
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Critical policyholder operations requiring authorized staff review before updating records.
                  </CardDescription>
                </div>
                <Link to="/change-requests">
                  <Button variant="ghost" size="sm" className="text-xs text-[#087F8C] hover:text-[#076C77] gap-1 font-medium">
                    View All <ChevronRight className="size-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                {recentApprovals.length > 0 ? (
                  <div className="space-y-3">
                    {recentApprovals.map((req) => {
                      const custName =
                        req.payload?.customerName ||
                        req.payload?.customer_name ||
                        "Policyholder";
                      const polNum =
                        req.payload?.policyNumber ||
                        req.payload?.policy_number ||
                        "Policy Record";
                      const reason =
                        req.payload?.description ||
                        req.payload?.reason ||
                        req.payload?.query ||
                        "Review required before updating records.";

                      return (
                        <div
                          key={req.id}
                          className="rounded-2xl border border-slate-100 bg-[#FAF9F6] p-4 text-xs space-y-2 hover:border-slate-200 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              {req.request_type
                                ? req.request_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                                : "Policy Endorsement"}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-800 bg-amber-50 border-amber-200 font-semibold rounded-full"
                            >
                              {req.status ? req.status.toUpperCase() : "PENDING"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <User className="size-3 text-slate-400" />
                              {custName}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <FileText className="size-3 text-slate-400" />
                              {polNum}
                            </span>
                          </div>

                          <p className="text-slate-700 text-xs leading-relaxed bg-white p-2.5 rounded-xl border border-slate-100">
                            "{reason}"
                          </p>

                          <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock className="size-3" />
                              {req.created_at ? new Date(req.created_at).toLocaleDateString() : "Pending"}
                            </span>
                            <Link to="/change-requests" className="text-[#087F8C] font-semibold hover:underline">
                              Review & Authorize
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-[#FAF9F6] p-8 text-center space-y-3 my-auto">
                    <div className="grid size-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-500 mx-auto shadow-2xs">
                      <CheckSquare className="size-5 text-[#087F8C]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-slate-900">No Pending Approvals</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Customer inquiries and high-risk operations requiring staff sign-off will appear here automatically.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Link to="/train">
                        <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 font-medium rounded-xl">
                          <BookOpen className="size-3.5 text-[#087F8C]" /> Manage Knowledge Store
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Voice Sessions & Operations Activity */}
          <div className="lg:col-span-5">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl h-full flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <PhoneCall className="size-4 text-[#087F8C]" />
                    <span>Recent Voice Calls</span>
                  </CardTitle>
                  <Link to="/calls">
                    <Button variant="ghost" size="sm" className="text-xs text-[#087F8C] hover:text-[#076C77] gap-1 font-medium">
                      All Calls <ChevronRight className="size-3.5" />
                    </Button>
                  </Link>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Authenticated conversational AI calls and outcomes.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 flex-1 space-y-3 text-xs">
                {recentSessions.length > 0 ? (
                  <div className="space-y-2.5">
                    {recentSessions.map((session) => (
                      <div
                        key={session.id}
                        className="rounded-2xl border border-slate-100 bg-[#FAF9F6] p-3 text-xs space-y-1.5 hover:border-slate-200 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">
                            {session.caller_name || "Guest Caller"}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border-emerald-200 rounded-full"
                          >
                            {session.status ? session.status.toUpperCase() : "COMPLETED"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{session.caller_phone || "WebRTC Session"}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-slate-400" />
                            {formatDuration(session.duration_seconds)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-[#FAF9F6] p-6 text-center space-y-3 my-auto">
                    <div className="grid size-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-500 mx-auto shadow-2xs">
                      <Mic className="size-5 text-[#087F8C]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-slate-900">No Calls Recorded Yet</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Start your first interactive AI voice consultation with the live call room.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Link to="/voice">
                        <Button size="sm" className="text-xs bg-[#087F8C] hover:bg-[#076C77] text-white font-medium rounded-xl">
                          <Mic className="size-3.5 mr-1" /> Launch Call Room
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link to="/claims" className="text-xs font-semibold text-[#087F8C] hover:underline flex items-center gap-1">
                    <ShieldCheck className="size-3.5" /> Claims Intake Queue
                  </Link>
                  <Link to="/settings" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
                    System Diagnostics <ArrowRight className="size-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
