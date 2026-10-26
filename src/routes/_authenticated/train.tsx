import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  UploadCloud,
  Check,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Tag,
  HelpCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Layers,
  FileCheck,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useBusiness } from "@/hooks/use-business";
import { insforge as supabase } from "@/integrations/insforge/client";
import {
  ingestPdf,
  ingestUrl,
  addManualKnowledgeFact,
  updateSourceTags,
  deleteKnowledgeSource,
  updateFactApproval,
} from "@/lib/train.functions";
import { InsurCallLoadingScreen } from "@/components/loading-screen";

export const Route = createFileRoute("/_authenticated/train")({
  head: () => ({
    meta: [
      { title: "Policy Knowledge Store: InsurCall" },
      {
        name: "description",
        content: "Organized insurance document workspace with verified facts, tag management, and retrieval inspection.",
      },
    ],
  }),
  component: KnowledgeBasePage,
});

const PRESET_CATEGORIES = [
  "All Sources",
  "Policy Documents",
  "Coverage & Exclusions",
  "Claims Procedures",
  "FNOL Guidelines",
  "Renewal Information",
  "Approved Facts",
];

const PRESET_TAGS = [
  "Health",
  "Motor",
  "Life",
  "Property",
  "FNOL",
  "Claims",
  "Renewal",
  "Customer-safe",
  "Staff-only",
  "IRDAI Guidelines",
];

