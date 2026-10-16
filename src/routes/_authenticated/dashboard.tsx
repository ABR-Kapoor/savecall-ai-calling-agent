import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { getDashboardMetrics } from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Operations Command — SaveCall AI" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => getDashboardMetrics(),
  });

  return (
    <AppShell
      title="SaveCall Operations Command"
      subtitle="Universal Autonomous Voice Employee Control Plane & Business Workspace"
    >
      <div className="space-y-6">
        {/* Quick Launch Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 p-6 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">LiveKit Ready</Badge>
              <h2 className="text-lg font-semibold text-white">Autonomous Voice Employee Active</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Handles incoming customer voice calls in natural English, Hindi, and Hinglish. Connect to the realtime test room to verify barge-in latency and policy enforcement.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link to="/agent">
              <Button variant="outline" className="border-border text-xs gap-1.5">
                <Bot className="h-4 w-4" />
                Configure Employee
              </Button>
            </Link>
            <Link to="/voice">
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold gap-2 shadow text-xs">
                <Mic className="h-4 w-4" />
                Launch Test Call
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Database error: {error.message}</span>
          </div>
        )}

        {/* Operational Voice-Employee Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Calls Handled</CardTitle>
              <PhoneCall className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : metrics?.totalCalls ?? metrics?.sessionsCount ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Recorded WebRTC & voice sessions</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Automation Rate</CardTitle>
              <Zap className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                {isLoading ? "..." : `${metrics?.automationRate ?? 100}%`}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Resolved without human escalation</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Captured Inquiries</CardTitle>
              <Users className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : metrics?.leads ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Qualified leads & callbacks</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pending Approvals</CardTitle>
              <CheckSquare className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">
                {isLoading ? "..." : metrics?.approvalsCount ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">High-risk actions awaiting sign-off</p>
            </CardContent>
          </Card>
        </div>

        {/* Action & Sessions Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Action Approval Queue Summary */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">High-Risk Approval Queue</CardTitle>
                <CardDescription className="text-xs">Requests staged by AI voice agent awaiting staff decision</CardDescription>
              </div>
              <Link to="/change-requests">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-cyan-400 hover:text-cyan-300">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading approvals...</p>
              ) : metrics?.recentApprovals?.length ? (
                metrics.recentApprovals.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-background/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                          {req.request_type}
                        </Badge>
                        <span className="text-xs font-medium">{new Date(req.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {JSON.stringify(req.payload)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{req.status}</Badge>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
                  No pending change requests in database.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice Sessions Summary */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Recent Voice Sessions</CardTitle>
                <CardDescription className="text-xs">Incoming WebRTC calls handled by the LiveKit agent</CardDescription>
              </div>
              <Link to="/calls">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-cyan-400 hover:text-cyan-300">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading sessions...</p>
              ) : metrics?.recentSessions?.length ? (
                metrics.recentSessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-background/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{s.caller_name || "Unknown Caller"}</span>
                        <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Room: {s.room_name} • {s.duration_sec}s
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
                  No voice sessions recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Insurance Vertical Module Card (Preserved & Integrated) */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 text-[10px] uppercase">
                  Vertical Module
                </Badge>
                <CardTitle className="text-base font-semibold">Insurance & Policy Operations</CardTitle>
              </div>
              <CardDescription className="text-xs mt-1">
                Integrated policyholder support module for policy lookups, first notice of loss (FNOL), and claims review.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/policies">
                <Button variant="outline" size="sm" className="text-xs gap-1 border-border">
                  <FileText className="h-3.5 w-3.5 text-cyan-400" /> Policies ({metrics?.policiesCount ?? 0})
                </Button>
              </Link>
              <Link to="/claims">
                <Button variant="outline" size="sm" className="text-xs gap-1 border-border">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Claims ({metrics?.claimsCount ?? 0})
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
