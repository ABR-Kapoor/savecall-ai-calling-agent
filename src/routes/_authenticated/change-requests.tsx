import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, CheckCircle2, XCircle, AlertCircle, Clock, ShieldAlert } from "lucide-react";
import { getApprovalRequests, updateApprovalStatus } from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/change-requests")({
  head: () => ({
    meta: [{ title: "Approvals — SaveCall Insurance AI" }],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ["approvals-list"],
    queryFn: () => getApprovalRequests(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: "approved" | "rejected" }) =>
      updateApprovalStatus({ data: { id: vars.id, status: vars.status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  const filtered = (requests ?? []).filter((r: any) => {
    const q = search.toLowerCase();
    const type = r.request_type?.toLowerCase() ?? "";
    const custName = r.customers?.name?.toLowerCase() ?? "";
    const polNum = r.policies?.policy_number?.toLowerCase() ?? "";
    return type.includes(q) || custName.includes(q) || polNum.includes(q);
  });

  return (
    <AppShell
      title="High-Risk Approval Queue"
      subtitle="Human-in-the-loop review for policy cancellations, nominee changes, and sensitive updates staged by AI"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by request type, policy, or customer..."
              className="pl-8 text-xs bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load approval requests: {error.message}</span>
          </div>
        )}

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 sm:p-6 pb-4">
            <CardTitle className="text-base font-semibold">Pending Compliance Reviews</CardTitle>
            <CardDescription className="text-xs">
              Actions requiring compliance officer sign-off before being committed to carrier core systems.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-8 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Loading approval requests from database...
                </span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
                <p className="text-sm font-medium">All caught up! No pending approvals</p>
                <p className="text-xs max-w-sm">
                  High-risk operations initiated by policyholders via the AI voice agent will appear here for verification.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Request Type</TableHead>
                      <TableHead className="text-xs">Policy / Customer</TableHead>
                      <TableHead className="text-xs">Payload Details</TableHead>
                      <TableHead className="text-xs">Risk Level</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Requested</TableHead>
                      <TableHead className="text-xs text-right">Officer Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r: any) => {
                      const rawRisk = r.risk_level;
                      const riskStr =
                        typeof rawRisk === "object" && rawRisk !== null
                          ? String(rawRisk.tier || rawRisk.level || "HIGH")
                          : String(rawRisk || "HIGH");
                      const risk = riskStr.toUpperCase();
                      const riskBadge =
                        risk === "CRITICAL"
                          ? "border-rose-500/40 bg-rose-500/20 text-rose-300"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-400";

                      const isPending = r.status === "pending";

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs font-semibold text-cyan-400">
                            {r.request_type}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground">
                              {r.customers?.name || "Customer"}
                            </div>
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {r.policies?.policy_number || "Policy #"}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono max-w-xs truncate text-muted-foreground">
                            {typeof r.payload === "string" ? r.payload : JSON.stringify(r.payload)}
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
                                r.status === "approved"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : r.status === "rejected"
                                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                              }`}
                            >
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.created_at ? new Date(r.created_at).toLocaleString() : "--"}
                          </TableCell>
                          <TableCell className="text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
                                  disabled={mutation.isPending}
                                  onClick={() => mutation.mutate({ id: r.id, status: "approved" })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-rose-500/40 text-rose-400 hover:bg-rose-500/20"
                                  disabled={mutation.isPending}
                                  onClick={() => mutation.mutate({ id: r.id, status: "rejected" })}
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground capitalize">
                                {r.status}
                              </span>
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
      </div>
    </AppShell>
  );
}
