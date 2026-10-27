import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  BookOpen,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Sliders,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageSquare,
  Lock,
  UserCheck,
  Code2,
  AlertTriangle,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useBusiness } from "@/hooks/use-business";
import { insforge as supabase } from "@/integrations/insforge/client";

export const Route = createFileRoute("/_authenticated/agent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AI Agent Studio: InsurCall WhatsApp AI" },
      {
        name: "description",
        content:
          "Configure your autonomous WhatsApp insurance agent: identity, customer disclosure, permitted and disallowed boundaries, escalation triggers, and prompt preview.",
      },
    ],
  }),
  component: AgentStudioPage,
});

const LANGUAGE_SETS = [
  { value: "hi,en,hinglish", label: "Hindi + English + Hinglish (Bilingual Indian Context)" },
  { value: "en", label: "English (Formal & Standard)" },
  { value: "hi", label: "Hindi (शुद्ध हिन्दी)" },
];

const DEPLOYMENT_MODES = [
  {
    mode: "draft",
    title: "Draft Mode",
    desc: "Configuration in progress. Live WhatsApp auto-replies are paused.",
    badge: "Draft",
    badgeColor: "border-slate-300 text-slate-600 bg-slate-100",
  },
  {
    mode: "test",
    title: "Test Sandbox",
    desc: "Internal staff testing only. Answers questions in sandbox without affecting live customers.",
    badge: "Testing",
    badgeColor: "border-blue-300 text-blue-700 bg-blue-50",
  },
  {
    mode: "assist",
    title: "Assist Mode (Recommended)",
    desc: "AI answers policy questions from approved knowledge; flags complex disputes for staff review.",
    badge: "Recommended",
    badgeColor: "border-teal-300 text-teal-800 bg-teal-50",
  },
  {
    mode: "autopilot",
    title: "Autonomous Production",
    desc: "Active WhatsApp auto-replies within strict policy boundaries and instant staff handoff.",
    badge: "Production",
    badgeColor: "border-emerald-300 text-emerald-800 bg-emerald-50",
  },
] as const;

interface AgentRecord {
  id: string;
  tenant_id: string;
  name: string;
  role?: string;
  greeting?: string;
  tone?: string;
  languages?: string[] | string;
  voice?: string;
  deployment_mode?: string;
  can_answer_questions?: boolean;
  can_capture_leads?: boolean;
  can_book?: boolean;
  can_transfer?: boolean;
  updated_at?: string;
}

