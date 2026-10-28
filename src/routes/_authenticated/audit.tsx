import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShieldAlert, AlertCircle, ShieldCheck, Eye, Terminal } from "lucide-react";
import { getAuditLogs } from "@/lib/insurance.functions";
import { useUser } from "@clerk/clerk-react";

export const Route = createFileRoute("/_authenticated/audit")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Audit Trail: InsurCall Insurance AI" }],
  }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [selectedPayload, setSelectedPayload] = useState<{
    action: string;
    payload: any;
  } | null>(null);

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["audit-logs-list", user?.id],
    queryFn: () => getAuditLogs({ data: { clerkUserId: user?.id } }),
    enabled: !!user?.id,
  });

  const filtered = (logs ?? []).filter((l: any) => {
    const q = search.toLowerCase();
    const action = l.action?.toLowerCase() ?? "";
    const target = l.target_resource?.toLowerCase() ?? "";
    const actor = l.actor_type?.toLowerCase() ?? "";
    const targetId = l.target_id?.toLowerCase() ?? "";
    return (
      action.includes(q) ||
      target.includes(q) ||
      actor.includes(q) ||
      targetId.includes(q)
    );
  });

  return (
    <AppShell
      title="Compliance & Security Audit Trail"
      subtitle="Comprehensive audit trail of customer conversations, policy access, dual-control approvals, and security events"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search action, target resource, or actor..."
              className="pl-8 text-xs bg-white border-slate-200 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Failed to load audit logs: {error.message}</span>
          </div>
        )}

        <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl">
          <CardHeader className="p-4 sm:p-6 pb-4 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">Security & Operational Event Log</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Every customer interaction, staff approval, and policy record access is captured with timestamps and actor provenance.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-8 text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2 border-[#087F8C] border-t-transparent animate-spin" />
                  Loading audit trail from database...
                </span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 space-y-3">
                <ShieldCheck className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-800">No audit events recorded yet</p>
                <p className="text-xs max-w-sm text-slate-500 leading-relaxed">
                  Customer interactions, dual-control approvals, and staff policy updates will automatically record entries here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Action / Event</TableHead>
                      <TableHead className="text-xs">Actor</TableHead>
                      <TableHead className="text-xs">Target Resource</TableHead>
                      <TableHead className="text-xs">Risk Level</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Timestamp</TableHead>
                      <TableHead className="text-xs text-right">Payload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((l: any) => {
                      const rawRisk = l.risk_level;
                      const riskStr =
                        typeof rawRisk === "object" && rawRisk !== null
                          ? String(rawRisk.tier || rawRisk.level || "LOW")
                          : String(rawRisk || "LOW");
                      const risk = riskStr.toUpperCase();
                      const riskBadge =
                        risk === "HIGH" || risk === "CRITICAL"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                          : risk === "MEDIUM"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";

                      return (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium text-xs">
                            <span className="font-mono text-cyan-400">{l.action}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px]">
                              {l.actor_type || "system"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {l.target_resource} {l.target_id ? `(${l.target_id.substring(0, 8)}...)` : ""}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${riskBadge}`}>
                              {risk}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                l.status === "success"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : l.status === "rejected"
                                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                  : "border-muted text-muted-foreground"
                              }`}
                            >
                              {l.status || "logged"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {l.created_at ? new Date(l.created_at).toLocaleString() : "--"}
                          </TableCell>
                          <TableCell className="text-right">
                            {l.payload ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() =>
                                  setSelectedPayload({
                                    action: l.action,
                                    payload: l.payload,
                                  })
                                }
                              >
                                <Terminal className="h-3 w-3 text-cyan-400" />
                                Inspect
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">None</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payload Modal */}
        {selectedPayload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <Card className="w-full max-w-lg border border-slate-200 bg-white shadow-xl rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Event Payload: {selectedPayload.action}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-slate-900"
                    onClick={() => setSelectedPayload(null)}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <pre className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800">
                  {typeof selectedPayload.payload === "string"
                    ? selectedPayload.payload
                    : JSON.stringify(selectedPayload.payload, null, 2)}
                </pre>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-medium rounded-xl px-4"
                    onClick={() => setSelectedPayload(null)}
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
