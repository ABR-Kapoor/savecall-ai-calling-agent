import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  PhoneCall,
  Clock,
  ShieldAlert,
  Mic,
  AlertCircle,
  FileText,
  Volume2,
} from "lucide-react";
import { getCallSessions } from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/calls")({
  head: () => ({
    meta: [{ title: "Voice Sessions — SaveCall Insurance AI" }],
  }),
  component: VoiceSessionsPage,
});

function VoiceSessionsPage() {
  const [search, setSearch] = useState("");
  const [selectedTranscript, setSelectedTranscript] = useState<{
    caller: string;
    room: string;
    transcript: string;
  } | null>(null);

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ["call-sessions-list"],
    queryFn: () => getCallSessions(),
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
      subtitle="Live & archived WebRTC conversational AI calls with risk scoring and auditable transcripts"
    >
      <div className="space-y-6">
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

          <Link to="/voice">
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold gap-2 shadow w-full sm:w-auto">
              <Mic className="h-4 w-4" />
              Launch Live Call
            </Button>
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load voice sessions: {error.message}</span>
          </div>
        )}

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 sm:p-6 pb-4">
            <CardTitle className="text-base font-semibold">LiveKit Call Registry</CardTitle>
            <CardDescription className="text-xs">
              Every inbound or WebRTC session is recorded, timestamped, and stored in InsForge PostgreSQL.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-8 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Loading call history from database...
                </span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-3">
                <PhoneCall className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium">No voice sessions found in database</p>
                <p className="text-xs max-w-sm">
                  Active WebRTC calls initiated from the Customer Voice UI will be recorded and listed here automatically.
                </p>
                <Link to="/voice">
                  <Button variant="outline" size="sm" className="mt-2 text-xs">
                    Start a Test Call
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Caller / Policyholder</TableHead>
                      <TableHead className="text-xs">Room / ID</TableHead>
                      <TableHead className="text-xs">Duration</TableHead>
                      <TableHead className="text-xs">Risk Level</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Started At</TableHead>
                      <TableHead className="text-xs text-right">Transcript</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s: any) => {
                      const caller = typeof s.customers?.name === "string" ? s.customers.name : typeof s.caller_name === "string" ? s.caller_name : "Unverified Caller";
                      const rawRisk = s.risk_state ?? s.risk_level;
                      const riskStr =
                        typeof rawRisk === "object" && rawRisk !== null
                          ? String(rawRisk.tier || rawRisk.level || "LOW")
                          : String(rawRisk || "LOW");
                      const risk = riskStr.toUpperCase();
                      const riskBadge =
                        risk === "HIGH" || risk === "CRITICAL"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                          : risk === "MEDIUM"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";

                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-xs">
                            <div>{caller}</div>
                            {s.caller_phone && (
                              <div className="text-[10px] text-muted-foreground">{s.caller_phone}</div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {s.room_name}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDuration(s.duration_sec)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${riskBadge}`}>
                              {risk}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                s.status === "active"
                                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 animate-pulse"
                                  : "border-muted text-muted-foreground"
                              }`}
                            >
                              {s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {s.started_at ? new Date(s.started_at).toLocaleString() : "--"}
                          </TableCell>
                          <TableCell className="text-right">
                            {s.transcript ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() =>
                                  setSelectedTranscript({
                                    caller,
                                    room: s.room_name,
                                    transcript: s.transcript,
                                  })
                                }
                              >
                                <FileText className="h-3 w-3 text-cyan-400" />
                                View
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">None</span>
                            )}
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

        {/* Transcript Modal */}
        {selectedTranscript && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg border-border bg-card shadow-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Call Transcript: {selectedTranscript.caller}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setSelectedTranscript(null)}
                  >
                    ✕
                  </Button>
                </div>
                <CardDescription className="text-xs font-mono">
                  {selectedTranscript.room}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-72 overflow-y-auto rounded-lg border border-border/80 bg-background/60 p-4 text-xs whitespace-pre-wrap leading-relaxed text-foreground">
                  {selectedTranscript.transcript}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setSelectedTranscript(null)}>
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
