import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  User,
  MessageSquare,
  PhoneCall,
  HelpCircle,
  FileText,
  UserCheck,
  Clock,
  Sparkles,
} from "lucide-react";
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
  payload?: Record<string, unknown> | string;
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
      ? String((rawRisk as Record<string, unknown>)["tier"] || (rawRisk as Record<string, unknown>)["level"] || "MEDIUM")
      : String(rawRisk || "MEDIUM");
  const risk = riskStr.toUpperCase();

  // Safely parse payload into an object
  const payloadObj =
    typeof request.payload === "string"
      ? safeJsonParse(request.payload)
      : (request.payload as Record<string, unknown>) || {};

  const customerQuery = typeof payloadObj["query"] === "string" ? payloadObj["query"] : null;
  const hasCallSession = Boolean(payloadObj["call_session_id"]);
  const existingNominee = typeof payloadObj["existing_nominee"] === "string" ? payloadObj["existing_nominee"] : null;
  const proposedNominee =
    typeof payloadObj["proposed_nominee"] === "string"
      ? payloadObj["proposed_nominee"]
      : typeof payloadObj["new_nominee"] === "string"
        ? payloadObj["new_nominee"]
        : null;

  // Determine friendly title and icon
  const requestInfo = getHumanRequestInfo(request.request_type, customerQuery);

  const customerName = request.customers?.name || "Customer / Policyholder";
  const policyLabel = request.policies?.policy_number || "Active Policy";

  const formattedDate = request.created_at
    ? new Date(request.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "--";

  // Check if this is an inquiry escalation versus an explicit data update
  const isInquiry = Boolean(customerQuery) || request.request_type === "unsupported_rag_escalation";

  return (
    <Card
      className={cn(
        "border border-slate-200/90 bg-white shadow-xs hover:border-[#087F8C]/40 hover:shadow-sm transition-all rounded-2xl overflow-hidden",
        className
      )}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header Row: Title, Category Icon, Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 text-[#087F8C]">
              <requestInfo.icon className="size-4.5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                  {requestInfo.title}
                </h4>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    risk === "CRITICAL" || risk === "HIGH"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : risk === "LOW"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                  )}
                >
                  {risk === "CRITICAL" ? "High Priority" : risk === "HIGH" ? "Needs Attention" : "Standard Review"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="size-3 text-slate-400" />
                  {formattedDate}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                  {hasCallSession ? (
                    <>
                      <PhoneCall className="size-3 text-[#087F8C]" /> Voice Receptionist Handoff
                    </>
                  ) : (
                    <>
                      <MessageSquare className="size-3 text-[#087F8C]" /> WhatsApp Conversation
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
        </div>

        {/* Customer & Policy Banner */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/75 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold">
              {getInitials(customerName)}
            </div>
            <span className="font-semibold text-slate-800">{customerName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <FileText className="size-3.5 text-slate-400" />
            <span>{policyLabel}</span>
          </div>
        </div>

        {/* Inquiry / Modification Body */}
        {customerQuery ? (
          <div className="rounded-xl border border-teal-100 bg-[#F4FBFC] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-teal-900">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-[#087F8C]" />
                Customer Inquiry
              </span>
              <span className="text-[11px] font-normal text-teal-700/80">Awaiting Response</span>
            </div>
            <div className="pl-3 border-l-2 border-[#087F8C]">
              <p className="text-sm font-medium text-slate-900 leading-snug">
                "{customerQuery}"
              </p>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              The AI assistant escalated this conversation because verified policy records did not contain unambiguous documentation.
            </p>
          </div>
        ) : existingNominee || proposedNominee ? (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Requested Nominee Update
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-medium block">Current Record</span>
                <span className="font-semibold text-slate-700 block">
                  {existingNominee || "Not Assigned"}
                </span>
              </div>
              <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-2.5 space-y-1">
                <span className="text-[10px] text-teal-700 uppercase font-semibold block">Proposed Value</span>
                <span className="font-bold text-teal-950 block">
                  {proposedNominee || "Pending Specification"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-1.5 text-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Modification Details
            </span>
            <div className="space-y-1">
              {renderPayloadSummary(payloadObj)}
            </div>
          </div>
        )}

        {/* Action Controls */}
        {isPending && (
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            {confirmAction === null ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 font-medium rounded-lg"
                  disabled={isPendingMutation}
                  onClick={() => setConfirmAction("reject")}
                >
                  <XCircle className="size-3.5 mr-1.5 text-slate-400" />
                  {isInquiry ? "Dismiss Inquiry" : "Reject Request"}
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-[#087F8C] hover:bg-[#076C77] text-white font-medium shadow-2xs rounded-lg"
                  disabled={isPendingMutation}
                  onClick={() => setConfirmAction("approve")}
                >
                  <CheckCircle2 className="size-3.5 mr-1.5 text-white" />
                  {isInquiry ? "Mark Handled" : "Approve Change"}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs">
                <span className="font-medium text-slate-800 pl-1">
                  Confirm {confirmAction === "approve" ? (isInquiry ? "resolution" : "approval") : (isInquiry ? "dismissal" : "rejection")}?
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-xs text-white font-medium rounded-lg shadow-2xs",
                    confirmAction === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
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

function getHumanRequestInfo(type?: string, query?: string | null): { title: string; icon: typeof User } {
  const normType = (type || "").toLowerCase();
  const normQuery = (query || "").toLowerCase();

  if (normQuery.includes("nominee") || normType.includes("nominee")) {
    return { title: "Nominee Update Request", icon: UserCheck };
  }
  if (normQuery.includes("claim") || normType.includes("claim")) {
    return { title: "Claim Status Clarification", icon: FileText };
  }
  if (normQuery.includes("soilder") || normQuery.includes("soldier") || normQuery.includes("retired") || normQuery.includes("defense")) {
    return { title: "Special Coverage Inquiry", icon: Shield };
  }
  if (normType.includes("cancel")) {
    return { title: "Policy Cancellation Request", icon: AlertTriangle };
  }
  if (normType.includes("address") || normType.includes("contact") || normType.includes("phone")) {
    return { title: "Contact Information Update", icon: User };
  }
  if (normType === "unsupported_rag_escalation") {
    return { title: "Customer Inquiry Escalation", icon: HelpCircle };
  }

  // Fallback: clean up underscored technical strings
  const cleaned = (type || "Review Item")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: cleaned, icon: HelpCircle };
}

function renderPayloadSummary(obj: Record<string, unknown>) {
  const IGNORE_KEYS = new Set(["call_session_id", "session_id", "id", "tenant_id", "customer_id", "policy_id"]);
  const entries = Object.entries(obj).filter(([k]) => !IGNORE_KEYS.has(k.toLowerCase()));

  if (entries.length === 0) {
    return (
      <p className="text-slate-500 italic text-xs">
        Standard assistance handoff record logged by customer agent.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-center justify-between text-xs py-0.5">
          <span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}:</span>
          <span className="font-semibold text-slate-800">
            {typeof val === "object" ? JSON.stringify(val) : String(val)}
          </span>
        </div>
      ))}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const second = parts[1];
  if (parts.length === 1 && first) {
    return first.slice(0, 2).toUpperCase();
  }
  if (parts.length >= 2 && first && second && first[0] && second[0]) {
    return (first[0] + second[0]).toUpperCase();
  }
  return "IN";
}

function safeJsonParse(val: string): Record<string, unknown> {
  try {
    const res = JSON.parse(val);
    return typeof res === "object" && res !== null ? res : {};
  } catch {
    return {};
  }
}
