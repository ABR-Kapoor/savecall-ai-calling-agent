import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import {
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  FileCheck,
  HelpCircle,
  Filter,
} from "lucide-react";
import { getApprovalRequests, updateApprovalStatus } from "@/lib/insurance.functions";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ApprovalReviewCard, type ApprovalRequestRecord } from "@/components/insurance/approval-review-card";
import { toast } from "sonner";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/change-requests")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Approvals & Handoffs: InsurCall Insurance AI" }],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "inquiries" | "modifications">("all");
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error, refetch } = useQuery({
    queryKey: ["approvals-list", user?.id],
    queryFn: () => getApprovalRequests({ data: { clerkUserId: user?.id } }),
    enabled: !!user?.id,
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
          ? "Request resolved and saved successfully."
          : "Request dismissed."
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update status";
      toast.error(msg);
    },
  });

  const allList = (requests ?? []) as ApprovalRequestRecord[];

  const filtered = allList.filter((r) => {
    const q = search.toLowerCase();
    const type = (r.request_type || "").toLowerCase();
    const custName = (r.customers?.name || "").toLowerCase();
    const polNum = (r.policies?.policy_number || "").toLowerCase();
    const payloadStr = typeof r.payload === "string" ? r.payload.toLowerCase() : JSON.stringify(r.payload || {}).toLowerCase();

    const matchesSearch =
      type.includes(q) || custName.includes(q) || polNum.includes(q) || payloadStr.includes(q);

    if (!matchesSearch) return false;

    if (filterCategory === "inquiries") {
      return type.includes("escalation") || payloadStr.includes("query");
    }
    if (filterCategory === "modifications") {
      return !type.includes("escalation") && !payloadStr.includes("query");
    }

    return true;
  });

  const pendingRequests = filtered.filter((r) => r.status === "pending");
  const pastRequests = filtered.filter((r) => r.status !== "pending");

  return (
    <AppShell
      title="Approvals & Customer Handoffs"
      subtitle="Review customer inquiries, policy updates, and AI handoffs that need human attention"
    >
      <div className="space-y-6 max-w-6xl">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                Awaiting Review
              </p>
              <h3 className="text-2xl font-bold text-amber-950 mt-1">
                {pendingRequests.length}
              </h3>
              <p className="text-[11px] text-amber-700/80 mt-0.5">
                Customer items requiring staff action
              </p>
            </div>
            <div className="size-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Clock className="size-5" />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
                Resolved Decisions
              </p>
              <h3 className="text-2xl font-bold text-emerald-950 mt-1">
                {pastRequests.length}
              </h3>
              <p className="text-[11px] text-emerald-700/80 mt-0.5">
                Completed staff sign-offs
              </p>
            </div>
            <div className="size-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
          </div>

          <div className="rounded-2xl border border-teal-200/80 bg-teal-50/50 p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-teal-900 uppercase tracking-wide">
                Safety & Guardrails
              </p>
              <h3 className="text-sm font-bold text-teal-950 mt-1">
                Dual-Control Active
              </h3>
              <p className="text-[11px] text-teal-700/80 mt-0.5">
                AI never executes unverified changes
              </p>
            </div>
            <div className="size-11 rounded-xl bg-teal-100 flex items-center justify-center text-[#087F8C] shrink-0">
              <ShieldCheck className="size-5" />
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by customer name, query, or policy..."
              className="pl-9 text-xs bg-white border-slate-200 rounded-xl focus-visible:ring-1 focus-visible:ring-[#087F8C]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <Button
              size="sm"
              variant={filterCategory === "all" ? "default" : "ghost"}
              className={`h-7 px-3 text-xs font-medium rounded-lg transition-all ${
                filterCategory === "all"
                  ? "bg-white text-slate-900 shadow-2xs hover:bg-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setFilterCategory("all")}
            >
              All ({allList.length})
            </Button>
            <Button
              size="sm"
              variant={filterCategory === "inquiries" ? "default" : "ghost"}
              className={`h-7 px-3 text-xs font-medium rounded-lg transition-all ${
                filterCategory === "inquiries"
                  ? "bg-white text-slate-900 shadow-2xs hover:bg-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setFilterCategory("inquiries")}
            >
              Inquiries
            </Button>
            <Button
              size="sm"
              variant={filterCategory === "modifications" ? "default" : "ghost"}
              className={`h-7 px-3 text-xs font-medium rounded-lg transition-all ${
                filterCategory === "modifications"
                  ? "bg-white text-slate-900 shadow-2xs hover:bg-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setFilterCategory("modifications")}
            >
              Policy Changes
            </Button>
          </div>
        </div>

        {error && (
          <ErrorState
            title="Failed to load approvals"
            message={error instanceof Error ? error.message : "Database query notice"}
            onRetry={() => refetch()}
          />
        )}

        {/* Section 1: Pending Items */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Awaiting Your Decision ({pendingRequests.length})
              </h3>
              <p className="text-xs text-slate-500">
                Items requiring your team's review before customer follow-up or record updates
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-14 text-center text-xs text-slate-500 flex flex-col items-center gap-2.5 border border-slate-200 rounded-2xl bg-white shadow-2xs">
              <span className="size-5 rounded-full border-2 border-[#087F8C] border-t-transparent animate-spin" />
              <span className="font-medium">Connecting to queue and verifying pending requests...</span>
            </div>
          ) : pendingRequests.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="size-10 text-emerald-600" />}
              title="All caught up! Zero pending approvals"
              description="Customer inquiries and high-impact policy requests requiring human verification will appear here for staff review."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingRequests.map((req) => (
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

        {/* Section 2: Completed History */}
        {pastRequests.length > 0 && (
          <div className="space-y-3.5 pt-6 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Past Decisions & Audit History ({pastRequests.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Historical record of customer handoffs and decisions committed by staff
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pastRequests.map((req) => (
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
