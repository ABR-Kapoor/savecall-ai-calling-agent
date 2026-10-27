import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, PhoneCall, Clock, Mic, FileText, PhoneIncoming, MessageSquare, ShieldCheck } from "lucide-react";
import { getCallSessions } from "@/lib/insurance.functions";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getCallStatusPresentation } from "@/lib/insurance/status-presentation";
import { useUser } from "@clerk/clerk-react";

export const Route = createFileRoute("/_authenticated/calls")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Voice Sessions: InsurCall Insurance AI" }],
  }),
  component: VoiceSessionsPage,
});

function VoiceSessionsPage() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  const { data: sessions, isLoading, error, refetch } = useQuery({
    queryKey: ["call-sessions-list", user?.id],
    queryFn: () => getCallSessions({ data: { clerkUserId: user?.id } }),
    enabled: !!user?.id,
  });

  const filtered = (sessions ?? []).filter((s: any) => {
    const q = search.toLowerCase();
    const custName = s.customers?.name?.toLowerCase() ?? "";
    const callerName = s.caller_name?.toLowerCase() ?? "";
    const room = s.room_name?.toLowerCase() ?? "";
    const phone = s.caller_phone?.toLowerCase() ?? "";
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
      subtitle="Live & archived WebRTC conversational AI calls with transcript logs and outcome verification"
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by caller, room, or phone..."
              className="pl-8 text-xs bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
              Showing {filtered.length} of {sessions?.length || 0} calls
            </span>
            <Link to="/voice">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium gap-1.5 shadow-xs w-full sm:w-auto">
                <Mic className="size-3.5" />
                Launch Live Call
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
                  LiveKit Call Registry
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Recorded WebRTC voice sessions and conversational transcripts stored in InsForge PostgreSQL
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Loading voice sessions from database...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<PhoneCall className="size-8" />}
                  title="No voice sessions found"
                  description={
                    search
                      ? "No calls match your search query."
                      : "Start a browser test call to record your first LiveKit session."
                  }
                  actionLabel="Launch Test Call"
                  onAction={() => window.location.assign("/voice")}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">Caller</TableHead>
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
                      const statusInfo = getCallStatusPresentation(s.status);

                      return (
                        <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <PhoneIncoming className="size-3.5 text-primary" />
                              {s.caller_name || "Anonymous Caller"}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {s.caller_phone || "WebRTC Client"}
                            </div>
                          </TableCell>

                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {s.room_name?.slice(0, 20)}...
                          </TableCell>

                          <TableCell className="text-xs font-semibold font-mono text-foreground">
                            {formatDuration(s.duration_sec)}
                          </TableCell>

                          <TableCell className="text-xs">
                            <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {s.started_at ? new Date(s.started_at).toLocaleString() : "--"}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {s.transcript ? s.transcript : "No recorded transcript"}
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

        {/* Transcript & Session Detail Dialog */}
        {selectedSession && (
          <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
            <DialogContent className="max-w-lg bg-card border-border">
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {selectedSession.caller_name || "Caller"}
                  </span>
                  <StatusBadge
                    label={getCallStatusPresentation(selectedSession.status).label}
                    tone={getCallStatusPresentation(selectedSession.status).tone}
                  />
                </div>
                <DialogTitle className="font-display text-lg font-bold text-foreground">
                  Voice Session Transcript
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  LiveKit Room: {selectedSession.room_name} • Duration: {formatDuration(selectedSession.duration_sec)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-muted/20">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Started At
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedSession.started_at ? new Date(selectedSession.started_at).toLocaleString() : "--"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Session ID
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground block truncate">
                      {selectedSession.id}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Recorded Audio Transcript
                  </span>
                  <div className="font-mono text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/60 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {selectedSession.transcript || "No transcript turns captured for this call."}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedSession(null)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
