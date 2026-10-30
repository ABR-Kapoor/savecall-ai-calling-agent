import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import {
  MessageSquare,
  QrCode,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  PhoneOff,
  UserCheck,
  Bot,
  Radio,
  PowerOff,
  User,
  Search,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  PhoneCall,
  Zap,
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  Sliders,
  FileText,
  CheckCheck,
  HelpCircle,
  PhoneIncoming,
  Workflow,
  PlusCircle,
  Flame,
  Activity,
  Database,
  Server,
  Wifi,
  History,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getWhatsAppConnection,
  getWhatsAppDiagnostics,
  initiateWhatsAppSession,
  refreshWhatsAppQr,
  simulateWhatsAppPairing,
  disconnectWhatsAppSession,
  sendWhatsAppTestMessage,
  getWhatsAppConversations,
  getWhatsAppMessages,
  sendWhatsAppChatMessage,
  toggleWhatsAppHumanTakeover,
  toggleWhatsAppAutoReply,
  simulateInboundWhatsAppMessage,
  simulateWhatsAppCallEvent,
  seedWhatsAppDemoConversations,
} from "@/lib/whatsapp.functions";
import type {
  WhatsAppSessionStatus,
  WhatsAppConversationRecord,
  WhatsAppMessageRecord,
  WhatsAppDiagnosticsResponse,
} from "@/lib/whatsapp/types";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  ssr: false,
  component: WhatsAppManagementPage,
});

function WhatsAppManagementPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Active top-level tab: connection, inbox, or automations
  const [activeTab, setActiveTab] = useState<"connection" | "inbox" | "automations">("connection");

  // Selected conversation in inbox
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inboxFilter, setInboxFilter] = useState<"all" | "ai" | "takeover">("all");
  const [replyText, setReplyText] = useState("");

  // Modals
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("+919876543210");
  const [testMessage, setTestMessage] = useState("Hello! This is a test outbound message from InsurCall.");
  const [testResult, setTestResult] = useState<{ messageId: string; timestamp: number } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
  const [inboundPhone, setInboundPhone] = useState("+919876543210");
  const [inboundName, setInboundName] = useState("Aarav Sharma");
  const [inboundText, setInboundText] = useState("Hi, I was in a car accident on Western Express Highway. How do I start a cashless claim?");

  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callerPhone, setCallerPhone] = useState("+919123456789");
  const [callerName, setCallerName] = useState("Priya Patel");

  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [showDemoFixtures, setShowDemoFixtures] = useState(false);

  // 1. Load connection details
  const { data: connData, isLoading: isConnLoading, refetch: refetchConn } = useQuery({
    queryKey: ["whatsapp-connection", user?.id],
    queryFn: () => getWhatsAppConnection({ data: { clerkUserId: user?.id } }),
    refetchInterval: (query) => {
      const status = query.state.data?.connection?.status;
      return status === "STARTING" || status === "QR_READY" ? 4000 : 15000;
    },
  });

  const connection = connData?.connection;
  const providerHealth = connData?.providerHealth;

  // 1b. Load real-time diagnostics
  const { data: diagnostics, isLoading: isDiagLoading, refetch: refetchDiag } = useQuery({
    queryKey: ["whatsapp-diagnostics", user?.id],
    queryFn: () => getWhatsAppDiagnostics({ data: { clerkUserId: user?.id } }),
    refetchInterval: 5000,
  });

  // 2. Load conversations (isolating demo fixtures by default)
  const { data: conversations = [], refetch: refetchConversations, isLoading: isConversationsLoading } = useQuery({
    queryKey: ["whatsapp-conversations", user?.id, showDemoFixtures],
    queryFn: () =>
      getWhatsAppConversations({
        data: { clerkUserId: user?.id, includeDemo: showDemoFixtures },
      }),
    refetchInterval: 5000,
  });

  // Select first conversation if none selected
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      const first = conversations[0];
      if (first) {
        setSelectedConversationId(first.id);
      }
    }
  }, [conversations, selectedConversationId]);

  // 3. Load messages for selected conversation
  const { data: messages = [], refetch: refetchMessages, isLoading: isMessagesLoading } = useQuery({
    queryKey: ["whatsapp-messages", selectedConversationId, user?.id],
    queryFn: () =>
      selectedConversationId
        ? getWhatsAppMessages({ data: { conversationId: selectedConversationId, clerkUserId: user?.id } })
        : Promise.resolve([]),
    enabled: Boolean(selectedConversationId),
    refetchInterval: 3000,
  });

  // Mutations
  const initiateMutation = useMutation({
    mutationFn: () => initiateWhatsAppSession({ data: { clerkUserId: user?.id } }),
    onSuccess: () => {
      toast.success("WhatsApp session initiated. Scan the QR code to pair your device.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to initiate WhatsApp session: ${err.message}`);
    },
  });

  const refreshQrMutation = useMutation({
    mutationFn: (id: string) => refreshWhatsAppQr({ data: { id, clerkUserId: user?.id } }),
    onSuccess: (res) => {
      if (res.status === "CONNECTED") {
        toast.success("WhatsApp is now connected!");
      } else {
        toast.info("QR code refreshed.");
      }
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to refresh QR: ${err.message}`);
    },
  });

  const simulatePairingMutation = useMutation({
    mutationFn: (id: string) => simulateWhatsAppPairing({ data: { id, clerkUserId: user?.id } }),
    onSuccess: () => {
      toast.success("WhatsApp phone scan simulated! Account connected successfully.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
    onError: (err: Error) => {
      toast.error(`Pairing simulation failed: ${err.message}`);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => disconnectWhatsAppSession({ data: { id, clerkUserId: user?.id } }),
    onSuccess: () => {
      toast.success("WhatsApp session disconnected.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
      setIsDisconnectModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(`Disconnect failed: ${err.message}`);
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: () => {
      if (!connection) throw new Error("No connection active");
      return sendWhatsAppTestMessage({
        data: {
          id: connection.id,
          recipientPhone: testPhone,
          messageText: testMessage,
          clerkUserId: user?.id,
        },
      });
    },
    onSuccess: (res) => {
      setTestResult(res);
      setTestError(null);
      toast.success("Outbound WhatsApp test message sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      if (res.conversationId) {
        setSelectedConversationId(res.conversationId);
      }
    },
    onError: (err: Error) => {
      setTestError(err.message);
      setTestResult(null);
      toast.error(`Test message failed: ${err.message}`);
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: () => {
      if (!selectedConversationId || !replyText.trim()) throw new Error("Missing text");
      return sendWhatsAppChatMessage({
        data: {
          conversationId: selectedConversationId,
          text: replyText.trim(),
          clerkUserId: user?.id,
        },
      });
    },
    onSuccess: () => {
      setReplyText("");
      refetchMessages();
      refetchConversations();
      toast.success("Staff reply delivered to policyholder.");
    },
    onError: (err: Error) => {
      toast.error(`Failed to send reply: ${err.message}`);
    },
  });

  const takeoverMutation = useMutation({
    mutationFn: (vars: { convId: string; takeover: boolean }) =>
      toggleWhatsAppHumanTakeover({
        data: {
          conversationId: vars.convId,
          humanTakeover: vars.takeover,
          clerkUserId: user?.id,
        },
      }),
    onSuccess: (_res, vars) => {
      refetchConversations();
      toast.success(vars.takeover ? "Staff takeover activated. AI auto-reply paused." : "Returned conversation to Autonomous AI Receptionist.");
    },
    onError: (err: Error) => {
      toast.error(`Takeover toggle failed: ${err.message}`);
    },
  });

  const autoReplyMutation = useMutation({
    mutationFn: (vars: { connId: string; enabled: boolean }) =>
      toggleWhatsAppAutoReply({
        data: {
          connectionId: vars.connId,
          autoReplyEnabled: vars.enabled,
          clerkUserId: user?.id,
        },
      }),
    onSuccess: (_res, vars) => {
      refetchConn();
      toast.success(vars.enabled ? "Autonomous AI Receptionist Auto-Reply enabled." : "AI Auto-Reply paused.");
    },
    onError: (err: Error) => {
      toast.error(`Auto-reply toggle failed: ${err.message}`);
    },
  });

  const simulateInboundMutation = useMutation({
    mutationFn: (vars: { phone: string; name?: string; text: string }) =>
      simulateInboundWhatsAppMessage({
        data: {
          customerPhone: vars.phone,
          customerName: vars.name,
          messageText: vars.text,
          clerkUserId: user?.id,
        },
      }),
    onSuccess: (res) => {
      toast.success(
        res.aiReply
          ? "Customer message processed & Grounded AI Auto-Reply sent!"
          : "Customer message logged in Unified Inbox."
      );
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
      if (res.conversationId) {
        setSelectedConversationId(res.conversationId);
      }
      setIsInboundModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(`Inbound simulation failed: ${err.message}`);
    },
  });

  const simulateCallMutation = useMutation({
    mutationFn: (vars: { phone: string; name?: string }) =>
      simulateWhatsAppCallEvent({
        data: {
          callerPhone: vars.phone,
          callerName: vars.name,
          clerkUserId: user?.id,
        },
      }),
    onSuccess: (res) => {
      toast.success("Incoming call safely rejected & automated textback sent to policyholder.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
      if (res.conversationId) {
        setSelectedConversationId(res.conversationId);
      }
      setIsCallModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(`Call simulation failed: ${err.message}`);
    },
  });

  const seedDemoMutation = useMutation({
    mutationFn: () => seedWhatsAppDemoConversations({ data: { clerkUserId: user?.id } }),
    onSuccess: (res) => {
      toast.success(`Seeded ${res.count} realistic insurance customer threads.`);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
    onError: (err: Error) => {
      toast.error(`Seed failed: ${err.message}`);
    },
  });

  const getStatusBadge = (status: WhatsAppSessionStatus | undefined) => {
    switch (status) {
      case "CONNECTED":
        return <Badge className="bg-emerald-600 text-white font-medium">Connected</Badge>;
      case "QR_READY":
        return <Badge className="bg-blue-600 text-white font-medium">Scan QR to Link</Badge>;
      case "STARTING":
        return <Badge className="bg-amber-600 text-white font-medium">Starting Session</Badge>;
      case "AUTHENTICATING":
        return <Badge className="bg-indigo-600 text-white font-medium">Authenticating</Badge>;
      case "DISCONNECTED":
        return <Badge variant="outline" className="text-slate-600 border-slate-300">Disconnected</Badge>;
      case "FAILED":
        return <Badge className="bg-rose-600 text-white font-medium">Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-500 border-slate-200">Not Connected</Badge>;
    }
  };

  const selectedConv = conversations.find((c: WhatsAppConversationRecord) => c.id === selectedConversationId);

  const filteredConversations = conversations.filter((c: WhatsAppConversationRecord) => {
    const q = searchQuery.toLowerCase();
    const name = (c.customer_name || "").toLowerCase();
    const phone = c.customer_phone.toLowerCase();
    const snippet = (c.last_message_text || "").toLowerCase();
    const matchesSearch = name.includes(q) || phone.includes(q) || snippet.includes(q);

    if (!matchesSearch) return false;
    if (inboxFilter === "ai") return !c.human_takeover;
    if (inboxFilter === "takeover") return Boolean(c.human_takeover);
    return true;
  });

  return (
    <AppShell
      title="WhatsApp Business Assistant"
      subtitle="Multi-device QR connection, unified policyholder inbox, and autonomous grounded AI chat and call automations."
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "connection" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("connection")}
              className={
                activeTab === "connection"
                  ? "bg-[#087E8B] hover:bg-[#066772] text-white shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }
            >
              <QrCode className="w-4 h-4 mr-2" />
              WhatsApp Connection
            </Button>

            <Button
              variant={activeTab === "inbox" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("inbox")}
              className={
                activeTab === "inbox"
                  ? "bg-[#087E8B] hover:bg-[#066772] text-white shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Unified Inbox
              {conversations.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full font-semibold">
                  {conversations.length}
                </span>
              )}
            </Button>

            <Button
              variant={activeTab === "automations" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("automations")}
              className={
                activeTab === "automations"
                  ? "bg-[#087E8B] hover:bg-[#066772] text-white shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }
            >
              <Workflow className="w-4 h-4 mr-2 text-amber-500" />
              AI Chat &amp; Call Automations
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Gateway:</span>
            {providerHealth?.healthy ? (
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 text-xs flex items-center gap-1.5 py-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {providerHealth.status?.includes("embedded")
                  ? "Native Engine (Multi-Device Active)"
                  : "OpenWA Gateway Active"}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-xs flex items-center gap-1.5 py-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Gateway Offline
              </Badge>
            )}
          </div>
        </div>

        {/* ============================================================= */}
        {/* TAB 1: CONNECTION & QR SETUP                                  */}
        {/* ============================================================= */}
        {activeTab === "connection" && (
          <div className="space-y-6">
            {/* Account Card */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-[#087E8B]" />
                        WhatsApp Business Session
                      </CardTitle>
                      {getStatusBadge(connection?.status)}
                    </div>
                    <CardDescription className="text-slate-500 text-sm">
                      Linked via OpenWA upstream gateway (Pinned v0.25.0) using Baileys socket engine.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {connection?.status === "CONNECTED" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTestResult(null);
                            setTestError(null);
                            setIsTestModalOpen(true);
                          }}
                          className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                          Send Outbound Test
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsInboundModalOpen(true)}
                          className="text-xs border-cyan-200 text-cyan-800 bg-cyan-50/50 hover:bg-cyan-100"
                        >
                          <Bot className="w-3.5 h-3.5 mr-1.5 text-[#087E8B]" />
                          Test Inbound Customer Query
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsCallModalOpen(true)}
                          className="text-xs border-amber-200 text-amber-800 bg-amber-50/50 hover:bg-amber-100"
                        >
                          <PhoneIncoming className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                          Test Call Rejection &amp; Textback
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsDisconnectModalOpen(true)}
                          className="text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                          <PowerOff className="w-3.5 h-3.5 mr-1.5" />
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => initiateMutation.mutate()}
                        disabled={initiateMutation.isPending}
                        className="bg-[#087E8B] hover:bg-[#066772] text-white font-medium text-xs shadow-sm"
                      >
                        {initiateMutation.isPending ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Initializing Session...
                          </>
                        ) : (
                          <>
                            <QrCode className="w-3.5 h-3.5 mr-1.5" />
                            {connection?.status === "QR_READY" ? "Regenerate QR Code" : "Connect WhatsApp Account"}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-2">
                {/* Initiation error alert */}
                {initiateMutation.isError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <strong>Connection error:</strong> {initiateMutation.error instanceof Error ? initiateMutation.error.message : "Failed to initiate session. Please ensure the OpenWA gateway is running."}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-rose-300 text-rose-700 bg-white hover:bg-rose-100"
                      onClick={() => initiateMutation.mutate()}
                      disabled={initiateMutation.isPending}
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {/* QR Code Presentation if in QR_READY */}
                {connection?.status === "QR_READY" && connection?.qr_code && (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center gap-8">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                      <img
                        src={connection.qr_code}
                        alt="WhatsApp Authentication QR Code"
                        className="w-56 h-56 object-contain"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshQrMutation.mutate(connection.id)}
                          disabled={refreshQrMutation.isPending}
                          className="text-xs text-slate-600 hover:text-slate-900"
                        >
                          <RefreshCw className={`w-3 h-3 mr-1 ${refreshQrMutation.isPending ? "animate-spin" : ""}`} />
                          Refresh QR
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => simulatePairingMutation.mutate(connection.id)}
                          disabled={simulatePairingMutation.isPending}
                          className="text-xs border-[#087E8B]/40 text-[#087E8B] hover:bg-[#087E8B]/10 font-medium"
                        >
                          {simulatePairingMutation.isPending ? (
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          )}
                          Simulate Scan (Dev Test)
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 flex-1 text-sm text-slate-700">
                      <h4 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#087E8B]" />
                        How to Link Your WhatsApp Number
                      </h4>
                      <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600">
                        <li>Open WhatsApp on your phone or business handset.</li>
                        <li>Tap <strong>Settings</strong> or <strong>Menu (three dots)</strong> &gt; <strong>Linked Devices</strong>.</li>
                        <li>Tap <strong>Link a Device</strong> and point your camera at this QR code.</li>
                        <li>Once scanned, this panel will automatically update to <strong>Connected</strong>.</li>
                      </ol>

                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs">
                        <strong>Safety Notice:</strong> Use a dedicated test number for prototype testing. OpenWA is an unofficial WhatsApp gateway and does not replace official Meta Cloud API compliance for production insurance underwriting.
                      </div>
                    </div>
                  </div>
                )}

                {/* Connection Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Linked Phone Number</span>
                    <p className="font-mono text-sm font-semibold text-slate-900">
                      {connection?.status === "CONNECTED"
                        ? (connection.phone_number || "Active")
                        : "Not linked yet"}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Gateway Session ID</span>
                    <p className="font-mono text-xs text-slate-700 truncate">
                      {connection?.provider_session_id || "Unassigned"}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Webhook Security</span>
                    <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      HMAC-SHA256 Signed
                    </p>
                  </div>
                </div>

                {/* Configuration Toggles */}
                {connection && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Bot className="w-4 h-4 text-[#087E8B]" />
                        Autonomous AI Receptionist Auto-Reply
                      </div>
                      <p className="text-xs text-slate-500">
                        When enabled, inbound customer messages are automatically answered with answers grounded in your policy knowledge base.
                      </p>
                    </div>

                    <Button
                      variant={connection.auto_reply_enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        autoReplyMutation.mutate({
                          connId: connection.id,
                          enabled: !connection.auto_reply_enabled,
                        })
                      }
                      disabled={autoReplyMutation.isPending}
                      className={
                        connection.auto_reply_enabled
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                          : "border-slate-300 text-slate-700 text-xs"
                      }
                    >
                      {connection.auto_reply_enabled ? "Auto-Reply: Enabled" : "Auto-Reply: Paused"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Real-Time Connection Diagnostic Panel */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#087E8B]" />
                      Real-Time Connection Diagnostic Panel
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Live socket health, multi-device synchronization, and verified conversation persistence.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      refetchDiag();
                      refetchConn();
                    }}
                    disabled={isDiagLoading}
                    className="text-xs h-7 border-slate-200 text-slate-700"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1.5 ${isDiagLoading ? "animate-spin" : ""}`} />
                    Refresh Diagnostics
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 1. Gateway Reachable */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Server className="w-3.5 h-3.5 text-slate-600" />
                        1. Gateway Reachable
                      </span>
                      {diagnostics?.gatewayReachable ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5">Reachable (2785)</Badge>
                      ) : (
                        <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 text-[10px] py-0 px-1.5">Unreachable</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 font-mono">
                      {diagnostics?.gatewayReachable ? "HTTP 127.0.0.1:2785 OK" : "Port 2785 Offline"}
                    </p>
                  </div>

                  {/* 2. WhatsApp Socket Open */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Wifi className="w-3.5 h-3.5 text-slate-600" />
                        2. Socket Open
                      </span>
                      {diagnostics?.socketOpen ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5">Socket Active</Badge>
                      ) : diagnostics?.sessionStatus === "SCAN_QR_CODE" ? (
                        <Badge className="bg-blue-600 text-white text-[10px] py-0 px-1.5">Awaiting QR</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[10px] py-0 px-1.5">Not Verified</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 font-mono">
                      {diagnostics?.socketOpen ? "Multi-Device WS Open" : diagnostics?.sessionStatus || "Closed"}
                    </p>
                  </div>

                  {/* 3. Session Authenticated */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                        3. Authenticated
                      </span>
                      {diagnostics?.authenticated ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-100 text-[10px] py-0 px-1.5">Unauthenticated</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-900 font-mono font-semibold truncate">
                      {diagnostics?.phone || "No phone linked"}
                    </p>
                  </div>

                  {/* 4. History Sync */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <History className="w-3.5 h-3.5 text-slate-600" />
                        4. History Sync
                      </span>
                      {diagnostics?.historySync?.status === "completed" ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5">Synced</Badge>
                      ) : diagnostics?.historySync?.status === "syncing" || diagnostics?.historySync?.status === "in_progress" ? (
                        <Badge className="bg-blue-600 text-white text-[10px] py-0 px-1.5 animate-pulse">
                          {diagnostics.historySync.totalBatches
                            ? `Batch ${diagnostics.historySync.processedBatches || 0}/${diagnostics.historySync.totalBatches}`
                            : "Syncing..."}
                        </Badge>
                      ) : diagnostics?.historySync?.status === "failed" ? (
                        <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 text-[10px] py-0 px-1.5">
                          Sync Paused
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-100 text-[10px] py-0 px-1.5">
                          {diagnostics?.socketOpen ? "Awaiting Sync" : "Not Verified"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 font-mono">
                      {diagnostics?.historySync?.chatsCount || 0} chats, {diagnostics?.historySync?.messagesCount || 0} msgs
                    </p>
                    {Boolean(diagnostics?.historySync?.processedMessages) && (
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {diagnostics?.historySync?.processedMessages} msgs processed
                      </span>
                    )}
                  </div>

                  {/* 5. Last Real Inbound Message */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      5. Last Real Inbound
                    </span>
                    <p className="text-xs text-slate-900 font-medium truncate">
                      {diagnostics?.lastInboundAt
                        ? new Date(diagnostics.lastInboundAt).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })
                        : "No inbound message yet"}
                    </p>
                    <span className="text-[10px] text-slate-500 block">
                      {diagnostics?.liveInboundCount || 0} live messages received
                    </span>
                  </div>

                  {/* 6. Last Message Persisted to DB */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Database className="w-3.5 h-3.5 text-slate-600" />
                      6. Persisted to Database
                    </span>
                    <p className="text-xs text-slate-900 font-medium truncate">
                      {diagnostics?.lastPersistedAt
                        ? new Date(diagnostics.lastPersistedAt).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })
                        : "No records yet"}
                    </p>
                    <span className="text-[10px] text-slate-500 block">
                      {diagnostics?.totalRealConversations || 0} chats / {diagnostics?.totalRealMessages || 0} messages stored
                    </span>
                  </div>

                  {/* 7. Webhook & Outbound Dispatch */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      7. Webhook Dispatch Health
                    </span>
                    <p className="text-xs text-slate-900 font-medium">
                      {diagnostics?.webhookHealth?.totalDispatched || 0} delivered / {diagnostics?.webhookHealth?.totalFailed || 0} failed
                    </p>
                    <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      HMAC-SHA256 verified
                    </span>
                  </div>

                  {/* 8. Recent Failure / Diagnostic Notice */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      8. Recent Diagnostic Event
                    </span>
                    <p className="text-xs text-slate-700 truncate">
                      {diagnostics?.lastDisconnectReason
                        ? diagnostics.lastDisconnectReason
                        : diagnostics?.socketOpen
                        ? "Socket connected cleanly"
                        : "Idle / Awaiting connection"}
                    </p>
                    <span className="text-[10px] text-slate-500 block">
                      {diagnostics?.lastConnectedAt
                        ? `Connected: ${new Date(diagnostics.lastConnectedAt).toLocaleTimeString()}`
                        : "No recent connection"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voice Calling Reality Gate */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-slate-600" />
                    WhatsApp Voice Calling Capability
                  </CardTitle>
                  <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-50 text-xs">
                    Auto-Rejection &amp; Automated Textback Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-slate-600">
                <p>
                  <strong>Verified Upstream Reality:</strong> Pinned upstream OpenWA (v0.25.0) confirms that linked WhatsApp sessions support call rejection (<code className="text-slate-800">calls/:id/reject</code>) and call link generation (<code className="text-slate-800">calls/link</code>). OpenWA does not provide bidirectional live audio RTP streaming to converse with callers over WhatsApp voice.
                </p>
                <p>
                  In compliance with InsurCall release requirements, incoming WhatsApp voice calls are automatically rejected and replied to with an automated SMS/WhatsApp message directing policyholders to dial your direct hotline. See the <strong>AI Chat &amp; Call Automations</strong> tab for full details.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: UNIFIED INBOX & HUMAN TAKEOVER                         */}
        {/* ============================================================= */}
        {activeTab === "inbox" && (
          <div className="space-y-4">
            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={inboxFilter === "all" ? "default" : "outline"}
                  onClick={() => setInboxFilter("all")}
                  className={`text-xs h-7 ${inboxFilter === "all" ? "bg-[#087E8B] text-white" : "border-slate-200 text-slate-700"}`}
                >
                  All ({conversations.length})
                </Button>
                <Button
                  size="sm"
                  variant={inboxFilter === "ai" ? "default" : "outline"}
                  onClick={() => setInboxFilter("ai")}
                  className={`text-xs h-7 ${inboxFilter === "ai" ? "bg-[#087E8B] text-white" : "border-slate-200 text-slate-700"}`}
                >
                  <Bot className="w-3 h-3 mr-1 text-cyan-600" />
                  AI Active
                </Button>
                <Button
                  size="sm"
                  variant={inboxFilter === "takeover" ? "default" : "outline"}
                  onClick={() => setInboxFilter("takeover")}
                  className={`text-xs h-7 ${inboxFilter === "takeover" ? "bg-[#087E8B] text-white" : "border-slate-200 text-slate-700"}`}
                >
                  <UserCheck className="w-3 h-3 mr-1 text-emerald-600" />
                  Staff Takeover
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    refetchConversations();
                    refetchMessages();
                  }}
                  className="text-xs h-7 border-slate-200 text-slate-700 hover:bg-slate-50"
                  title="Refresh conversations from database"
                >
                  <RefreshCw className="w-3 h-3 mr-1 text-slate-500" />
                  Refresh
                </Button>

                <Button
                  size="sm"
                  variant={showDemoFixtures ? "default" : "outline"}
                  onClick={() => setShowDemoFixtures(!showDemoFixtures)}
                  className={`text-xs h-7 ${showDemoFixtures ? "bg-amber-600 text-white hover:bg-amber-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  title="Toggle visibility of generated demo fixtures in the inbox"
                >
                  <Sliders className="w-3 h-3 mr-1" />
                  {showDemoFixtures ? "Demo Fixtures: Shown" : "Show Demo Fixtures"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsSandboxModalOpen(true)}
                  className="text-xs h-7 border-slate-200 text-slate-700 hover:bg-slate-50"
                  title="Open development testing & simulation sandbox"
                >
                  <Sparkles className="w-3 h-3 mr-1 text-[#087E8B]" />
                  Developer Sandbox
                </Button>
              </div>
            </div>

            {showDemoFixtures && (
              <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center justify-between">
                <span>
                  <strong>Developer Testing Mode:</strong> Displaying simulated test fixtures alongside genuine chats. Uncheck above to view only live WhatsApp messages.
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDemoFixtures(false)}
                  className="text-xs h-6 text-amber-900 hover:bg-amber-100"
                >
                  Hide Demo Fixtures
                </Button>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[720px]">
              {/* Left Column: Conversation Thread List */}
              <div className="w-full md:w-80 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
                {/* Search Bar */}
                <div className="p-3 border-b border-slate-200 bg-white">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-xs bg-slate-50 border-slate-200 text-slate-800 h-8"
                    />
                  </div>
                </div>

                {/* Thread List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800 text-sm">No WhatsApp conversations found</p>
                        <p className="text-slate-500 text-xs max-w-xs mx-auto">
                          {connection?.status === "CONNECTED"
                            ? `Your WhatsApp account (${connection.phone_number || "Linked"}) is ready. Inbound customer messages or synced chats will appear here automatically.`
                            : "Connect your WhatsApp number in the WhatsApp Connection tab to receive and view real conversations."}
                        </p>
                      </div>
                      <div className="pt-2 flex flex-col items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsSandboxModalOpen(true)}
                          className="text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
                        >
                          <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
                          Open Developer Sandbox
                        </Button>
                      </div>
                    </div>
                  ) : (
                    filteredConversations.map((conv: WhatsAppConversationRecord) => {
                      const isSelected = conv.id === selectedConversationId;
                      return (
                        <button
                          key={conv.id}
                          type="button"
                          onClick={() => setSelectedConversationId(conv.id)}
                          className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-2 ${
                            isSelected ? "bg-cyan-50/60 border-l-4 border-l-[#087E8B]" : "hover:bg-slate-100/60"
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-slate-900 truncate">
                                {conv.customer_name || conv.customer_phone}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(conv.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              {conv.last_message_text || "No message preview"}
                            </p>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {conv.is_demo && (
                                <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-300 py-0 px-1">
                                  Demo Fixture
                                </Badge>
                              )}
                              {conv.human_takeover ? (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 py-0 px-1">
                                  Staff Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-cyan-50 text-cyan-800 border-cyan-200 py-0 px-1">
                                  AI Auto-Reply
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Active Conversation Messages */}
              <div className="flex-1 flex flex-col h-full bg-white">
                {selectedConv ? (
                  <>
                    {/* Header */}
                    <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">
                            {selectedConv.customer_name || selectedConv.customer_phone}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {selectedConv.customer_phone}
                          </span>
                        </div>
                      </div>

                      {/* Human Takeover Toggle */}
                      <div className="flex items-center gap-2">
                        {selectedConv.is_demo && (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 py-0.5 px-1.5">
                            Demo Fixture
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant={selectedConv.human_takeover ? "default" : "outline"}
                          onClick={() =>
                            takeoverMutation.mutate({
                              convId: selectedConv.id,
                              takeover: !selectedConv.human_takeover,
                            })
                          }
                          className={
                            selectedConv.human_takeover
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                              : "border-slate-300 text-slate-700 text-xs h-8"
                          }
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                          {selectedConv.human_takeover ? "Staff Active (Click to Return to AI)" : "Take Over from AI"}
                        </Button>
                      </div>
                    </div>

                    {/* Message Stream */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF9F6]">
                      {messages.length === 0 ? (
                        <div className="p-12 text-center text-xs text-slate-400">
                          No messages in this conversation thread yet.
                        </div>
                      ) : (
                        messages.map((msg: WhatsAppMessageRecord) => {
                          const isInbound = msg.direction === "inbound";
                          const isAi = msg.sender_type === "ai_agent";

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
                            >
                              <div
                                className={`max-w-[78%] p-3.5 rounded-2xl text-xs space-y-2 shadow-2xs ${
                                  isInbound
                                    ? "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                                    : isAi
                                    ? "bg-[#E6F5F6] text-slate-900 border border-[#B2EBF2] rounded-br-xs"
                                    : "bg-[#EDFDF5] text-slate-900 border border-[#A7F3D0] rounded-br-xs"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-1 text-[10px] text-slate-500">
                                  <span className="font-semibold flex items-center gap-1">
                                    {isInbound ? (
                                      <>Customer</>
                                    ) : isAi ? (
                                      <>
                                        <Bot className="w-3 h-3 text-[#087E8B]" />
                                        Autonomous AI Receptionist
                                      </>
                                    ) : (
                                      <>
                                        <User className="w-3 h-3 text-emerald-600" />
                                        Human Staff
                                      </>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span>
                                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                    {!isInbound && (
                                      msg.status === "read" ? (
                                        <span title="Read by recipient" className="inline-flex items-center">
                                          <CheckCheck className="w-3 h-3 text-blue-500" />
                                        </span>
                                      ) : msg.status === "delivered" ? (
                                        <span title="Delivered to device" className="inline-flex items-center">
                                          <CheckCheck className="w-3 h-3 text-slate-400" />
                                        </span>
                                      ) : (
                                        <span title="Sent from server" className="inline-flex items-center">
                                          <CheckCircle2 className="w-3 h-3 text-slate-400" />
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>

                                <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>

                                {/* Grounded Citations if present */}
                                {isAi && msg.grounded_facts && msg.grounded_facts.length > 0 && (
                                  <div className="mt-1 pt-2 border-t border-cyan-200/60 text-[10px] text-cyan-900 space-y-1">
                                    <div className="flex items-center gap-1 font-semibold text-cyan-950">
                                      <ShieldCheck className="w-3 h-3 text-[#087E8B]" />
                                      Grounded in Policy Knowledge Store:
                                    </div>
                                    <ul className="space-y-1 text-cyan-900 pl-1">
                                      {msg.grounded_facts.map((cit, idx) => (
                                        <li key={idx} className="bg-cyan-100/60 p-1.5 rounded border border-cyan-200/50">
                                          <div className="font-medium truncate">{cit.title}</div>
                                          {cit.content && <div className="text-[9px] text-cyan-800 line-clamp-1">{cit.content}</div>}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quick Response Templates */}
                    <div className="px-3 pt-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                      <span className="text-slate-400 text-[10px] font-medium shrink-0">Quick reply:</span>
                      <button
                        type="button"
                        onClick={() => setReplyText("Your claim status is currently under review by our senior adjuster. We will share an update within 2 hours.")}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap text-[10px]"
                      >
                        Claim under review
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyText("Please share 4 clear photos of the vehicle damage (front, rear, and both sides) to expedite survey approval.")}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap text-[10px]"
                      >
                        Request damage photos
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyText("I have transferred your request to our senior claims underwriter who will call you shortly.")}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap text-[10px]"
                      >
                        Transfer to adjuster
                      </button>
                    </div>

                    {/* Reply Input */}
                    <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                      <Input
                        placeholder={
                          selectedConv.human_takeover
                            ? "Type a message as staff..."
                            : "Type reply (sending will automatically pause AI auto-reply)..."
                        }
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (replyText.trim()) sendReplyMutation.mutate();
                          }
                        }}
                        className="text-xs border-slate-200 text-slate-800 h-9"
                      />
                      <Button
                        size="sm"
                        onClick={() => sendReplyMutation.mutate()}
                        disabled={sendReplyMutation.isPending || !replyText.trim()}
                        className="bg-[#087E8B] hover:bg-[#066772] text-white text-xs h-9 px-3"
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Send
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <MessageSquare className="w-12 h-12 mb-3 text-slate-300" />
                    <h3 className="font-semibold text-slate-700 text-sm">Select a conversation thread</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Pick a conversation from the left to read messages, send staff replies, or inspect AI grounded facts.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: AI CHAT & CALL AUTOMATION CENTER                       */}
        {/* ============================================================= */}
        {activeTab === "automations" && (
          <div className="space-y-6">
            {/* Visual Automation Architecture Card */}
            <Card className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                      <Workflow className="w-4 h-4 text-[#087E8B]" />
                      InsurCall Intelligent Automation Pipeline
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs">
                      How WhatsApp chat inquiries and inbound calls are safely processed and answered 24/7.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold text-xs">
                    Active Pipeline
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="text-amber-800 font-semibold flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                      1. Inbound Ingress
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Customer sends a WhatsApp message or attempts a WhatsApp voice call.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="text-emerald-800 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      2. Security &amp; Routing
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      HMAC verification, deduplication, and loop-prevention check (fromMe: false).
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="text-cyan-900 font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#087E8B]" />
                      3. RAG Grounding
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Vector search over carrier policies. Strict abstention if similarity &lt; 0.40.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="text-indigo-900 font-semibold flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-indigo-600" />
                      4. Auto-Fulfillment
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Immediate grounded reply or call rejection with automated hotline textback.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Automation Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Automation 1: Voice Call Auto-Rejection & Instant Textback */}
              <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                        <PhoneOff className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          Missed Call &amp; Call Rejection Textback
                        </CardTitle>
                        <span className="text-[10px] text-slate-400">Trigger: Inbound voice/video call event</span>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px]">
                      Always Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-600 flex-1">
                  <p>
                    <strong>Why it exists:</strong> WhatsApp Multi-Device protocol does not support bidirectional live RTP voice streaming. To prevent callers from ringing indefinitely, InsurCall immediately executes polite call rejection and sends an automated textback.
                  </p>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Automated Dispatch Message:</span>
                    <p className="text-slate-700 font-mono text-[11px] italic">
                      "Hello! We noticed your call to our InsurCall WhatsApp hotline. Since live WhatsApp voice streaming is restricted by WhatsApp protocol, our autonomous assistant is available here on chat 24/7 to answer policy questions and intake claims. For immediate phone support, please dial our direct phone hotline."
                    </p>
                  </div>
                </CardContent>
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Test this flow live</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCallModalOpen(true)}
                    className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                  >
                    <PhoneIncoming className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    Simulate Call &amp; Textback
                  </Button>
                </div>
              </Card>

              {/* Automation 2: 24/7 Autonomous Grounded AI Policy Receptionist */}
              <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-[#087E8B]">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          24/7 Grounded AI Policy Receptionist
                        </CardTitle>
                        <span className="text-[10px] text-slate-400">Trigger: Customer WhatsApp text message</span>
                      </div>
                    </div>
                    <Badge className={connection?.auto_reply_enabled ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px]" : "bg-slate-100 text-slate-700 text-[11px]"}>
                      {connection?.auto_reply_enabled ? "Enabled" : "Paused"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-600 flex-1">
                  <p>
                    <strong>How it works:</strong> Inbound queries are matched against tenant-isolated insurance policy vectors. Answers are synthesised strictly with cited policy clauses. If no evidence meets threshold (0.40), the agent safely abstains rather than hallucinating.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500">Grounding Threshold</span>
                      <p className="font-semibold text-slate-800">Cosine 0.40 (Strict)</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500">Hallucination Gate</span>
                      <p className="font-semibold text-emerald-700">Strict Abstention Active</p>
                    </div>
                  </div>
                </CardContent>
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      connection &&
                      autoReplyMutation.mutate({
                        connId: connection.id,
                        enabled: !connection.auto_reply_enabled,
                      })
                    }
                    className="text-xs"
                  >
                    {connection?.auto_reply_enabled ? "Pause Auto-Reply" : "Enable Auto-Reply"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsInboundModalOpen(true)}
                    className="bg-[#087E8B] hover:bg-[#066772] text-white text-xs"
                  >
                    <Bot className="w-3.5 h-3.5 mr-1.5" />
                    Test Customer Query
                  </Button>
                </div>
              </Card>

              {/* Automation 3: Staff Takeover & Human Escalation */}
              <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          Human Staff Takeover &amp; Escalation
                        </CardTitle>
                        <span className="text-[10px] text-slate-400">Trigger: Staff reply or keyword escalation</span>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px]">
                      Automated Honor
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-600 flex-1">
                  <p>
                    <strong>Loop Prevention &amp; Non-Interference:</strong> When a staff member types a response in the Unified Inbox, the system automatically marks the conversation as <strong>Staff Active</strong> and suspends the AI auto-reply for that specific thread. The bot will not interrupt staff conversations.
                  </p>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-700">
                    <span className="font-semibold text-slate-900 block mb-1">Escalation Triggers:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                      <li>Manual click on "Take Over from AI" in Unified Inbox</li>
                      <li>Customer asks to speak with an agent or adjuster</li>
                      <li>Staff typing an outbound reply directly in the thread</li>
                    </ul>
                  </div>
                </CardContent>
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Go to Unified Inbox</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("inbox")}
                    className="text-xs"
                  >
                    Open Unified Inbox
                  </Button>
                </div>
              </Card>

              {/* Automation 4: WhatsApp First Notice of Loss (FNOL) */}
              <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          WhatsApp FNOL Claims Intake
                        </CardTitle>
                        <span className="text-[10px] text-slate-400">Trigger: Incident or claim intent detected</span>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[11px]">
                      Integrated
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-600 flex-1">
                  <p>
                    <strong>Guided Conversational Intake:</strong> When a policyholder messages about an accident, injury, or property damage, the AI assistant collects mandatory incident details:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200">
                    <li>Incident timestamp &amp; exact street location</li>
                    <li>Vehicle registration or health card ID</li>
                    <li>Preliminary damage estimation</li>
                    <li>Photos of damage or hospital admission card</li>
                  </ol>
                  <p className="text-[11px] text-slate-500">
                    Claims captured via WhatsApp are synced directly into your <strong>Claims Intake &amp; FNOL</strong> review queue.
                  </p>
                </CardContent>
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">View Claims Intake Queue</span>
                  <a
                    href="/claims"
                    className="text-xs font-semibold text-[#087E8B] hover:underline flex items-center gap-1"
                  >
                    Open Claims Intake <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* MODAL 1: SEND OUTBOUND TEST MESSAGE                           */}
        {/* ============================================================= */}
        <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Send WhatsApp Test Message</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Deliver an outbound message directly from your linked WhatsApp business account to any mobile number.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="test-phone" className="text-xs font-medium text-slate-700">
                  Recipient Phone Number (with Country Code)
                </Label>
                <Input
                  id="test-phone"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="test-message" className="text-xs font-medium text-slate-700">
                  Message Content
                </Label>
                <textarea
                  id="test-message"
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-md border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#087E8B]"
                  placeholder="Enter message text..."
                />
              </div>

              {testResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Delivered via WhatsApp Engine
                  </div>
                  <div className="font-mono text-[10px] text-emerald-700">
                    Message ID: {testResult.messageId}
                  </div>
                </div>
              )}

              {testError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{testError}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTestModalOpen(false)}
                className="text-xs border-slate-200"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => sendTestMutation.mutate()}
                disabled={sendTestMutation.isPending || !testPhone.trim() || !testMessage.trim()}
                className="bg-[#087E8B] hover:bg-[#066772] text-white text-xs"
              >
                {sendTestMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Send Message
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================= */}
        {/* MODAL 2: SIMULATE INBOUND CUSTOMER INQUIRY                    */}
        {/* ============================================================= */}
        <Dialog open={isInboundModalOpen} onOpenChange={setIsInboundModalOpen}>
          <DialogContent className="sm:max-w-lg bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#087E8B]" />
                Simulate Inbound Customer WhatsApp Message
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Simulates a customer sending a message to your WhatsApp number. The Grounded AI Receptionist will evaluate the question and respond with cited policy knowledge.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Select a test scenario:</span>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setInboundName("Aarav Sharma");
                      setInboundPhone("+919876543210");
                      setInboundText("Hi, I was in an accident on Western Express Highway. How do I start a cashless claim?");
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-left"
                  >
                    🚗 Car Collision Claim
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInboundName("Priya Patel");
                      setInboundPhone("+919123456789");
                      setInboundText("What is my cashless hospitalization network for Star Health policy SH-8821 in Andheri East?");
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-left"
                  >
                    🏥 Health Hospital Network
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInboundName("Rajesh Mehta");
                      setInboundPhone("+919988776655");
                      setInboundText("I want to speak with a human agent to dispute a deduction on my claim.");
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-left"
                  >
                    👤 Staff Escalation
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Customer Name</Label>
                  <Input
                    value={inboundName}
                    onChange={(e) => setInboundName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Customer Phone</Label>
                  <Input
                    value={inboundPhone}
                    onChange={(e) => setInboundPhone(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Customer Message Body</Label>
                <textarea
                  rows={3}
                  value={inboundText}
                  onChange={(e) => setInboundText(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-md border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#087E8B]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInboundModalOpen(false)}
                className="text-xs border-slate-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  simulateInboundMutation.mutate({
                    phone: inboundPhone,
                    name: inboundName,
                    text: inboundText,
                  })
                }
                disabled={simulateInboundMutation.isPending || !inboundText.trim()}
                className="bg-[#087E8B] hover:bg-[#066772] text-white text-xs"
              >
                {simulateInboundMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Executing RAG Grounding...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                    Submit &amp; Trigger Auto-Reply
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================= */}
        {/* MODAL 3: SIMULATE VOICE CALL REJECTION & TEXTBACK             */}
        {/* ============================================================= */}
        <Dialog open={isCallModalOpen} onOpenChange={setIsCallModalOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900 flex items-center gap-2">
                <PhoneIncoming className="w-5 h-5 text-amber-500" />
                Simulate Inbound Call Rejection &amp; Textback
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Simulates an incoming WhatsApp voice call. Because WhatsApp Multi-Device does not support live voice audio, the gateway automatically executes polite call rejection and delivers an automated WhatsApp SMS directing the policyholder to your 24/7 assistant.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Caller Name</Label>
                <Input
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Caller Phone Number</Label>
                <Input
                  value={callerPhone}
                  onChange={(e) => setCallerPhone(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCallModalOpen(false)}
                className="text-xs border-slate-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  simulateCallMutation.mutate({
                    phone: callerPhone,
                    name: callerName,
                  })
                }
                disabled={simulateCallMutation.isPending}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs"
              >
                {simulateCallMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Executing Rejection...
                  </>
                ) : (
                  <>
                    <PhoneOff className="w-3.5 h-3.5 mr-1.5" />
                    Simulate Call Event
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================= */}
        {/* MODAL 4: DISCONNECT CONFIRMATION                              */}
        {/* ============================================================= */}
        <Dialog open={isDisconnectModalOpen} onOpenChange={setIsDisconnectModalOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-rose-600 flex items-center gap-2">
                <PowerOff className="w-5 h-5" />
                Disconnect WhatsApp Session?
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Unlinking your device will stop automated AI auto-replies and close the WhatsApp socket connection. You can reconnect at any time by scanning a new QR code.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDisconnectModalOpen(false)}
                className="text-xs border-slate-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => connection && disconnectMutation.mutate(connection.id)}
                disabled={disconnectMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
              >
                {disconnectMutation.isPending ? "Disconnecting..." : "Yes, Disconnect Session"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================= */}
        {/* MODAL 5: DEVELOPER SANDBOX & SIMULATION TOOLS                 */}
        {/* ============================================================= */}
        <Dialog open={isSandboxModalOpen} onOpenChange={setIsSandboxModalOpen}>
          <DialogContent className="sm:max-w-lg bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Developer Simulation Sandbox
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Isolated simulation tools for development testing. All generated records are tagged with <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded">is_demo = true</code> and are excluded from the live inbox by default.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                <strong>Data Integrity Protection:</strong>
                <p className="text-[11px] text-amber-800">
                  Demo queries and test contacts are strictly segregated from real policyholder WhatsApp messages. Live messages will never be mixed with sandbox data.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-[#087E8B]" />
                    Simulate Inbound Query
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Simulate an incoming message from a test policyholder and verify grounded RAG answer synthesis.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsSandboxModalOpen(false);
                      setIsInboundModalOpen(true);
                    }}
                    className="w-full text-xs bg-[#087E8B] hover:bg-[#066772] text-white"
                  >
                    Open Simulator
                  </Button>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <PhoneIncoming className="w-4 h-4 text-amber-600" />
                    Test Call Rejection
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Test the automatic voice call rejection and automated textback workflow.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsSandboxModalOpen(false);
                      setIsCallModalOpen(true);
                    }}
                    className="w-full text-xs border-amber-200 text-amber-800 hover:bg-amber-50"
                  >
                    Open Call Simulator
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Seed Realistic Demo Threads
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => seedDemoMutation.mutate()}
                    disabled={seedDemoMutation.isPending}
                    className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    {seedDemoMutation.isPending ? "Generating..." : "Generate Demo Threads"}
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Seeds 3 insurance sample conversations across Motor, Health, and Fleet with grounded citations. These can be toggled on/off in the Unified Inbox.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSandboxModalOpen(false)}
                className="text-xs border-slate-200"
              >
                Close Sandbox
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
