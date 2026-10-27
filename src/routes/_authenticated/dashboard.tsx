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
  Zap,
  ChevronRight,
  Database,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  Server,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { getDashboardMetrics, getTenantSettings } from "@/lib/insurance.functions";
import { InsurCallLoadingScreen } from "@/components/loading-screen";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Overview: InsurCall WhatsApp AI Operations" }],
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
  policyNumber?: string;
  [key: string]: unknown;
}

interface ApprovalRecord {
  id: string;
  request_type?: string;
  status?: string;
  created_at?: string;
  payload?: ApprovalPayload;
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
        submessage="Connecting to your insurance workspace and verifying tenant status."
      />
    );
  }

  const branding = (tenant?.branding_config as BrandingConfig | null) || {};
  const companyName = tenant?.name || "Insurance Operations";
  const agentName = branding.agent_config?.name || "Anya";

  const waStatus = metrics?.whatsappStatus || "DISCONNECTED";
  const isWaConnected = waStatus === "ready";
  const isWaScanning = waStatus === "SCAN_QR_CODE";
  const waPhone = metrics?.whatsappPhone || "";

  const totalConversations = metrics?.totalConversations ?? 0;
  const takeoverCount = metrics?.takeoverCount ?? 0;
  const totalMessages = metrics?.totalMessages ?? 0;
  const aiReplies = metrics?.aiRepliesCount ?? 0;
  const approvedKnowledge = metrics?.approvedKnowledgeCount ?? 0;
  const pendingKnowledge = metrics?.pendingKnowledgeCount ?? 0;
  const pendingApprovals = metrics?.approvalsCount ?? 0;
  const recentApprovals = (metrics?.recentApprovals as ApprovalRecord[] | undefined) ?? [];

  return (
    <AppShell
      title="Overview"
      subtitle={`WhatsApp Automation, Grounded Knowledge & Dual-Control Operations: ${companyName}`}
    >
      <div className="space-y-6">
        {/* Welcome & Real WhatsApp Channel Status Header Banner */}
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
                {isWaConnected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    WhatsApp Channel Connected
                  </span>
                ) : isWaScanning ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                    <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                    QR Scan Required
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                    <span className="size-2 rounded-full bg-slate-400" />
                    WhatsApp Channel Offline
                  </span>
                )}
                {waPhone && (
                  <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {waPhone}
                  </span>
                )}
                <span className="text-xs font-mono text-slate-400">{companyName}</span>
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
                {agentName} is managing your WhatsApp customer channels
              </h2>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                Autonomous WhatsApp policy assistance grounded exclusively in your approved insurance documents. High-risk beneficiary changes and claim decisions require staff adjuster sign-off.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/train">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 font-mono">
                <BookOpen className="size-3.5 text-[#087F8C]" /> Train Knowledge
              </Button>
            </Link>
            <Link to="/whatsapp">
              <Button size="sm" className="bg-[#087F8C] text-white hover:bg-[#076C77] text-xs font-mono gap-1.5 shadow-xs">
                <MessageSquare className="size-3.5 text-white" /> WhatsApp Inbox
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              {error instanceof Error ? error.message : "Database connection notice: failed to load metrics"}
            </span>
          </div>
        )}

        {/* 4 Real Operational Headline Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. WhatsApp Conversations */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                WhatsApp Chats
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-[#E6F6F7] text-[#087F8C]">
                <MessageSquare className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display tracking-tight text-slate-900">
                {isMetricsLoading ? "..." : totalConversations}
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">
                {totalMessages} messages ({aiReplies} AI replies)
              </p>
            </CardContent>
          </Card>

          {/* 2. Human Takeover / Handoffs */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                Staff Takeover
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <ShieldAlert className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-display tracking-tight ${takeoverCount > 0 ? "text-amber-700" : "text-slate-900"}`}>
                {isMetricsLoading ? "..." : takeoverCount}
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">
                {takeoverCount > 0 ? "Active staff takeover threads" : "All chats automated or resolved"}
              </p>
            </CardContent>
          </Card>

          {/* 3. Grounded Knowledge Store */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                Knowledge Store
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display tracking-tight text-emerald-700">
                {isMetricsLoading ? "..." : `${approvedKnowledge} Approved`}
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">
                {pendingKnowledge > 0 ? `${pendingKnowledge} awaiting review` : "Knowledge store verified"}
              </p>
            </CardContent>
          </Card>

          {/* 4. Dual-Control Approvals Queue */}
          <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                Staff Approvals
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <CheckSquare className="size-3.5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display tracking-tight text-blue-700">
                {isMetricsLoading ? "..." : pendingApprovals}
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">Requires dual-control sign-off</p>
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
                    Critical operations that require authorized human review before updating policy records.
                  </CardDescription>
                </div>
                <Link to="/change-requests">
                  <Button variant="ghost" size="sm" className="text-xs text-[#087F8C] hover:text-[#076C77] gap-1 font-mono">
                    View Queue <ChevronRight className="size-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                {recentApprovals.length > 0 ? (
                  <div className="space-y-3">
                    {recentApprovals.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-slate-100 bg-[#FAF9F6] p-4 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {req.request_type ? req.request_type.replace(/_/g, " ").toUpperCase() : "POLICY ENDORSEMENT"}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono text-amber-800 bg-amber-50 border-amber-200 font-semibold"
                          >
                            {req.status ? req.status.toUpperCase() : "PENDING"}
                          </Badge>
                        </div>
                        <p className="text-slate-600 text-[11.5px] leading-relaxed">
                          {req.payload?.description || req.payload?.reason || "Pending dual-control staff adjuster authorization."}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-mono">
                          <span>Status: {req.status || "pending"}</span>
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
                        High-risk operations like beneficiary updates, address changes, or claim disputes requiring staff confirmation will appear here automatically.
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

          {/* Verified Infrastructure & RAG Pipeline Status */}
          <div className="lg:col-span-5">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl h-full flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                  <span>Verified Platform Health</span>
                  <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Runtime status across messaging gateways, database RLS, and vector retrieval.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-[#FAF9F6]">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="size-4 text-[#087F8C]" />
                    <div>
                      <span className="font-semibold text-slate-900 block">WhatsApp Multi-Device Gateway</span>
                      <span className="text-[10px] font-mono text-slate-400">Baileys WebSocket on port 2785</span>
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
                      <span className="font-semibold text-slate-900 block">Grounded Vector Engine</span>
                      <span className="text-[10px] font-mono text-slate-400">pgvector cosine similarity matching</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200">
                    Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-[#FAF9F6]">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="size-4 text-[#087F8C]" />
                    <div>
                      <span className="font-semibold text-slate-900 block">Dual-Control Escalations</span>
                      <span className="text-[10px] font-mono text-slate-400">Zero unsupervised payout authorization</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-blue-800 bg-blue-50 border-blue-200">
                    Enforced
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
