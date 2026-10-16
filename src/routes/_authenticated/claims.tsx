import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShieldAlert, AlertCircle } from "lucide-react";
import { getClaims } from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/claims")({
  head: () => ({
    meta: [{ title: "Claims — SaveCall Insurance AI" }],
  }),
  component: ClaimsPage,
});

function ClaimsPage() {
  const [search, setSearch] = useState("");

  const { data: claims, isLoading, error } = useQuery({
    queryKey: ["claims-list"],
    queryFn: () => getClaims(),
  });

  const filtered = (claims ?? []).filter((c: any) => {
    const q = search.toLowerCase();
    const custName = c.customers?.name?.toLowerCase() ?? "";
    const polNum = c.policies?.policy_number?.toLowerCase() ?? "";
    return (
      c.claim_number?.toLowerCase().includes(q) ||
      polNum.includes(q) ||
      custName.includes(q)
    );
  });

  return (
    <AppShell title="Claims Processing" subtitle="Review insurance claims queried or submitted via AI voice assistant">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search claim #, policy #, or claimant..."
              className="pl-8 text-xs bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load claims: {error.message}</span>
          </div>
        )}

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Active Claims</CardTitle>
            <CardDescription className="text-xs">Live status updates synced to the voice assistant agent</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">Loading claims from InsForge...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="font-medium text-foreground">No claims found in database</p>
                <p>New claim inquiries or submissions will be registered here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Claim Number</TableHead>
                    <TableHead className="text-xs">Policy Number</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Claim Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Submitted</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((claim: any) => (
                    <TableRow key={claim.id}>
                      <TableCell className="text-xs font-mono font-medium text-cyan-400">
                        {claim.claim_number}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{claim.policies?.policy_number || "-"}</TableCell>
                      <TableCell className="text-xs font-medium">{claim.customers?.name || "Unassigned"}</TableCell>
                      <TableCell className="text-xs font-medium">₹{Number(claim.estimated_amount ?? claim.amount ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={
                            claim.status === "approved"
                              ? "border-emerald-500/40 text-emerald-400"
                              : claim.status === "in_review"
                              ? "border-amber-500/40 text-amber-400"
                              : "border-muted text-muted-foreground"
                          }
                        >
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {claim.description}
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
