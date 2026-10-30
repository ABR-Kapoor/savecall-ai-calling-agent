import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  PhoneCall,
  Mic,
  PhoneIncoming,
  PhoneOutgoing,
  Headphones,
  AlertTriangle,
} from "lucide-react";
import { getCallSessions } from "@/lib/insurance.functions";
import {
  initiateOutboundWhatsAppCallServerFn,
  terminateWhatsAppCallServerFn,
} from "@/lib/whatsapp-calling.functions";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getCallStatusPresentation } from "@/lib/insurance/status-presentation";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calls")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Voice Calls & Sessions: InsurCall Insurance AI" }],
  }),
  component: VoiceSessionsPage,
});

type CallSession = {
  id: string;
  channel?: string | null;
  direction?: string | null;
  caller_name?: string | null;
  caller_phone?: string | null;
  caller_wa_id?: string | null;
  room_name?: string | null;
  duration_sec?: number | null;
  status?: string | null;
  lifecycle_status?: string | null;
  started_at?: string | null;
  summary?: string | null;
  transcript?: unknown;
  meta_call_id?: string | null;
  termination_reason?: string | null;
  customers?: { name?: string | null } | null;
};

function VoiceSessionsPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "webrtc">("all");
  const [selectedSession, setSelectedSession] = useState<CallSession | null>(null);

  // Outbound WhatsApp Call Modal
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState(false);
  const [outboundPhone, setOutboundPhone] = useState("");
  const [outboundCallerName, setOutboundCallerName] = useState("");
  const [outboundConfirmed, setOutboundConfirmed] = useState(false);

  const {
    data: sessions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["call-sessions-list", user?.id],
    queryFn: () => getCallSessions({ data: { clerkUserId: user?.id } }),
    enabled: !!user?.id,
  });

  const outboundCallMutation = useMutation({
    mutationFn: (vars: { toPhoneNumber: string; callerName?: string; confirmed: boolean }) =>
      initiateOutboundWhatsAppCallServerFn({
        data: {
          clerkUserId: user?.id,
          toPhoneNumber: vars.toPhoneNumber,
          callerName: vars.callerName,
          confirmed: vars.confirmed,
        },
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["call-sessions-list"] });
      setIsOutboundModalOpen(false);
      setOutboundPhone("");
      setOutboundCallerName("");
      setOutboundConfirmed(false);
      toast.success("Outbound WhatsApp Call Initiated", {
        description: `Meta Call ID: ${data.metaCallId} • Room: ${data.roomName}`,
      });
    },
    onError: (err: unknown) => {
      toast.error("Outbound call failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    },
  });

  const terminateCallMutation = useMutation({
    mutationFn: (callSessionId: string) =>
      terminateWhatsAppCallServerFn({
        data: {
          callSessionId,
          clerkUserId: user?.id,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-sessions-list"] });
      setSelectedSession(null);
      toast.info("Call disconnected successfully");
    },
    onError: (err: unknown) => {
      toast.error("Could not disconnect call", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    },
  });

  const filtered = ((sessions ?? []) as CallSession[]).filter((s) => {
    // Channel filter
    if (channelFilter !== "all") {
      const sChan = s.channel || "webrtc";
      if (sChan !== channelFilter) return false;
    }

    const q = search.toLowerCase();
    const custName = s.customers?.name?.toLowerCase() ?? "";
    const callerName = s.caller_name?.toLowerCase() ?? "";
    const room = s.room_name?.toLowerCase() ?? "";
    const phone = (s.caller_phone || s.caller_wa_id || "").toLowerCase();
    return custName.includes(q) || callerName.includes(q) || room.includes(q) || phone.includes(q);
  });

  const formatDuration = (seconds?: number | null) => {
    if (!seconds && seconds !== 0) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  return (
    <AppShell title="Calls" subtitle="Review conversations, outcomes, and transcripts.">
      <div className="space-y-4">
        {/* Top Control Bar with Search, Channel Filters, and Actions */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search caller or phone…"
                aria-label="Search calls"
                className="h-9 bg-background pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Channel filter pills */}
            <div
              className="flex w-fit items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs"
              role="group"
              aria-label="Filter calls by channel"
            >
              <button
                type="button"
                aria-pressed={channelFilter === "all"}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  channelFilter === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setChannelFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                aria-pressed={channelFilter === "whatsapp"}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  channelFilter === "whatsapp"
                    ? "bg-background text-emerald-700 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setChannelFilter("whatsapp")}
              >
                <Headphones className="size-3 text-emerald-600" />
                WhatsApp
              </button>
              <button
                type="button"
                aria-pressed={channelFilter === "webrtc"}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  channelFilter === "webrtc"
                    ? "bg-background text-blue-700 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setChannelFilter("webrtc")}
              >
                <Mic className="size-3 text-blue-600" />
                Browser call
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-medium gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              onClick={() => setIsOutboundModalOpen(true)}
            >
              <PhoneOutgoing className="size-3.5 text-emerald-600" />
              Call on WhatsApp
            </Button>

            <Link to="/voice">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium gap-1.5 shadow-xs"
              >
                <Mic className="size-3.5" />
                Start browser call
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <ErrorState
            title="Failed to load voice sessions"
            message={
              error instanceof Error ? error.message : "Failed to load voice records. Please retry."
            }
            onRetry={() => refetch()}
          />
        )}

        {/* Sessions Registry Card */}
        <Card className="overflow-hidden border border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Recent calls
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                  Calls across WhatsApp and browser voice
                </CardDescription>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                Showing {filtered.length} of {sessions?.length || 0} calls
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Loading voice calls from database...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<PhoneCall className="size-8" />}
                  title="No voice sessions found"
                  description={
                    search || channelFilter !== "all"
                      ? "No calls match your active filter."
                      : "Receive an inbound call on WhatsApp or launch a browser call to record your first session."
                  }
                  actionLabel="Test Browser Call"
                  onAction={() => window.location.assign("/voice")}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2 p-3 md:hidden">
                  {filtered.map((s) => {
                    const statusInfo = getCallStatusPresentation(s.status);
                    const isWhatsApp = s.channel === "whatsapp";
                    return (
                      <article
                        key={s.id}
                        className="rounded-lg border border-border/80 bg-background p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {s.caller_name || s.customers?.name || "Caller"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {s.caller_phone || s.caller_wa_id || "Browser caller"}
                            </p>
                          </div>
                          <StatusBadge
                            label={s.lifecycle_status || statusInfo.label}
                            tone={statusInfo.tone}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>
                            {isWhatsApp ? "WhatsApp" : "Browser"} ·{" "}
                            {s.direction === "outbound" ? "Outbound" : "Inbound"}
                          </span>
                          <span>{formatDuration(s.duration_sec)}</span>
                          <span>
                            {s.started_at
                              ? new Date(s.started_at).toLocaleDateString()
                              : "Date unavailable"}
                          </span>
                        </div>
                        {s.summary && (
                          <p className="mt-2 line-clamp-2 text-xs leading-4 text-foreground">
                            {s.summary}
                          </p>
                        )}
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-3 text-xs"
                            onClick={() => setSelectedSession(s)}
                          >
                            View call
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-semibold">Caller</TableHead>
                        <TableHead className="text-xs font-semibold">Conversation</TableHead>
                        <TableHead className="text-xs font-semibold">Duration</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold">Started</TableHead>
                        <TableHead className="text-xs text-right font-semibold">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((s) => {
                        const isWhatsApp = s.channel === "whatsapp";
                        const isOutbound = s.direction === "outbound";
                        const statusInfo = getCallStatusPresentation(s.status);

                        return (
                          <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="min-w-44 text-xs">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                {isOutbound ? (
                                  <PhoneOutgoing className="size-3.5 text-blue-600 shrink-0" />
                                ) : (
                                  <PhoneIncoming className="size-3.5 text-emerald-600 shrink-0" />
                                )}
                                <span>{s.caller_name || s.customers?.name || "Caller"}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[10px] text-muted-foreground">
                                <span className="font-mono">
                                  {s.caller_phone || s.caller_wa_id || "Browser caller"}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{isWhatsApp ? "WhatsApp" : "Browser voice"}</span>
                                <span aria-hidden="true">·</span>
                                <span>{isOutbound ? "Outbound" : "Inbound"}</span>
                              </div>
                            </TableCell>

                            <TableCell className="max-w-64 text-xs text-muted-foreground">
                              <span
                                className="block truncate text-foreground"
                                title={s.summary || undefined}
                              >
                                {s.summary ||
                                  (s.transcript ? "Transcript available" : "No summary recorded")}
                              </span>
                            </TableCell>

                            <TableCell className="text-xs font-semibold font-mono text-foreground">
                              {formatDuration(s.duration_sec)}
                            </TableCell>

                            <TableCell className="text-xs">
                              <StatusBadge
                                label={s.lifecycle_status || statusInfo.label}
                                tone={statusInfo.tone}
                              />
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {s.started_at
                                ? new Date(s.started_at).toLocaleString(undefined, {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : "--"}
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedSession(s)}
                                className="h-7 text-xs text-primary hover:text-primary/90 hover:bg-primary/10"
                              >
                                View call
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal: Place Authorized Outbound WhatsApp Call */}
        <Dialog open={isOutboundModalOpen} onOpenChange={setIsOutboundModalOpen}>
          <DialogContent className="max-h-[90dvh] max-w-md gap-4 overflow-y-auto rounded-2xl border-border bg-card p-4 sm:p-5">
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald-700">
                <Headphones className="size-5" />
                <DialogTitle className="text-base font-bold">
                  Initiate Outbound WhatsApp Call
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                The telephony engine will initiate a direct WhatsApp call from your verified
                business phone number.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Explicit Calling Consent Required</p>
                  <p className="mt-0.5 text-xs leading-5 text-amber-800">
                    WhatsApp Business calling is region- and account-dependent. Ensure you have
                    caller consent before placing an outbound call. In test mode, calls are
                    restricted to approved test numbers.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="outbound-phone" className="text-xs font-medium">
                  WhatsApp number with country code
                </Label>
                <Input
                  id="outbound-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={outboundPhone}
                  onChange={(e) => setOutboundPhone(e.target.value)}
                  className="mt-1 h-9 bg-background text-sm"
                />
              </div>

              <div>
                <Label htmlFor="outbound-name" className="text-xs font-medium">
                  Contact name <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="outbound-name"
                  placeholder="e.g. Ramesh Patel"
                  value={outboundCallerName}
                  onChange={(e) => setOutboundCallerName(e.target.value)}
                  className="mt-1 h-9 bg-background text-sm"
                />
              </div>

              <div className="flex items-start gap-2 border-t border-border/60 pt-3">
                <input
                  type="checkbox"
                  id="confirm-consent"
                  checked={outboundConfirmed}
                  onChange={(e) => setOutboundConfirmed(e.target.checked)}
                  className="mt-1 size-4 rounded border-border"
                />
                <label
                  htmlFor="confirm-consent"
                  className="text-xs text-muted-foreground leading-tight cursor-pointer"
                >
                  I confirm this policyholder has given explicit consent for voice contact, and I
                  authorize placing this outbound WhatsApp call.
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOutboundModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-700 text-xs text-white hover:bg-emerald-800"
                disabled={
                  !outboundConfirmed || !outboundPhone.trim() || outboundCallMutation.isPending
                }
                onClick={() =>
                  outboundCallMutation.mutate({
                    toPhoneNumber: outboundPhone,
                    callerName: outboundCallerName,
                    confirmed: outboundConfirmed,
                  })
                }
              >
                {outboundCallMutation.isPending ? "Starting…" : "Confirm and call"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Inspect Call Session Details */}
        {selectedSession && (
          <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
            <DialogContent className="max-h-[90dvh] max-w-2xl gap-0 overflow-y-auto rounded-2xl border-border bg-card p-0">
              <DialogHeader className="border-b border-border/70 px-4 py-4 pr-12 text-left sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {selectedSession.channel === "whatsapp" ? (
                      <Badge className="bg-emerald-600 text-white text-xs">WhatsApp Voice</Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-700 border-blue-200 text-xs">
                        Browser
                      </Badge>
                    )}
                    <DialogTitle className="truncate text-base font-semibold text-foreground">
                      Call with{" "}
                      {selectedSession.caller_name || selectedSession.customers?.name || "caller"}
                    </DialogTitle>
                  </div>
                  <StatusBadge
                    label={
                      selectedSession.lifecycle_status ||
                      getCallStatusPresentation(selectedSession.status).label
                    }
                    tone={getCallStatusPresentation(selectedSession.status).tone}
                  />
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  {selectedSession.channel === "whatsapp" ? "WhatsApp call" : "Browser voice call"}
                  {selectedSession.direction ? ` · ${selectedSession.direction}` : ""}
                  {selectedSession.started_at
                    ? ` · ${new Date(selectedSession.started_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                    : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 p-4 sm:p-5">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                    <dt className="text-[11px] text-muted-foreground">Duration</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {formatDuration(selectedSession.duration_sec)}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2.5">
                    <dt className="text-[11px] text-muted-foreground">Phone</dt>
                    <dd
                      className="mt-1 truncate text-xs font-medium text-foreground"
                      title={
                        selectedSession.caller_phone || selectedSession.caller_wa_id || undefined
                      }
                    >
                      {selectedSession.caller_phone ||
                        selectedSession.caller_wa_id ||
                        "Not available"}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2.5">
                    <dt className="text-[11px] text-muted-foreground">Call room</dt>
                    <dd
                      className="mt-1 truncate font-mono text-[11px] text-foreground"
                      title={selectedSession.room_name || undefined}
                    >
                      {selectedSession.room_name || "Not available"}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2.5">
                    <dt className="text-[11px] text-muted-foreground">Call ID</dt>
                    <dd
                      className="mt-1 truncate font-mono text-[11px] text-foreground"
                      title={selectedSession.meta_call_id || selectedSession.id}
                    >
                      {selectedSession.meta_call_id || selectedSession.id.slice(0, 12)}
                    </dd>
                  </div>
                </dl>

                {selectedSession.termination_reason && (
                  <p className="rounded-lg border border-border/70 px-3 py-2 text-xs text-muted-foreground">
                    Ended:{" "}
                    <span className="font-medium text-foreground">
                      {selectedSession.termination_reason}
                    </span>
                  </p>
                )}

                {selectedSession.summary && (
                  <section>
                    <h3 className="text-xs font-semibold text-foreground">Call summary</h3>
                    <p className="mt-1.5 rounded-lg border border-border/60 bg-background p-3 text-sm leading-5 text-foreground">
                      {selectedSession.summary}
                    </p>
                  </section>
                )}

                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-xs font-semibold text-foreground">Conversation</h3>
                    <span className="text-[11px] text-muted-foreground">
                      {Array.isArray(selectedSession.transcript)
                        ? `${selectedSession.transcript.length} turns`
                        : "Transcript"}
                    </span>
                  </div>
                  <div className="max-h-[min(42vh,26rem)] space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-3">
                    {selectedSession.transcript ? (
                      typeof selectedSession.transcript === "string" ? (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                          {selectedSession.transcript}
                        </p>
                      ) : Array.isArray(selectedSession.transcript) &&
                        selectedSession.transcript.length ? (
                        selectedSession.transcript.map((item: unknown, idx: number) => {
                          const turn =
                            item && typeof item === "object"
                              ? (item as { role?: unknown; text?: unknown; content?: unknown })
                              : {};
                          const role =
                            typeof turn.role === "string" ? turn.role.toLowerCase() : "caller";
                          const text =
                            typeof turn.text === "string"
                              ? turn.text
                              : typeof turn.content === "string"
                                ? turn.content
                                : "";
                          const isCaller = role === "user" || role === "caller";
                          return (
                            <div
                              key={idx}
                              className={`flex ${isCaller ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[88%] rounded-xl px-3 py-2 ${isCaller ? "bg-[#E7F2EF] text-slate-900" : "bg-white text-slate-800 shadow-xs"}`}
                              >
                                <p className="mb-1 text-[10px] font-semibold text-slate-500">
                                  {isCaller ? "Caller" : "InsurCall"}
                                </p>
                                <p className="whitespace-pre-wrap text-sm leading-5">
                                  {text || "No text available"}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          No transcript was recorded for this call.
                        </p>
                      )
                    ) : (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No transcript was recorded for this call.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <DialogFooter className="border-t border-border/70 px-4 py-3 sm:px-5">
                {selectedSession.status === "active" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    onClick={() => terminateCallMutation.mutate(selectedSession.id)}
                    disabled={terminateCallMutation.isPending}
                  >
                    {terminateCallMutation.isPending ? "Ending call…" : "End active call"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSession(null)}
                  className="ml-auto text-xs"
                >
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
