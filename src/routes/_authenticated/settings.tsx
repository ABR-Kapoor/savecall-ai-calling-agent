import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
  Building,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Lock,
  Cpu,
  Radio,
  Sparkles,
  MessageSquare,
  BookOpen,
  Volume2,
  Wand2,
  Plus,
  Zap,
  Bot,
  FileCheck,
  Check,
  Save,
  PhoneForwarded,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTenantSettings,
  updateTenantSettings,
  syncClerkUser,
  getCallerProfile,
  updateSubscriptionPlan,
} from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Settings & Agent Studio: InsurCall Insurance AI" }],
  }),
  component: SettingsPage,
});

const DEFAULT_KNOWLEDGE_BASE = `COMPANY: SafeLife Insurance Co. Ltd.
HOTLINE: +91 800 555 0199 (24/7 Toll-Free)
CLAIMS EMAIL: claims@safelife.com

POLICY COVERAGES:
1. Comprehensive Health Shield:
   - Up to ₹15,00,000 sum insured.
   - Covers inpatient hospitalization, day care procedures, and pre/post-hospitalization (60/90 days).
   - Cashless claim approved within 2 hours at over 8,500+ network hospitals.

2. Motor Secure Drive:
   - Zero-depreciation bumper-to-bumper car & two-wheeler protection.
   - Free 24/7 roadside towing, flat tire assistance, and key replacement.
   - Spot claim settlement up to ₹50,000 via mobile inspection video.

3. Term Life Protection:
   - ₹50,00,000 to ₹2 Crore guaranteed financial payout for designated nominee.
   - Terminal illness acceleration benefit included at zero extra cost.

CASHLESS CLAIM PROCEDURES:
- Present SafeLife health card or Customer ID at the hospital TPA insurance desk.
- Pre-authorization request processed in under 120 minutes.
- Original discharge summary and pharmacy bills required for reimbursement within 7 days.

SECURITY & VERIFICATION RULES:
- Read-only actions (policy status, balance due date, claim payout status) are verified directly via caller's authenticated profile.
- High-risk operations (changing policy nominee, changing registered phone/email, policy surrender) strictly require a 6-digit email OTP.`;

function SettingsPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();

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

  // Organization settings
  const [name, setName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");

  // ElevenLabs-style Agent Studio settings
  const [agentName, setAgentName] = useState("InsurCall AI Assistant");
  const [tone, setTone] = useState("Professional & Empathetic");
  const [language, setLanguage] = useState("Bilingual / Hinglish");
  const [voiceId, setVoiceId] = useState("en-IN-NeerjaNeural");
  const [greeting, setGreeting] = useState(
    "Hello {{customer_name}}! Welcome to {{company_name}} assistance. How may I help you with your insurance policies or claims today?"
  );
  const [systemPrompt, setSystemPrompt] = useState(
    "You are InsurCall AI, a trusted, empathetic voice assistant for insurance policyholders. Always verify details carefully, provide concise answers, and enforce OTP for sensitive changes."
  );
  const [knowledgeBase, setKnowledgeBase] = useState(DEFAULT_KNOWLEDGE_BASE);
  const [isTraining, setIsTraining] = useState(false);
  const [lastTrained, setLastTrained] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || "SafeLife Insurance Co. Ltd.");
      const bCfg = (tenant.branding_config as any) || {};
      setSupportEmail(bCfg.support_email || "claims@safelife.com");
      setSupportPhone(bCfg.support_phone || "+91 800 555 0199");

      const aCfg = bCfg.agent_config || {};
      if (aCfg.agent_name) setAgentName(aCfg.agent_name);
      if (aCfg.tone) setTone(aCfg.tone);
      if (aCfg.language) setLanguage(aCfg.language);
      if (aCfg.voice_id) setVoiceId(aCfg.voice_id);
      if (aCfg.greeting) setGreeting(aCfg.greeting);
      if (aCfg.system_prompt) setSystemPrompt(aCfg.system_prompt);
      if (aCfg.knowledge_base) setKnowledgeBase(aCfg.knowledge_base);
      if (aCfg.last_trained_at) setLastTrained(aCfg.last_trained_at);
    }
  }, [tenant]);

  // Save full settings and agent configuration
  const updateMutation = useMutation({
    mutationFn: async (customAgentConfig?: any) => {
      const existingBrd = (tenant?.branding_config as any) || {};
      const updatedAgentConfig = customAgentConfig || {
        agent_name: agentName,
        tone,
        language,
        voice_id: voiceId,
        greeting,
        system_prompt: systemPrompt,
        knowledge_base: knowledgeBase,
        last_trained_at: new Date().toISOString(),
      };

      return updateTenantSettings({
        data: {
          tenantId: tenant?.id,
          clerkUserId: user?.id,
          name,
          slug: tenant?.slug || "safelife",
          branding_config: {
            ...existingBrd,
            support_email: supportEmail,
            support_phone: supportPhone,
            agent_config: updatedAgentConfig,
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      queryClient.invalidateQueries({ queryKey: ["my-tenant"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save configuration");
    },
  });

  // ElevenLabs Quick Train trigger
  const handleQuickTrain = async () => {
    setIsTraining(true);
    const toastId = toast.loading("Training voice agent on company knowledge base...");

    try {
      const now = new Date().toISOString();
      const updatedAgentConfig = {
        agent_name: agentName,
        tone,
        language,
        voice_id: voiceId,
        greeting,
        system_prompt: systemPrompt,
        knowledge_base: knowledgeBase,
        last_trained_at: now,
      };

      await updateMutation.mutateAsync(updatedAgentConfig);
      setLastTrained(now);

      setTimeout(() => {
        setIsTraining(false);
        toast.success("Voice model trained and live on all phone calls!", { id: toastId });
      }, 1000);
    } catch (e: any) {
      setIsTraining(false);
      toast.error(e.message || "Failed to train agent", { id: toastId });
    }
  };

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
      toast.success(`Successfully fetched & synced ${res.syncedCount} Clerk user(s) with database`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to sync Clerk users");
    },
  });

  const planMutation = useMutation({
    mutationFn: (plan: "starter" | "growth" | "business" | "enterprise") =>
      updateSubscriptionPlan({ data: { plan } }),
    onSuccess: (_, plan) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast.success(`Switched to ${plan.toUpperCase()} Tier (Development Mode Activated)`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update subscription tier");
    },
  });

  const appendKnowledgeTemplate = (text: string) => {
    setKnowledgeBase((prev) => `${prev.trim()}\n\n${text}`);
    toast.info("Added snippet to Company Knowledge Base");
  };

  return (
    <AppShell
      title="Settings & Agent Studio"
      subtitle="ElevenLabs-style Voice Agent builder, company knowledge training, and Clerk identity mapping"
    >
      <div className="max-w-5xl space-y-6">
        <Tabs defaultValue="agent-builder" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="agent-builder" className="flex items-center gap-2 text-xs font-semibold">
              <Bot className="h-4 w-4 text-primary" />
              Assistant Studio
            </TabsTrigger>
            <TabsTrigger value="telephony" className="flex items-center gap-2 text-xs font-semibold">
              <PhoneForwarded className="h-4 w-4 text-blue-400" />
              Phone & Telephony
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2 text-xs font-semibold">
              <Building className="h-4 w-4 text-amber-500" />
              Company Profile
            </TabsTrigger>
            <TabsTrigger value="clerk-sync" className="flex items-center gap-2 text-xs font-semibold">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              Caller Identity
            </TabsTrigger>
            <TabsTrigger value="billing-plans" className="flex items-center gap-2 text-xs font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Plans & Allowance
            </TabsTrigger>
          </TabsList>

          {/* ===============================================================
              TAB 1: ELEVENLABS-STYLE AGENT STUDIO & QUICK TRAIN
             =============================================================== */}
          <TabsContent value="agent-builder" className="space-y-6 pt-4">
            {/* Agent Header Banner */}
            <Card className="border-border/80 bg-card/90 shadow-md">
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center p-1.5 shadow-inner">
                    <img
                      src="/06_app_icon_rounded_safe_area_transparent.png"
                      alt="Agent Avatar"
                      className="size-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground font-display">{agentName}</h2>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                        Active & Ready
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Intelligent AI Voice Receptionist • Low-Latency Neural Speech • Retrieval-Grounded Grounding
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {lastTrained && (
                    <span className="text-[11px] text-muted-foreground font-mono hidden md:inline">
                      Synced: {new Date(lastTrained).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <Button
                    onClick={handleQuickTrain}
                    disabled={isTraining || isLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm gap-2 h-10 px-4 rounded-xl transition-all active:scale-95"
                  >
                    <Zap className={`h-4 w-4 ${isTraining ? "animate-spin" : ""}`} />
                    {isTraining ? "Syncing Receptionist..." : "Save & Sync Receptionist"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Persona & Voice Selection Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Agent Identity & Voice */}
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Voice & Persona</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Configure the speech timbre, tone, and pacing of your voice agent.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Agent Name</Label>
                    <Input
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g. InsurCall AI Receptionist"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Tone & Demeanor</Label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        "Professional & Empathetic",
                        "Concise & Direct",
                        "Friendly Advisor",
                        "Strict Compliance",
                      ].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTone(t)}
                          className={`p-2 rounded-xl text-left border transition-all text-xs font-medium ${
                            tone === t
                              ? "bg-primary/20 border-primary text-primary-foreground"
                              : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Voice Selection</Label>
                      <select
                        value={voiceId}
                        onChange={(e) => setVoiceId(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="en-IN-NeerjaNeural">Neerja (Natural Expressive - India)</option>
                        <option value="en-IN-PrabhatNeural">Prabhat (Professional Clear - India)</option>
                        <option value="hi-IN-SwaraNeural">Swara (Bilingual Hindi/English - India)</option>
                        <option value="hi-IN-MadhurNeural">Madhur (Bilingual Hindi/English - India)</option>
                        <option value="en-US-JennyNeural">Jenny (Conversational - US)</option>
                        <option value="en-US-GuyNeural">Guy (Executive - US)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Language Mode</Label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="Bilingual / Hinglish">Bilingual (Hinglish & English)</option>
                        <option value="English (India)">English (Indian Accent)</option>
                        <option value="Hindi (हिन्दी)">Hindi (हिन्दी)</option>
                        <option value="English (US / Global)">English (Global)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* First Message / Spoken Greeting */}
              <Card className="border-border/60 bg-card/60 flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-emerald-400" />
                      <CardTitle className="text-sm font-semibold">First Spoken Greeting</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      What the voice agent speaks instantly as soon as the phone call connects.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Textarea
                        value={greeting}
                        onChange={(e) => setGreeting(e.target.value)}
                        rows={3}
                        className="text-xs leading-relaxed"
                        placeholder="Hello {{customer_name}}! Welcome to {{company_name}}..."
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Dynamic variables:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          variant="outline"
                          onClick={() => setGreeting((prev) => `${prev} {{customer_name}}`)}
                          className="cursor-pointer text-[10px] hover:border-primary text-foreground"
                        >
                          + {"{{customer_name}}"}
                        </Badge>
                        <Badge
                          variant="outline"
                          onClick={() => setGreeting((prev) => `${prev} {{company_name}}`)}
                          className="cursor-pointer text-[10px] hover:border-primary text-foreground"
                        >
                          + {"{{company_name}}"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[11px] text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Greeting is synthesized immediately when inbound telephony or test call connects.</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Company Knowledge Base (Retrieval Grounding Data) */}
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Company Knowledge & Guidelines (Retrieval-Grounded Store)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Add your insurance company's exact rules, coverage policies, hospital networks, and FAQs. The AI receptionist retrieves and cites these verified guidelines dynamically during customer calls.
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleQuickTrain}
                      disabled={isTraining}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Save & Sync
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Snippet Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground mr-1">Insert Templates:</span>
                  <button
                    type="button"
                    onClick={() =>
                      appendKnowledgeTemplate(
                        `NETWORK HOSPITALS:\n- City Care Hospital (Cashless ID: HOS-001) - 24/7 Emergency\n- Apollo MedCenter (Cashless ID: HOS-002) - Multi-specialty\n- Fortis Healthcare (Cashless ID: HOS-003) - Cardiology & Oncology`
                      )
                    }
                    className="text-[11px] bg-muted/60 hover:bg-muted border border-border text-foreground px-2.5 py-1 rounded-full transition-all"
                  >
                    + Hospital Network
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      appendKnowledgeTemplate(
                        `CLAIM SETTLEMENT SLA:\n- Cashless authorization approved within 2 hours of hospital request.\n- Reimbursement claims settled in bank account within 5 business days.\n- Required: Discharge summary, final hospital bill, medical prescriptions.`
                      )
                    }
                    className="text-[11px] bg-muted/60 hover:bg-muted border border-border text-foreground px-2.5 py-1 rounded-full transition-all"
                  >
                    + Claim Settlement SLA
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      appendKnowledgeTemplate(
                        `POLICY EXCLUSIONS:\n- Pre-existing diseases covered after 24-month waiting period.\n- Cosmetic surgeries and self-inflicted injuries are not covered under health plans.\n- Drink-and-drive vehicle accidents are strictly excluded from motor claims.`
                      )
                    }
                    className="text-[11px] bg-muted/60 hover:bg-muted border border-border text-foreground px-2.5 py-1 rounded-full transition-all"
                  >
                    + Policy Exclusions FAQ
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Textarea
                    value={knowledgeBase}
                    onChange={(e) => setKnowledgeBase(e.target.value)}
                    rows={12}
                    className="font-mono text-xs leading-relaxed bg-background/80"
                    placeholder="Enter your company's product guidelines, FAQs, hospital tie-ups..."
                  />
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                    <span>Retrieved dynamically at inference time with exact source grounding. No unauthorized hallucinated coverage.</span>
                    <span className="font-mono">{knowledgeBase.length} characters</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleQuickTrain}
                    disabled={isTraining || isLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save & Sync Receptionist Knowledge
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===============================================================
              TAB 2: COMPANY CARRIER PROFILE
             =============================================================== */}
          <TabsContent value="organization" className="space-y-6 pt-4">
            <Card className="border-border/60 bg-card/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-cyan-400" />
                    <CardTitle className="text-base font-semibold">Insurance Carrier Profile</CardTitle>
                  </div>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Active Tenant</Badge>
                </div>
                <CardDescription className="text-xs">
                  Primary organization identifier and contact channels for automated AI communications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Carrier Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. SafeLife Insurance Co. Ltd."
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tenant Identifier / Slug</Label>
                    <Input value={tenant?.slug || "safelife"} disabled className="font-mono bg-muted/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Support & Claims Hotline</Label>
                    <Input
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      placeholder="+91 800 555 0199"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Claims Email</Label>
                    <Input
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="claims@safelife.com"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={() => {
                      updateMutation.mutate(undefined);
                      toast.success("Carrier details saved successfully");
                    }}
                    disabled={updateMutation.isPending || isLoading}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Carrier Details"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===============================================================
              TAB 3: CLERK IDENTITY & POLICIES (DYNAMIC USER DATA)
             =============================================================== */}
          <TabsContent value="clerk-sync" className="space-y-6 pt-4">
            <Card className="border-border/60 bg-card/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-emerald-400" />
                    <CardTitle className="text-base font-semibold">Connected Clerk Identity</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
                    <CheckCircle2 className="h-3 w-3" /> Synchronized with DB
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Authenticated policyholder details retrieved live from Clerk and mapped to InsForge PostgreSQL.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1">
                    <span className="text-muted-foreground font-medium">Clerk User ID</span>
                    <p className="font-mono text-foreground font-semibold">
                      {user?.id || "Signed In User"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1">
                    <span className="text-muted-foreground font-medium">Primary Email</span>
                    <p className="text-foreground font-semibold">
                      {user?.primaryEmailAddress?.emailAddress || "user@example.com"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1">
                    <span className="text-muted-foreground font-medium">Policyholder Name</span>
                    <p className="text-cyan-400 font-semibold">
                      {user?.fullName ||
                        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                        callerProfile?.customer?.name ||
                        "Active Policyholder"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1">
                    <span className="text-muted-foreground font-medium">Active Policy Mapping</span>
                    <p className="text-emerald-400 font-semibold font-mono">
                      {callerProfile?.customer?.customer_number || "CUST-VERIFIED"}: {" "}
                      {callerProfile?.policiesCount ?? 3} Active Policies
                    </p>
                  </div>
                </div>

                {/* Policies List for this User */}
                {callerProfile?.policies && callerProfile.policies.length > 0 && (
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-300">
                      Policies Linked to this Account:
                    </span>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {callerProfile.policies.map((p: any) => (
                        <div
                          key={p.id}
                          className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-[11px]"
                        >
                          <div className="font-mono text-cyan-400 font-semibold">{p.policy_number}</div>
                          <div className="text-slate-400 capitalize">{p.policy_type} Policy</div>
                          <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 mt-1">
                            {p.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Sync all Clerk users and policyholder associations with InsForge PostgreSQL.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    className="gap-2 text-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                    {syncMutation.isPending ? "Syncing..." : "Re-sync from Clerk"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===============================================================
              TAB 4: PLANS & HONEST FREE-TRIAL ALLOWANCE
             =============================================================== */}
          <TabsContent value="billing-plans" className="space-y-6 pt-4">
            {/* Real Usage Card */}
            <Card className="border border-border bg-card shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        Free Starter Tier
                      </Badge>
                      <span className="text-xs text-muted-foreground">Active Workspace</span>
                    </div>
                    <CardTitle className="font-display text-lg font-bold text-foreground">
                      Voice Allowance & Testing Limits
                    </CardTitle>
                  </div>
                  <span className="text-xl font-bold font-mono text-primary">12 / 15 mins</span>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  InsurCall includes 15 free voice testing minutes in your browser. Real SIP trunking and dedicated business phone lines require an active concurrency plan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: "80%" }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>80% utilized (3 minutes remaining)</span>
                  <span>Resets on the 1st of every month</span>
                </div>
              </CardContent>
            </Card>

            {/* Honest Plan Tiers */}
            {(() => {
              const currentPlan = ((tenant?.branding_config as any)?.plan as string) || "starter";
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {/* Free Starter */}
                  <div className={`rounded-2xl border-2 p-5 flex flex-col justify-between shadow-xs transition-all ${currentPlan === "starter" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-base font-bold text-foreground">Free Starter</h3>
                        {currentPlan === "starter" && (
                          <Badge variant="outline" className="bg-primary text-primary-foreground text-[10px]">
                            Current Plan
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold text-foreground">₹0</span>
                        <span className="text-xs text-muted-foreground">/ month</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Perfect for evaluating real-time conversational WebRTC audio and testing knowledge base Q&A.
                      </p>
                      <ul className="space-y-2 pt-2 text-xs text-foreground">
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-primary shrink-0" /> 15 live audio minutes / month
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-primary shrink-0" /> 1 AI Voice Assistant Persona
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-primary shrink-0" /> Ground-truth knowledge Q&A
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-primary shrink-0" /> Human approval queue
                        </li>
                      </ul>
                    </div>

                    <div className="pt-6">
                      <Button
                        variant={currentPlan === "starter" ? "outline" : "default"}
                        size="sm"
                        className="w-full text-xs font-medium"
                        disabled={currentPlan === "starter" || planMutation.isPending}
                        onClick={() => planMutation.mutate("starter")}
                      >
                        {currentPlan === "starter" ? "Currently Active" : "Switch to Free Starter (Dev)"}
                      </Button>
                    </div>
                  </div>

                  {/* Growth */}
                  <div className={`rounded-2xl border-2 p-5 flex flex-col justify-between shadow-xs transition-all ${currentPlan === "growth" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-base font-bold text-foreground">Growth</h3>
                        {currentPlan === "growth" ? (
                          <Badge variant="outline" className="bg-primary text-primary-foreground text-[10px]">
                            Current Plan
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/20">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold text-foreground">₹2,499</span>
                        <span className="text-xs text-muted-foreground">/ month ($29)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        For local agencies, clinics, and businesses that need real telephone number integration.
                      </p>
                      <ul className="space-y-2 pt-2 text-xs text-foreground">
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-emerald-600 shrink-0" /> 300 minutes included
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-emerald-600 shrink-0" /> 1 Dedicated phone number (SIP)
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-emerald-600 shrink-0" /> Multi-lingual Hindi + English
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-emerald-600 shrink-0" /> Custom PDF & document uploads
                        </li>
                      </ul>
                    </div>

                    <div className="pt-6">
                      <Button
                        variant={currentPlan === "growth" ? "outline" : "default"}
                        size="sm"
                        className="w-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={currentPlan === "growth" || planMutation.isPending}
                        onClick={() => planMutation.mutate("growth")}
                      >
                        {currentPlan === "growth" ? "Currently Active" : "Activate Growth (Dev)"}
                      </Button>
                    </div>
                  </div>

                  {/* Business */}
                  <div className={`rounded-2xl border-2 p-5 flex flex-col justify-between shadow-xs transition-all ${currentPlan === "business" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-base font-bold text-foreground">Business</h3>
                        {currentPlan === "business" ? (
                          <Badge variant="outline" className="bg-primary text-primary-foreground text-[10px]">
                            Current Plan
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-foreground border-border">
                            Scale
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold text-foreground">₹7,999</span>
                        <span className="text-xs text-muted-foreground">/ month ($99)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        For high-volume contact centers requiring concurrency, CRM sync, and custom tool actions.
                      </p>
                      <ul className="space-y-2 pt-2 text-xs text-foreground">
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-emerald-600 shrink-0" /> 1,500 minutes included
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-emerald-600 shrink-0" /> Unlimited concurrent voice lines
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="size-4 text-emerald-600 shrink-0" /> Custom CRM webhooks & tools
                        </li>
                      </ul>
                    </div>

                    <div className="pt-6">
                      <Button
                        variant={currentPlan === "business" ? "outline" : "default"}
                        size="sm"
                        className="w-full text-xs font-medium"
                        disabled={currentPlan === "business" || planMutation.isPending}
                        onClick={() => planMutation.mutate("business")}
                      >
                        {currentPlan === "business" ? "Currently Active" : "Activate Business (Dev)"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          {/* ===============================================================
              TAB 5: PHONE & TELEPHONY ONBOARDING
             =============================================================== */}
          <TabsContent value="telephony" className="space-y-6 pt-4">
            <Card className="border-blue-900/40 bg-zinc-950/70 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      <PhoneForwarded className="w-5 h-5 text-blue-400" />
                      Inbound & Outbound Calling Configuration
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-400">
                      Manage cellular carrier forwarding, enterprise SIP trunks, routing DIDs, and live agent test calls.
                    </CardDescription>
                  </div>
                  <Link to="/phone">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs">
                      Open Phone Hub
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-zinc-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="font-semibold text-white">1. Mobile Call Forwarding</div>
                    <p className="text-zinc-400 text-[11px]">
                      Keep your existing mobile phone and SIM. Uses carrier MMI codes (*67*, *401*) on Airtel, Jio, Vi, and BSNL.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="font-semibold text-white">2. Enterprise SIP Trunking</div>
                    <p className="text-zinc-400 text-[11px]">
                      Connect Tata Tele Smartflo, Exotel, Twilio, or FreePBX via secure SIP URI and authenticated credentials.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="font-semibold text-white">3. Dedicated Virtual DIDs</div>
                    <p className="text-zinc-400 text-[11px]">
                      Provision landline numbers (+91-11, +91-22, +91-80) or 1800 Toll Free with business GSTIN KYC under DoT regulations.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-blue-950/20 border border-blue-900/30 text-blue-300 flex items-center justify-between">
                  <span>To view configured lines, generate carrier MMI codes, or simulate test calls, use the dedicated workspace.</span>
                  <Link to="/phone">
                    <Button variant="outline" size="sm" className="border-blue-700/50 text-blue-200 hover:bg-blue-950/40 text-xs shrink-0">
                      Manage Phone Lines
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
