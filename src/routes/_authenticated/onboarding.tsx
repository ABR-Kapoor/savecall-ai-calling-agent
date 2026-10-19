import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Mic,
  Volume2,
  FileText,
  Clock,
  ArrowRight,
  Check,
  AlertCircle,
  HelpCircle,
  PhoneCall,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getTenantSettings, updateTenantSettings } from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [{ title: "Guided Setup — SaveCall AI Voice Employee" }],
  }),
  component: OnboardingPage,
});

interface OnboardingData {
  step: number;
  workspaceMode: "insurance" | "general";
  organizationName: string;
  industry: string;
  plan: "starter" | "growth" | "business" | "enterprise";
  referralSource: string;
  referralOther: string;
  consentTerms: boolean;
  consentMarketing: boolean;
  consentTimestamp: string | null;
  agentName: string;
  agentLanguage: string;
  agentTone: string;
  agentGreeting: string;
  businessKnowledge: string;
}

const DEFAULT_ONBOARDING: OnboardingData = {
  step: 0,
  workspaceMode: "insurance",
  organizationName: "",
  industry: "Healthcare & Insurance",
  plan: "starter",
  referralSource: "Search / Google",
  referralOther: "",
  consentTerms: false,
  consentMarketing: false,
  consentTimestamp: null,
  agentName: "Anya",
  agentLanguage: "Hinglish (Conversational Bilingual)",
  agentTone: "Warm & Professional",
  agentGreeting: "Hello! Thank you for calling our office. I am Anya, your AI receptionist. How can I assist you with your policy, coverage, or claim inquiry today?",
  businessKnowledge: "We provide comprehensive customer support, policy details, claims filing, and general assistance. Operating hours: Monday-Saturday 9 AM - 8 PM IST.",
};

