import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Clock,
  Mic,
  FileText,
  PhoneIncoming,
  PhoneOutgoing,
  MessageSquare,
  ShieldCheck,
  Headphones,
  AlertTriangle,
  Info,
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

function VoiceSessionsPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "webrtc">("all");
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // Outbound WhatsApp Call Modal
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState(false);
  const [outboundPhone, setOutboundPhone] = useState("");
  const [outboundCallerName, setOutboundCallerName] = useState("");
  const [outboundConfirmed, setOutboundConfirmed] = useState(false);

  const { data: sessions, isLoading, error, refetch } = useQuery({
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
    onError: (err: any) => {
      toast.error("Outbound Call Error", { description: err.message });
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
    onError: (err: any) => {
      toast.error("Failed to disconnect call", { description: err.message });
    },
  });

  const filtered = (sessions ?? []).filter((s: any) => {
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
    return (
      custName.includes(q) ||
      callerName.includes(q) ||
      room.includes(q) ||
      phone.includes(q)
    );
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  return (
    <AppShell
      title="Voice Sessions"
      subtitle="Unified LiveKit Cloud voice calls across WhatsApp Business Calling and WebRTC with verified transcripts and operational outcomes"
    >
      <div className="space-y-6">
        {/* Top Control Bar with Search, Channel Filters, and Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by caller, WhatsApp number, or room..."
                className="pl-8 text-xs bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Channel filter pills */}
            <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
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
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  channelFilter === "webrtc"
                    ? "bg-background text-blue-700 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setChannelFilter("webrtc")}
              >
                <Mic className="size-3 text-blue-600" />
                WebRTC
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
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium gap-1.5 shadow-xs">
                <Mic className="size-3.5" />
                Browser Voice Call
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <ErrorState
            title="Failed to load voice sessions"
            message={(error as any)?.message || "PostgreSQL query failed"}
            onRetry={() => refetch()}
          />
        )}

        {/* Sessions Registry Card */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Voice Call Registry
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Genuine persisted calls across WhatsApp Business Platform and WebRTC with AI agent transcripts
                </CardDescription>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">Caller & Channel</TableHead>
                      <TableHead className="text-xs font-semibold">Direction</TableHead>
                      <TableHead className="text-xs font-semibold">LiveKit Room</TableHead>
                      <TableHead className="text-xs font-semibold">Duration</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Started At</TableHead>
                      <TableHead className="text-xs font-semibold">Transcript</TableHead>
                      <TableHead className="text-xs text-right font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s: any) => {
                      const isWhatsApp = s.channel === "whatsapp";
                      const isOutbound = s.direction === "outbound";
                      const statusInfo = getCallStatusPresentation(s.status);

                      return (
                        <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {isOutbound ? (
                                <PhoneOutgoing className="size-3.5 text-blue-600 shrink-0" />
                              ) : (
                                <PhoneIncoming className="size-3.5 text-emerald-600 shrink-0" />
                              )}
                              <span>{s.caller_name || s.customers?.name || "Caller"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {isWhatsApp ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] h-4 px-1 gap-1">
                                  <Headphones className="size-2.5" />
                                  WhatsApp
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-[10px] h-4 px-1 gap-1">
                                  <Mic className="size-2.5" />
                                  WebRTC
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {s.caller_phone || s.caller_wa_id || "WebRTC Client"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs">
                            <Badge variant="secondary" className="text-[10px]">
                              {isOutbound ? "Outbound" : "Inbound"}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {s.room_name?.slice(0, 18)}...
                          </TableCell>

                          <TableCell className="text-xs font-semibold font-mono text-foreground">
                            {formatDuration(s.duration_sec)}
                          </TableCell>

                          <TableCell className="text-xs">
                            <StatusBadge label={s.lifecycle_status || statusInfo.label} tone={statusInfo.tone} />
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {s.started_at ? new Date(s.started_at).toLocaleString() : "--"}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {s.summary
                              ? s.summary
                              : s.transcript
                              ? (typeof s.transcript === "string" ? s.transcript : JSON.stringify(s.transcript))
                              : "No transcript recorded"}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSession(s)}
                              className="h-7 text-xs text-primary hover:text-primary/90 hover:bg-primary/10"
                            >
                              Inspect
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Place Authorized Outbound WhatsApp Call */}
        <Dialog open={isOutboundModalOpen} onOpenChange={setIsOutboundModalOpen}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald-700">
                <Headphones className="size-5" />
                <DialogTitle className="text-base font-bold">Initiate Outbound WhatsApp Call</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                LiveKit Cloud Telephony will initiate a genuine WhatsApp call from your verified business phone number.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Explicit Calling Consent Required</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    WhatsApp Business calling is region- and account-dependent. Ensure you have caller consent before placing an outbound call. In test mode, calls are restricted to approved test numbers.
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Destination WhatsApp Number (with country code)</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={outboundPhone}
                  onChange={(e) => setOutboundPhone(e.target.value)}
                  className="text-xs mt-1 bg-background"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Policyholder / Contact Name (Optional)</Label>
                <Input
                  placeholder="e.g. Ramesh Patel"
                  value={outboundCallerName}
                  onChange={(e) => setOutboundCallerName(e.target.value)}
                  className="text-xs mt-1 bg-background"
                />
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-border/60">
                <input
                  type="checkbox"
                  id="confirm-consent"
                  checked={outboundConfirmed}
                  onChange={(e) => setOutboundConfirmed(e.target.checked)}
                  className="mt-1 size-4 rounded border-border"
                />
                <label htmlFor="confirm-consent" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                  I confirm this policyholder has given explicit consent for voice contact, and I authorize placing this outbound WhatsApp call.
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                disabled={!outboundConfirmed || !outboundPhone.trim() || outboundCallMutation.isPending}
                onClick={() =>
                  outboundCallMutation.mutate({
                    toPhoneNumber: outboundPhone,
                    callerName: outboundCallerName,
                    confirmed: outboundConfirmed,
                  })
                }
              >
                {outboundCallMutation.isPending ? "Connecting Call..." : "Confirm & Dial Call"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Inspect Call Session Details */}
        {selectedSession && (
          <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
            <DialogContent className="max-w-lg bg-card border-border">
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <div className="flex items-center gap-2">
                    {selectedSession.channel === "whatsapp" ? (
                      <Badge className="bg-emerald-600 text-white text-xs">WhatsApp Voice</Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-700 border-blue-200 text-xs">WebRTC</Badge>
                    )}
                    <span className="text-xs font-bold text-foreground">
                      {selectedSession.caller_name || selectedSession.customers?.name || "Caller"}
                    </span>
                  </div>
                  <StatusBadge
                    label={selectedSession.lifecycle_status || getCallStatusPresentation(selectedSession.status).label}
                    tone={getCallStatusPresentation(selectedSession.status).tone}
                  />
                </div>
                <DialogTitle className="font-display text-base font-bold text-foreground mt-2">
                  Call Session Details & Transcript
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Room: {selectedSession.room_name} • Duration: {formatDuration(selectedSession.duration_sec)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <span className="text-muted-foreground">Direction:</span>
                    <p className="font-semibold capitalize">{selectedSession.direction || "inbound"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Caller Number:</span>
                    <p className="font-mono font-medium">{selectedSession.caller_phone || selectedSession.caller_wa_id || "--"}</p>
                  </div>
                  {selectedSession.meta_call_id && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Meta Call ID:</span>
                      <p className="font-mono text-[11px] truncate">{selectedSession.meta_call_id}</p>
                    </div>
                  )}
                  {selectedSession.termination_reason && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Termination Reason:</span>
                      <p className="font-medium text-slate-700">{selectedSession.termination_reason}</p>
                    </div>
                  )}
                </div>

                {selectedSession.summary && (
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Operational Summary</Label>
                    <p className="text-xs text-muted-foreground mt-1 p-3 rounded-lg bg-muted/20 border border-border/40">
                      {selectedSession.summary}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold text-foreground">Transcript Log</Label>
                  <div className="mt-1 p-3 rounded-lg bg-muted/40 border border-border/60 max-h-48 overflow-y-auto text-xs space-y-2">
                    {selectedSession.transcript ? (
                      typeof selectedSession.transcript === "string" ? (
                        <p className="text-slate-700 whitespace-pre-wrap">{selectedSession.transcript}</p>
                      ) : Array.isArray(selectedSession.transcript) ? (
                        selectedSession.transcript.map((t: any, idx: number) => (
                          <div key={idx} className="flex gap-2">
                            <span className="font-semibold text-primary capitalize">{t.role || "speaker"}:</span>
                            <span className="text-slate-800">{t.text || t.content}</span>
                          </div>
                        ))
                      ) : (
                        <pre className="text-[11px] font-mono">{JSON.stringify(selectedSession.transcript, null, 2)}</pre>
                      )
                    ) : (
                      <p className="text-muted-foreground italic">No transcript recorded for this session.</p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between">
                {selectedSession.status === "active" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    onClick={() => terminateCallMutation.mutate(selectedSession.id)}
                    disabled={terminateCallMutation.isPending}
                  >
                    Disconnect Call
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSession(null)}
                  className="text-xs ml-auto"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