function KnowledgeBasePage() {
  const { data: business, isLoading: isBusinessLoading } = useBusiness();
  const businessId = business?.id;
  const queryClient = useQueryClient();

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState("All Sources");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  // Modal / Drawer state
  const [showAddFactModal, setShowAddFactModal] = useState(false);
  const [showTagInfo, setShowTagInfo] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  // New Fact Form
  const [factQuestion, setFactQuestion] = useState("");
  const [factAnswer, setFactAnswer] = useState("");
  const [factCategory, setFactCategory] = useState("Coverage & Exclusions");
  const [factTags, setFactTags] = useState<string[]>(["Customer-safe"]);

  // Drag & drop file upload
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Invalidate queries helper
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["training", businessId] });
  };

  // 1. Fetch Knowledge Sources
  const sourcesQuery = useQuery({
    queryKey: ["training", "sources", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.database
        .from("knowledge_sources")
        .select("id, type, name, source_uri, status, metadata, created_at, updated_at")
        .or(`tenant_id.eq.${businessId!},business_id.eq.${businessId!}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        type: s.type || "document",
        name: s.name,
        sourceUri: s.source_uri,
        status: s.status || "done",
        tags: (s.metadata?.tags as string[]) || [],
        textPreview: s.metadata?.text_preview || "",
        pagesFound: s.metadata?.pages_found ?? 1,
        factsFound: s.metadata?.facts_found ?? 1,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
    },
  });

  // 2. Fetch Knowledge Items (Facts)
  const itemsQuery = useQuery({
    queryKey: ["training", "items", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.database
        .from("knowledge_items")
        .select("id, question, answer, category, approved, source_id, created_at")
        .or(`tenant_id.eq.${businessId!},business_id.eq.${businessId!}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const sources = sourcesQuery.data || [];
  const items = itemsQuery.data || [];

  // Filter sources
  const filteredSources = sources.filter((s) => {
    const matchesSearch =
      searchQuery === "" ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.textPreview.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = !selectedTag || s.tags.includes(selectedTag);

    const matchesCategory =
      selectedCategory === "All Sources" ||
      (selectedCategory === "Policy Documents" && s.type === "pdf") ||
      (selectedCategory === "Approved Facts" && s.type === "approved_response") ||
      s.tags.some((t) => t.toLowerCase().includes(selectedCategory.toLowerCase()));

    return matchesSearch && matchesTag && matchesCategory;
  });

  // Selected source detail
  const selectedSource = sources.find((s) => s.id === selectedSourceId) || filteredSources[0] || null;
  const selectedSourceItems = selectedSource
    ? items.filter((i) => i.source_id === selectedSource.id)
    : [];

  // File upload handler
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !businessId) return;
    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          if (!base64) throw new Error("Could not read file data.");

          await ingestPdf({
            data: {
              businessId,
              fileName: file.name,
              dataBase64: base64,
              tags: ["Policy Document", "Customer-safe"],
            },
          });

          toast.success(`Successfully uploaded and extracted facts from ${file.name}`);
          invalidate();
        } catch (e: any) {
          toast.error(e?.message || "Failed to process PDF.");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      toast.error(e?.message || "File upload error.");
      setIsUploading(false);
    }
  };

  // Add Manual Fact Mutation
  const addFactMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("Tenant session missing.");
      return addManualKnowledgeFact({
        data: {
          businessId,
          question: factQuestion.trim(),
          answer: factAnswer.trim(),
          category: factCategory,
          tags: factTags,
        },
      });
    },
    onSuccess: () => {
      toast.success("Approved insurance fact saved to knowledge store.");
      setShowAddFactModal(false);
      setFactQuestion("");
      setFactAnswer("");
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save fact.");
    },
  });

  // Update Tags Mutation
  const updateTagsMutation = useMutation({
    mutationFn: async ({ sourceId, tags }: { sourceId: string; tags: string[] }) => {
      return updateSourceTags({ data: { sourceId, tags } });
    },
    onSuccess: () => {
      toast.success("Document tags updated.");
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update tags.");
    },
  });

  // Delete Source Mutation
  const deleteSourceMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      if (!businessId) throw new Error("Tenant session missing.");
      return deleteKnowledgeSource({ data: { sourceId, businessId } });
    },
    onSuccess: () => {
      toast.success("Knowledge source deleted.");
      if (selectedSourceId) setSelectedSourceId(null);
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete knowledge source.");
    },
  });

  // Update Fact Approval Mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ itemId, approved }: { itemId: string; approved: boolean }) => {
      return updateFactApproval({ data: { itemId, approved } });
    },
    onSuccess: () => {
      toast.success("Fact approval status updated.");
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update approval.");
    },
  });

  if (isBusinessLoading) {
    return (
      <InsurCallLoadingScreen
        message="Loading policy knowledge store..."
        submessage="Connecting to insurance document repository and indexing verified facts."
      />
    );
  }

  return (
    <AppShell
      title="Policy Knowledge Store"
      subtitle="Organized insurance document workspace with verified facts, tag management, and retrieval inspection."
    >
      <div className="space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F6F7] px-2.5 py-0.5 text-xs font-semibold text-[#087F8C] border border-[#087F8C]/20">
                <ShieldCheck className="size-3.5" />
                Verified Knowledge Only
              </span>
              <span className="text-xs font-mono text-slate-400">
                {sources.length} sources &bull; {items.filter((i) => i.approved).length} approved facts
              </span>
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Autonomous Assistant Grounding
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              Documents uploaded here are extracted into structured facts. The AI strictly answers queries using approved facts, avoiding hallucinations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTagInfo(true)}
              className="text-xs gap-1.5 border-slate-200 text-slate-600"
            >
              <HelpCircle className="size-3.5 text-[#087F8C]" /> How Tags Work
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddFactModal(true)}
              className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono gap-1.5 shadow-xs"
            >
              <Plus className="size-3.5" /> Add Approved Fact
            </Button>
          </div>
        </div>

        {/* 3-Panel Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: Sources & Filters (Col 3) */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl p-4 space-y-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Knowledge Categories
                </span>
                <div className="space-y-1">
                  {PRESET_CATEGORIES.map((cat) => {
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                          isActive
                            ? "bg-[#087F8C] text-white font-semibold shadow-2xs"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <span>{cat}</span>
                        {isActive && <Check className="size-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Filter by Tag
                  </span>
                  {selectedTag && (
                    <button
                      onClick={() => setSelectedTag(null)}
                      className="text-[10px] font-mono text-[#087F8C] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TAGS.map((tag) => {
                    const isSelected = selectedTag === tag;
                    return (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(isSelected ? null : tag)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                          isSelected
                            ? "bg-[#172033] text-white border-[#172033]"
                            : "bg-[#FAF9F6] text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* CENTRE PANEL: Document Workspace (Col 5 or 6) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-3xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? "border-[#087F8C] bg-[#E6F6F7]/40 scale-[0.99]"
                  : "border-slate-200 bg-white hover:border-[#087F8C]/50 hover:bg-[#FAF9F6]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <div className="grid size-12 place-items-center rounded-2xl bg-[#FAF9F6] border border-slate-200 text-[#087F8C] mx-auto mb-3 shadow-2xs">
                {isUploading ? (
                  <RefreshCw className="size-5 animate-spin" />
                ) : (
                  <UploadCloud className="size-5" />
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900">
                {isUploading ? "Extracting policy text..." : "Drop policy PDF, guidelines, or rate card here"}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                Supports PDF, TXT, or Markdown. Text is extracted locally with zero external leaks.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
              <Input
                placeholder="Search documents, tags, or extracted policy wording..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-xs bg-white border-slate-200 rounded-2xl h-10 shadow-2xs"
              />
            </div>

            {/* Document List */}
            <div className="space-y-3">
              {filteredSources.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-2">
                  <FileText className="size-8 text-slate-300 mx-auto" />
                  <h4 className="text-xs font-semibold text-slate-700">No Knowledge Sources Found</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Upload a policy PDF or click "Add Approved Fact" to populate your carrier knowledge base.
                  </p>
                </div>
              ) : (
                filteredSources.map((source) => {
                  const isSelected = selectedSource?.id === source.id;
                  return (
                    <div
                      key={source.id}
                      onClick={() => setSelectedSourceId(source.id)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                        isSelected
                          ? "border-[#087F8C] bg-white ring-1 ring-[#087F8C] shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                              source.type === "pdf"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : source.type === "url"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {source.type === "pdf" ? "PDF" : source.type === "url" ? "WEB" : "FACT"}
                          </span>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{source.name}</h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {source.textPreview || "Extracted policy wording ready for retrieval."}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {source.tags.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200"
                        >
                          Indexed
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT DETAIL DRAWER: Selected Source (Col 4) */}
          <div className="lg:col-span-4 space-y-4">
            {selectedSource ? (
              <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl p-5 space-y-5 sticky top-20">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Selected Document
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                      {selectedSource.name}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete knowledge source "${selectedSource.name}"?`)) {
                        deleteSourceMutation.mutate(selectedSource.id);
                      }
                    }}
                    className="size-8 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {/* Source Status & Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-[#FAF9F6] p-2.5">
                    <span className="text-[10px] font-mono text-slate-400 block">Status</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="size-3" /> Indexed & Ready
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-[#FAF9F6] p-2.5">
                    <span className="text-[10px] font-mono text-slate-400 block">Facts Extracted</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {selectedSourceItems.length || selectedSource.factsFound || 1} Facts
                    </span>
                  </div>
                </div>

                {/* Tag Management */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Tag className="size-3.5 text-[#087F8C]" /> Tags
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Controls retrieval scope</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-8 p-2 rounded-xl border border-slate-200 bg-[#FAF9F6]">
                    {selectedSource.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-700 shadow-2xs"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = selectedSource.tags.filter((x) => x !== t);
                            updateTagsMutation.mutate({
                              sourceId: selectedSource.id,
                              tags: newTags,
                            });
                          }}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                    {selectedSource.tags.length === 0 && (
                      <span className="text-xs text-slate-400">No tags assigned</span>
                    )}
                  </div>

                  {/* Add Tag Input */}
                  <div className="flex gap-1.5 pt-1">
                    <Input
                      placeholder="Add tag (e.g. Health, Motor)..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTagInput.trim()) {
                          const tagToAdd = newTagInput.trim().replace(/^#/, "");
                          if (!selectedSource.tags.includes(tagToAdd)) {
                            updateTagsMutation.mutate({
                              sourceId: selectedSource.id,
                              tags: [...selectedSource.tags, tagToAdd],
                            });
                          }
                          setNewTagInput("");
                        }
                      }}
                      className="text-xs h-8 border-slate-200 bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (newTagInput.trim()) {
                          const tagToAdd = newTagInput.trim().replace(/^#/, "");
                          if (!selectedSource.tags.includes(tagToAdd)) {
                            updateTagsMutation.mutate({
                              sourceId: selectedSource.id,
                              tags: [...selectedSource.tags, tagToAdd],
                            });
                          }
                          setNewTagInput("");
                        }
                      }}
                      className="text-xs h-8 px-2.5 bg-[#087F8C] text-white hover:bg-[#076C77]"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Extracted Text Preview */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-700 block">Extracted Content Preview</span>
                  <div className="rounded-xl border border-slate-100 bg-[#FAF9F6] p-3 text-xs text-slate-600 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedSource.textPreview || "No raw text available for this item."}
                  </div>
                </div>

                {/* Structured Facts */}
                {selectedSourceItems.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-700 block">
                      Structured Facts ({selectedSourceItems.length})
                    </span>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {selectedSourceItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1.5 shadow-2xs"
                        >
                          <div className="font-semibold text-slate-900">{item.question}</div>
                          <p className="text-slate-600 text-[11.5px] leading-relaxed">{item.answer}</p>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                            <span className="font-mono text-slate-400">{item.category}</span>
                            <button
                              onClick={() =>
                                approvalMutation.mutate({
                                  itemId: item.id,
                                  approved: !item.approved,
                                })
                              }
                              className={`font-semibold flex items-center gap-1 ${
                                item.approved ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              {item.approved ? (
                                <>
                                  <Check className="size-3" /> Approved
                                </>
                              ) : (
                                "Pending Approval"
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
                Select a document from the workspace to inspect tags and extracted text.
              </div>
            )}
          </div>
        </div>

        {/* MODAL: Add Approved Insurance Fact */}
        {showAddFactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Add Approved Insurance Fact
                </h3>
                <button
                  onClick={() => setShowAddFactModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Question or Caller Trigger</label>
                  <Input
                    placeholder="e.g. What is the waiting period for cashless hospitalization?"
                    value={factQuestion}
                    onChange={(e) => setFactQuestion(e.target.value)}
                    className="border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Approved Official Answer</label>
                  <Textarea
                    rows={4}
                    placeholder="e.g. Inpatient cashless hospitalization requires a minimum 24-hour admission. Daycare procedures listed in Annexure B are covered without 24-hour stay."
                    value={factAnswer}
                    onChange={(e) => setFactAnswer(e.target.value)}
                    className="border-slate-200 text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Category</label>
                  <select
                    value={factCategory}
                    onChange={(e) => setFactCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-xs"
                  >
                    <option value="Coverage & Exclusions">Coverage & Exclusions</option>
                    <option value="Claims Procedures">Claims Procedures</option>
                    <option value="FNOL Guidelines">FNOL Guidelines</option>
                    <option value="Renewal Information">Renewal Information</option>
                    <option value="Operating Hours & Contact">Operating Hours & Contact</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddFactModal(false)}
                  className="text-xs border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!factQuestion.trim() || !factAnswer.trim() || addFactMutation.isPending}
                  onClick={() => addFactMutation.mutate()}
                  className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono"
                >
                  {addFactMutation.isPending ? "Saving..." : "Save Approved Fact"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL / TOOLTIP: How Tags Work */}
        {showTagInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-[#087F8C]" />
                  <h3 className="font-display text-base font-bold text-slate-900">
                    How Document Tags Work
                  </h3>
                </div>
                <button
                  onClick={() => setShowTagInfo(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p>
                  Tags help organize your insurance documents and provide targeted semantic retrieval when callers ask specialized questions.
                </p>
                <div className="space-y-2 pt-1">
                  <div className="rounded-xl border border-slate-100 bg-[#FAF9F6] p-3">
                    <span className="font-bold text-slate-900 block mb-0.5">Product Line Tags</span>
                    <span>#Health, #Motor, #Life, #Property: filter answers by policy product.</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-[#FAF9F6] p-3">
                    <span className="font-bold text-slate-900 block mb-0.5">Workflow Tags</span>
                    <span>#FNOL, #Claims, #Renewal: activate documents during specific call workflows.</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-[#FAF9F6] p-3">
                    <span className="font-bold text-slate-900 block mb-0.5">Audience Scope</span>
                    <span>#Customer-safe, #Staff-only: ensures internal guidelines are not read to policyholders.</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Note: A tag organizes and indexes information. It does not certify legal validity or amend official policy contract terms.
                </p>
              </div>

              <div className="pt-2 text-right">
                <Button
                  size="sm"
                  onClick={() => setShowTagInfo(false)}
                  className="bg-[#087F8C] text-white hover:bg-[#076C77] text-xs font-mono"
                >
                  Got It
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
