import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, ShieldAlert } from "lucide-react";
import { getApprovalRequests, updateApprovalStatus } from "@/lib/insurance.functions";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ApprovalReviewCard, type ApprovalRequestRecord } from "@/components/insurance/approval-review-card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/change-requests")({
  head: () => ({
    meta: [{ title: "Pending Approvals: InsurCall Insurance AI" }],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error, refetch } = useQuery({
    queryKey: ["approvals-list"],
    queryFn: () => getApprovalRequests(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: "approved" | "rejected" }) =>
      updateApprovalStatus({ data: { id: vars.id, status: vars.status } }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["approvals-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["policies-list"] });
      toast.success(
        vars.status === "approved"
          ? "Request approved and committed to database."
          : "Request rejected successfully."
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update approval status");
    },
  });

  const filtered = (requests ?? []).filter((r: any) => {
    const q = search.toLowerCase();
    const type = r.request_type?.toLowerCase() ?? "";
    const custName = r.customers?.name?.toLowerCase() ?? "";
    const polNum = r.policies?.policy_number?.toLowerCase() ?? "";
    return type.includes(q) || custName.includes(q) || polNum.includes(q);
  });

  const pendingRequests = filtered.filter((r: any) => r.status === "pending");
  const pastRequests = filtered.filter((r: any) => r.status !== "pending");

  return (
    <AppShell
      title="High-Risk Approval Queue"
      subtitle="Human-in-the-loop review for policy cancellations, nominee changes, and high-impact updates staged by AI"
    >
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by request type, policy, or customer..."
              className="pl-8 text-xs bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="text-xs text-muted-foreground self-center sm:self-auto font-mono">
            {pendingRequests.length} pending review • {pastRequests.length} completed
          </div>
        </div>

        {error && (
          <ErrorState
            title="Failed to load approvals"
            message={(error as any)?.message || "PostgreSQL query failed"}
            onRetry={() => refetch()}
          />
        )}

        {/* Section 1: Pending Actions Requiring Decision */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-foreground">
              Awaiting Compliance Decision ({pendingRequests.length})
            </h3>
            <span className="text-xs text-muted-foreground">
              Requires dual-authorization before committing to carrier policy records
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2 border border-border rounded-xl bg-card">
              <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span>Loading approvals from database...</span>
            </div>
          ) : pendingRequests.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="size-8 text-emerald-600" />}
              title="All caught up! Zero pending approvals"
              description="High-risk modifications initiated by policyholders via the voice receptionist will appear here for staff sign-off."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((req: any) => (
                <ApprovalReviewCard
                  key={req.id}
                  request={req}
                  isPendingMutation={mutation.isPending}
                  onApprove={(id) => mutation.mutate({ id, status: "approved" })}
                  onReject={(id) => mutation.mutate({ id, status: "rejected" })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Historical Approvals */}
        {pastRequests.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-display text-sm font-semibold text-foreground">
              Past Decisions & Audit History ({pastRequests.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastRequests.map((req: any) => (
                <ApprovalReviewCard
                  key={req.id}
                  request={req}
                  isPendingMutation={false}
                  onApprove={() => {}}
                  onReject={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
