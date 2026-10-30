import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Lock,
  MessageSquare,
  Sparkles,
  Bot,
  Check,
  Save,
  ArrowRight,
  Clock,
  Shield,
  HelpCircle,
  Smartphone,
  ExternalLink,
  Activity,
  Server,
  Wifi,
  AlertTriangle,
  Headphones,
  PhoneCall,
  Radio,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  getTenantSettings,
  updateTenantSettings,
  syncClerkUser,
  getCallerProfile,
  updateSubscriptionPlan,
  getSystemDiagnostics,
} from "@/lib/insurance.functions";
import {
  getWhatsAppCallingStatus,
  updateWhatsAppCallingSettings,
  validateCallingSetupServerFn,
} from "@/lib/whatsapp-calling.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Settings & Workspace: InsurCall Insurance AI" }],
  }),
  component: SettingsPage,
});

interface BrandingConfig {
  plan?: string;
  support_email?: string;
  support_phone?: string;
  business_hours?: string;
  supported_lines?: string[];
  agent_config?: {
    agent_name?: string;
    tone?: string;
    language?: string;
    greeting?: string;
    voice_id?: string;
    system_prompt?: string;
    knowledge_base?: string;
    last_trained_at?: string;
    [key: string]: unknown;
  };
  organization_details?: {
    agency_name?: string;
    business_type?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    lines_of_insurance?: string[];
    preferred_language?: string;
    [key: string]: unknown;
  };
  call_handling?: {
    working_hours?: string;
    emergency_hotline?: string;
    after_hours_route?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const DEFAULT_SUPPORTED_LINES = [
  "Health & Medical",
  "Motor & Commercial Vehicle",
  "Term & Life",
  "Property & Home",
  "Commercial & Fleet",
];

function SettingsPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const isInitialized = useRef(false);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-settings", user?.id],
    queryFn: () =>
      getTenantSettings({
        data: {
          clerkUserId: user?.id,
          userEmail: user?.primaryEmailAddress?.emailAddress,
          userName: user?.fullName || undefined,
        },
      }),
  });

  const { data: callerProfile } = useQuery({
    queryKey: ["caller-profile", user?.id, tenant?.id],
    queryFn: () => {
      const payload: { clerkUserId?: string; email?: string; tenantId?: string } = {};
      if (user?.id) payload.clerkUserId = user.id;
      if (user?.primaryEmailAddress?.emailAddress) payload.email = user.primaryEmailAddress.emailAddress;
      if (tenant?.id) payload.tenantId = tenant.id;
      return getCallerProfile({ data: payload });
    },
    enabled: !!user,
  });

  const {
    data: diagnostics,
    isLoading: isDiagLoading,
    isRefetching: isDiagRefetching,
    refetch: refetchDiag,
  } = useQuery({
    queryKey: ["system-diagnostics", tenant?.id, user?.id],
    queryFn: () =>
      getSystemDiagnostics({
        data: {
          tenantId: tenant?.id,
          clerkUserId: user?.id,
        },
      }),
    enabled: !!tenant?.id,
  });

  // Organization state (strictly from user database records)
  const [name, setName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [supportedLines, setSupportedLines] = useState<string[]>(DEFAULT_SUPPORTED_LINES);

  // Assistant persona (strictly from user database records)
  const [agentName, setAgentName] = useState("");
  const [tone, setTone] = useState("");
  const [language, setLanguage] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    if (tenant && !isInitialized.current) {
      isInitialized.current = true;
      setName(tenant.name || "");
      const bCfg = (tenant.branding_config as BrandingConfig | null) || {};
      const org = bCfg.organization_details || {};
      const call = bCfg.call_handling || {};

      setSupportEmail(bCfg.support_email || org.contact_email || "");
      setSupportPhone(bCfg.support_phone || org.contact_phone || "");

      const hours =
        (typeof bCfg.business_hours === "string" && bCfg.business_hours) ||
        (typeof call.working_hours === "string" && call.working_hours) ||
        "";
      setBusinessHours(hours);

      const lines =
        (Array.isArray(bCfg.supported_lines) && bCfg.supported_lines.length > 0 ? bCfg.supported_lines : null) ||
        (Array.isArray(org.lines_of_insurance) && org.lines_of_insurance.length > 0 ? org.lines_of_insurance : null) ||
        DEFAULT_SUPPORTED_LINES;
      setSupportedLines(lines);

      const aCfg = bCfg.agent_config || {};
      const rawAgent = aCfg as Record<string, unknown>;
      if (typeof aCfg.agent_name === "string" && aCfg.agent_name) {
        setAgentName(aCfg.agent_name);
      } else if (typeof rawAgent["name"] === "string" && rawAgent["name"]) {
        setAgentName(rawAgent["name"]);
      } else {
        setAgentName("");
      }

      if (typeof aCfg.tone === "string") {
        setTone(aCfg.tone);
      } else {
        setTone("");
      }

      if (typeof aCfg.language === "string") {
        setLanguage(aCfg.language);
      } else {
        setLanguage("");
      }

      if (typeof aCfg.greeting === "string") {
        setGreeting(aCfg.greeting);
      } else {
        setGreeting("");
      }
    }
  }, [tenant]);

  const toggleLine = (line: string) => {
    setSupportedLines((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line]
    );
  };

  // Save updated settings
  const updateMutation = useMutation({
    mutationFn: async () => {
      const existingBrd = (tenant?.branding_config as BrandingConfig | null) || {};
      const existingOrg = existingBrd.organization_details || {};
      const existingCall = existingBrd.call_handling || {};
      const existingAgent = existingBrd.agent_config || {};

      const cleanName = name.trim();
      const updatedAgentConfig = {
        ...existingAgent,
        name: agentName.trim() || cleanName,
        agent_name: agentName.trim() || cleanName,
        tone: tone.trim(),
        language: language.trim(),
        greeting: greeting.trim(),
        last_updated_at: new Date().toISOString(),
      };

      const updatedBranding = {
        ...existingBrd,
        support_email: supportEmail.trim(),
        support_phone: supportPhone.trim(),
        business_hours: businessHours.trim(),
        supported_lines: supportedLines,
        organization_details: {
          ...existingOrg,
          agency_name: cleanName,
          contact_email: supportEmail.trim(),
          contact_phone: supportPhone.trim(),
          lines_of_insurance: supportedLines,
        },
        call_handling: {
          ...existingCall,
          working_hours: businessHours.trim(),
        },
        agent_config: updatedAgentConfig,
      };

      return updateTenantSettings({
        data: {
          tenantId: tenant?.id,
          clerkUserId: user?.id,
          name: cleanName,
          slug: tenant?.slug || "insurcall",
          branding_config: updatedBranding,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      queryClient.invalidateQueries({ queryKey: ["my-tenant"] });
      queryClient.invalidateQueries({ queryKey: ["caller-profile"] });
      queryClient.invalidateQueries({ queryKey: ["agent-studio"] });
      toast.success("Settings saved and synced across your workspace.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save configuration";
      toast.error(msg);
    },
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      syncClerkUser({
        data: {
          tenantId: tenant?.id,
          clerkUserId: user?.id,
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["caller-profile"] });
      queryClient.invalidateQueries({ queryKey: ["policies-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success(`Successfully verified and synced ${res.syncedCount} staff account(s).`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to sync staff profile";
      toast.error(msg);
    },
  });

  const planMutation = useMutation({
    mutationFn: (plan: "starter" | "growth" | "business" | "enterprise") =>
      updateSubscriptionPlan({ data: { plan } }),
    onSuccess: (_, plan) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast.success(`Switched workspace to ${plan.toUpperCase()} tier.`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update plan tier";
      toast.error(msg);
    },
  });

  const currentPlan = ((tenant?.branding_config as BrandingConfig | null)?.plan as string) || "starter";

  const { data: waCallingStatus } = useQuery({
    queryKey: ["settings-wa-calling-status", user?.id],
    queryFn: () => getWhatsAppCallingStatus({ data: { clerkUserId: user?.id } }),
    enabled: !!user?.id,
  });

  const updateCallingSettingsMutation = useMutation({
    mutationFn: (vars: {
      callingEnabled?: boolean;
      inboundCallingEnabled?: boolean;
      outboundCallingEnabled?: boolean;
      metaPhoneNumberId?: string;
      displayName?: string;
    }) =>
      updateWhatsAppCallingSettings({
        data: {
          clerkUserId: user?.id,
          ...vars,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-wa-calling-status"] });
      toast.success("WhatsApp Calling settings updated");
    },
    onError: (err: any) => {
      toast.error("Failed to update calling settings", { description: err.message });
    },
  });

  return (
    <AppShell
      title="Settings & Workspace"
      subtitle="Manage your insurance agency profile, staff identity, WhatsApp assistant persona, calling channels, and plan allowances"
    >
      <div className="max-w-5xl space-y-6">
        <Tabs defaultValue="organization" className="w-full">
          {/* Top Navigation Tabs */}
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <TabsTrigger
              value="organization"
              className="flex items-center gap-2 text-xs font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all"
            >
              <Building2 className="size-4 text-[#087F8C]" />
              Agency Profile
            </TabsTrigger>
            <TabsTrigger
              value="calling"
              className="flex items-center gap-2 text-xs font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all"
            >
              <Headphones className="size-4 text-emerald-600" />
              WhatsApp Calling
            </TabsTrigger>
            <TabsTrigger
              value="assistant"
              className="flex items-center gap-2 text-xs font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all"
            >
              <Bot className="size-4 text-[#087F8C]" />
              Assistant Persona
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center gap-2 text-xs font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all"
            >
              <ShieldCheck className="size-4 text-emerald-600" />
              Staff & Governance
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="flex items-center gap-2 text-xs font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all"
            >
              <Sparkles className="size-4 text-amber-500" />
              Plan & Quotas
            </TabsTrigger>
            <TabsTrigger
              value="diagnostics"
              className="flex items-center gap-2 text-xs font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all"
            >
              <Activity className="size-4 text-[#087F8C]" />
              System Diagnostics
            </TabsTrigger>
          </TabsList>

          {/* ===============================================================
              TAB 1: AGENCY PROFILE
             =============================================================== */}
          <TabsContent value="organization" className="space-y-6 pt-3">
            <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#087F8C]">
                      <Building2 className="size-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Agency Identity & Contact Channels
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        These official details are introduced to policyholders during WhatsApp conversations.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold">
                    Active Workspace
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Organization / Agency Name
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter organization legal name"
                      disabled={isLoading}
                      className="text-xs bg-white border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Workspace Identifier
                    </Label>
                    <Input
                      value={tenant?.slug || ""}
                      disabled
                      placeholder="Unassigned"
                      className="text-xs bg-slate-50 border-slate-200 text-slate-500 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Customer Support & Claims Phone
                    </Label>
                    <Input
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      disabled={isLoading}
                      className="text-xs bg-white border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Official Claims & Inquiries Email
                    </Label>
                    <Input
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="e.g. claims@youragency.com"
                      disabled={isLoading}
                      className="text-xs bg-white border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Official Support Operating Hours
                  </Label>
                  <Input
                    value={businessHours}
                    onChange={(e) => setBusinessHours(e.target.value)}
                    placeholder="e.g. Monday - Friday, 9:00 AM - 6:00 PM"
                    disabled={isLoading}
                    className="text-xs bg-white border-slate-200 rounded-xl"
                  />
                  <p className="text-[11px] text-slate-400">
                    When customers reach out outside these hours, the assistant will inform them of your emergency hotline and next available business day.
                  </p>
                </div>

                {/* Supported Lines */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 block">
                      Supported Lines of Insurance
                    </Label>
                    <span className="text-[10px] text-slate-400">Click to toggle active lines</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_SUPPORTED_LINES.map((line) => {
                      const isSelected = supportedLines.includes(line);
                      return (
                        <button
                          key={line}
                          type="button"
                          onClick={() => toggleLine(line)}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                            isSelected
                              ? "border-teal-300 bg-teal-50 text-[#087F8C] font-semibold shadow-2xs"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          <Check className={`size-3 ${isSelected ? "text-[#087F8C]" : "opacity-0"}`} />
                          {line}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Changes apply immediately to your active tenant.
                  </p>
                  <Button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending || isLoading}
                    className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-medium rounded-xl shadow-2xs gap-1.5"
                  >
                    <Save className="size-3.5" />
                    {updateMutation.isPending ? "Saving Changes..." : "Save Agency Details"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===============================================================
              TAB 2: ASSISTANT PERSONA
             =============================================================== */}
          <TabsContent value="assistant" className="space-y-6 pt-3">
            <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#087F8C]">
                      <Bot className="size-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        WhatsApp Assistant Personality
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        Define how your AI assistant introduces itself and speaks with WhatsApp policyholders.
                      </CardDescription>
                    </div>
                  </div>
                  <Link to="/agent">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 rounded-xl">
                      <span>Open Advanced Studio</span>
                      <ExternalLink className="size-3 text-slate-400" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Assistant Display Name
                    </Label>
                    <Input
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Enter assistant display name"
                      className="text-xs bg-white border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Primary Language
                    </Label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#087F8C]"
                    >
                      <option value="">Select language...</option>
                      <option value="Bilingual (Hinglish & English)">Bilingual (Hinglish & English)</option>
                      <option value="English (India)">English (Indian Formal)</option>
                      <option value="Hindi (हिन्दी)">Hindi (शुद्ध हिन्दी)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700 block">
                    Communication Tone & Demeanor
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { title: "Professional & Empathetic", desc: "Warm, reassuring, clear" },
                      { title: "Friendly Advisor", desc: "Approachable, conversational" },
                      { title: "Concise & Direct", desc: "Bullet points, quick answers" },
                      { title: "Strict Compliance", desc: "Formal, regulatory focus" },
                    ].map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => setTone(item.title)}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          tone === item.title
                            ? "border-[#087F8C] bg-teal-50/60 text-[#087F8C] shadow-2xs"
                            : "border-slate-200 bg-slate-50/60 text-slate-600 hover:border-slate-300 hover:bg-slate-100/60"
                        }`}
                      >
                        <span className="block text-xs font-bold">{item.title}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">
                      Initial Greeting Message
                    </Label>
                    <span className="text-[11px] text-slate-400">
                      Sent when a customer initiates a new conversation
                    </span>
                  </div>
                  <Textarea
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                    rows={3}
                    className="text-xs bg-white border-slate-200 rounded-xl leading-relaxed"
                    placeholder="Enter initial greeting message for customers..."
                  />
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                    <span>Available variables:</span>
                    <button
                      type="button"
                      onClick={() => setGreeting((prev) => `${prev} {{customer_name}}`)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                    >
                      + {"{{customer_name}}"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGreeting((prev) => `${prev} {{company_name}}`)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                    >
                      + {"{{company_name}}"}
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    For full prompt instructions and guardrail testing, visit the Agent Studio.
                  </span>
                  <Button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-medium rounded-xl shadow-2xs gap-1.5"
                  >
                    <Save className="size-3.5" />
                    Save Personality Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===============================================================
              TAB 3: STAFF & GOVERNANCE
             =============================================================== */}
          <TabsContent value="security" className="space-y-6 pt-3">
            <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                      <ShieldCheck className="size-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Staff Identity & Security Controls
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        Authenticated credentials and active guardrails protecting your organization.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs gap-1 font-semibold">
                    <CheckCircle2 className="size-3.5" /> Isolated Tenant
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-1">
                    <span className="text-slate-400 font-medium block text-[11px]">Authenticated Staff Member</span>
                    <p className="text-slate-900 font-bold text-sm">
                      {user?.fullName || "Staff Adjuster"}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      {user?.primaryEmailAddress?.emailAddress || "adjuster@insurcall.ai"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-1">
                    <span className="text-slate-400 font-medium block text-[11px]">Database Tenant Access</span>
                    <p className="text-slate-900 font-bold text-sm">
                      {tenant?.name || "Verified Organization"}
                    </p>
                    <p className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Strict Tenant Data Isolation Enforced
                    </p>
                  </div>
                </div>

                {/* Safety & Compliance Feature Grid */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Active Production Guardrails
                  </h4>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span className="font-semibold text-xs text-slate-800">Dual-Control Approvals</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-6">
                        Policy cancellations, nominee modifications, and claims payouts require human sign-off in the Approvals queue.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span className="font-semibold text-xs text-slate-800">Opt-Out & Privacy Enforcement</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-6">
                        Customer STOP and UNSUBSCRIBE messages immediately pause automated replies under DPDP and Meta policies.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span className="font-semibold text-xs text-slate-800">Grounded Source Traceability</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-6">
                        The assistant cites only approved insurance policy clauses. Unverified coverage inquiries are escalated.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span className="font-semibold text-xs text-slate-800">Cryptographic Webhook Signatures</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-6">
                        Incoming messages are verified with HMAC-SHA256 signatures to ensure authenticity before persistence.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs text-slate-400">
                    Staff memberships are synced with Clerk identity.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    className="gap-2 text-xs border-slate-200 rounded-xl font-medium"
                  >
                    <RefreshCw className={`size-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                    {syncMutation.isPending ? "Syncing..." : "Re-sync Staff Profile"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===============================================================
              TAB 4: PLAN & ALLOWANCE
             =============================================================== */}
          <TabsContent value="billing" className="space-y-6 pt-3">
            {/* Usage Summary Card */}
            <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-teal-50 text-[#087F8C] border-teal-200 text-xs font-semibold capitalize">
                        {currentPlan} Plan
                      </Badge>
                      <span className="text-xs text-slate-500 font-medium">Active Workspace</span>
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900 mt-1">
                      WhatsApp Messaging & Knowledge Capacity
                    </CardTitle>
                  </div>
                  <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                    Unlimited Testing Tier
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-1">
                  InsurCall is configured for live WhatsApp Multi-Device synchronization and pgvector retrieval grounding.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-1">
                    <span className="text-slate-400 font-medium text-[11px] block">WhatsApp Sockets</span>
                    <span className="text-sm font-bold text-slate-900 block">1 Active Multi-Device</span>
                    <span className="text-[10px] text-slate-500">Live on port 2785</span>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-1">
                    <span className="text-slate-400 font-medium text-[11px] block">Retrieval Pipeline</span>
                    <span className="text-sm font-bold text-slate-900 block">Encrypted Vector Index</span>
                    <span className="text-[10px] text-emerald-700 font-medium">1536-dim embeddings</span>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-1">
                    <span className="text-slate-400 font-medium text-[11px] block">Outbound Hard-Block</span>
                    <span className="text-sm font-bold text-slate-900 block">Enabled (Safe Mode)</span>
                    <span className="text-[10px] text-slate-500">Zero accidental replies</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan Tier Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Starter */}
              <div
                className={`rounded-2xl border-2 p-5 flex flex-col justify-between shadow-2xs transition-all ${
                  currentPlan === "starter"
                    ? "border-[#087F8C] bg-teal-50/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Starter Tier</h3>
                    {currentPlan === "starter" && (
                      <Badge className="bg-[#087F8C] text-white text-[10px] font-semibold">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">₹0</span>
                    <span className="text-xs text-slate-500">/ month</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    For testing WhatsApp connectivity and grounded Q&A with your team.
                  </p>
                  <ul className="space-y-2 pt-2 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-[#087F8C] shrink-0" /> WhatsApp Multi-Device session
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-[#087F8C] shrink-0" /> Grounded vector retrieval
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-[#087F8C] shrink-0" /> Human approval queue
                    </li>
                  </ul>
                </div>

                <div className="pt-5">
                  <Button
                    variant={currentPlan === "starter" ? "outline" : "default"}
                    size="sm"
                    className="w-full text-xs font-medium rounded-xl"
                    disabled={currentPlan === "starter" || planMutation.isPending}
                    onClick={() => planMutation.mutate("starter")}
                  >
                    {currentPlan === "starter" ? "Current Tier" : "Select Starter"}
                  </Button>
                </div>
              </div>

              {/* Growth */}
              <div
                className={`rounded-2xl border-2 p-5 flex flex-col justify-between shadow-2xs transition-all ${
                  currentPlan === "growth"
                    ? "border-[#087F8C] bg-teal-50/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Growth Tier</h3>
                    {currentPlan === "growth" ? (
                      <Badge className="bg-[#087F8C] text-white text-[10px] font-semibold">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-[#087F8C] border-teal-200 bg-teal-50 font-semibold">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">₹2,499</span>
                    <span className="text-xs text-slate-500">/ month</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    For established agencies needing full policy automation and contact sync.
                  </p>
                  <ul className="space-y-2 pt-2 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" /> High-volume conversation sync
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" /> Policy document PDF ingestion
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" /> Multi-staff human takeover
                    </li>
                  </ul>
                </div>

                <div className="pt-5">
                  <Button
                    variant={currentPlan === "growth" ? "outline" : "default"}
                    size="sm"
                    className="w-full text-xs font-medium bg-[#087F8C] hover:bg-[#076C77] text-white rounded-xl shadow-2xs"
                    disabled={currentPlan === "growth" || planMutation.isPending}
                    onClick={() => planMutation.mutate("growth")}
                  >
                    {currentPlan === "growth" ? "Current Tier" : "Select Growth"}
                  </Button>
                </div>
              </div>

              {/* Enterprise */}
              <div
                className={`rounded-2xl border-2 p-5 flex flex-col justify-between shadow-2xs transition-all ${
                  currentPlan === "enterprise" || currentPlan === "business"
                    ? "border-[#087F8C] bg-teal-50/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Enterprise</h3>
                    {currentPlan === "enterprise" || currentPlan === "business" ? (
                      <Badge className="bg-[#087F8C] text-white text-[10px] font-semibold">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200 font-semibold">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">Custom</span>
                    <span className="text-xs text-slate-500">SLA & Scale</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    For multi-branch brokerages and insurers requiring dedicated API access.
                  </p>
                  <ul className="space-y-2 pt-2 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" /> Meta Official Cloud API adapter
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" /> Custom core-system integrations
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" /> Dedicated SLA & compliance support
                    </li>
                  </ul>
                </div>

                <div className="pt-5">
                  <Button
                    variant={currentPlan === "enterprise" || currentPlan === "business" ? "outline" : "default"}
                    size="sm"
                    className="w-full text-xs font-medium rounded-xl"
                    disabled={currentPlan === "enterprise" || currentPlan === "business" || planMutation.isPending}
                    onClick={() => planMutation.mutate("enterprise")}
                  >
                    {currentPlan === "enterprise" || currentPlan === "business" ? "Current Tier" : "Select Enterprise"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ===============================================================
              TAB 5: SYSTEM DIAGNOSTICS (Restricted Technical Infrastructure)
             =============================================================== */}
          <TabsContent value="diagnostics" className="space-y-6 pt-3">
            <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#087F8C]">
                    <Activity className="size-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Infrastructure Diagnostics & Integration Health
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Truthful runtime checks for databases, WebRTC voice servers, WhatsApp gateway, and RAG retrieval pipelines.
                    </CardDescription>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchDiag()}
                  disabled={isDiagLoading || isDiagRefetching}
                  className="text-xs h-8 rounded-xl border-slate-200 font-medium gap-1.5 shrink-0"
                >
                  <RefreshCw className={`size-3.5 ${isDiagLoading || isDiagRefetching ? "animate-spin" : ""}`} />
                  Run Diagnostics Probe
                </Button>
              </CardHeader>

              <CardContent className="pt-5 space-y-4">
                {isDiagLoading && !diagnostics ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                    <RefreshCw className="size-5 animate-spin mx-auto text-[#087F8C]" />
                    <p>Probing platform components and services...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(diagnostics?.items ?? []).map((item) => {
                      const statusBadge =
                        item.status === "connected" ? (
                          <Badge variant="outline" className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border-emerald-200 rounded-full">
                            Connected
                          </Badge>
                        ) : item.status === "degraded" ? (
                          <Badge variant="outline" className="text-[10px] font-semibold text-amber-800 bg-amber-50 border-amber-200 rounded-full">
                            Degraded
                          </Badge>
                        ) : item.status === "unavailable" ? (
                          <Badge variant="outline" className="text-[10px] font-semibold text-rose-800 bg-rose-50 border-rose-200 rounded-full">
                            Unavailable
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 bg-slate-100 border-slate-200 rounded-full">
                            Not Configured
                          </Badge>
                        );

                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-100 bg-[#FAF9F6] p-4 text-xs space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500 font-semibold">
                                {item.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.latencyMs !== undefined && (
                                <span className="font-mono text-[10px] text-slate-400">
                                  {item.latencyMs}ms
                                </span>
                              )}
                              {statusBadge}
                            </div>
                          </div>

                          <p className="text-slate-700 text-xs leading-relaxed">
                            {item.summary}
                          </p>

                          {item.details && Object.keys(item.details).length > 0 && (
                            <div className="rounded-xl border border-slate-200/70 bg-white p-2.5 text-[11px] font-mono space-y-1 text-slate-600">
                              {Object.entries(item.details).map(([k, v]) => (
                                <div key={k} className="flex items-center justify-between py-0.5 border-b border-slate-50 last:border-0">
                                  <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>
                                  <span className="font-semibold text-slate-800 truncate max-w-xs">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400 font-mono">
                            <span>Diagnostic ID: {item.id}</span>
                            <span>Checked: {new Date(item.lastCheckedAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===============================================================
              TAB: WHATSAPP BUSINESS CALLING CHANNELS
             =============================================================== */}
          <TabsContent value="calling" className="space-y-6 pt-3">
            <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                      <Headphones className="size-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        WhatsApp Business Voice Calling
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Official Meta WhatsApp Cloud API and Autonomous Voice Telephony configuration
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={waCallingStatus?.connection?.status === "CONNECTED" ? "default" : "secondary"}
                    className={waCallingStatus?.connection?.status === "CONNECTED" ? "bg-emerald-600 text-white" : ""}
                  >
                    {waCallingStatus?.connection?.status || "NOT_CONFIGURED"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Meta Configuration Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">WhatsApp Business Phone Number ID</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={waCallingStatus?.connection?.meta_phone_number_id || process.env["WHATSAPP_BUSINESS_PHONE_NUMBER_ID"] || "Not configured"}
                        className="font-mono text-xs bg-slate-50 border-slate-200"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      From Meta Developer Console &rarr; WhatsApp &rarr; API Setup.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Cloud Voice Telephony Project</Label>
                    <Input
                      readOnly
                      value={waCallingStatus?.validation?.details?.livekitUrlHost || "Configured via Telephony Settings"}
                      className="font-mono text-xs bg-slate-50 border-slate-200"
                    />
                    <p className="text-[11px] text-slate-500">
                      Autonomous voice network with native messaging bridge.
                    </p>
                  </div>
                </div>

                {/* Features & Controls */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Channel Permissions & Inbound Reception
                  </h4>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Inbound Call Reception</p>
                      <p className="text-[11px] text-slate-500">
                        Allow customers to initiate two-way voice calls to your business number on WhatsApp.
                      </p>
                    </div>
                    <Switch
                      checked={waCallingStatus?.inboundEnabled}
                      onCheckedChange={(checked) =>
                        updateCallingSettingsMutation.mutate({
                          callingEnabled: true,
                          inboundCallingEnabled: checked,
                        })
                      }
                      disabled={updateCallingSettingsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">Outbound Staff Dialing</p>
                        {waCallingStatus?.testMode && (
                          <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                            Restricted to Test Allowlist
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Allow authorized staff to initiate outbound voice calls to verified policyholders.
                      </p>
                    </div>
                    <Switch
                      checked={waCallingStatus?.outboundEnabled}
                      onCheckedChange={(checked) =>
                        updateCallingSettingsMutation.mutate({
                          callingEnabled: true,
                          outboundCallingEnabled: checked,
                        })
                      }
                      disabled={updateCallingSettingsMutation.isPending}
                    />
                  </div>
                </div>

                {/* Public Webhook Callback URL */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Public Meta Webhook Callback URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={waCallingStatus?.webhookUrl || "https://app.insurcall.ai/api/webhooks/meta-whatsapp"}
                      className="font-mono text-xs bg-slate-50 border-slate-200"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(waCallingStatus?.webhookUrl || "");
                        toast.success("Copied webhook URL");
                      }}
                    >
                      <Copy className="size-3.5 mr-1" />
                      Copy URL
                    </Button>
                  </div>
                </div>

                {/* Missing Configuration Notice if applicable */}
                {waCallingStatus?.validation?.missingVariables && waCallingStatus.validation.missingVariables.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <AlertTriangle className="size-4 text-amber-600" />
                      <span>Pending Environment Settings</span>
                    </div>
                    <p className="text-[11px] text-amber-800 mb-2">
                      The following environment variable names must be populated on the server for full calling operation:
                    </p>
                    <ul className="list-disc pl-5 font-mono text-[10px] space-y-0.5">
                      {waCallingStatus.validation.missingVariables.map((v: string) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Links to Calling Onboarding and Call History */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link to="/phone">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5 text-primary">
                      <Headphones className="size-3.5" />
                      Open WhatsApp Calling Dashboard
                    </Button>
                  </Link>

                  <Link to="/calls">
                    <Button size="sm" className="bg-[#087F8C] hover:bg-[#076d78] text-white text-xs gap-1.5">
                      <PhoneCall className="size-3.5" />
                      View Call Registry
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
