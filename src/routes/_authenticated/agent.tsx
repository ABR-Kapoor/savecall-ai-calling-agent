import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBusiness } from "@/hooks/use-business";
import { insforge as supabase } from "@/integrations/insforge/client";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({
    meta: [
      { title: "AI employee settings" },
      {
        name: "description",
        content:
          "Name your receptionist, pick its voice, languages, tone, greeting and what it is allowed to do.",
      },
      { property: "og:title", content: "AI employee settings" },
      {
        property: "og:description",
        content:
          "Name your receptionist, pick its voice, languages, tone, greeting and what it is allowed to do.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentPage,
});

const LANGUAGE_SETS = [
  { value: "hi,en,hinglish", label: "Hindi + English + Hinglish" },
  { value: "en", label: "English only" },
  { value: "hi", label: "Hindi only" },
];

const PERMISSIONS = [
  { key: "can_answer_questions", label: "Answer questions about prices, services and hours" },
  { key: "can_book", label: "Book appointments in your calendar" },
  { key: "can_capture_leads", label: "Capture name and number when it can't book" },
  { key: "can_transfer", label: "Offer a callback from you for urgent calls" },
] as const satisfies {
  key: "can_book" | "can_capture_leads" | "can_transfer" | "can_answer_questions";
  label: string;
}[];

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
        .eq("business_id", businessId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    name: "Riya",
    greeting: "",
    tone: "warm",
    voice: "alloy",
    languages: "hi,en,hinglish",
    can_book: true,
    can_capture_leads: true,
    can_transfer: true,
    can_answer_questions: true,
  });

  useEffect(() => {
    if (!agent.data) return;
    setForm({
      name: agent.data.name,
      greeting: agent.data.greeting,
      tone: agent.data.tone,
      voice: agent.data.voice,
      languages: Array.isArray(agent.data.languages)
        ? agent.data.languages.join(",")
        : (agent.data.languages ?? "hi,en,hinglish"),
      can_book: agent.data.can_book,
      can_capture_leads: agent.data.can_capture_leads,
      can_transfer: agent.data.can_transfer,
      can_answer_questions: agent.data.can_answer_questions,
    });
  }, [agent.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        business_id: businessId!,
        name: form.name,
        greeting: form.greeting,
        tone: form.tone,
        voice: form.voice,
        languages: form.languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        can_book: form.can_book,
        can_capture_leads: form.can_capture_leads,
        can_transfer: form.can_transfer,
        can_answer_questions: form.can_answer_questions,
      };
      const { error } = agent.data
        ? await supabase.database.from("ai_agents").update(payload).eq("id", agent.data.id)
        : await supabase.database.from("ai_agents").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Your AI employee is updated.");
      void queryClient.invalidateQueries({ queryKey: ["agent", businessId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  return (
    <AppShell
      title="AI employee"
      subtitle="Give your receptionist a name, a voice and clear permissions."
    >
      <div className="grid max-w-3xl gap-4">
        <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="agent-name">Name callers hear</Label>
            <Input
              id="agent-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Languages</Label>
            <Select
              value={form.languages}
              onValueChange={(languages) => setForm({ ...form, languages })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_SETS.map((set) => (
                  <SelectItem key={set.value} value={set.value}>
                    {set.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tone</Label>
            <Select value={form.tone} onValueChange={(tone) => setForm({ ...form, tone })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["warm", "professional", "friendly", "brisk"].map((tone) => (
                  <SelectItem key={tone} value={tone}>
                    {tone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Voice</Label>
            <Select value={form.voice} onValueChange={(voice) => setForm({ ...form, voice })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["alloy", "verse", "coral", "sage", "shimmer"].map((voice) => (
                  <SelectItem key={voice} value={voice}>
                    {voice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="greeting">Opening line</Label>
            <Textarea
              id="greeting"
              rows={2}
              value={form.greeting}
              onChange={(e) => setForm({ ...form, greeting: e.target.value })}
              placeholder="Hello, thanks for calling Glow Studio. How can I help you today?"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-base font-semibold">What it is allowed to do</h2>
          {PERMISSIONS.map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between gap-4 text-sm">
              <span>{label}</span>
              <Switch
                checked={form[key]}
                onCheckedChange={(checked) => setForm({ ...form, [key]: checked })}
              />
            </label>
          ))}
        </div>

        <Button
          onClick={() => save.mutate()}
          disabled={!businessId || save.isPending}
          className="w-fit"
        >
          Save AI employee
        </Button>
      </div>
    </AppShell>
  );
}