const STEPS = [
  { id: 0, title: "Welcome" },
  { id: 1, title: "Workspace Mode" },
  { id: 2, title: "Organization" },
  { id: 3, title: "Subscription Plan" },
  { id: 4, title: "Consent" },
  { id: 5, title: "AI Persona" },
  { id: 6, title: "Knowledge" },
  { id: 7, title: "Test Call" },
  { id: 8, title: "Launch" },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-settings"],
    queryFn: () => getTenantSettings(),
  });

  const [data, setData] = useState<OnboardingData>(DEFAULT_ONBOARDING);
  const [saveStatus, setSaveStatus] = useState<string>("");

  // Sync initial state from server branding_config if available
  useEffect(() => {
    if (tenant && tenant.branding_config) {
      const cfg = tenant.branding_config as any;
      setData((prev) => ({
        ...prev,
        step: typeof cfg.onboarding_step === "number" ? cfg.onboarding_step : prev.step,
        workspaceMode: cfg.workspace_mode || prev.workspaceMode,
        organizationName: tenant.name || cfg.organization_name || prev.organizationName,
        industry: cfg.industry || prev.industry,
        plan: cfg.plan || prev.plan,
        referralSource: cfg.referral_source || prev.referralSource,
        referralOther: cfg.referral_other || prev.referralOther,
        consentTerms: Boolean(cfg.consent_terms),
        consentMarketing: Boolean(cfg.consent_marketing),
        consentTimestamp: cfg.consent_timestamp || prev.consentTimestamp,
        agentName: cfg.agent_config?.name || prev.agentName,
        agentLanguage: cfg.agent_config?.language || prev.agentLanguage,
        agentTone: cfg.agent_config?.tone || prev.agentTone,
        agentGreeting: cfg.agent_config?.greeting || prev.agentGreeting,
        businessKnowledge: cfg.business_knowledge || prev.businessKnowledge,
      }));
    }
  }, [tenant]);

  // Save changes to backend
  const saveMutation = useMutation({
    mutationFn: async (updated: OnboardingData) => {
      const existingBrd = (tenant?.branding_config as any) || {};
      const payload = {
        name: updated.organizationName || tenant?.name || "Company Workspace",
        slug: tenant?.slug || (updated.organizationName ? updated.organizationName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/(^-|-$)/g, "") : "company-workspace"),
        branding_config: {
          ...existingBrd,
          onboarding_step: updated.step,
          onboarding_completed: updated.step >= 8,
          workspace_mode: updated.workspaceMode,
          industry: updated.industry,
          plan: updated.plan || existingBrd.plan || "starter",
          referral_source: updated.referralSource,
          referral_other: updated.referralOther,
          consent_terms: updated.consentTerms,
          consent_marketing: updated.consentMarketing,
          consent_timestamp: updated.consentTimestamp,
          business_knowledge: updated.businessKnowledge,
          agent_config: {
            name: updated.agentName,
            language: updated.agentLanguage,
            tone: updated.agentTone,
            greeting: updated.agentGreeting,
            role: updated.workspaceMode === "insurance" ? "Insurance Claims & Policy Specialist" : "Universal Front Desk Receptionist",
          },
        },
      };
      return updateTenantSettings({ data: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(""), 2000);
    },
    onError: (err) => {
      console.error("Save error:", err);
      setSaveStatus("Failed to save");
    },
  });

  const updateField = <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      return next;
    });
  };

  const goToStep = (stepNumber: number) => {
    const nextData = { ...data, step: stepNumber };
    setData(nextData);
    saveMutation.mutate(nextData);
  };

  const nextStep = () => {
    if (data.step < STEPS.length - 1) {
      goToStep(data.step + 1);
    }
  };

  const prevStep = () => {
    if (data.step > 0) {
      goToStep(data.step - 1);
    }
  };

  const handleConsentTerms = (checked: boolean) => {
    setData((prev) => ({
      ...prev,
      consentTerms: checked,
      consentTimestamp: checked ? new Date().toISOString() : null,
    }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col justify-between p-4 md:p-8">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <img
            src="/02_logo_with_InsurCall_light_transparent.png"
            alt="InsurCall"
            className="h-8 w-auto object-contain transition-transform group-hover:scale-[1.02]"
          />
          <span className="text-[11px] text-muted-foreground font-medium border-l border-border pl-2.5">
            Setup Assistant
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs text-muted-foreground animate-fade-in">{saveStatus}</span>
          )}
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              Exit to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto w-full flex-1 py-8 flex flex-col justify-center">
        {/* Progress Dots / Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>Step {data.step + 1} of {STEPS.length}: {STEPS[data.step]?.title}</span>
            <span>{Math.round(((data.step) / (STEPS.length - 1)) * 100)}% Completed</span>
          </div>
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${((data.step) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 0: Welcome Reveal */}
        {data.step === 0 && (
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader className="text-center pb-4 pt-8">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-8 animate-pulse" />
              </div>
              <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
                Welcome to SaveCall
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                Deploy an enterprise AI voice receptionist that answers customer calls, verifies policies, takes claims, and transfers when needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2 pb-8 max-w-md mx-auto">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 text-sm">
                  <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-foreground">Multi-lingual Voice Calling:</strong>
                    <p className="text-xs text-muted-foreground mt-0.5">Fluent natural conversations in English, Hindi, and Hinglish.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 text-sm">
                  <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-foreground">Zero Hallucinations with RAG:</strong>
                    <p className="text-xs text-muted-foreground mt-0.5">Answers caller queries strictly using approved company knowledge.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 text-sm">
                  <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-foreground">Choose Any Subscription Tier:</strong>
                    <p className="text-xs text-muted-foreground mt-0.5">In development, select any tier (Starter, Growth, Business, Enterprise) with instant activation.</p>
                  </div>
                </div>
              </div>

              <Button onClick={nextStep} className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                Get Started <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 1: Choose Workspace Mode */}
        {data.step === 1 && (
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader>
              <CardTitle className="font-display text-xl font-bold text-foreground">
                Choose your workspace mode
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                SaveCall adapts its conversation workflows, schemas, and tools to your industry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onClick={() => updateField("workspaceMode", "insurance")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  data.workspaceMode === "insurance"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border hover:border-muted-foreground/40 bg-card"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">Insurance Agency / Brokerage</h4>
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          Recommended
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pre-loaded with health insurance knowledge, cashless hospital inquiries, policy verification, claims intake, and approval queue.
                      </p>
                    </div>
                  </div>
                  <div className={`size-5 rounded-full border flex items-center justify-center shrink-0 ${data.workspaceMode === "insurance" ? "border-primary bg-primary text-white" : "border-border"}`}>
                    {data.workspaceMode === "insurance" && <Check className="size-3" />}
                  </div>
                </div>
              </div>

              <div
                onClick={() => updateField("workspaceMode", "general")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  data.workspaceMode === "general"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border hover:border-muted-foreground/40 bg-card"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-muted text-foreground">
                      <Briefcase className="size-5" />
                    </span>
                    <div>
                      <h4 className="font-semibold text-foreground">Universal Service Business</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        For clinics, salons, law offices, and service centers. Handles hours, appointments, service FAQs, and caller dispatch.
                      </p>
                    </div>
                  </div>
                  <div className={`size-5 rounded-full border flex items-center justify-center shrink-0 ${data.workspaceMode === "general" ? "border-primary bg-primary text-white" : "border-border"}`}>
                    {data.workspaceMode === "general" && <Check className="size-3" />}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                <Button variant="outline" size="sm" onClick={prevStep} className="gap-1.5">
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button size="sm" onClick={nextStep} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  Continue <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Organization & Discovery */}
        {data.step === 2 && (
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader>
              <CardTitle className="font-display text-xl font-bold text-foreground">
                Organization details
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Set up your company profile. All database records will be scoped to this organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Company / Organization Name</label>
                <Input
                  value={data.organizationName}
                  onChange={(e) => updateField("organizationName", e.target.value)}
                  placeholder="e.g. Apex Health & Insurance Brokers"
                  className="bg-background text-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Industry Sector</label>
                <select
                  value={data.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="Healthcare & Insurance">Healthcare & Insurance</option>
                  <option value="Home & Field Services">Home & Field Services</option>
                  <option value="Financial & Legal Services">Financial & Legal Services</option>
                  <option value="Hospitality & Dining">Hospitality & Dining</option>
                  <option value="Retail & E-commerce">Retail & E-commerce</option>
                  <option value="Other">Other Business</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">How did you discover SaveCall?</label>
                <select
                  value={data.referralSource}
                  onChange={(e) => updateField("referralSource", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="Search / Google">Search / Google</option>
                  <option value="Social Media (Twitter/X, LinkedIn)">Social Media (Twitter/X, LinkedIn)</option>
                  <option value="Friend or Colleague">Friend or Colleague</option>
                  <option value="YouTube / Podcast">YouTube / Podcast</option>
                  <option value="GitHub / Open Source">GitHub / Open Source</option>
                  <option value="Other">Other (Please specify)</option>
                </select>
              </div>

              {data.referralSource === "Other" && (
                <div className="space-y-1.5 pt-1 animate-fade-in">
                  <label className="text-xs font-semibold text-foreground">Please share where you heard about us</label>
                  <Input
                    value={data.referralOther}
                    onChange={(e) => updateField("referralOther", e.target.value)}
                    placeholder="e.g., Tech event, blog post, newsletter..."
                    className="bg-background text-sm"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                <Button variant="outline" size="sm" onClick={prevStep} className="gap-1.5">
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button size="sm" onClick={nextStep} disabled={!data.organizationName.trim()} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  Continue <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Choose Any Subscription Tier (Dev-Enabled) */}
        {data.step === 3 && (
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-xl font-bold text-foreground">
                    Choose your subscription tier
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-1">
                    Select a plan for your organization. In development mode, you can activate any plan freely.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  Dev Mode: Free 1-Click
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Starter */}
                <div
                  onClick={() => updateField("plan", "starter")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    data.plan === "starter"
                      ? "border-primary bg-primary/5 ring-2 ring-primary shadow-xs"
                      : "border-border hover:border-muted-foreground/40 bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-foreground">Free Starter</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">₹0 / month • Evaluation</p>
                      <ul className="mt-2.5 space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> 15 live audio minutes / mo</li>
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> 1 AI Voice Receptionist</li>
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Browser WebRTC calling</li>
                      </ul>
                    </div>
                    <div className={`size-5 rounded-full border flex items-center justify-center shrink-0 ${data.plan === "starter" ? "border-primary bg-primary text-white" : "border-border"}`}>
                      {data.plan === "starter" && <Check className="size-3" />}
                    </div>
                  </div>
                </div>

                {/* Growth */}
                <div
                  onClick={() => updateField("plan", "growth")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    data.plan === "growth"
                      ? "border-primary bg-primary/5 ring-2 ring-primary shadow-xs"
                      : "border-border hover:border-muted-foreground/40 bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-foreground">Growth</h4>
                        <Badge variant="outline" className="text-[10px] text-primary border-primary/20">Popular</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">₹2,499 / mo ($29) • For growing firms</p>
                      <ul className="mt-2.5 space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" /> 300 minutes included</li>
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" /> 1 Dedicated SIP Phone Number</li>
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" /> Multi-lingual Hindi + English</li>
                      </ul>
                    </div>
                    <div className={`size-5 rounded-full border flex items-center justify-center shrink-0 ${data.plan === "growth" ? "border-primary bg-primary text-white" : "border-border"}`}>
                      {data.plan === "growth" && <Check className="size-3" />}
                    </div>
                  </div>
                </div>

                {/* Business */}
                <div
                  onClick={() => updateField("plan", "business")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    data.plan === "business"
                      ? "border-primary bg-primary/5 ring-2 ring-primary shadow-xs"
                      : "border-border hover:border-muted-foreground/40 bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-foreground">Business</h4>
                        <Badge variant="outline" className="text-[10px] text-foreground border-border">Scale</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">₹7,999 / mo ($99) • Contact Centers</p>
                      <ul className="mt-2.5 space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" /> 1,500 minutes included</li>
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" /> Unlimited concurrent voice lines</li>
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" /> Custom CRM webhooks & tools</li>
                      </ul>
                    </div>
                    <div className={`size-5 rounded-full border flex items-center justify-center shrink-0 ${data.plan === "business" ? "border-primary bg-primary text-white" : "border-border"}`}>
                      {data.plan === "business" && <Check className="size-3" />}
                    </div>
                  </div>
                </div>

                {/* Enterprise */}
                <div
                  onClick={() => updateField("plan", "enterprise")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    data.plan === "enterprise"
                      ? "border-primary bg-primary/5 ring-2 ring-primary shadow-xs"
                      : "border-border hover:border-muted-foreground/40 bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-foreground">Enterprise</h4>
                        <Badge variant="outline" className="text-[10px] text-primary border-primary/20">Custom</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Custom Volume • Dedicated Infrastructure</p>
                      <ul className="mt-2.5 space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Unlimited minutes with 99.9% SLA</li>
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Private LLM / On-premise deployment</li>
                        <li className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Dedicated solutions engineer</li>
                      </ul>
                    </div>
                    <div className={`size-5 rounded-full border flex items-center justify-center shrink-0 ${data.plan === "enterprise" ? "border-primary bg-primary text-white" : "border-border"}`}>
                      {data.plan === "enterprise" && <Check className="size-3" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                <Button variant="outline" size="sm" onClick={prevStep} className="gap-1.5">
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button size="sm" onClick={nextStep} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  Continue <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Consent & Agreements */}
        {data.step === 4 && (
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader>
              <CardTitle className="font-display text-xl font-bold text-foreground">
                Terms of Service & Privacy
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Review and record your agreement to customer data isolation and audio recording guidelines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.consentTerms}
                    onChange={(e) => handleConsentTerms(e.target.checked)}
                    className="size-4 mt-0.5 rounded border-border text-primary focus:ring-primary shrink-0"
                  />
                  <div className="text-xs text-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">
                      I agree to the Terms of Service and Customer Privacy Policy (Required)
                    </span>
                    <p className="text-muted-foreground mt-0.5">
                      I authorize SaveCall to process incoming voice audio sessions for reception and transcription in compliance with enterprise tenant isolation guidelines.
                    </p>
                  </div>
                </label>

                <div className="h-px bg-border" />

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.consentMarketing}
                    onChange={(e) => updateField("consentMarketing", e.target.checked)}
                    className="size-4 mt-0.5 rounded border-border text-primary focus:ring-primary shrink-0"
                  />
                  <div className="text-xs text-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">
                      Product updates and voice agent optimization tips (Optional)
                    </span>
                    <p className="text-muted-foreground mt-0.5">
                      Receive occasional product improvements, benchmark latency summaries, and new telephony integrations. You may unsubscribe anytime.
                    </p>
                  </div>
                </label>
              </div>

              {data.consentTimestamp && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border">
                  <Clock className="size-3.5 text-primary" />
                  <span>Consent recorded on: {new Date(data.consentTimestamp).toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                <Button variant="outline" size="sm" onClick={prevStep} className="gap-1.5">
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button
                  size="sm"
                  onClick={nextStep}
                  disabled={!data.consentTerms}
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Continue <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 5: AI Voice Assistant Persona */}
        {data.step === 5 && (
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader>
              <CardTitle className="font-display text-xl font-bold text-foreground">
                Design your voice assistant persona
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Set the voice tone, greeting style, and multi-lingual behavior for your callers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Assistant Name</label>
                  <Input
                    value={data.agentName}
                    onChange={(e) => updateField("agentName", e.target.value)}
                    placeholder="e.g. Anya"
                    className="bg-background text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Primary Language</label>
                  <select
                    value={data.agentLanguage}
                    onChange={(e) => updateField("agentLanguage", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="Hinglish (Conversational Bilingual)">Hinglish (Conversational Bilingual)</option>
                    <option value="English (Indian/International)">English (Indian/International)</option>
                    <option value="Hindi (Standard)">Hindi (Standard)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Speaking Tone</label>
                <select
                  value={data.agentTone}
                  onChange={(e) => updateField("agentTone", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="Warm & Professional">Warm & Professional (Empathetic, clear, patient)</option>
                  <option value="Direct & Efficient">Direct & Efficient (Quick answers, concise summaries)</option>
                  <option value="Formal & Reassuring">Formal & Reassuring (High-trust enterprise)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Initial Greeting Phrase</label>
                <textarea
                  value={data.agentGreeting}
                  onChange={(e) => updateField("agentGreeting", e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground shadow-xs focus:ring-1 focus:ring-primary font-sans leading-relaxed"
                />
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
                <Volume2 className="size-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  <strong>Preview:</strong> Callers will hear: &ldquo;{data.agentGreeting}&rdquo;
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                <Button variant="outline" size="sm" onClick={prevStep} className="gap-1.5">
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button size="sm" onClick={nextStep} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  Continue <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 6: Business Knowledge Fast-Start */}
        {data.step === 6 && (
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader>
              <CardTitle className="font-display text-xl font-bold text-foreground">
                Business Knowledge Base
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Provide key facts so your assistant answers caller questions accurately without hallucinating.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Core Facts, FAQs & Operating Guidelines</span>
              </div>

              <textarea
                value={data.businessKnowledge}
                onChange={(e) => updateField("businessKnowledge", e.target.value)}
                rows={6}
                placeholder="Enter operating hours, address, services, pricing, cancellation policies, and common FAQs..."
                className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground shadow-xs focus:ring-1 focus:ring-primary leading-relaxed font-mono"
              />

              <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                <AlertCircle className="size-4 text-primary shrink-0 mt-0.5" />
                <span>
                  You can upload complete PDF policy brochures, knowledge articles, and claim documentation at any time from the <strong>Business Knowledge</strong> tab.
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                <Button variant="outline" size="sm" onClick={prevStep} className="gap-1.5">
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button size="sm" onClick={nextStep} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  Continue <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 7: Interactive Test Call */}
        {data.step === 7 && (
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Mic className="size-7" />
              </div>
              <CardTitle className="font-display text-xl font-bold text-foreground">
                Test your assistant live
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground max-w-md mx-auto">
                Connect directly to your assistant in your browser using real-time WebRTC audio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4 pb-6 max-w-md mx-auto text-center">
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Configured Assistant:</span>
                  <span className="font-semibold text-foreground">{data.agentName} ({data.agentLanguage.split(" ")[0]})</span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Selected Plan Tier:</span>
                  <span className="font-semibold text-primary capitalize">{data.plan} Tier</span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">WebRTC Audio Engine:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" /> Ready
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Link to="/voice">
                  <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                    <PhoneCall className="size-4" /> Launch Interactive Test Call
                  </Button>
                </Link>
                <p className="text-[11px] text-muted-foreground">
                  Opens the real-time voice caller in a clean dialog. You can also skip this and test anytime later.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                <Button variant="outline" size="sm" onClick={prevStep} className="gap-1.5">
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button size="sm" onClick={nextStep} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  Finish Setup <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 8: Launch Checklist */}
        {data.step === 8 && (
          <Card className="border border-border shadow-xs bg-card">
            <CardHeader className="text-center pb-2 pt-6">
              <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="size-8" />
              </div>
              <CardTitle className="font-display text-2xl font-bold text-foreground">
                Setup Complete & Ready
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground max-w-md mx-auto">
                Your AI receptionist is active and ready to handle customer calls for {data.organizationName || "your business"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4 pb-8 max-w-md mx-auto">
              <div className="rounded-xl border border-border divide-y divide-border bg-card">
                <div className="p-3 flex items-center gap-3 text-xs font-medium">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span className="text-foreground">Company: <strong>{data.organizationName || "Company Workspace"}</strong></span>
                </div>
                <div className="p-3 flex items-center gap-3 text-xs font-medium">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span className="text-foreground">Subscription Model: <strong className="capitalize">{data.plan} Tier</strong> (Development Activated)</span>
                </div>
                <div className="p-3 flex items-center gap-3 text-xs font-medium">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span className="text-foreground">AI receptionist persona &ldquo;{data.agentName}&rdquo; provisioned</span>
                </div>
                <div className="p-3 flex items-center gap-3 text-xs font-medium">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  <span className="text-foreground">Approved knowledge base indexed</span>
                </div>
              </div>

              <Button
                onClick={async () => {
                  await saveMutation.mutateAsync({ ...data, step: 8 });
                  navigate({ to: "/dashboard" });
                }}
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 shadow-xs"
              >
                Go to Dashboard <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full pt-4 border-t border-border text-center text-xs text-muted-foreground">
        SaveCall Enterprise AI Employee Platform • Strict Tenant Isolation & Encrypted Session Data
      </footer>
    </div>
  );
}
