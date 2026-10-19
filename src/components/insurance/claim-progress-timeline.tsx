import { CheckCircle2, Clock, AlertTriangle, FileCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClaimTimelineStage {
  id: string;
  label: string;
  description: string;
  timestamp?: string | undefined;
  status: "completed" | "current" | "upcoming" | "failed";
  note?: string | undefined;
}

interface ClaimProgressTimelineProps {
  currentStatus: string;
  submittedAt?: string | undefined;
  className?: string | undefined;
}

export function ClaimProgressTimeline({
  currentStatus,
  submittedAt,
  className,
}: ClaimProgressTimelineProps) {
  const norm = (currentStatus || "").toLowerCase();

  // Determine stage states dynamically based on persisted claim status
  const isApproved = norm === "approved" || norm === "settled" || norm === "paid";
  const isRejected = norm === "rejected" || norm === "denied";
  const isUnderReview = norm === "in_review" || norm === "under_review" || norm === "processing";
  const isSubmitted = norm === "submitted" || norm === "received" || !norm;

  const stages: ClaimTimelineStage[] = [
    {
      id: "intake",
      label: "First Notice of Loss (FNOL)",
      description: "Claim submitted and registered in carrier database",
      timestamp: submittedAt ? new Date(submittedAt).toLocaleString() : undefined,
      status: "completed",
      note: "Registered via SaveCall Voice Assistant",
    },
    {
      id: "review",
      label: "Documentation & Policy Check",
      description: "Coverage verification against active policy terms and exclusions",
      status: isApproved || isRejected ? "completed" : isUnderReview ? "current" : "upcoming",
      note: isUnderReview ? "Under evaluation by claims specialist" : undefined,
    },
    {
      id: "decision",
      label: isRejected ? "Claim Denied" : "Assessment & Decision",
      description: isRejected
        ? "Claim rejected based on policy coverage exclusions"
        : "Evaluation of approved cashless or reimbursement limits",
      status: isRejected ? "failed" : isApproved ? "completed" : isUnderReview ? "upcoming" : "upcoming",
    },
    {
      id: "settlement",
      label: norm === "paid" ? "Settlement Disbursed" : "Final Settlement",
      description: "Disbursement to hospital TPA or direct policyholder account",
      status: norm === "paid" ? "completed" : isApproved ? "current" : "upcoming",
      note: isApproved ? "Awaiting banking transfer authorization" : undefined,
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        {stages.map((stage) => {
          const isDone = stage.status === "completed";
          const isCurr = stage.status === "current";
          const isFail = stage.status === "failed";

          return (
            <div key={stage.id} className="relative">
              {/* Timeline Indicator Dot */}
              <div
                className={cn(
                  "absolute -left-6 top-0.5 grid size-5 place-items-center rounded-full text-white ring-4 ring-background",
                  isDone && "bg-emerald-600",
                  isCurr && "bg-primary animate-pulse",
                  isFail && "bg-rose-600",
                  stage.status === "upcoming" && "bg-muted text-muted-foreground ring-border"
                )}
              >
                {isDone && <CheckCircle2 className="size-3" />}
                {isCurr && <Clock className="size-3" />}
                {isFail && <AlertTriangle className="size-3" />}
                {stage.status === "upcoming" && <span className="size-1.5 rounded-full bg-muted-foreground/60" />}
              </div>

              {/* Stage Content */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h5
                    className={cn(
                      "text-xs font-semibold leading-tight",
                      isDone && "text-foreground",
                      isCurr && "text-primary font-bold",
                      isFail && "text-rose-700",
                      stage.status === "upcoming" && "text-muted-foreground font-normal"
                    )}
                  >
                    {stage.label}
                  </h5>
                  {isCurr && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
                      Current Stage
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {stage.description}
                </p>

                {stage.timestamp && (
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {stage.timestamp}
                  </div>
                )}

                {stage.note && (
                  <div className="mt-1 text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded border border-border/60">
                    {stage.note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
