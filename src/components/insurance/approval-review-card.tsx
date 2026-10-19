import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Shield, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { getApprovalStatusPresentation } from "@/lib/insurance/status-presentation";
import { cn } from "@/lib/utils";

export interface ApprovalRequestRecord {
  id: string;
  request_type: string;
  status: string;
  risk_level?: string | Record<string, unknown>;
  created_at?: string;
  payload?: any;
  customers?: {
    name?: string;
    customer_number?: string;
  };
  policies?: {
    policy_number?: string;
  };
}

interface ApprovalReviewCardProps {
  request: ApprovalRequestRecord;
  onApprove: (id: string) => Promise<void> | void;
  onReject: (id: string) => Promise<void> | void;
  isPendingMutation?: boolean;
  className?: string;
}

export function ApprovalReviewCard({
  request,
  onApprove,
  onReject,
  isPendingMutation = false,
  className,
}: ApprovalReviewCardProps) {
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);

  const statusInfo = getApprovalStatusPresentation(request.status);
  const isPending = request.status === "pending";

  const rawRisk = request.risk_level;
  const riskStr =
    typeof rawRisk === "object" && rawRisk !== null
      ? String((rawRisk as any).tier || (rawRisk as any).level || "HIGH")
      : String(rawRisk || "HIGH");
  const risk = riskStr.toUpperCase();

  // Parse payload into readable before/after fields
  const payloadObj = typeof request.payload === "string" ? safeJsonParse(request.payload) : request.payload || {};

  return (
    <Card className={cn("border border-border bg-card shadow-xs hover:border-primary/40 transition-all", className)}>
      <CardContent className="p-4 space-y-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-foreground">
                {request.request_type}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] uppercase font-semibold",
                  risk === "CRITICAL"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                )}
              >
                {risk} Risk
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Submitted: {request.created_at ? new Date(request.created_at).toLocaleString() : "--"}
            </div>
          </div>
          <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
        </div>

        {/* Policy & Customer Context */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <User className="size-3 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {request.customers?.name || "Policyholder"}
            </span>
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {request.policies?.policy_number || "Active Policy"}
          </div>
        </div>

        {/* Human-Readable Before/After Diff */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Staged Modification
          </span>

          {payloadObj.existing_nominee || payloadObj.proposed_nominee ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-border/60 bg-card p-2 space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase block">Current Value</span>
                <span className="font-medium text-foreground">
                  {payloadObj.existing_nominee || "Unassigned"}
                </span>
              </div>
              <div className="rounded border border-primary/30 bg-primary/5 p-2 space-y-0.5">
                <span className="text-[10px] text-primary uppercase block font-semibold">Proposed Value</span>
                <span className="font-bold text-foreground">
                  {payloadObj.proposed_nominee || payloadObj.new_nominee || "New Designee"}
                </span>
              </div>
            </div>
          ) : (
            <div className="font-mono text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-24 leading-relaxed">
              {JSON.stringify(payloadObj, null, 2)}
            </div>
          )}
        </div>

        {/* Decision Buttons with Confirmation */}
        {isPending && (
          <div className="pt-1 flex items-center justify-end gap-2 border-t border-border/60">
            {confirmAction === null ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                  disabled={isPendingMutation}
                  onClick={() => setConfirmAction("reject")}
                >
                  <XCircle className="size-3.5 mr-1" /> Reject Request
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                  disabled={isPendingMutation}
                  onClick={() => setConfirmAction("approve")}
                >
                  <CheckCircle2 className="size-3.5 mr-1" /> Approve Change
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/60 border border-border text-xs">
                <span className="font-medium text-foreground">
                  Confirm {confirmAction === "approve" ? "Approval" : "Rejection"}?
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "h-6 px-2.5 text-xs text-white",
                    confirmAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90"
                  )}
                  disabled={isPendingMutation}
                  onClick={() => {
                    const action = confirmAction;
                    setConfirmAction(null);
                    if (action === "approve") onApprove(request.id);
                    else onReject(request.id);
                  }}
                >
                  Confirm
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function safeJsonParse(val: string): any {
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}
