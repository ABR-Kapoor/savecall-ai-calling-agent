/**
 * Train the AI on your own material — website URL or PDF — with a mandatory
 * human review desk. Nothing scraped here reaches the agent until an owner
 * approves the fact; rejected or ignored facts simply never enter the prompt.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, FileText, Globe, Pencil, UploadCloud, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBusiness } from "@/hooks/use-business";
import { insforge as supabase } from "@/integrations/insforge/client";
import { ingestPdf, ingestUrl } from "@/lib/train.functions";

export const Route = createFileRoute("/_authenticated/train")({
  head: () => ({
    meta: [
      { title: "Train your AI — website & PDF import" },
      {
        name: "description",
        content:
          "Import your website or price-list PDF, review every extracted fact, and approve exactly what the AI receptionist may repeat.",
      },
      { property: "og:title", content: "Train your AI — website & PDF import" },
      {
        property: "og:description",
        content:
          "Human-in-the-loop knowledge import: scrape, review, approve. Unapproved facts never reach the agent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrainPage,
});

function TrainPage() {
  const { data: business } = useBusiness();
  const businessId = business?.id;
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["training", businessId] });
  };

  const pending = useQuery({
    queryKey: ["training", "pending", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.database
        .from("knowledge_items")
        .select("id, question, answer, category, created_at, knowledge_sources(type, name, source_uri)")
        .or(`tenant_id.eq.${businessId!},business_id.eq.${businessId!}`)
        .eq("approved", false)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        knowledge_sources: item.knowledge_sources
          ? {
              kind: item.knowledge_sources.type,
              title: item.knowledge_sources.name,
              url: item.knowledge_sources.source_uri,
            }
          : null,
      }));
    },
  });

  const approvedCount = useQuery({
    queryKey: ["training", "approved-count", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { count, error } = await supabase.database
        .from("knowledge_items")
        .select("id", { count: "exact", head: true })
        .or(`tenant_id.eq.${businessId!},business_id.eq.${businessId!}`)
        .eq("approved", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const sources = useQuery({
    queryKey: ["training", "sources", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.database
        .from("knowledge_sources")
        .select("id, type, name, source_uri, status, metadata, created_at")
        .or(`tenant_id.eq.${businessId!},business_id.eq.${businessId!}`)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        kind: s.type,
        title: s.name,
        url: s.source_uri,
        pages_found: s.metadata?.pages_found ?? 0,
        facts_found: s.metadata?.facts_found ?? 0,
        error: s.metadata?.error ?? null,
      }));
    },
  });

  return (
    <AppShell
      title="Train your AI"
      subtitle="Point it at your website or drop a PDF. Every extracted line is a proposal until you approve it."
    >
      <Tabs defaultValue="add" className="max-w-4xl">
        <TabsList>
          <TabsTrigger value="add">Add Source</TabsTrigger>
          <TabsTrigger value="review">
            Fact Review Desk
            {(pending.data?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pending.data?.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4 space-y-4">
          <AddSourceTab businessId={businessId} onDone={invalidate} />
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-base font-semibold">Recent imports</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(sources.data ?? []).map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-background/60 px-3 py-2"
                >
                  {s.kind === "pdf" ? (
                    <FileText className="size-4 text-primary" />
                  ) : (
                    <Globe className="size-4 text-primary" />
                  )}
                  <span className="font-medium">{s.title ?? s.url ?? s.kind}</span>
                  <Badge
                    variant={
                      s.status === "done"
                        ? "outline"
                        : s.status === "error" || s.status === "blocked"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {s.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {s.pages_found} page{s.pages_found === 1 ? "" : "s"} · {s.facts_found} fact
                    {s.facts_found === 1 ? "" : "s"}
                  </span>
                  {s.error && <span className="w-full text-xs text-destructive">{s.error}</span>}
                </li>
              ))}
              {!sources.data?.length && <li className="text-muted-foreground">No imports yet.</li>}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {approvedCount.data ?? 0} approved facts answer calls right now. Only approved facts
              go into the receptionist's brief; anything else it must take down as a callback
              request.
            </p>
          </section>
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <ReviewDesk
            items={(pending.data as any) ?? []}
            loading={pending.isLoading}
            onChanged={invalidate}
            onApprove={async (id) => {
              const { error } = await supabase.database
                .from("knowledge_items")
                .update({ approved: true })
                .eq("id", id);
              if (error) throw error;
            }}
            onReject={async (id) => {
              const { error } = await supabase.database.from("knowledge_items").delete().eq("id", id);
              if (error) throw error;
            }}
            onEdit={async (id, question, answer) => {
              const { error } = await supabase.database
                .from("knowledge_items")
                .update({ question, answer, approved: true })
                .eq("id", id);
              if (error) throw error;
            }}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ---------------- add source ---------------- */

