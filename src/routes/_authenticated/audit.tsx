import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Search, ShieldCheck } from "lucide-react";
import { getAuditLogs } from "@/lib/insurance.functions";
import { useUser } from "@clerk/clerk-react";

export const Route = createFileRoute("/_authenticated/audit")({
  ssr: false,
  head: () => ({ meta: [{ title: "Activity & Audit | InsurCall" }] }),
  component: AuditLogsPage,
});

type AuditLog = {
  id: string;
  action?: string | null;
  actor_type?: string | null;
  target_resource?: string | null;
  target_id?: string | null;
  risk_level?: unknown;
  status?: string | null;
  created_at?: string | null;
  payload?: unknown;
};

function label(value?: string | null) {
  if (!value) return "Not specified";
  return value.replace(/[_-]+/g, " ").replace(/\b\w[\w]*\b/g, (word) => {
    const lower = word.toLowerCase();
    const acronyms: Record<string, string> = {
      ai: "AI",
      api: "API",
      id: "ID",
      otp: "OTP",
      rag: "RAG",
      fnol: "FNOL",
      webrtc: "Browser",
    };
    return acronyms[lower] || `${lower[0]?.toUpperCase()}${lower.slice(1)}`;
  });
}

function getRisk(value: unknown) {
  if (typeof value === "object" && value !== null) {
    const risk = value as { tier?: unknown; level?: unknown };
    value = risk.tier ?? risk.level;
  }
  const normalized = typeof value === "string" ? value.toUpperCase() : "LOW";
  return ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(normalized) ? normalized : "LOW";
}

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function payloadLabel(key: string) {
  const labels: Record<string, string> = {
    query: "Question",
    latency_ms: "Processing time",
    chunks_count: "Matched passages",
    top_similarity: "Match strength",
    sources: "Sources",
    provider: "AI provider",
    model: "Model",
    call_session_id: "Call session",
  };
  return labels[key] || label(key);
}

function actionLabel(action?: string | null) {
  const actions: Record<string, string> = {
    rag_retrieval_grounded: "Approved information used",
    human_handoff: "Human help requested",
  };
  return actions[action || ""] || label(action);
}

function readableValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const names = value
      .map((item) =>
        item && typeof item === "object"
          ? ((item as { sourceName?: unknown; source_name?: unknown }).sourceName ??
            (item as { source_name?: unknown }).source_name)
          : null,
      )
      .filter((name): name is string => typeof name === "string" && name.length > 0);
    return names.length
      ? names.join(", ")
      : `${value.length} ${value.length === 1 ? "item" : "items"}`;
  }
  return "Additional information";
}

