import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Shield, HeartPulse, Car, Calendar, User, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPolicies } from "@/lib/insurance.functions";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PolicyTypeTiles } from "@/components/insurance/policy-type-tile";
import { PolicySummaryCard, type PolicyRecord } from "@/components/insurance/policy-summary-card";
import { getPolicyStatusPresentation } from "@/lib/insurance/status-presentation";

export const Route = createFileRoute("/_authenticated/policies")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Policy Directory: InsurCall Insurance AI" }],
  }),
  component: PoliciesPage,
});

import { useUser } from "@clerk/clerk-react";

function PoliciesPage() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activePolicyModal, setActivePolicyModal] = useState<PolicyRecord | null>(null);

  const { data: policies, isLoading, error, refetch } = useQuery({
    queryKey: ["policies-list", user?.id],
    queryFn: () =>
      getPolicies({
        data: {
          clerkUserId: user?.id,
        },
      }),
  });

  // Filter policies by search text and category
  const filtered = (policies ?? []).filter((p: any) => {
    const q = search.toLowerCase();
    const custName = p.customers?.name?.toLowerCase() ?? "";
    const custNum = p.customers?.customer_number?.toLowerCase() ?? "";
    const polNum = p.policy_number?.toLowerCase() ?? "";
    const plan = p.plan_name?.toLowerCase() ?? "";
    const type = (p.policy_type || "").toLowerCase();

    const matchesSearch =
      polNum.includes(q) ||
      plan.includes(q) ||
      custName.includes(q) ||
      custNum.includes(q);

    if (!matchesSearch) return false;

    if (selectedCategory === "all") return true;
    if (selectedCategory === "health") return type.includes("health") || type.includes("medic");
    if (selectedCategory === "auto") return type.includes("auto") || type.includes("motor");
    if (selectedCategory === "life") return type.includes("life") || type.includes("term");
    if (selectedCategory === "property") return type.includes("prop") || type.includes("home");

    return true;
  });

  return (
    <AppShell
      title="Policy Directory"
      subtitle="Policyholder coverage records protected under InsForge tenant isolation"
    >
      <div className="space-y-6">
        {/* Policy Category Filter Tiles */}
        <PolicyTypeTiles
          selectedCategory={selectedCategory}
          onSelect={(cat) => setSelectedCategory(cat)}
        />

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search policy #, plan, or customer..."
              className="pl-8 text-xs bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="text-xs text-muted-foreground self-center sm:self-auto font-mono">
            Showing {filtered.length} of {policies?.length || 0} policies
          </div>
        </div>

        {error && (
          <ErrorState
            title="Failed to load policies"
            message={(error as any)?.message || "PostgreSQL query failed"}
            onRetry={() => refetch()}
          />
        )}

        {/* Desktop Responsive Table + Mobile Card View */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Active & Scoped Policies
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  InsForge Row Level Security ensures queries remain strictly isolated to this carrier workspace
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Loading policies from database...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Shield className="size-8" />}
                  title="No policies found"
                  description={
                    search || selectedCategory !== "all"
                      ? "No records matched your search or category filter. Try clearing your filters."
                      : "New policies created in InsForge will automatically appear here."
                  }
                  actionLabel={search || selectedCategory !== "all" ? "Reset Filters" : undefined}
                  onAction={() => {
                    setSearch("");
                    setSelectedCategory("all");
                  }}
                />
              </div>
            ) : (
              <>
                {/* Desktop View Table (hidden on small mobile) */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-semibold">Policy Number</TableHead>
                        <TableHead className="text-xs font-semibold">Policyholder</TableHead>
                        <TableHead className="text-xs font-semibold">Plan & Category</TableHead>
                        <TableHead className="text-xs font-semibold">Annual Premium</TableHead>
                        <TableHead className="text-xs font-semibold">Renewal Date</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold">Nominee</TableHead>
                        <TableHead className="text-xs text-right font-semibold">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((policy: any) => {
                        const statusInfo = getPolicyStatusPresentation(policy.status);

                        return (
                          <TableRow key={policy.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-xs font-mono font-bold text-primary">
                              {policy.policy_number}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-medium text-foreground">
                                {policy.customers?.name || "Unassigned"}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {policy.customers?.customer_number || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-medium text-foreground">{policy.plan_name}</div>
                              <div className="text-[10px] text-muted-foreground uppercase">
                                {policy.policy_type}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold font-mono text-foreground">
                              ₹{Number(policy.premium_amount || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {policy.due_date || "-"}
                            </TableCell>
                            <TableCell className="text-xs">
                              <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {policy.nominee_name
                                ? `${policy.nominee_name} (${policy.nominee_relationship || "Nominee"})`
                                : "None"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActivePolicyModal(policy)}
                                className="h-7 text-xs text-primary hover:text-primary/90 hover:bg-primary/10"
                              >
                                View
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
                  {filtered.map((policy: any) => (
                    <PolicySummaryCard
                      key={policy.id}
                      policy={policy}
                      onView={(p) => setActivePolicyModal(p)}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Policy Details Dialog */}
        {activePolicyModal && (
          <Dialog open={!!activePolicyModal} onOpenChange={() => setActivePolicyModal(null)}>
            <DialogContent className="max-w-lg bg-card border-border">
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <span className="font-mono text-xs font-bold text-primary">
                    {activePolicyModal.policy_number}
                  </span>
                  <StatusBadge
                    label={getPolicyStatusPresentation(activePolicyModal.status).label}
                    tone={getPolicyStatusPresentation(activePolicyModal.status).tone}
                  />
                </div>
                <DialogTitle className="font-display text-lg font-bold text-foreground">
                  {activePolicyModal.plan_name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Policy terms, cashless network provisions, and registered beneficiaries.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-muted/20">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Policyholder
                    </span>
                    <span className="font-medium text-foreground">
                      {activePolicyModal.customers?.name || "Verified Customer"}
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      {activePolicyModal.customers?.customer_number}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Annual Premium
                    </span>
                    <span className="font-bold text-foreground font-mono">
                      ₹{Number(activePolicyModal.premium_amount || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Due: {activePolicyModal.due_date || "Annual"}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Registered Nominee
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {activePolicyModal.nominee_name || "None designated"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Relationship: {activePolicyModal.nominee_relationship || "N/A"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    To modify nominee or contact info, callers must complete 2FA OTP verification via the voice receptionist or request compliance sign-off.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActivePolicyModal(null)}
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