function AddSourceTab({
  businessId,
  onDone,
}: {
  businessId?: string | undefined;
  onDone: () => void;
}) {
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const importUrl = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("No business selected.");
      return ingestUrl({ data: { businessId, url: url.trim() } });
    },
    onSuccess: (result) => {
      if (result.skippedByRobots) {
        toast.warning("That site's robots.txt says no crawling — nothing was imported.");
      } else {
        toast.success(
          `Read ${result.pagesFound} page(s), found ${result.factsFound} candidate fact(s) for review.`,
        );
        setUrl("");
      }
      onDone();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "URL import failed"),
  });

  const importPdf = useMutation({
    mutationFn: async (file: File) => {
      if (!businessId) throw new Error("No business selected.");
      if (file.size > 6 * 1024 * 1024) throw new Error("PDFs up to 6 MB, please.");
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
      });
      return ingestPdf({ data: { businessId, fileName: file.name, dataBase64: base64 } });
    },
    onSuccess: (result) => {
      toast.success(
        `Read ${result.pagesFound} page(s), found ${result.factsFound} candidate fact(s) for review.`,
      );
      onDone();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "PDF import failed"),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <Globe className="size-4 text-primary" /> Website
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We fetch the page (and your About/Services/Contact-style pages if they exist), strip the
          chrome, and keep only fact-like lines. robots.txt is always respected.
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            importUrl.mutate();
          }}
        >
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://glowstudio.example.com"
            required
            type="url"
          />
          <Button type="submit" disabled={importUrl.isPending || !businessId}>
            {importUrl.isPending && <LoaderIcon />} Import
          </Button>
        </form>
      </section>

      <section
        className={cnDrag(dragOver)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files.item(0);
          if (file) importPdf.mutate(file);
        }}
      >
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <UploadCloud className="size-4 text-primary" /> Price list / brochure PDF
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag a PDF here, or pick one. Text is extracted locally with unpdf — scanned image-only
          PDFs can't be read.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.item(0);
            if (file) importPdf.mutate(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => fileRef.current?.click()}
          disabled={importPdf.isPending}
        >
          {importPdf.isPending && <LoaderIcon />} Choose PDF
        </Button>
      </section>
    </div>
  );
}

function cnDrag(active: boolean) {
  return [
    "rounded-2xl border bg-card p-5 transition-colors",
    active ? "border-primary border-dashed bg-primary/5" : "border-border border-dashed",
  ].join(" ");
}

function LoaderIcon() {
  return (
    <span className="mr-1 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]" />
  );
}

/* ---------------- review desk ---------------- */

type PendingItem = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  created_at: string;
  knowledge_sources: { kind: string; title: string | null; url: string | null } | null;
};

function ReviewDesk({
  items,
  loading,
  onChanged,
  onApprove,
  onReject,
  onEdit,
}: {
  items: PendingItem[];
  loading: boolean;
  onChanged: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (id: string, question: string, answer: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<PendingItem | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const run = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update");
    }
  };

  const approveAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.database
        .from("knowledge_items")
        .update({ approved: true })
        .in(
          "id",
          items.map((i) => i.id),
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Approved ${items.length} fact(s) — your agent can now say these.`);
      onChanged();
    },
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading pending facts…</p>;
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Nothing waiting for review. Import a source and candidate facts will land here — nothing
        reaches the AI until you tick it off.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} extracted fact(s) waiting. Approve the ones you want on the line; the rest
          are simply never spoken.
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => approveAll.mutate()}
          disabled={approveAll.isPending}
        >
          Approve all
        </Button>
      </div>

      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-border bg-card p-4">
          {editing?.id === item.id ? (
            <div className="space-y-2">
              <Labelish>Question the agent will match</Labelish>
              <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
              <Labelish>Answer it may repeat</Labelish>
              <Textarea rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() =>
                    run(async () => {
                      await onEdit(item.id, question.trim(), answer.trim());
                      setEditing(null);
                    }, "Edited and approved.")
                  }
                >
                  Save & approve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                from {item.knowledge_sources?.title ?? item.knowledge_sources?.url ?? item.category}{" "}
                · {item.knowledge_sources?.kind === "pdf" ? "PDF" : "website"}
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium">{item.question}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.answer}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    run(() => onApprove(item.id), "Approved — the agent can use this now.")
                  }
                >
                  <Check className="size-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditing(item);
                    setQuestion(item.question);
                    setAnswer(item.answer);
                  }}
                >
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => run(() => onReject(item.id), "Rejected — discarded.")}
                >
                  <X className="size-4" /> Reject
                </Button>
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}

function Labelish({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}
