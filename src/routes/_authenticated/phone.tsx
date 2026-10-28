import { createFileRoute, Link } from "@tanstack/react-router";
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
  Headphones,
  Check,
  XCircle,
  Globe,
  Sliders,
  Settings,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  getWhatsAppCallingStatus,
  updateWhatsAppCallingSettings,
  validateCallingSetupServerFn,
} from "@/lib/whatsapp-calling.functions";

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
} from "@/lib/telephony/types";

export const Route = createFileRoute("/_authenticated/phone")({
  ssr: false,
  head: () => ({
    meta: [{ title: "WhatsApp Business Calling: InsurCall AI" }],
  }),
  component: WhatsAppCallingPage,
});

function WhatsAppCallingPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Primary tab: 'whatsapp' is default
  const [activeTab, setActiveTab] = useState<"whatsapp" | "forwarding" | "sip">("whatsapp");

  // WhatsApp Calling Status Query
  const {
    data: waStatus,
    isLoading: waLoading,
    error: waError,
    refetch: refetchWaStatus,
  } = useQuery({
    queryKey: ["whatsapp-calling-status", user?.id],
    queryFn: () => getWhatsAppCallingStatus({ data: { clerkUserId: user?.id } }),
    enabled: !!user?.id,
  });

  // Calling Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (vars: {
      callingEnabled?: boolean;
      inboundCallingEnabled?: boolean;
      outboundCallingEnabled?: boolean;
      metaPhoneNumberId?: string;
      displayName?: string;
      callingHours?: { enabled: boolean; start: string; end: string; timezone?: string };
    }) =>
      updateWhatsAppCallingSettings({
        data: {
          clerkUserId: user?.id,
          ...vars,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-calling-status"] });
      toast.success("Calling settings updated successfully");
    },
    onError: (err: any) => {
      toast.error("Failed to update settings", { description: err.message });
    },
  });

  // Validation Test Mutation
  const [validationChecklist, setValidationChecklist] = useState<any[] | null>(null);
  const validateMutation = useMutation({
    mutationFn: () => validateCallingSetupServerFn(),
    onSuccess: (data) => {
      setValidationChecklist(data.checkList);
      toast.success("Configuration validation completed", {
        description: data.validation.ready
          ? "All required components are properly configured!"
          : "Some configuration settings require attention.",
      });
    },
    onError: (err: any) => {
      toast.error("Validation failed", { description: err.message });
    },
  });

  // Local state for calling hours form
  const [callingHoursEnabled, setCallingHoursEnabled] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  // Sync state from query when loaded
  const [syncedHours, setSyncedHours] = useState(false);
  if (waStatus && !syncedHours) {
    if (waStatus.callingHours) {
      setCallingHoursEnabled(Boolean(waStatus.callingHours.enabled));
      setStartTime(waStatus.callingHours.start || "09:00");
      setEndTime(waStatus.callingHours.end || "18:00");
    }
    setSyncedHours(true);
  }

  // Legacy Telephony Queries (Preserved for PSTN/SIP)
  const { data: phoneData } = useQuery({
    queryKey: ["phone-numbers-list", user?.id],
    queryFn: () => getPhoneNumbers({ data: { clerkUserId: user?.id } }),
    enabled: !!user?.id && activeTab !== "whatsapp",
  });

  const { data: carrierOptions } = useQuery({
    queryKey: ["carrier-options"],
    queryFn: () => getCarrierOptions(),
    enabled: activeTab !== "whatsapp",
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`, { description: text });
  };

  const isLiveKitCloud = waStatus?.validation?.isCloudLiveKit ?? false;
  const isReady = waStatus?.validation?.ready ?? false;
  const missingVars = waStatus?.validation?.missingVariables ?? [];

  return (
    <AppShell
      title="WhatsApp Business Voice Calling"
      subtitle="Genuine two-way AI voice calling on WhatsApp powered by LiveKit Cloud Connectors and Meta WhatsApp Cloud API"
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Navigation Tabs between WhatsApp (Primary) and Legacy PSTN/SIP */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TabsList className="bg-muted/60 p-1">
                <TabsTrigger value="whatsapp" className="gap-2 font-medium text-xs sm:text-sm">
                  <Headphones className="size-4 text-emerald-600" />
                  WhatsApp Voice Calling (LiveKit Cloud)
                </TabsTrigger>
                <TabsTrigger value="forwarding" className="gap-2 font-medium text-xs sm:text-sm">
                  <PhoneForwarded className="size-4 text-slate-500" />
                  Carrier Forwarding (PSTN)
                </TabsTrigger>
                <TabsTrigger value="sip" className="gap-2 font-medium text-xs sm:text-sm">
                  <Server className="size-4 text-slate-500" />
                  Enterprise SIP Trunk
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Link to="/calls">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <PhoneCall className="size-3.5 text-primary" />
                    Call History
                  </Button>
                </Link>
                <Link to="/settings">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                    <Settings className="size-3.5" />
                    Channel Settings
                  </Button>
                </Link>
              </div>
            </div>

            {/* TAB 1: WHATSAPP VOICE CALLING (LIVEKIT CLOUD) - PRIMARY EXPERIENCE */}
            <TabsContent value="whatsapp" className="space-y-6 mt-6">
              {/* Status Header Overview Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/80 bg-card shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">LiveKit Cloud Telephony</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`size-2.5 rounded-full ${isLiveKitCloud ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span className="font-semibold text-sm">
                          {isLiveKitCloud ? "LiveKit Cloud" : "Self-Hosted / Local"}
                        </span>
                      </div>
                    </div>
                    <Radio className="size-7 text-primary/70" />
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-card shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Meta WhatsApp API</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`size-2.5 rounded-full ${waStatus?.validation?.metaConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span className="font-semibold text-sm">
                          {waStatus?.validation?.metaConfigured ? "API v26.0 Configured" : "Setup Required"}
                        </span>
                      </div>
                    </div>
                    <Globe className="size-7 text-emerald-600/70" />
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-card shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Inbound Call Reception</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`size-2.5 rounded-full ${waStatus?.inboundEnabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                        <span className="font-semibold text-sm">
                          {waStatus?.inboundEnabled ? "Accepting Inbound" : "Inbound Disabled"}
                        </span>
                      </div>
                    </div>
                    <PhoneCall className="size-7 text-blue-600/70" />
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-card shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Outbound Calling Guard</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`size-2.5 rounded-full ${waStatus?.outboundEnabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                        <span className="font-semibold text-sm">
                          {waStatus?.outboundEnabled
                            ? waStatus?.testMode
                              ? "Test Mode Only"
                              : "Outbound Live"
                            : "Outbound Disabled"}
                        </span>
                      </div>
                    </div>
                    <ShieldCheck className="size-7 text-indigo-600/70" />
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1 & 2: Configuration & Operational Settings */}
                <div className="lg:col-span-2 space-y-6">
                  {/* WhatsApp Connection Card */}
                  <Card className="border border-border shadow-xs">
                    <CardHeader className="pb-3 border-b border-border/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-md bg-emerald-50 text-emerald-700">
                            <Headphones className="size-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold">
                              WhatsApp Business Number & Account Details
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Connection identifiers registered with Meta WhatsApp Cloud Platform
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          variant={waStatus?.connection?.status === "CONNECTED" ? "default" : "secondary"}
                          className={waStatus?.connection?.status === "CONNECTED" ? "bg-emerald-600 text-white" : ""}
                        >
                          {waStatus?.connection?.status || "NOT_CONFIGURED"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">WhatsApp Business Phone Number ID</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              readOnly
                              value={waStatus?.connection?.meta_phone_number_id || process.env["WHATSAPP_BUSINESS_PHONE_NUMBER_ID"] || "Not configured"}
                              className="font-mono text-xs bg-muted/40"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-8 shrink-0"
                              onClick={() =>
                                copyToClipboard(
                                  waStatus?.connection?.meta_phone_number_id || "",
                                  "Phone Number ID"
                                )
                              }
                            >
                              <Copy className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Verified Display Number / Name</Label>
                          <Input
                            readOnly
                            value={waStatus?.connection?.display_name || waStatus?.connection?.phone_number || "+91 (Configured in Meta)"}
                            className="text-xs bg-muted/40 mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                        <div>
                          <Label className="text-xs text-muted-foreground">Cloud API Version Candidate</Label>
                          <p className="text-xs font-semibold mt-1">
                            Meta WhatsApp Graph API v{waStatus?.validation?.details?.apiVersion || "26.0"}
                          </p>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Assigned Voice Agent Worker</Label>
                          <p className="text-xs font-semibold mt-1 text-primary">
                            {waStatus?.agentName || "insurcall-voice-agent"}
                          </p>
                        </div>
                      </div>

                      {/* Feature Toggles */}
                      <div className="pt-4 border-t border-border/60 space-y-3">
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          Voice Reception & Feature Gates
                        </h4>

                        <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                          <div>
                            <p className="text-sm font-medium">Inbound WhatsApp Voice Calls</p>
                            <p className="text-xs text-muted-foreground">
                              Allow policyholders to call your WhatsApp Business number and talk with the AI voice agent.
                            </p>
                          </div>
                          <Switch
                            checked={waStatus?.inboundEnabled}
                            onCheckedChange={(checked) =>
                              updateSettingsMutation.mutate({
                                callingEnabled: true,
                                inboundCallingEnabled: checked,
                              })
                            }
                            disabled={updateSettingsMutation.isPending}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">Outbound WhatsApp Voice Calls</p>
                              {waStatus?.testMode && (
                                <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                                  Restricted to Test Allowlist
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Allow authorized staff to initiate outbound voice calls directly to verified policyholders.
                            </p>
                          </div>
                          <Switch
                            checked={waStatus?.outboundEnabled}
                            onCheckedChange={(checked) =>
                              updateSettingsMutation.mutate({
                                callingEnabled: true,
                                outboundCallingEnabled: checked,
                              })
                            }
                            disabled={updateSettingsMutation.isPending}
                          />
                        </div>
                      </div>

                      {/* Business Calling Hours */}
                      <div className="pt-4 border-t border-border/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                              Business Calling Hours
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Reject incoming calls outside operational hours with an automated notification.
                            </p>
                          </div>
                          <Switch
                            checked={callingHoursEnabled}
                            onCheckedChange={setCallingHoursEnabled}
                          />
                        </div>

                        {callingHoursEnabled && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div>
                              <Label className="text-xs text-muted-foreground">Start Time</Label>
                              <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="text-xs bg-background mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">End Time</Label>
                              <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="text-xs bg-background mt-1"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs font-medium"
                                onClick={() =>
                                  updateSettingsMutation.mutate({
                                    callingHours: {
                                      enabled: callingHoursEnabled,
                                      start: startTime,
                                      end: endTime,
                                      timezone: "Asia/Kolkata",
                                    },
                                  })
                                }
                                disabled={updateSettingsMutation.isPending}
                              >
                                Save Hours
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Meta Webhook Endpoint Card */}
                  <Card className="border border-border shadow-xs">
                    <CardHeader className="pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-md bg-blue-50 text-blue-700">
                          <Radio className="size-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">
                            Meta Webhook Endpoint & Event Handshake
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Configure this URL in the Meta Developer Console under WhatsApp &rarr; Configuration
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Callback URL</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            readOnly
                            value={waStatus?.webhookUrl || "https://your-domain.com/api/webhooks/meta-whatsapp"}
                            className="font-mono text-xs bg-muted/40"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() =>
                              copyToClipboard(waStatus?.webhookUrl || "", "Webhook Callback URL")
                            }
                          >
                            <Copy className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                          <p className="text-xs font-medium text-foreground">Required Webhook Fields</p>
                          <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc pl-4">
                            <li><code className="text-primary font-mono">messages</code> (Inbound text & receipts)</li>
                            <li><code className="text-primary font-mono">voice_calls</code> / <code className="text-primary font-mono">calls</code> (WebRTC offers & answers)</li>
                          </ul>
                        </div>

                        <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                          <p className="text-xs font-medium text-foreground">Security Verification</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            GET requests validated via <code className="font-mono">hub.verify_token</code>.
                            POST events verified via HMAC-SHA256 signature in <code className="font-mono">X-Hub-Signature-256</code>.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Column 3: LiveKit Cloud Telephony & Diagnostics Checklist */}
                <div className="space-y-6">
                  {/* LiveKit Cloud Telephony Card */}
                  <Card className="border border-border shadow-xs">
                    <CardHeader className="pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-md bg-indigo-50 text-indigo-700">
                          <Server className="size-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">LiveKit Cloud Telephony</CardTitle>
                          <CardDescription className="text-xs">
                            WebRTC audio bridge & agent dispatch
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">LiveKit Project Host</Label>
                        <p className="text-xs font-mono font-medium mt-0.5 truncate">
                          {waStatus?.validation?.details?.livekitUrlHost || "Configured via LIVEKIT_URL"}
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Supported Connector APIs</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] font-mono">AcceptWhatsAppCall</Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">DialWhatsAppCall</Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">ConnectWhatsAppCall</Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">DisconnectWhatsAppCall</Badge>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/60 text-xs text-blue-900 mt-2">
                        <div className="flex items-start gap-2">
                          <Info className="size-4 text-blue-600 shrink-0 mt-0.5" />
                          <p>
                            The WhatsApp Connector is provided by <strong>LiveKit Cloud</strong>. The AI agent connects to the room and handles Silero VAD, Groq LLM, and insurance RAG tools.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Safe Setup Validation Checklist */}
                  <Card className="border border-border shadow-xs">
                    <CardHeader className="pb-3 border-b border-border/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="size-4 text-emerald-600" />
                          <CardTitle className="text-sm font-semibold">Configuration Checklist</CardTitle>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => validateMutation.mutate()}
                          disabled={validateMutation.isPending}
                        >
                          <RotateCcw className={`size-3 ${validateMutation.isPending ? "animate-spin" : ""}`} />
                          Validate Setup
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-2.5">
                      {validationChecklist ? (
                        <div className="space-y-2">
                          {validationChecklist.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start justify-between p-2 rounded-md bg-muted/30 border border-border/40 text-xs"
                            >
                              <div className="flex items-start gap-2">
                                {item.passed ? (
                                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                  <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <p className="font-medium text-foreground">{item.label}</p>
                                  <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                                </div>
                              </div>
                              <Badge
                                variant={item.passed ? "default" : "secondary"}
                                className={`text-[10px] h-5 ${item.passed ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800"}`}
                              >
                                {item.passed ? "Ready" : "Pending"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Click <strong>Validate Setup</strong> to safely test your LiveKit Cloud and Meta configuration without placing calls.
                          </p>
                          <Button
                            size="sm"
                            className="text-xs gap-1.5"
                            onClick={() => validateMutation.mutate()}
                            disabled={validateMutation.isPending}
                          >
                            <Sparkles className="size-3.5" />
                            Run Setup Check
                          </Button>
                        </div>
                      )}

                      {missingVars.length > 0 && (
                        <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs mt-3">
                          <p className="font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="size-3.5 text-amber-600" />
                            Missing Environment Variables:
                          </p>
                          <ul className="list-disc pl-5 mt-1 space-y-0.5 font-mono text-[11px]">
                            {missingVars.map((v: string) => (
                              <li key={v}>{v}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: CARRIER FORWARDING (PRESERVED SECONDARY) */}
            <TabsContent value="forwarding" className="space-y-6 mt-6">
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Carrier Forwarding (PSTN / SIM)</CardTitle>
                  <CardDescription className="text-xs">
                    Legacy telecom forwarding codes (*21*) for routing standard cellular calls to InsurCall DIDs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="p-4 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-2">
                    <p className="font-semibold text-foreground">Airtel, Jio, and Vodafone-Idea Forwarding</p>
                    <p className="text-muted-foreground">
                      To route unanswered cellular phone calls to InsurCall, dial <code className="font-mono font-semibold text-primary">*67*&amp;lt;YOUR_DID&amp;gt;#</code> from your handset.
                    </p>
                    <p className="text-muted-foreground">
                      For genuine two-way voice calling with interactive WhatsApp integration, switch to the <strong>WhatsApp Voice Calling</strong> tab above.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: ENTERPRISE SIP TRUNK (PRESERVED SECONDARY) */}
            <TabsContent value="sip" className="space-y-6 mt-6">
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Enterprise SIP Trunking</CardTitle>
                  <CardDescription className="text-xs">
                    Connect an enterprise IP PBX or carrier SIP trunk (Tata Tele Smartflo, Airtel IQ, Twilio)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="p-4 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-2">
                    <p className="font-semibold text-foreground">SIP Trunk Registration</p>
                    <p className="text-muted-foreground">
                      Point your SIP trunk gateway to <code className="font-mono text-primary">sip:sip.insurcall.ai:5060</code> with authenticated Digest credentials.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}
