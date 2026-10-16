import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  Mic,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Radio,
  Sliders,
  CheckCircle2,
  Clock,
  ArrowRight,
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
import { useBusiness } from "@/hooks/use-business";
import { insforge as supabase } from "@/integrations/insforge/client";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({
    meta: [
      { title: "AI Employee Studio — SaveCall" },
      {
        name: "description",
        content:
          "Configure your autonomous voice employee: role, voice, languages, personality, permitted skills, and deployment mode.",
      },
      { property: "og:title", content: "AI Employee Studio — SaveCall" },
      {
        property: "og:description",
        content:
          "Configure your autonomous voice employee: role, voice, languages, personality, permitted skills, and deployment mode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentPage,
});

const LANGUAGE_SETS = [
  { value: "hi,en,hinglish", label: "Hindi + English + Hinglish (Bilingual)" },
  { value: "en", label: "English (Global / Standard)" },
  { value: "hi", label: "Hindi (शुद्ध हिन्दी)" },
];

const VOICES = [
  { value: "hi-IN-SwaraNeural", label: "Swara (Natural Indian English & Hindi)" },
  { value: "hi-IN-MadhurNeural", label: "Madhur (Deep Male, Clear Hindi & English)" },
  { value: "en-US-JennyNeural", label: "Jenny (Warm & Friendly US English)" },
  { value: "en-US-GuyNeural", label: "Guy (Professional Executive US English)" },
];

const DEPLOYMENT_MODES = [
  {
    mode: "test",
    title: "Test Mode",
    desc: "Internal staff testing only. No live external customer calls or actions.",
    badge: "Testing",
    badgeColor: "border-slate-500/40 text-slate-400 bg-slate-500/10",
  },
  {
    mode: "assist",
    title: "Assist Mode",
    desc: "AI handles routine inquiries and FAQs; transfers complex calls to staff.",
    badge: "Recommended",
    badgeColor: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
  },
  {
    mode: "controlled",
    title: "Controlled Mode",
    desc: "Executes only explicitly permitted actions with mandatory confirmation.",
    badge: "Regulated",
    badgeColor: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  },
  {
    mode: "autopilot",
    title: "Autopilot",
    desc: "Fully autonomous customer handling within configured policy boundaries.",
    badge: "Production",
    badgeColor: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  },
] as const;

const PERMISSIONS = [
  {
    key: "can_answer_questions",
    title: "Search Knowledge & Answer FAQs",
    desc: "Answers caller questions using verified company documents, pricing, and policies.",
  },
  {
    key: "can_capture_leads",
    title: "Capture Inquiries & Leads",
    desc: "Records caller contact details, requirements, and urgency for follow-up.",
  },
  {
    key: "can_book",
    title: "Appointment & Service Booking",
    desc: "Checks calendar availability and books confirmed slots directly.",
  },
  {
    key: "can_transfer",
    title: "Human Staff Warm Transfer",
    desc: "Offers instant escalation or scheduled callback when caller requests human staff.",
  },
] as const;

function AgentPage() {
  const { data: business } = useBusiness();
  const businessId = business?.id;
  const queryClient = useQueryClient();

  const agent = useQuery({
    queryKey: ["agent", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.database
        .from("ai_agents")
        .select("*")
        .or(`tenant_id.eq.${businessId!},business_id.eq.${businessId!}`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    name: "Riya",
    role: "AI Receptionist & Support Specialist",
    greeting: "Hello! Thank you for calling. I am Riya, your AI voice assistant. How may I help you today?",
    tone: "professional",
    voice: "hi-IN-SwaraNeural",
    languages: "hi,en,hinglish",
    deployment_mode: "assist",
    can_book: true,
    can_capture_leads: true,
    can_transfer: true,
    can_answer_questions: true,
  });

  useEffect(() => {
    if (!agent.data) return;
    setForm({
      name: agent.data.name || "Riya",
      role: (agent.data as any).role || "AI Receptionist & Support Specialist",
      greeting: agent.data.greeting || "Hello! Thank you for calling. How may I help you today?",
      tone: agent.data.tone || "professional",
      voice: agent.data.voice || "hi-IN-SwaraNeural",
      languages: Array.isArray(agent.data.languages)
        ? agent.data.languages.join(",")
        : (agent.data.languages ?? "hi,en,hinglish"),
      deployment_mode: (agent.data as any).deployment_mode || "assist",
      can_book: agent.data.can_book ?? true,
      can_capture_leads: agent.data.can_capture_leads ?? true,
      can_transfer: agent.data.can_transfer ?? true,
      can_answer_questions: agent.data.can_answer_questions ?? true,
    });
  }, [agent.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        tenant_id: businessId!,
        business_id: businessId!,
        name: form.name.trim(),
        role: form.role.trim(),
        greeting: form.greeting.trim(),
        tone: form.tone,
        voice: form.voice,
        languages: form.languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        deployment_mode: form.deployment_mode,
        can_book: form.can_book,
        can_capture_leads: form.can_capture_leads,
        can_transfer: form.can_transfer,
        can_answer_questions: form.can_answer_questions,
        updated_at: new Date().toISOString(),
      };

      const { error } = agent.data?.id
        ? await supabase.database.from("ai_agents").update(payload).eq("id", agent.data.id)
        : await supabase.database.from("ai_agents").insert([payload]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("AI Employee configuration saved successfully.");
      void queryClient.invalidateQueries({ queryKey: ["agent", businessId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save employee configuration"),
  });

  return (
    <AppShell
      title="AI Employee Studio"
      subtitle="Configure identity, conversational skills, voice parameters, and operational deployment mode."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Quick Test & Readiness Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-cyan-400" />
              <span className="font-semibold text-sm text-white">Active Employee: {form.name}</span>
              <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-400 uppercase">
                {form.deployment_mode}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {form.role} • Speaks {form.languages.includes("hi") ? "Hindi, English & Hinglish" : "English"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/train">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-border/80">
                <BookOpen className="h-3.5 w-3.5" /> Teach Knowledge
              </Button>
            </Link>
            <Link to="/voice">
              <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs gap-1.5 shadow">
                <Mic className="h-3.5 w-3.5" /> Test Voice Call
              </Button>
            </Link>
          </div>
        </div>

        {/* Identity & Speech Configuration */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-cyan-400" /> Employee Identity & Voice
            </CardTitle>
            <CardDescription className="text-xs">
              Define the employee's caller persona, pronunciation voice, and opening greeting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="agent-name" className="text-xs">Employee Name</Label>
                <Input
                  id="agent-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Riya, Aarav, Sarah"
                  className="text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-role" className="text-xs">Job Role & Title</Label>
                <Input
                  id="agent-role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="e.g. Customer Support Specialist, Appointment Coordinator"
                  className="text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Voice Selection</Label>
                <Select
                  value={form.voice}
                  onValueChange={(voice) => setForm({ ...form, voice })}
                >
                  <SelectTrigger className="text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map((v) => (
                      <SelectItem key={v.value} value={v.value} className="text-xs">
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Languages</Label>
                <Select
                  value={form.languages}
                  onValueChange={(languages) => setForm({ ...form, languages })}
                >
                  <SelectTrigger className="text-xs bg-background">
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
                <Label className="text-xs">Tone & Demeanor</Label>
                <Select
                  value={form.tone}
                  onValueChange={(tone) => setForm({ ...form, tone })}
                >
                  <SelectTrigger className="text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional" className="text-xs">Professional & Courteous</SelectItem>
                    <SelectItem value="warm" className="text-xs">Warm & Empathetic</SelectItem>
                    <SelectItem value="friendly" className="text-xs">Friendly & Engaging</SelectItem>
                    <SelectItem value="brisk" className="text-xs">Concise & Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="greeting" className="text-xs">Opening Line (Spoken Immediately on Call Connect)</Label>
              <Textarea
                id="greeting"
                rows={3}
                value={form.greeting}
                onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                placeholder="Hello! Thank you for calling. How may I assist you today?"
                className="text-xs leading-relaxed bg-background"
              />
            </div>
          </CardContent>
        </Card>

        {/* Permitted Business Skills */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-400" /> Permitted Skills & Actions
            </CardTitle>
            <CardDescription className="text-xs">
              Actions the employee is explicitly authorized to execute on behalf of the company.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PERMISSIONS.map(({ key, title, desc }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-border/50 bg-background/50"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">{title}</div>
                  <div className="text-[11px] text-muted-foreground">{desc}</div>
                </div>
                <Switch
                  checked={(form as any)[key]}
                  onCheckedChange={(checked) => setForm({ ...form, [key]: checked })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Deployment Mode */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-400" /> Deployment Mode
            </CardTitle>
            <CardDescription className="text-xs">
              Control the autonomy level of this AI employee when handling real customer calls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {DEPLOYMENT_MODES.map((d) => {
                const isSelected = form.deployment_mode === d.mode;
                return (
                  <div
                    key={d.mode}
                    onClick={() => setForm({ ...form, deployment_mode: d.mode })}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all text-left space-y-1.5 ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-950/20 shadow-sm"
                        : "border-border/60 bg-background/40 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{d.title}</span>
                      <Badge variant="outline" className={`text-[10px] ${d.badgeColor}`}>
                        {d.badge}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{d.desc}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-2">
          <Link to="/voice">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
              Test in private room <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>

          <Button
            onClick={() => save.mutate()}
            disabled={!businessId || save.isPending}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs px-6"
          >
            {save.isPending ? "Saving..." : "Save AI Employee"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
