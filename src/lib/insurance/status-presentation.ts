/**
 * Canonical status-to-tone and label mapping for SaveCall Insurance.
 * Maps persisted database states to accessible visual presentation.
 */

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusPresentation {
  label: string;
  tone: StatusTone;
  badgeClass: string;
}

export function getPolicyStatusPresentation(status?: string | null): StatusPresentation {
  const norm = (status || "").toLowerCase().trim();
  switch (norm) {
    case "active":
      return {
        label: "Active",
        tone: "success",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "expiring_soon":
    case "renewal_due":
      return {
        label: "Renewal Due",
        tone: "warning",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "expired":
      return {
        label: "Expired",
        tone: "neutral",
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
    case "cancelled":
    case "surrendered":
      return {
        label: "Cancelled",
        tone: "danger",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
      };
    case "grace_period":
      return {
        label: "Grace Period",
        tone: "warning",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      };
    default:
      return {
        label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown",
        tone: "neutral",
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
  }
}

export function getClaimStatusPresentation(status?: string | null): StatusPresentation {
  const norm = (status || "").toLowerCase().trim();
  switch (norm) {
    case "approved":
    case "settled":
    case "paid":
      return {
        label: norm === "paid" ? "Paid" : norm === "settled" ? "Settled" : "Approved",
        tone: "success",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "submitted":
    case "received":
      return {
        label: "Received",
        tone: "info",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
      };
    case "in_review":
    case "under_review":
    case "processing":
      return {
        label: "Under Review",
        tone: "warning",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "needs_documents":
    case "pending_documents":
      return {
        label: "Needs Documents",
        tone: "warning",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "rejected":
    case "denied":
      return {
        label: "Rejected",
        tone: "danger",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
      };
    default:
      return {
        label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending",
        tone: "neutral",
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
  }
}

export function getApprovalStatusPresentation(status?: string | null): StatusPresentation {
  const norm = (status || "").toLowerCase().trim();
  switch (norm) {
    case "approved":
      return {
        label: "Approved",
        tone: "success",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "rejected":
      return {
        label: "Rejected",
        tone: "danger",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
      };
    case "pending":
    default:
      return {
        label: "Pending Review",
        tone: "warning",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      };
  }
}

export function getCallStatusPresentation(status?: string | null): StatusPresentation {
  const norm = (status || "").toLowerCase().trim();
  switch (norm) {
    case "completed":
      return {
        label: "Completed",
        tone: "success",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "active":
    case "in-progress":
      return {
        label: "Active Call",
        tone: "info",
        badgeClass: "bg-primary/10 text-primary border-primary/20",
      };
    case "failed":
    case "error":
      return {
        label: "Failed",
        tone: "danger",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
      };
    default:
      return {
        label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Ended",
        tone: "neutral",
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
  }
}
