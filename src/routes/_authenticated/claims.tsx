import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, ShieldAlert, Calendar, FileText, User, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getClaims } from "@/lib/insurance.functions";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ClaimSummaryCard, type ClaimRecord } from "@/components/insurance/claim-summary-card";
import { ClaimProgressTimeline } from "@/components/insurance/claim-progress-timeline";
import { getClaimStatusPresentation } from "@/lib/insurance/status-presentation";

import { useUser } from "@clerk/clerk-react";

export const Route = createFileRoute("/_authenticated/claims")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Claims Processing: InsurCall Insurance AI" }],
  }),
  component: ClaimsPage,
});

function ClaimsPage() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [activeClaimModal, setActiveClaimModal] = useState<ClaimRecord | null>(null);

  const { data: claims, isLoading, error, refetch } = useQuery({
    queryKey: ["claims-list", user?.id],
    queryFn: () =>
      getClaims({
        data: {
          clerkUserId: user?.id,
        },
      }),
  });

  const totalClaims = claims?.length || 0;
  const inReviewCount = (claims ?? []).filter((c: any) =>
    ["submitted", "under_review", "pending", "in_progress"].includes(String(c.status || "").toLowerCase())
  ).length;
  const settledCount = (claims ?? []).filter((c: any) =>
    ["approved", "settled", "paid"].includes(String(c.status || "").toLowerCase())
  ).length;

  const filtered = (claims ?? []).filter((c: any) => {
    const q = search.toLowerCase();
    const custName = c.customers?.name?.toLowerCase() ?? "";
    const polNum = c.policies?.policy_number?.toLowerCase() ?? "";
    const claimNum = c.claim_number?.toLowerCase() ?? "";
    return claimNum.includes(q) || polNum.includes(q) || custName.includes(q);
  });

  return (
    <AppShell
      title="Claims Processing"
      subtitle="First Notice of Loss (FNOL) filings, incident intake, and active claim evaluations"
    >
      <div className="space-y-6">
        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-slate-200 bg-white p-4 shadow-xs rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Registered Filings
                </span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {totalClaims}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Total FNOL records
                </span>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
                <FileText className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 bg-white p-4 shadow-xs rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Under Evaluation
                </span>
                <span className="text-2xl font-bold text-amber-700 mt-1 block">
                  {inReviewCount}
                </span>
                <span className="text-[11px] text-amber-600 mt-0.5 block">
                  Survey & assessment active
                </span>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Clock className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 bg-white p-4 shadow-xs rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Settled / Approved
                </span>
                <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                  {settledCount}
                </span>
                <span className="text-[11px] text-emerald-600 mt-0.5 block">
                  Resolved claim dossiers
                </span>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search claim #, policy #, or claimant..."
              className="pl-8 text-xs bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="text-xs text-muted-foreground self-center sm:self-auto font-medium">
            Showing {filtered.length} of {claims?.length || 0} claims
          </div>
        </div>

        {error && (
          <ErrorState
            title="Failed to load claims"
            message={(error as any)?.message || "Failed to load claims. Please retry."}
            onRetry={() => refetch()}
          />
        )}

        {/* Claims Container */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Registered Claims Registry
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Synchronized with encrypted policyholder records and verified against active policy limits
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Loading claims from database...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<ShieldAlert className="size-8" />}
                  title="No claims found"
                  description={
                    search
                      ? "No claims match your search query."
                      : "New claim inquiries or incident filings will automatically appear here."
                  }
                  actionLabel={search ? "Clear Search" : undefined}
                  onAction={() => setSearch("")}
                />
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-semibold">Claim Number</TableHead>
                        <TableHead className="text-xs font-semibold">Policy Number</TableHead>
                        <TableHead className="text-xs font-semibold">Claimant</TableHead>
                        <TableHead className="text-xs font-semibold">Estimated Amount</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold">Submitted Date</TableHead>
                        <TableHead className="text-xs font-semibold">Description</TableHead>
                        <TableHead className="text-xs text-right font-semibold">Timeline</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((claim: any) => {
                        const statusInfo = getClaimStatusPresentation(claim.status);
                        const claimAmount = claim.estimated_amount ?? claim.amount;

                        return (
                          <TableRow key={claim.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-xs font-mono font-bold text-foreground">
                              {claim.claim_number}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-primary font-medium">
                              {claim.policies?.policy_number || "-"}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-foreground">
                              {claim.customers?.name || "Unassigned"}
                            </TableCell>
                            <TableCell className="text-xs font-semibold font-mono text-foreground">
                              {claimAmount !== undefined && claimAmount !== null
                                ? `₹${Number(claimAmount).toLocaleString()}`
                                : ": "}
                            </TableCell>
                            <TableCell className="text-xs">
                              <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : "--"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                              {claim.description || "First Notice of Loss filing"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveClaimModal(claim)}
                                className="h-7 text-xs text-primary hover:text-primary/90 hover:bg-primary/10"
                              >
                                Review
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-border p-3 space-y-3">
                  {filtered.map((claim: any) => (
                    <ClaimSummaryCard
                      key={claim.id}
                      claim={claim}
                      onInspect={(c) => setActiveClaimModal(c)}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Claim Lifecycle & Timeline Dialog */}
        {activeClaimModal && (
          <Dialog open={!!activeClaimModal} onOpenChange={() => setActiveClaimModal(null)}>
            <DialogContent className="max-w-lg bg-card border-border">
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {activeClaimModal.claim_number}
                  </span>
                  <StatusBadge
                    label={getClaimStatusPresentation(activeClaimModal.status).label}
                    tone={getClaimStatusPresentation(activeClaimModal.status).tone}
                  />
                </div>
                <DialogTitle className="font-display text-lg font-bold text-foreground">
                  Claim Lifecycle & Timeline
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Incident details and evaluation steps logged for policy {activeClaimModal.policies?.policy_number}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Summary Box */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-muted/20">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Claimant
                    </span>
                    <span className="font-medium text-foreground">
                      {activeClaimModal.customers?.name || "Policyholder"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Estimated Amount
                    </span>
                    <span className="font-bold text-foreground font-mono">
                      {activeClaimModal.estimated_amount !== undefined
                        ? `₹${Number(activeClaimModal.estimated_amount).toLocaleString()}`
                        : "Not specified"}
                    </span>
                  </div>
                </div>

                {activeClaimModal.description && (
                  <div className="p-3 rounded-xl border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">
                      Reported Incident Notes
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {activeClaimModal.description}
                    </p>
                  </div>
                )}

                {/* Vertical Timeline */}
                <div className="p-4 rounded-xl border border-border bg-card">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-3">
                    Claim Progress
                  </span>
                  <ClaimProgressTimeline
                    currentStatus={activeClaimModal.status}
                    submittedAt={activeClaimModal.created_at}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveClaimModal(null)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