function AgentStudioPage() {
  const { data: business } = useBusiness();
  const businessId = business?.id;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"identity" | "boundaries" | "escalation" | "prompt">("identity");

  const agentQuery = useQuery({
    queryKey: ["agent-studio", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<AgentRecord | null> => {
      const { data, error } = await supabase.database
        .from("ai_agents")
        .select("*")
        .or(`tenant_id.eq.${businessId!},business_id.eq.${businessId!}`)
        .maybeSingle();
      if (error) throw error;
      return (data as AgentRecord | null) ?? null;
    },
  });

  const [form, setForm] = useState({
    name: "Anya",
    role: "Autonomous WhatsApp Insurance Receptionist",
    businessIdentity: "Licensed Insurance Agency / Brokerage",
    greeting: "Hello! Welcome to our office. I am Anya, your AI insurance assistant. How can I assist you with your policy, coverage, or claim inquiry today?",
    disclosure: "I am an automated AI assistant. For legally binding policy endorsements or formal claim settlements, our licensed staff adjusters will assist you.",
    tone: "professional",
    languages: "hi,en,hinglish",
    deployment_mode: "assist",
    escalationContact: "+91 98765 43210 (Claims Service Desk)",
    // Permitted Tasks
    can_answer_questions: true,
    can_capture_leads: true,
    can_book: true,
    can_transfer: true,
    can_intake_claims: true,
    // Disallowed Boundaries
    never_guarantee_claims: true,
    never_alter_beneficiary: true,
    never_quote_unapproved: true,
    never_collect_credentials: true,
    // Configuration version
    version: "v1.2.0",
  });

  useEffect(() => {
    if (!agentQuery.data) return;
    const a = agentQuery.data;
    setForm((prev) => ({
      ...prev,
      name: a.name || "Anya",
      role: a.role || "Autonomous WhatsApp Insurance Receptionist",
      greeting: a.greeting || prev.greeting,
      tone: a.tone || "professional",
      languages: Array.isArray(a.languages) ? a.languages.join(",") : (a.languages ?? "hi,en,hinglish"),
      deployment_mode: a.deployment_mode || "assist",
      can_book: a.can_book ?? true,
      can_capture_leads: a.can_capture_leads ?? true,
      can_transfer: a.can_transfer ?? true,
      can_answer_questions: a.can_answer_questions ?? true,
    }));
  }, [agentQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("No tenant workspace selected");

      const payload = {
        tenant_id: businessId,
        business_id: businessId,
        name: form.name.trim(),
        role: form.role.trim(),
        greeting: form.greeting.trim(),
        tone: form.tone,
        languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
        deployment_mode: form.deployment_mode,
        can_book: form.can_book,
        can_capture_leads: form.can_capture_leads,
        can_transfer: form.can_transfer,
        can_answer_questions: form.can_answer_questions,
        updated_at: new Date().toISOString(),
      };

      const { error } = agentQuery.data?.id
        ? await supabase.database.from("ai_agents").update(payload).eq("id", agentQuery.data.id)
        : await supabase.database.from("ai_agents").insert([payload]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("AI Agent configuration saved and synchronized with live WhatsApp assistant.");
      void queryClient.invalidateQueries({ queryKey: ["agent-studio", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save configuration";
      toast.error(msg);
    },
  });

  // Generates the deterministic system prompt preview
  const generatedPrompt = `### ROLE AND IMMUTABLE SAFETY CONTRACT
You are ${form.name}, an authorized AI Insurance Assistant representing ${form.businessIdentity}.
Your communication style is ${form.tone} and bilingual (${form.languages}).

### MANDATORY CUSTOMER DISCLOSURE
On conversation start, you must disclose:
"${form.disclosure}"

### APPROVED CAPABILITIES
${form.can_answer_questions ? "- Explain coverage terms, policy wording, and claim filing steps using ONLY approved knowledge." : ""}
${form.can_intake_claims ? "- Assist with First Notice of Loss (FNOL) incident collection (policy #, incident date, damage description)." : ""}
${form.can_capture_leads ? "- Record policyholder renewal inquiries and contact details." : ""}
${form.can_transfer ? "- Initiate instant human takeover when requested by customer." : ""}

### STRICT PROHIBITIONS (NEVER OVERRIDE)
- NEVER guarantee claim approval, settlement amount, or payout deadlines.
- NEVER modify policy beneficiaries, nominees, or coverage limits without dual-control human authorization.
- NEVER request passwords, Aadhaar OTPs, credit card CVVs, or bank login credentials.
- NEVER invent facts, hospitals, or premiums if not found in verified knowledge sources.
- If verified evidence is absent or confidence is below 0.65, escalate to ${form.escalationContact}.`;

  return (
    <AppShell
      title="AI Agent"
      subtitle="Configure identity, customer disclosure, safety boundaries, escalation policies, and system prompt"
    >
      <div className="space-y-6 max-w-5xl">
        {/* Clean Light-Mode Status Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="grid size-11 place-items-center rounded-xl bg-[#E6F6F7] text-[#087F8C]">
              <Bot className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-slate-900">{form.name}</h2>
                <Badge variant="outline" className="text-[10px] font-mono border-teal-200 text-teal-800 bg-teal-50 uppercase">
                  {form.deployment_mode}
                </Badge>
                <span className="text-[11px] font-mono text-slate-400">Ver: {form.version}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {form.role} • Speaks {form.languages.includes("hi") ? "Hinglish, Hindi & English" : "English"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/whatsapp">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 font-mono">
                <MessageSquare className="size-3.5 text-[#087F8C]" /> Test in WhatsApp Inbox
              </Button>
            </Link>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!businessId || saveMutation.isPending}
              size="sm"
              className="bg-[#087F8C] hover:bg-[#076C77] text-white font-medium text-xs font-mono gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="size-3.5" />
              {saveMutation.isPending ? "Saving..." : "Save Agent"}
            </Button>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
          <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200">
            <TabsTrigger value="identity" className="text-xs font-mono data-[state=active]:bg-white data-[state=active]:text-[#087F8C]">
              <Bot className="size-3.5 mr-1.5" /> Identity & Disclosure
            </TabsTrigger>
            <TabsTrigger value="boundaries" className="text-xs font-mono data-[state=active]:bg-white data-[state=active]:text-[#087F8C]">
              <ShieldCheck className="size-3.5 mr-1.5" /> Permitted & Prohibited Tasks
            </TabsTrigger>
            <TabsTrigger value="escalation" className="text-xs font-mono data-[state=active]:bg-white data-[state=active]:text-[#087F8C]">
              <ShieldAlert className="size-3.5 mr-1.5" /> Escalation & Dual-Control
            </TabsTrigger>
            <TabsTrigger value="prompt" className="text-xs font-mono data-[state=active]:bg-white data-[state=active]:text-[#087F8C]">
              <Code2 className="size-3.5 mr-1.5" /> System Prompt Preview
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Identity & Disclosure */}
          <TabsContent value="identity" className="space-y-4">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Bot className="size-4 text-[#087F8C]" /> Assistant Identity & Disclosure
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Define the customer-facing name, opening greeting, and mandatory statutory AI disclosure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="agent-name" className="text-xs font-medium text-slate-700">Agent Display Name</Label>
                    <Input
                      id="agent-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Anya, Riya, Aarav"
                      className="text-xs bg-white border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="agent-role" className="text-xs font-medium text-slate-700">Job Title & Scope</Label>
                    <Input
                      id="agent-role"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      placeholder="e.g. Autonomous WhatsApp Insurance Specialist"
                      className="text-xs bg-white border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Operating Languages</Label>
                    <Select
                      value={form.languages}
                      onValueChange={(languages) => setForm({ ...form, languages })}
                    >
                      <SelectTrigger className="text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_SETS.map((set) => (
                          <SelectItem key={set.value} value={set.value} className="text-xs">
                            {set.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Tone & Demeanor</Label>
                    <Select
                      value={form.tone}
                      onValueChange={(tone) => setForm({ ...form, tone })}
                    >
                      <SelectTrigger className="text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional" className="text-xs">Empathetic & Professional (Recommended)</SelectItem>
                        <SelectItem value="courteous" className="text-xs">Courteous & Formal</SelectItem>
                        <SelectItem value="concise" className="text-xs">Brisk & Concise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="greeting" className="text-xs font-medium text-slate-700">
                    Opening Welcome Message (Sent on Inbound WhatsApp Initiation)
                  </Label>
                  <Textarea
                    id="greeting"
                    rows={3}
                    value={form.greeting}
                    onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                    className="text-xs leading-relaxed bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="disclosure" className="text-xs font-medium text-slate-700">
                      Mandatory Customer-Facing AI Notice
                    </Label>
                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200">
                      Compliance Enforced
                    </Badge>
                  </div>
                  <Textarea
                    id="disclosure"
                    rows={2}
                    value={form.disclosure}
                    onChange={(e) => setForm({ ...form, disclosure: e.target.value })}
                    className="text-xs leading-relaxed bg-white border-slate-200"
                  />
                  <p className="text-[11px] text-slate-500">
                    Never represent the assistant as a licensed insurance broker or human adjuster when that would mislead customers.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Deployment Autonomy Mode */}
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Radio className="size-4 text-[#087F8C]" /> Operational Deployment Mode
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Control how the assistant responds to incoming WhatsApp customer messages.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {DEPLOYMENT_MODES.map((d) => {
                    const isSelected = form.deployment_mode === d.mode;
                    return (
                      <div
                        key={d.mode}
                        onClick={() => setForm({ ...form, deployment_mode: d.mode })}
                        className={`cursor-pointer p-4 rounded-xl border transition-all text-left space-y-1.5 ${
                          isSelected
                            ? "border-[#087F8C] bg-[#E6F6F7]/50 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{d.title}</span>
                          <Badge variant="outline" className={`text-[10px] ${d.badgeColor}`}>
                            {d.badge}
                          </Badge>
                        </div>
                        <p className="text-[11.5px] text-slate-500 leading-relaxed">{d.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Permitted & Disallowed Tasks */}
          <TabsContent value="boundaries" className="space-y-4">
            {/* Permitted Actions */}
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" /> Permitted Customer Actions
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Explicitly allowed automated services backed by approved knowledge store.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-100 bg-[#FAF9F6]">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Explain Verified Policy Wording & Exclusions</span>
                    <span className="text-[11px] text-slate-500">Answers queries using pgvector cosine similarity against approved tenant chunks.</span>
                  </div>
                  <Switch
                    checked={form.can_answer_questions}
                    onCheckedChange={(v) => setForm({ ...form, can_answer_questions: v })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-100 bg-[#FAF9F6]">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">First Notice of Loss (FNOL) Claims Intake</span>
                    <span className="text-[11px] text-slate-500">Captures date, loss description, and docket details as draft records.</span>
                  </div>
                  <Switch
                    checked={form.can_intake_claims}
                    onCheckedChange={(v) => setForm({ ...form, can_intake_claims: v })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-100 bg-[#FAF9F6]">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Capture Renewal & Lead Enquiries</span>
                    <span className="text-[11px] text-slate-500">Records customer contact info, vehicle/health details for follow-up.</span>
                  </div>
                  <Switch
                    checked={form.can_capture_leads}
                    onCheckedChange={(v) => setForm({ ...form, can_capture_leads: v })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Disallowed Strict Boundaries */}
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="size-4 text-rose-600" /> Disallowed Actions (Strict Server Enforced)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Critical safeguards preventing hallucinations, unauthorized financial advice, or credential leaks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-rose-100 bg-rose-50/40">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">No Claim Settlement Guarantees</span>
                    <span className="text-[11px] text-slate-500">Agent will never promise claim approval, payout timing, or cash disbursements.</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-rose-800 bg-rose-100 border-rose-200">
                    Locked
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-rose-100 bg-rose-50/40">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">No Irreversible Beneficiary Changes</span>
                    <span className="text-[11px] text-slate-500">Changes to policy nominee or contact email require staff dual-control authorization.</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-rose-800 bg-rose-100 border-rose-200">
                    Locked
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-rose-100 bg-rose-50/40">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Zero Sensitive Credential Collection</span>
                    <span className="text-[11px] text-slate-500">Agent refuses to collect OTPs, CVVs, passwords, or netbanking credentials.</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-rose-800 bg-rose-100 border-rose-200">
                    Locked
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Escalation & Dual-Control */}
          <TabsContent value="escalation" className="space-y-4">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="size-4 text-[#087F8C]" /> Human Handoff & Escalation Routing
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Configure when the assistant must stop automated replies and transition to staff takeover.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="escalation-contact" className="text-xs font-medium text-slate-700">
                    Authorized Staff Contact / Desk Number
                  </Label>
                  <Input
                    id="escalation-contact"
                    value={form.escalationContact}
                    onChange={(e) => setForm({ ...form, escalationContact: e.target.value })}
                    className="text-xs bg-white border-slate-200"
                  />
                  <p className="text-[11px] text-slate-500">
                    Shared with policyholders when automated assistance is unable to verify approved facts.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-[#FAF9F6] p-4 space-y-2 text-xs">
                  <span className="font-semibold text-slate-900 block">Automated Takeover Triggers:</span>
                  <ul className="space-y-1.5 text-slate-600 list-disc list-inside text-[11.5px]">
                    <li>Explicit customer request: words like "talk to human", "speak to manager", "agent".</li>
                    <li>Unverified knowledge: retrieval cosine similarity falls below safety threshold (0.65).</li>
                    <li>Disputed claims or hospitalization emergencies: instantly tagged for priority staff review.</li>
                    <li>Dual-control request creation: changes to nominees or policyholder details logged in Approvals.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: System Prompt Preview */}
          <TabsContent value="prompt" className="space-y-4">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Code2 className="size-4 text-[#087F8C]" /> Generated Live System Prompt Preview
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Assembled deterministically from immutable safety rules + approved business configuration.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200">
                    Prompt Shield Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap select-text">
                  {generatedPrompt}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Notice: Document text, training inputs, and customer messages are injected as bounded context at inference time. They can never alter or override the core immutable safety instructions.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
