import { ShieldAlert, Calendar, FileText, ArrowRight, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getClaimStatusPresentation } from "@/lib/insurance/status-presentation";
import { cn } from "@/lib/utils";

export interface ClaimRecord {
  id: string;
  claim_number: string;
  amount?: number;
  estimated_amount?: number;
  status: string;
  created_at?: string;
  description?: string;
  policies?: {
    policy_number?: string;
    plan_name?: string;
  };
  customers?: {
    name?: string;
    customer_number?: string;
  };
}

interface ClaimSummaryCardProps {
  claim: ClaimRecord;
  onInspect?: (claim: ClaimRecord) => void;
  className?: string;
}

export function ClaimSummaryCard({ claim, onInspect, className }: ClaimSummaryCardProps) {
  const statusInfo = getClaimStatusPresentation(claim.status);
  const claimAmount = claim.estimated_amount ?? claim.amount;

  return (
    <Card className={cn("border border-border bg-card shadow-xs hover:border-primary/40 transition-all", className)}>
      <CardContent className="p-4 space-y-3">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-700 shrink-0">
              <ShieldAlert className="size-4" />
            </span>
            <div>
              <span className="font-mono text-xs font-bold text-foreground">
                {claim.claim_number}
              </span>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <FileText className="size-3" /> Policy: {claim.policies?.policy_number || "Linked Policy"}
              </div>
            </div>
          </div>
          <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
        </div>

        {/* Claimant & Description */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <User className="size-3" /> Claimant:
            </span>
            <span className="font-medium text-foreground">
              {claim.customers?.name || "Verified Policyholder"}
            </span>
          </div>
          {claim.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
              {claim.description}
            </p>
          )}
        </div>

        {/* Claim Amount & Date */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block font-medium">Estimated Amount</span>
            <span className="font-semibold text-foreground font-mono">
              {claimAmount !== undefined && claimAmount !== null
                ? `₹${Number(claimAmount).toLocaleString()}`
                : "Not Provided"}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase block font-medium">Filed Date</span>
            <span className="font-medium text-foreground text-xs flex items-center gap-1">
              <Calendar className="size-3 text-muted-foreground" />
              {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : "--"}
            </span>
          </div>
        </div>

        {onInspect && (
          <div className="pt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onInspect(claim)}
              className="text-xs h-7 text-primary hover:text-primary/90 gap-1 p-0 hover:bg-transparent"
            >
              Review claim timeline <ArrowRight className="size-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