function AuditLogsPage() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const {
    data: logs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["audit-logs-list", user?.id],
    queryFn: () => getAuditLogs({ data: { clerkUserId: user?.id } }),
    enabled: !!user?.id,
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ((logs ?? []) as AuditLog[]).filter((log) =>
      [
        log.action,
        log.target_resource,
        log.actor_type,
        log.target_id,
        log.status,
        getRisk(log.risk_level),
      ].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [logs, search]);

  const selectedPayloadEntries =
    selectedLog?.payload &&
    typeof selectedLog.payload === "object" &&
    !Array.isArray(selectedLog.payload)
      ? Object.entries(selectedLog.payload as Record<string, unknown>)
      : [];

  return (
    <AppShell
      title="Activity & audit"
      subtitle="Review workspace events and open an entry for more detail."
    >
      <div className="space-y-4 md:space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
              <p className="mt-1 text-xs text-slate-500">
                Search by event, person, resource, status, or risk.
              </p>
            </div>
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <label className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
                <span className="sr-only">Search activity</span>
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search activity…"
                  className="h-10 rounded-lg border-slate-200 bg-white pl-9 text-sm"
                />
              </label>
              <span className="shrink-0 text-xs tabular-nums text-slate-500" aria-live="polite">
                {isLoading
                  ? "Loading"
                  : `${filtered.length} ${filtered.length === 1 ? "event" : "events"}`}
              </span>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>We couldn’t load activity. Please refresh and try again.</span>
            </div>
          )}
        </section>

        {isLoading ? (
          <div
            className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500"
            role="status"
          >
            <span className="mx-auto mb-3 block size-5 animate-spin rounded-full border-2 border-[#087F8C] border-t-transparent" />
            Loading activity…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-full bg-[#EAF4F1] text-[#357565]">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              {search ? "No matching activity" : "No activity yet"}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {search
                ? "Try another name, event, or resource."
                : "Workspace events will appear here as they happen."}
            </p>
            {search && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearch("")}>
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="h-10 text-xs font-semibold">Activity</TableHead>
                    <TableHead className="h-10 text-xs font-semibold">Person</TableHead>
                    <TableHead className="h-10 text-xs font-semibold">Resource</TableHead>
                    <TableHead className="h-10 text-xs font-semibold">Status · risk</TableHead>
                    <TableHead className="h-10 text-xs font-semibold">When</TableHead>
                    <TableHead className="h-10 text-right text-xs font-semibold">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => {
                    const risk = getRisk(log.risk_level);
                    const status = (log.status || "logged").toLowerCase();
                    return (
                      <TableRow key={log.id} className="hover:bg-slate-50/70">
                        <TableCell className="max-w-56 py-2.5 text-xs font-medium text-slate-900">
                          <span className="block truncate" title={actionLabel(log.action)}>
                            {actionLabel(log.action)}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-700">
                          {label(log.actor_type || "system")}
                        </TableCell>
                        <TableCell className="max-w-48 py-2.5 text-xs text-slate-600">
                          <span className="block truncate" title={log.target_resource || undefined}>
                            {label(log.target_resource)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2 py-0 text-[10px] ${status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "failed" || status === "rejected" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                            >
                              {label(status)}
                            </Badge>
                            <span
                              className={`text-[10px] font-medium ${risk === "HIGH" || risk === "CRITICAL" ? "text-rose-700" : risk === "MEDIUM" ? "text-amber-700" : "text-slate-500"}`}
                            >
                              {label(risk)}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-2.5 text-xs text-slate-500">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-[#356B60]"
                            onClick={() => setSelectedLog(log)}
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
            <div className="space-y-2 sm:hidden">
              {filtered.map((log) => {
                const risk = getRisk(log.risk_level);
                const riskStyles =
                  risk === "HIGH" || risk === "CRITICAL"
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : risk === "MEDIUM"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800";
                const status = (log.status || "logged").toLowerCase();
                const statusStyles =
                  status === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : status === "rejected" || status === "failed"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-slate-200 bg-slate-50 text-slate-700";

                return (
                  <article
                    key={log.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-slate-900">
                          {actionLabel(log.action)}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(log.created_at)}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${riskStyles}`}
                        >
                          {label(risk)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusStyles}`}
                        >
                          {label(status)}
                        </Badge>
                      </div>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-2.5 text-xs">
                      <div className="min-w-0">
                        <dt className="text-slate-500">Actor</dt>
                        <dd className="mt-1 truncate font-medium text-slate-800">
                          {label(log.actor_type || "system")}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-slate-500">Resource</dt>
                        <dd
                          className="mt-1 truncate font-medium text-slate-800"
                          title={log.target_resource || undefined}
                        >
                          {label(log.target_resource)}
                          {log.target_id ? ` · ${log.target_id.slice(0, 8)}` : ""}
                        </dd>
                      </div>
                      <div className="col-span-2 flex items-end justify-start">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => setSelectedLog(log)}
                        >
                          View details
                        </Button>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        {selectedLog && (
          <DialogContent className="max-h-[85dvh] gap-0 overflow-y-auto rounded-2xl border-slate-200 p-0 sm:max-w-xl">
            <DialogHeader className="border-b border-slate-100 px-4 py-4 pr-12 text-left sm:px-5">
              <DialogDescription className="text-xs">Activity details</DialogDescription>
              <DialogTitle className="text-base">{actionLabel(selectedLog.action)}</DialogTitle>
              <p className="text-xs text-slate-500">
                {label(selectedLog.target_resource)}
                {selectedLog.target_id ? ` · ${selectedLog.target_id}` : ""}
              </p>
            </DialogHeader>
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                >
                  {label(selectedLog.status || "logged")}
                </Badge>
                <Badge
                  variant="outline"
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    getRisk(selectedLog.risk_level) === "HIGH" ||
                    getRisk(selectedLog.risk_level) === "CRITICAL"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : getRisk(selectedLog.risk_level) === "MEDIUM"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {label(getRisk(selectedLog.risk_level))} risk
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">When</dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {formatDate(selectedLog.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Who</dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {label(selectedLog.actor_type || "system")}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Resource</dt>
                  <dd className="mt-1 truncate font-medium text-slate-800">
                    {label(selectedLog.target_resource)}
                  </dd>
                </div>
              </dl>
              {selectedPayloadEntries.length ? (
                <section className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold text-slate-800">What happened</h3>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {selectedPayloadEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="min-w-0 rounded-lg border border-slate-200 px-3 py-2.5"
                      >
                        <dt className="text-[11px] font-medium text-slate-500">
                          {payloadLabel(key)}
                        </dt>
                        <dd className="mt-1 max-h-24 overflow-auto break-words whitespace-pre-wrap text-xs leading-5 text-slate-800">
                          {readableValue(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : (
                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {typeof selectedLog.payload === "string"
                    ? selectedLog.payload
                    : "No additional event details were recorded."}
                </p>
              )}
              {Boolean(selectedLog.payload && typeof selectedLog.payload === "object") && (
                <details className="mt-4 rounded-lg border border-slate-200">
                  <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-slate-600">
                    Technical event data
                  </summary>
                  <pre className="max-h-64 overflow-auto border-t border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-700">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </details>
              )}
              <div className="mt-4 flex justify-end">
                <Button
                  className="h-9 rounded-lg bg-[#087F8C] px-4 text-sm text-white hover:bg-[#076C77]"
                  onClick={() => setSelectedLog(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </AppShell>
  );
}
