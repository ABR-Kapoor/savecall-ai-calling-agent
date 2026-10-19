import { Shield, Calendar, User, ArrowRight, HeartPulse, Car } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPolicyStatusPresentation } from "@/lib/insurance/status-presentation";
import { cn } from "@/lib/utils";

export interface PolicyRecord {
  id: string;
  policy_number: string;
  plan_name: string;
  policy_type: string;
  status: string;
  premium_amount?: number;
  due_date?: string;
  nominee_name?: string;
  nominee_relationship?: string;
  customers?: {
    name?: string;
    customer_number?: string;
  };
}

interface PolicySummaryCardProps {
  policy: PolicyRecord;
  onView?: (policy: PolicyRecord) => void;
  className?: string;
}

export function PolicySummaryCard({ policy, onView, className }: PolicySummaryCardProps) {
  const statusInfo = getPolicyStatusPresentation(policy.status);
  const typeLower = (policy.policy_type || "").toLowerCase();

  const TypeIcon =
    typeLower.includes("health") || typeLower.includes("medic")
      ? HeartPulse
      : typeLower.includes("auto") || typeLower.includes("motor")
      ? Car
      : Shield;

  return (
    <Card className={cn("border border-border bg-card shadow-xs hover:border-primary/40 transition-all", className)}>
      <CardContent className="p-4 space-y-3">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
              <TypeIcon className="size-4" />
            </span>
            <div>
              <span className="font-mono text-xs font-bold text-primary tracking-tight">
                {policy.policy_number}
              </span>
              <h4 className="text-xs font-semibold text-foreground leading-tight">
                {policy.plan_name}
              </h4>
            </div>
          </div>
          <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
        </div>

        {/* Policyholder & Nominee Details */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <User className="size-3" /> Policyholder:
            </span>
            <span className="font-medium text-foreground">
              {policy.customers?.name || "Verified Policyholder"}
            </span>
          </div>
          {policy.nominee_name && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Nominee:</span>
              <span className="text-foreground">
                {policy.nominee_name} ({policy.nominee_relationship || "Designee"})
              </span>
            </div>
          )}
        </div>

        {/* Financial & Renewal Data */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block font-medium">Premium</span>
            <span className="font-semibold text-foreground font-mono">
              ₹{Number(policy.premium_amount || 0).toLocaleString()} / yr
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase block font-medium">Renewal Date</span>
            <span className="font-medium text-foreground text-xs flex items-center gap-1">
              <Calendar className="size-3 text-muted-foreground" />
              {policy.due_date || "Annual"}
            </span>
          </div>
        </div>

        {onView && (
          <div className="pt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(policy)}
              className="text-xs h-7 text-primary hover:text-primary/90 gap-1 p-0 hover:bg-transparent"
            >
              View policy details <ArrowRight className="size-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
