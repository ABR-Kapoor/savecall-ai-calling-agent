import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import {
  PhoneCall,
  PhoneForwarded,
  ShieldCheck,
  Radio,
  Server,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Clock,
  ArrowRight,
  Plus,
  PlayCircle,
  PowerOff,
  Info,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Phone,
  Signal,
  RotateCcw,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

import {
  getPhoneNumbers,
  getCarrierOptions,
  createPhoneNumber,
  initiatePhoneVerification,
  verifyPhoneNumber,
  testPhoneNumber,
  activatePhoneNumber,
  disconnectPhoneNumber,
} from "@/lib/telephony.functions";
import type {
  PhoneNumberRecord,
  PhoneNumberStatus,
  ForwardingConfig,
  SipTrunkConfig,
} from "@/lib/telephony/types";

export const Route = createFileRoute("/_authenticated/phone")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Phone & Telephony Onboarding: InsurCall AI" }],
  }),
  component: PhoneOnboardingPage,
});

function PhoneOnboardingPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"forwarding" | "sip" | "hosted">("forwarding");
  const [selectedCarrier, setSelectedCarrier] = useState("airtel");
  const [inputNumber, setInputNumber] = useState("");
  const [forwardingMode, setForwardingMode] = useState<"busy_and_no_answer" | "all_calls" | "unreachable_only">("busy_and_no_answer");
  
  // SIP Trunk Inputs
  const [sipTrunkProvider, setSipTrunkProvider] = useState("Tata Tele Smartflo");
  const [sipUri, setSipUri] = useState("sip:sip.insurcall.ai");
  const [sipAuthUser, setSipAuthUser] = useState("");

  // Test Call Modal state
  const [testModalNumber, setTestModalNumber] = useState<PhoneNumberRecord | null>(null);
  const [testCallerPhone, setTestCallerPhone] = useState("+91 98765 43210");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    callSessionId?: string;
    roomName?: string;
    latencyMs: number;
    logs: string[];
    error?: string;
  } | null>(null);

  // Disconnect Confirmation Modal
  const [disconnectTarget, setDisconnectTarget] = useState<PhoneNumberRecord | null>(null);

  // Queries
  const { data: phoneData, isLoading, error, refetch } = useQuery({
    queryKey: ["phone-numbers-list", user?.id],
    queryFn: () => getPhoneNumbers({ data: { clerkUserId: user?.id } }),
    enabled: !!user?.id,
  });

  const { data: carrierOptions } = useQuery({
    queryKey: ["carrier-options"],
    queryFn: () => getCarrierOptions(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: {
      phoneNumber: string;
      connectionType: "forwarding" | "sip_trunk" | "hosted_number";
      carrierId: string;
      forwardingMode: "busy_and_no_answer" | "all_calls" | "unreachable_only";
      sipConfig?: {
        trunkProvider: string;
        sipUri: string;
        authUsername?: string;
        transport: "udp" | "tcp" | "tls";
      };
    }) =>
      createPhoneNumber({
        data: {
          clerkUserId: user?.id,
          phoneNumber: data.phoneNumber,
          countryCode: "+91",
          connectionType: data.connectionType,
          carrierId: data.carrierId,
          forwardingMode: data.forwardingMode,
          sipConfig: data.sipConfig,
        },
      }),
    onSuccess: (newPhone) => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers-list"] });
      setIsWizardOpen(false);
      setInputNumber("");
      toast.success("Phone number setup initialized", {
        description: `Dial the activation code on your mobile phone to forward calls to ${newPhone.display_number}`,
      });
    },
    onError: (err: Error) => {
      toast.error("Setup failed", { description: err.message });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) =>
      verifyPhoneNumber({
        data: { id, clerkUserId: user?.id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers-list"] });
      toast.success("Carrier connection verified", {
        description: "Your forwarding route is confirmed. You can now run a test call.",
      });
    },
    onError: (err: Error) => {
      toast.error("Verification failed", { description: err.message });
    },
  });

  const testMutation = useMutation({
    mutationFn: (vars: { id: string; testCallerPhone?: string }) =>
      testPhoneNumber({
        data: { id: vars.id, clerkUserId: user?.id, testCallerPhone: vars.testCallerPhone },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers-list"] });
      queryClient.invalidateQueries({ queryKey: ["call-sessions-list"] });
      setTestResult(res);
      toast.success("Test call simulated successfully", {
        description: `Agent voice synthesized in ${res.latencyMs}ms with knowledge retrieval`,
      });
    },
    onError: (err: Error) => {
      toast.error("Test call error", { description: err.message });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) =>
      activatePhoneNumber({
        data: { id, clerkUserId: user?.id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers-list"] });
      toast.success("AI Receptionist Activated", {
        description: "InsurCall is now answering live incoming calls on this number.",
      });
    },
    onError: (err: Error) => {
      toast.error("Activation failed", { description: err.message });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (vars: { id: string; reason?: string }) =>
      disconnectPhoneNumber({
        data: { id: vars.id, clerkUserId: user?.id, reason: vars.reason },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers-list"] });
      setDisconnectTarget(null);
      toast.info("Phone number disconnected", {
        description: res.rollbackInstructions || "Carrier forwarding has been disabled.",
      });
    },
    onError: (err: Error) => {
      toast.error("Disconnection error", { description: err.message });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`, { description: text });
  };

  const getStatusBadge = (status: PhoneNumberStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-600 text-white font-medium">Active (Live)</Badge>;
      case "TESTING":
        return <Badge className="bg-blue-600 text-white font-medium">Ready for Activation</Badge>;
      case "CONFIGURED":
        return <Badge className="bg-indigo-600 text-white font-medium">Carrier Forwarded</Badge>;
      case "VERIFICATION_PENDING":
        return <Badge className="bg-amber-600 text-white font-medium">Awaiting Dial Code</Badge>;
      case "SETUP_PENDING":
        return <Badge className="bg-amber-500 text-white font-medium">Setup Pending</Badge>;
      case "DISCONNECTED":
        return <Badge variant="outline" className="text-slate-500 border-slate-300">Disconnected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const phones = phoneData?.phoneNumbers || [];

  return (
    <AppShell
      title="Phone & Telephony Onboarding"
      subtitle="Connect your existing mobile number via carrier forwarding, connect an enterprise SIP trunk, or provision dedicated virtual numbers."
    >
      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        {/* Top Announcement & Setup Trigger */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-50/70 via-white to-cyan-50/70 border border-blue-100 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-400">
                India-First Telecom Gateway
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Connect Your Business Line in Under 2 Minutes
            </h2>
            <p className="text-sm text-slate-500 max-w-2xl">
              Keep your existing mobile phone and SIM. When clients call and you are busy or unavailable, your InsurCall AI receptionist answers seamlessly with your agency policies and coverage knowledge.
            </p>
          </div>
          <Button
            onClick={() => setIsWizardOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-900/20 px-5 py-2.5 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Connect Business Number
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <ErrorState
            title="Unable to load telephony records"
            message={(error as Error).message}
            onRetry={() => refetch()}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-50 border border-slate-200 animate-pulse p-6" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && phones.length === 0 && (
          <EmptyState
            icon={<PhoneCall className="w-8 h-8 text-blue-400" />}
            title="No Phone Numbers Configured"
            description="Your AI receptionist has not been linked to a phone number yet. Choose your preferred connection path to begin receiving client calls."
            actionLabel="Start Phone Onboarding Wizard"
            onAction={() => setIsWizardOpen(true)}
          />
        )}

        {/* Configured Phone Numbers List */}
        {!isLoading && phones.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white tracking-tight">
                Configured Telephony Lines ({phones.length})
              </h3>
              <span className="text-xs text-slate-500">
                All numbers are tenant-isolated and encrypted
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {phones.map((p) => {
                const fwd = p.forwarding_config as Partial<ForwardingConfig>;
                const sip = p.sip_config as Partial<SipTrunkConfig>;

                return (
                  <Card key={p.id} className="bg-white border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                    <CardHeader className="pb-4 border-b border-slate-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-white tracking-tight">
                              {p.display_number}
                            </span>
                            {getStatusBadge(p.status)}
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            {p.connection_type === "forwarding" && (
                              <>
                                <PhoneForwarded className="w-3.5 h-3.5 text-blue-400" />
                                <span>Carrier Forwarding ({fwd?.carrierName || "Indian Carrier"})</span>
                              </>
                            )}
                            {p.connection_type === "sip_trunk" && (
                              <>
                                <Server className="w-3.5 h-3.5 text-indigo-400" />
                                <span>SIP Trunk ({sip?.trunkProvider || "Enterprise PBX"})</span>
                              </>
                            )}
                            {p.connection_type === "hosted_number" && (
                              <>
                                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Dedicated Virtual Landline (+91 DID)</span>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <Badge variant="outline" className="text-slate-500 border-slate-300 font-mono text-[11px]">
                            {p.provider}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 pb-6 space-y-4 text-sm flex-1">
                      {/* Connection Details Box */}
                      {p.connection_type === "forwarding" && fwd?.routingDid && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Inbound Routing DID:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-medium text-blue-400">{fwd.routingDid}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-slate-500 hover:text-white"
                                onClick={() => copyToClipboard(fwd.routingDid || "", "Routing DID")}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Forwarding Mode:</span>
                            <span className="text-slate-800 capitalize">
                              {fwd.mode === "busy_and_no_answer" ? "When Busy / Unanswered" : fwd.mode}
                            </span>
                          </div>

                          {/* DoT Compliant Handset Setup Guidance */}
                          <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-900/30 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-blue-300">Handset Settings (DoT Compliant):</span>
                              <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-800">
                                Recommended
                              </Badge>
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-700">
                              <p>
                                <strong>Android:</strong> Phone App &gt; Settings &gt; Supplementary Services &gt; Call Forwarding &gt; When Busy / Unanswered &gt; Enter <code className="text-blue-300">{fwd.routingDid}</code>
                              </p>
                              <p>
                                <strong>iPhone:</strong> Settings &gt; Phone &gt; Call Forwarding &gt; On &gt; Forward to <code className="text-blue-300">{fwd.routingDid}</code>
                              </p>
                            </div>
                          </div>

                          {fwd.activationMmi && (
                            <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-500">Legacy Dial Code (Optional):</span>
                              <div className="flex items-center gap-1.5">
                                <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200">
                                  {fwd.activationMmi}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-slate-500 hover:text-white"
                                  onClick={() => copyToClipboard(fwd.activationMmi || "", "Activation MMI Code")}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {fwd.deactivationMmi && (
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-500">Deactivation Code:</span>
                              <code className="text-slate-500 font-mono">{fwd.deactivationMmi}</code>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SIP Details Box */}
                      {p.connection_type === "sip_trunk" && sip?.sipUri && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">SIP Destination URI:</span>
                            <span className="font-mono text-indigo-400">{sip.sipUri}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Transport / Codecs:</span>
                            <span className="text-slate-700">{sip.transport?.toUpperCase()} / G.711u, Opus</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Outbound CLI Preserved:</span>
                            <span className="text-emerald-400 font-medium">Authorized</span>
                          </div>
                        </div>
                      )}

                      {/* Status Guidance */}
                      {p.status === "SETUP_PENDING" && (
                        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 text-xs text-amber-300 flex items-start gap-2">
                          <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                          <div>
                            <strong>Next Step:</strong> Dial the activation code shown above from your mobile phone. Once carrier confirms, click <em>Verify Carrier Connection</em> below.
                          </div>
                        </div>
                      )}

                      {p.status === "CONFIGURED" && (
                        <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-300 flex items-start gap-2">
                          <Sparkles className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                          <div>
                            <strong>Forwarding Verified:</strong> Run a quick test call to confirm that your AI receptionist answers with your knowledge store before activating live calls.
                          </div>
                        </div>
                      )}

                      {p.status === "TESTING" && (
                        <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/40 text-xs text-blue-300 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                          <div>
                            <strong>Test Call Passed:</strong> Your agent answered successfully. Click <em>Activate AI Receptionist</em> to start answering real client calls.
                          </div>
                        </div>
                      )}

                      {p.status === "ACTIVE" && (
                        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-300 flex items-start gap-2">
                          <Signal className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                          <div>
                            <strong>Live & Ready:</strong> Inbound calls forwarded to this number are actively answered by your AI insurance receptionist.
                          </div>
                        </div>
                      )}
                    </CardContent>

                    {/* Action Footer */}
                    <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {p.status === "SETUP_PENDING" && (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs"
                            disabled={verifyMutation.isPending}
                            onClick={() => verifyMutation.mutate(p.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Verify Connection
                          </Button>
                        )}

                        {(p.status === "CONFIGURED" || p.status === "TESTING" || p.status === "ACTIVE") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-medium border-slate-300 hover:bg-slate-100 text-slate-800"
                            onClick={() => {
                              setTestModalNumber(p);
                              setTestResult(null);
                            }}
                          >
                            <PlayCircle className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                            Run Test Call
                          </Button>
                        )}

                        {p.status === "TESTING" && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-900/30"
                            disabled={activateMutation.isPending}
                            onClick={() => activateMutation.mutate(p.id)}
                          >
                            <Radio className="w-3.5 h-3.5 mr-1.5" />
                            Activate Live Agent
                          </Button>
                        )}
                      </div>

                      {p.status !== "DISCONNECTED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                          onClick={() => setDisconnectTarget(p)}
                        >
                          <PowerOff className="w-3.5 h-3.5 mr-1" />
                          Disconnect
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Regulatory & Telecom Compliance Notice */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 space-y-2">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>DoT (Department of Telecommunications) Directive 16-6/2020-TC & TRAI Regulatory Notice</span>
          </div>
          <p>
            In accordance with Department of Telecommunications (DoT) directive 16-6/2020-TC dated March 28, 2024 (effective April 15, 2024), telecom access licensees discontinued USSD-based call forwarding (*401*, *21*, etc.) to curb fraudulent SIM interception. Subscribers must configure call forwarding via mobile handset settings (Android / iOS) or carrier applications (MyJio, Airtel Thanks, Vi). InsurCall operates over licensed provider gateways preserving Calling Line Identification (CLI) and notifies callers of AI assistance.
          </p>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODAL 1: Connect Number Wizard */}
        {/* ------------------------------------------------------------- */}
        <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
          <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-400" />
                Connect Business Phone Number
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Select your preferred connection method to route client calls to your AI insurance receptionist.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full mt-2">
              <TabsList className="grid grid-cols-3 bg-slate-50 border border-slate-200 p-1">
                <TabsTrigger value="forwarding" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs">
                  1. Mobile Forwarding (Fastest)
                </TabsTrigger>
                <TabsTrigger value="sip" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs">
                  2. Enterprise SIP Trunk
                </TabsTrigger>
                <TabsTrigger value="hosted" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs">
                  3. Dedicated Landline
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Call Forwarding */}
              <TabsContent value="forwarding" className="space-y-4 pt-4">
                <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-xs text-blue-200">
                  <strong>Recommended for Indian Agencies:</strong> You keep your existing mobile number and SIM. No hardware or SIP server required. When you cannot answer, calls forward seamlessly to your AI assistant.
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-700">Your Indian Cellular Carrier</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      {[
                        { id: "airtel", name: "Bharti Airtel" },
                        { id: "jio", name: "Reliance Jio" },
                        { id: "vi", name: "Vodafone Idea (Vi)" },
                        { id: "bsnl", name: "BSNL Mobile" },
                        { id: "tatatele", name: "Tata Tele (Smartflo)" },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCarrier(c.id)}
                          className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                            selectedCarrier === c.id
                              ? "bg-blue-600/20 border-blue-500 text-white shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="biz-phone" className="text-xs text-slate-700">
                      Existing Business Mobile Number (10 digits)
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-500 text-sm font-mono">
                        +91
                      </span>
                      <Input
                        id="biz-phone"
                        placeholder="98765 43210"
                        value={inputNumber}
                        onChange={(e) => setInputNumber(e.target.value)}
                        className="bg-slate-50 border-slate-200 text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700">When Should AI Answer?</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setForwardingMode("busy_and_no_answer")}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                          forwardingMode === "busy_and_no_answer"
                            ? "bg-blue-600/20 border-blue-500 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="font-semibold text-white">When Busy or Unanswered</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Ring phone first, AI answers if missed</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setForwardingMode("all_calls")}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                          forwardingMode === "all_calls"
                            ? "bg-blue-600/20 border-blue-500 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="font-semibold text-white">All Calls (Full Automation)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">AI answers every incoming call immediately</div>
                      </button>
                    </div>
                  </div>

                  {/* Charge Notice */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
                    <span className="font-semibold text-slate-700">Carrier Billing Disclosure:</span>
                    <p>
                      Forwarded calls utilize your SIM plan's outgoing minutes. On Indian unlimited recharge plans (Jio, Airtel, Vi), forwarded minutes are typically included in standard plan allowances.
                    </p>
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <Button variant="ghost" onClick={() => setIsWizardOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
                    disabled={!inputNumber.trim() || createMutation.isPending}
                    onClick={() =>
                      createMutation.mutate({
                        phoneNumber: inputNumber,
                        connectionType: "forwarding",
                        carrierId: selectedCarrier,
                        forwardingMode,
                      })
                    }
                  >
                    Generate Activation Code
                  </Button>
                </DialogFooter>
              </TabsContent>

              {/* Tab 2: SIP Trunk */}
              <TabsContent value="sip" className="space-y-4 pt-4">
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-200">
                  Connect your existing Cloud PBX (Tata Tele Smartflo, Exotel, Twilio, FreePBX) via SIP URI routing.
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-700">Trunk Provider</Label>
                    <Input
                      value={sipTrunkProvider}
                      onChange={(e) => setSipTrunkProvider(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700">SIP Destination URI</Label>
                    <Input
                      value={sipUri}
                      onChange={(e) => setSipUri(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-white mt-1 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700">Agency DID / Caller ID (E.164)</Label>
                    <Input
                      placeholder="+911149204850"
                      value={inputNumber}
                      onChange={(e) => setInputNumber(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-white mt-1 font-mono"
                    />
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <Button variant="ghost" onClick={() => setIsWizardOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    disabled={!inputNumber.trim() || createMutation.isPending}
                    onClick={() =>
                      createMutation.mutate({
                        phoneNumber: inputNumber,
                        connectionType: "sip_trunk",
                        carrierId: "tatatele",
                        forwardingMode: "all_calls",
                        sipConfig: {
                          trunkProvider: sipTrunkProvider,
                          sipUri,
                          authUsername: sipAuthUser,
                          transport: "tls",
                        },
                      })
                    }
                  >
                    Save SIP Trunk
                  </Button>
                </DialogFooter>
              </TabsContent>

              {/* Tab 3: Dedicated Landline */}
              <TabsContent value="hosted" className="space-y-4 pt-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-emerald-400" />
                    Dedicated Virtual India Number (+91 DID)
                  </h4>
                  <p>
                    Provision a brand new virtual phone number (e.g. 011 / 022 / 080 or Toll-Free 1800) registered exclusively to your insurance agency.
                  </p>
                  <div className="p-2.5 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-500">
                    <strong>Regulatory Requirement:</strong> Under Indian telecom regulations (DoT VNO guidelines), virtual business DIDs require Business KYC verification including Certificate of Incorporation / GSTIN and authorized signatory ID.
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    className="border-slate-300 text-slate-700"
                    onClick={() => {
                      toast.info("Business KYC Desk", {
                        description: "Our compliance team will reach out to verify your GSTIN for virtual DID issuance.",
                      });
                      setIsWizardOpen(false);
                    }}
                  >
                    Submit KYC Request for Virtual DID
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* ------------------------------------------------------------- */}
        {/* MODAL 2: Test Call Simulator */}
        {/* ------------------------------------------------------------- */}
        <Dialog open={!!testModalNumber} onOpenChange={(open) => !open && setTestModalNumber(null)}>
          <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-blue-400" />
                Simulate Inbound Test Call
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Verify that your AI receptionist answers promptly, greets the caller, and retrieves knowledge accurately from your store.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Line:</span>
                  <span className="font-mono font-medium text-white">{testModalNumber?.display_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Simulated Caller Number:</span>
                  <span className="font-mono text-slate-700">{testCallerPhone}</span>
                </div>
              </div>

              {testResult && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Test Call Executed Successfully
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] text-slate-500">
                      {testResult.latencyMs} ms
                    </Badge>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs text-slate-700 bg-slate-100 p-3 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                    {testResult.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-blue-400 select-none">&gt;</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    A test session record has been persisted to your <strong>Live Calls &amp; Transcripts</strong> log for auditability.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setTestModalNumber(null)}>
                Close
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
                disabled={testMutation.isPending}
                onClick={() => {
                  if (testModalNumber) {
                    testMutation.mutate({
                      id: testModalNumber.id,
                      testCallerPhone,
                    });
                  }
                }}
              >
                {testMutation.isPending ? "Connecting Call..." : "Execute Test Call"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ------------------------------------------------------------- */}
        {/* MODAL 3: Disconnect Confirmation */}
        {/* ------------------------------------------------------------- */}
        <Dialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
          <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Disconnect Phone Number
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Are you sure you want to disconnect <strong>{disconnectTarget?.display_number}</strong>?
              </DialogDescription>
            </DialogHeader>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
              <p>
                To stop calls from forwarding to the AI receptionist, dial the carrier cancellation code on your mobile phone:
              </p>
              <div className="p-2 rounded bg-slate-100 font-mono text-center text-sm font-semibold text-rose-300 border border-slate-200">
                {(disconnectTarget?.forwarding_config as any)?.deactivationMmi || "##002#"}
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setDisconnectTarget(null)}>
                Keep Connected
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-500 text-white font-medium"
                disabled={disconnectMutation.isPending}
                onClick={() => {
                  if (disconnectTarget) {
                    disconnectMutation.mutate({
                      id: disconnectTarget.id,
                      reason: "User requested disconnection via dashboard",
                    });
                  }
                }}
              >
                Confirm Disconnection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
