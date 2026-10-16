import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Shield, AlertCircle } from "lucide-react";
import { getPolicies } from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/policies")({
  head: () => ({
    meta: [{ title: "Policies — SaveCall Insurance AI" }],
  }),
  component: PoliciesPage,
});

function PoliciesPage() {
  const [search, setSearch] = useState("");

  const { data: policies, isLoading, error } = useQuery({
    queryKey: ["policies-list"],
    queryFn: () => getPolicies(),
  });

  const filtered = (policies ?? []).filter((p: any) => {
    const q = search.toLowerCase();
    const custName = p.customers?.name?.toLowerCase() ?? "";
    const custNum = p.customers?.customer_number?.toLowerCase() ?? "";
    return (
      p.policy_number?.toLowerCase().includes(q) ||
      p.plan_name?.toLowerCase().includes(q) ||
      custName.includes(q) ||
      custNum.includes(q)
    );
  });

  return (
    <AppShell
      title="Policy Directory"
      subtitle="Multi-tenant policy records queried and protected under InsForge Row Level Security"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search policy #, plan, or customer..."
              className="pl-8 text-xs bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load policies: {error.message}</span>
          </div>
        )}

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Active & Scoped Policies</CardTitle>
            <CardDescription className="text-xs">InsForge RLS strictly limits views to authorized tenant</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">Loading policies from InsForge...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                <Shield className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="font-medium text-foreground">No policies found in database</p>
                <p>New policies created in InsForge will automatically appear here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Policy Number</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Plan & Type</TableHead>
                    <TableHead className="text-xs">Premium</TableHead>
                    <TableHead className="text-xs">Due Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Nominee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((policy: any) => (
                    <TableRow key={policy.id}>
                      <TableCell className="text-xs font-mono font-medium text-cyan-400">
                        {policy.policy_number}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{policy.customers?.name || "Unassigned"}</div>
                        <div className="text-[10px] text-muted-foreground">{policy.customers?.customer_number || "-"}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{policy.plan_name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{policy.policy_type}</div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">₹{Number(policy.premium_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{policy.due_date || "-"}</TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={
                            policy.status === "active"
                              ? "border-emerald-500/40 text-emerald-400"
                              : "border-amber-500/40 text-amber-400"
                          }
                        >
                          {policy.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {policy.nominee_name ? `${policy.nominee_name} (${policy.nominee_relationship || 'Nominee'})` : "None"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
