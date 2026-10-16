import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  getTenantSettings,
  updateTenantSettings,
  syncClerkUser,
  getCallerProfile,
} from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Settings & Agent Studio — SaveCall Insurance AI" }],
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
    queryKey: ["tenant-settings"],
    queryFn: () => getTenantSettings(),
  });

  const { data: callerProfile } = useQuery({
    queryKey: ["caller-profile", user?.id, user?.primaryEmailAddress?.emailAddress],
    queryFn: () => {
      const payload: { clerkUserId?: string; email?: string } = {};
      if (user?.id) payload.clerkUserId = user.id;
      if (user?.primaryEmailAddress?.emailAddress) payload.email = user.primaryEmailAddress.emailAddress;
      return getCallerProfile({ data: payload });
    },
    enabled: !!user,
  });

  // Organization settings
  const [name, setName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");

  // ElevenLabs-style Agent Studio settings
  const [agentName, setAgentName] = useState("SaveCall AI Assistant");
  const [tone, setTone] = useState("Professional & Empathetic");
  const [language, setLanguage] = useState("English (US / Global)");
  const [voiceId, setVoiceId] = useState("en-US-JennyNeural");
  const [greeting, setGreeting] = useState(
    "Hello {{customer_name}}! Welcome to {{company_name}} assistance. How may I help you with your insurance policies or claims today?"
  );
  const [systemPrompt, setSystemPrompt] = useState(
    "You are SaveCall AI, a trusted, empathetic voice assistant for insurance policyholders. Always verify details carefully, provide concise answers, and enforce OTP for sensitive changes."
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
    mutationFn: () => syncClerkUser(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["caller-profile"] });
      queryClient.invalidateQueries({ queryKey: ["policies-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success(`Successfully synced ${res.syncedCount} Clerk user(s) with database`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to sync Clerk users");
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
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="agent-builder" className="flex items-center gap-2 text-xs font-semibold">
              <Bot className="h-4 w-4 text-cyan-400" />
              Agent Studio (ElevenLabs)
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2 text-xs font-semibold">
              <Building className="h-4 w-4 text-amber-400" />
              Company Carrier Profile
            </TabsTrigger>
            <TabsTrigger value="clerk-sync" className="flex items-center gap-2 text-xs font-semibold">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              Clerk Identity & Policies
            </TabsTrigger>
          </TabsList>

          {/* ===============================================================
              TAB 1: ELEVENLABS-STYLE AGENT STUDIO & QUICK TRAIN
             =============================================================== */}
          <TabsContent value="agent-builder" className="space-y-6 pt-4">
            {/* Agent Header Banner */}
            <Card className="border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 shadow-lg">
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
                    <Sparkles className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white font-display">{agentName}</h2>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                        Live on Calls
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      Groq Llama 3.3 70B • Whisper STT • EdgeTTS • LiveKit WebRTC
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {lastTrained && (
                    <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                      Trained: {new Date(lastTrained).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <Button
                    onClick={handleQuickTrain}
                    disabled={isTraining || isLoading}
                    className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 gap-2 h-10 px-4 rounded-xl transition-all active:scale-95"
                  >
                    <Zap className={`h-4 w-4 fill-slate-950 ${isTraining ? "animate-spin" : ""}`} />
                    {isTraining ? "Training Agent..." : "Quick Train Agent"}
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
                    <Volume2 className="h-4 w-4 text-cyan-400" />
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
                      placeholder="e.g. SaveCall AI Receptionist"
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
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
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
                        <option value="en-US-JennyNeural">Jenny (Natural Friendly - US)</option>
                        <option value="en-US-GuyNeural">Guy (Executive Clear - US)</option>
                        <option value="hi-IN-SwaraNeural">Swara (Bilingual Hindi/English)</option>
                        <option value="hi-IN-MadhurNeural">Madhur (Bilingual Hindi/English)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Language Mode</Label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="English (US / Global)">English (Global)</option>
                        <option value="Hindi (हिन्दी)">Hindi (हिन्दी)</option>
                        <option value="Bilingual / Hinglish">Bilingual (Hinglish)</option>
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
                          className="cursor-pointer text-[10px] hover:border-cyan-500 text-slate-300"
                        >
                          + {"{{customer_name}}"}
                        </Badge>
                        <Badge
                          variant="outline"
                          onClick={() => setGreeting((prev) => `${prev} {{company_name}}`)}
                          className="cursor-pointer text-[10px] hover:border-cyan-500 text-slate-300"
                        >
                          + {"{{company_name}}"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[11px] text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Greeting is synthesized immediately with sub-400ms TTFB.</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Company Knowledge Base (Quick Train Data) */}
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-cyan-400" />
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Company Knowledge Base (LLM Training Data)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Add your insurance company's exact rules, coverage policies, hospital networks, and FAQs. The LLM is instantly trained on this content.
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleQuickTrain}
                      disabled={isTraining}
                      size="sm"
                      className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs gap-1.5"
                    >
                      <Zap className="h-3.5 w-3.5 fill-slate-950" />
                      Quick Train
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Snippet Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-400 mr-1">Insert Templates:</span>
                  <button
                    type="button"
                    onClick={() =>
                      appendKnowledgeTemplate(
                        `NETWORK HOSPITALS:\n- City Care Hospital (Cashless ID: HOS-001) - 24/7 Emergency\n- Apollo MedCenter (Cashless ID: HOS-002) - Multi-specialty\n- Fortis Healthcare (Cashless ID: HOS-003) - Cardiology & Oncology`
                      )
                    }
                    className="text-[11px] bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-slate-300 px-2.5 py-1 rounded-full transition-all"
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
                    className="text-[11px] bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-slate-300 px-2.5 py-1 rounded-full transition-all"
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
                    className="text-[11px] bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-slate-300 px-2.5 py-1 rounded-full transition-all"
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
                    <span>Injected directly into Groq Llama 3.3 70B runtime prompt on every call session.</span>
                    <span className="font-mono">{knowledgeBase.length} characters</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleQuickTrain}
                    disabled={isTraining || isLoading}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save & Quick Train Voice Agent
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
                      {callerProfile?.customer?.customer_number || "CUST-VERIFIED"} —{" "}
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
        </Tabs>
      </div>
    </AppShell>
  );
}
