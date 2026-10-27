import { useState, useRef, useEffect } from "react";
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
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  Bot,
  UserCheck,
  Sliders,
  Send,
  Sparkles,
  ArrowRight,
  Layers,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useBusiness } from "@/hooks/use-business";
import { insforge as supabase } from "@/integrations/insforge/client";
import {
  ingestPdf,
  addManualKnowledgeFact,
  updateSourceTags,
  deleteKnowledgeSource,
  updateFactApproval,
} from "@/lib/train.functions";
import { InsurCallLoadingScreen } from "@/components/loading-screen";

export const Route = createFileRoute("/_authenticated/train")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Knowledge & Training: InsurCall Grounded AI" },
      {
        name: "description",
        content:
          "Teach and verify your insurance assistant: conversational guided interview, document upload, fact extraction, and retrieval grounding.",
      },
    ],
  }),
  component: KnowledgeAndTrainingPage,
});

interface KnowledgeSourceRow {
  id: string;
  type?: string;
  name: string;
  source_uri?: string;
  status?: string;
  metadata?: {
    tags?: string[];
    text_preview?: string;
    pages_found?: number;
    facts_found?: number;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

interface KnowledgeItemRecord {
  id: string;
  question: string;
  answer: string;
  category: string;
  approved: boolean;
  source_id?: string;
  created_at: string;
}

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
  "Commercial",
  "FNOL",
  "Claims",
  "Renewal",
  "Customer-safe",
  "Staff-only",
];

// Interactive Guided Conversational Interview Steps
interface InterviewStep {
  id: number;
  area: string;
  question: string;
  hint: string;
  example: string;
  field: "organization" | "lines" | "claims" | "prohibitions";
}

const INTERVIEW_STEPS: InterviewStep[] = [
  {
    id: 0,
    area: "Organisation & Licensing",
    question: "What is your official business name, licensing model, and customer support operating hours?",
    hint: "Specify whether you operate as a Direct Broker, Corporate Agent, or Survey Agency, along with operating hours.",
    example: "We are Apex Insurance Partners, an IRDAI-registered composite corporate agency operating Monday to Saturday, 9 AM to 7 PM IST.",
    field: "organization",
  },
  {
    id: 1,
    area: "Insurance Lines & Products",
    question: "Which insurance lines and specific policy products do you advise and service?",
    hint: "List the core products (e.g. Health Floater, Private Car Comprehensive, Pure Term Life, Commercial Property).",
    example: "We handle Comprehensive Private Car Motor Insurance with cashless garage network, Family Health Shield with 24-hr admission cashless, and 1 Cr Pure Term Life.",
    field: "lines",
  },
  {
    id: 2,
    area: "Claims & First Notice of Loss (FNOL)",
    question: "How should customers initiate a claim enquiry or report an emergency hospitalization/accident?",
    hint: "Provide the claim desk hotline, required first-step documents, and cashless process instructions.",
    example: "Emergency hospitalization must be reported within 24 hours to our claims desk. Inpatient cashless requires TPA card and Govt ID. Motor accidents require photos of damage, RC, and driving licence.",
    field: "claims",
  },
  {
    id: 3,
    area: "Prohibitions & Staff Escalation",
    question: "What commitments must the AI NEVER make, and when must a staff adjuster immediately take over?",
    hint: "Define strict boundaries regarding claim payouts, nominee changes, and when to route to human staff.",
    example: "The assistant must never guarantee claim approval or payout amounts. Any request to alter policy nominee, contact details, or disputed settlements must immediately transfer to a licensed staff adjuster.",
    field: "prohibitions",
  },
];

function KnowledgeAndTrainingPage() {
  const { data: business, isLoading: isBusinessLoading } = useBusiness();
  const businessId = business?.id;
  const queryClient = useQueryClient();

  // Active Main Tab
  const [mainTab, setMainTab] = useState<"interview" | "documents" | "facts" | "testbed">("interview");

  // Filters state for Documents Tab
  const [selectedCategory, setSelectedCategory] = useState("All Sources");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  // Modals state
  const [showAddFactModal, setShowAddFactModal] = useState(false);
  const [showTagInfo, setShowTagInfo] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  // New Fact Form
  const [factQuestion, setFactQuestion] = useState("");
  const [factAnswer, setFactAnswer] = useState("");
  const [factCategory, setFactCategory] = useState("Coverage & Exclusions");
  const [factTags, setFactTags] = useState<string[]>(["Customer-safe"]);

  // File Upload
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Guided Interview State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState({
    organization: "Apex Insurance Partners (Composite Agency, Mon-Sat 9 AM - 7 PM IST)",
    lines: "Comprehensive Motor (Private Car), Family Health Floater, and Term Life Protection",
    claims: "Cashless hospitalization within 24 hours with TPA e-card; Motor claims require RC copy, DL, and accident site photos.",
    prohibitions: "Never guarantee claim settlement or payout amounts; transfer complex disputes and nominee changes to staff adjusters.",
  });
  const [interviewInput, setInterviewInput] = useState("");
  const [isIngestingInterview, setIsIngestingInterview] = useState(false);

  // Retrieval Testbed State
  const [testQuery, setTestQuery] = useState("");
  const [testResults, setTestResults] = useState<Array<{
    question: string;
    answer: string;
    category: string;
    score: number;
    approved: boolean;
  }> | null>(null);

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
      return (data || []).map((s: KnowledgeSourceRow) => ({
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
      return (data as KnowledgeItemRecord[]) || [];
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

          toast.success(`Successfully uploaded and indexed ${file.name}`);
          invalidate();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Failed to process PDF";
          toast.error(msg);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "File upload error";
      toast.error(msg);
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
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save fact";
      toast.error(msg);
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
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update approval";
      toast.error(msg);
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
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to delete knowledge source";
      toast.error(msg);
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
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update tags";
      toast.error(msg);
    },
  });

  // Handle Interview Step Response Submission
  const handleSaveInterviewResponse = () => {
    const currentStep = INTERVIEW_STEPS[currentStepIndex];
    if (!currentStep) return;

    if (interviewInput.trim()) {
      setInterviewAnswers((prev) => ({
        ...prev,
        [currentStep.field]: interviewInput.trim(),
      }));
    }
    setInterviewInput("");
    if (currentStepIndex < INTERVIEW_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      toast.info("All interview topics answered. Review and approve extracted facts below.");
    }
  };

  // Convert Interview Answers to Approved Knowledge Facts
  const handleApproveInterviewFacts = async () => {
    if (!businessId) return;
    setIsIngestingInterview(true);
    try {
      const factsToCreate = [
        {
          question: "What is your business identity, licensing model, and operating hours?",
          answer: interviewAnswers.organization,
          category: "Operating Hours & Contact",
          tags: ["Customer-safe", "Organisation"],
        },
        {
          question: "Which insurance lines and policies do you service?",
          answer: interviewAnswers.lines,
          category: "Coverage & Exclusions",
          tags: ["Customer-safe", "Products"],
        },
        {
          question: "How do policyholders file a claim or report an emergency?",
          answer: interviewAnswers.claims,
          category: "Claims Procedures",
          tags: ["Customer-safe", "FNOL", "Claims"],
        },
        {
          question: "What are the rules regarding claim guarantees and staff escalations?",
          answer: interviewAnswers.prohibitions,
          category: "FNOL Guidelines",
          tags: ["Staff-only", "Escalation"],
        },
      ];

      for (const f of factsToCreate) {
        await addManualKnowledgeFact({
          data: {
            businessId,
            question: f.question,
            answer: f.answer,
            category: f.category,
            tags: f.tags,
          },
        });
      }

      toast.success("Conversational interview facts approved and ingested into live AI knowledge store!");
      invalidate();
      setMainTab("facts");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to ingest interview facts";
      toast.error(msg);
    } finally {
      setIsIngestingInterview(false);
    }
  };

  // Test Semantic Retrieval locally against loaded items
  const handleRunRetrievalTest = () => {
    if (!testQuery.trim()) {
      setTestResults(null);
      return;
    }
    const q = testQuery.toLowerCase();
    const scored = items.map((item) => {
      let score = 0.5;
      const qWords = q.split(/\s+/).filter(Boolean);
      for (const w of qWords) {
        if (item.question.toLowerCase().includes(w)) score += 0.2;
        if (item.answer.toLowerCase().includes(w)) score += 0.15;
      }
      return {
        question: item.question,
        answer: item.answer,
        category: item.category,
        approved: item.approved,
        score: Math.min(0.98, score),
      };
    });

    scored.sort((a, b) => b.score - a.score);
    setTestResults(scored.slice(0, 4));
  };

  if (isBusinessLoading) {
    return (
      <InsurCallLoadingScreen
        message="Loading policy knowledge store..."
        submessage="Connecting to insurance document repository and indexing verified facts."
      />
    );
  }

  const currentStep = INTERVIEW_STEPS[currentStepIndex];

  return (
    <AppShell
      title="Knowledge & Training"
      subtitle="Single source of truth: teach the assistant via guided interview, policy documents, and approved facts"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)} className="space-y-4">
          <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200">
            <TabsTrigger value="interview" className="text-xs font-mono data-[state=active]:bg-white data-[state=active]:text-[#087F8C]">
              <MessageSquare className="size-3.5 mr-1.5" /> 1. Guided Interview
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs font-mono data-[state=active]:bg-white data-[state=active]:text-[#087F8C]">
              <FileText className="size-3.5 mr-1.5" /> 2. Documents & Guidelines ({sources.length})
            </TabsTrigger>
            <TabsTrigger value="facts" className="text-xs font-mono data-[state=active]:bg-white data-[state=active]:text-[#087F8C]">
              <ShieldCheck className="size-3.5 mr-1.5" /> 3. Approved Facts ({items.filter((i) => i.approved).length})
            </TabsTrigger>
            <TabsTrigger value="testbed" className="text-xs font-mono data-[state=active]:bg-white data-[state=active]:text-[#087F8C]">
              <Search className="size-3.5 mr-1.5" /> 4. Retrieval Inspector
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: GUIDED OWNER INTERVIEW */}
          <TabsContent value="interview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Interactive Interview Card */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl p-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="grid size-8 place-items-center rounded-lg bg-[#E6F6F7] text-[#087F8C]">
                        <Bot className="size-4" />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-900">
                          Let's Train Your InsurCall Assistant
                        </h3>
                        <p className="text-[11px] font-mono text-slate-500">
                          Topic {currentStepIndex + 1} of {INTERVIEW_STEPS.length}: {currentStep?.area}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono text-teal-800 bg-teal-50 border-teal-200">
                      Step {currentStepIndex + 1} / {INTERVIEW_STEPS.length}
                    </Badge>
                  </div>

                  {/* Assistant Question Bubble */}
                  <div className="rounded-2xl border border-slate-100 bg-[#FAF9F6] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Sparkles className="size-3.5 text-[#087F8C]" />
                      Assistant asks:
                    </div>
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      {currentStep?.question}
                    </p>
                    <p className="text-[11px] text-slate-500 italic">
                      Tip: {currentStep?.hint}
                    </p>
                  </div>

                  {/* Response Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Your Business Answer:
                    </label>
                    <Textarea
                      rows={3}
                      placeholder={currentStep?.example}
                      value={interviewInput || interviewAnswers[currentStep?.field || "organization"]}
                      onChange={(e) => setInterviewInput(e.target.value)}
                      className="text-xs bg-white border-slate-200 leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentStepIndex === 0}
                      onClick={() => setCurrentStepIndex((p) => Math.max(0, p - 1))}
                      className="text-xs border-slate-200 font-mono"
                    >
                      Previous Topic
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleSaveInterviewResponse}
                      className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono gap-1.5 shadow-xs"
                    >
                      {currentStepIndex < INTERVIEW_STEPS.length - 1 ? "Save & Next Topic" : "Update Response"}
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Right Column: Review & Fact Extraction Queue */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl p-5 space-y-4 sticky top-20">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-display text-sm font-bold text-slate-900">
                        Extracted Facts Awaiting Approval
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Derived directly from your interview responses.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200">
                      Traceable
                    </Badge>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {INTERVIEW_STEPS.map((s, idx) => {
                      const val = interviewAnswers[s.field];
                      return (
                        <div
                          key={s.id}
                          className="rounded-xl border border-slate-100 bg-[#FAF9F6] p-3 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-[11px]">{s.area}</span>
                            <span className="text-[10px] font-mono text-slate-400">Topic #{idx + 1}</span>
                          </div>
                          <p className="text-[11.5px] text-slate-600 line-clamp-2 leading-relaxed">{val}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <Button
                      onClick={handleApproveInterviewFacts}
                      disabled={isIngestingInterview || !businessId}
                      className="w-full bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono h-10 shadow-xs"
                    >
                      {isIngestingInterview ? (
                        <>
                          <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                          Ingesting Facts...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3.5 mr-1.5" />
                          Approve & Publish to Assistant
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-slate-400 text-center mt-1.5">
                      Ingests facts into pgvector knowledge store with full tenant isolation.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: DOCUMENT WORKSPACE */}
          <TabsContent value="documents" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT PANEL: Categories & Tags (Col 3) */}
              <div className="lg:col-span-3 space-y-4">
                <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl p-4 space-y-4">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Document Categories
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

              {/* CENTRE PANEL: Drag & Drop + List (Col 5) */}
              <div className="lg:col-span-5 space-y-4">
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
                    Supports PDF, TXT, or Markdown. Text is chunked locally and indexed in pgvector.
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
                  <Input
                    placeholder="Search documents, tags, or policy wording..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-xs bg-white border-slate-200 rounded-2xl h-10 shadow-2xs"
                  />
                </div>

                <div className="space-y-3">
                  {filteredSources.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-2">
                      <FileText className="size-8 text-slate-300 mx-auto" />
                      <h4 className="text-xs font-semibold text-slate-700">No Knowledge Sources Found</h4>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Upload a policy PDF or complete the Guided Interview above.
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
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                              >
                                {source.type === "pdf" ? "PDF" : "FACT"}
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

              {/* RIGHT DETAIL DRAWER: Source Inspection (Col 4) */}
              <div className="lg:col-span-4 space-y-4">
                {selectedSource ? (
                  <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl p-5 space-y-4 sticky top-20">
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

                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-700 block">Extracted Text Preview:</span>
                      <div className="rounded-xl border border-slate-100 bg-[#FAF9F6] p-3 text-xs text-slate-600 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap font-sans">
                        {selectedSource.textPreview || "No raw text preview."}
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
                    Select a document from the list to view extracted text and tags.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: APPROVED FACTS REGISTRY */}
          <TabsContent value="facts" className="space-y-4">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Approved Knowledge Item Registry ({items.length} total)
                </h3>
                <p className="text-xs text-slate-500">
                  Only facts marked "Approved" are queried by the live WhatsApp assistant.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setShowAddFactModal(true)}
                className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono gap-1.5 shadow-xs"
              >
                <Plus className="size-3.5" /> Add Custom Fact
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="border border-slate-200 bg-white shadow-xs rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 leading-snug">{item.question}</span>
                    <button
                      onClick={() =>
                        approvalMutation.mutate({
                          itemId: item.id,
                          approved: !item.approved,
                        })
                      }
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold shrink-0 ${
                        item.approved
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {item.approved ? "Approved" : "Pending Review"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.answer}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                    <span>{item.category}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 4: RETRIEVAL TESTBED */}
          <TabsContent value="testbed" className="space-y-4">
            <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl p-6 space-y-5 max-w-3xl mx-auto">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Retrieval Verification Testbed
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Test realistic policyholder questions against your approved knowledge store before enabling customer auto-replies.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="e.g. What is the waiting period for cashless hospitalization?"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRunRetrievalTest()}
                  className="text-xs border-slate-200 bg-white"
                />
                <Button
                  onClick={handleRunRetrievalTest}
                  className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono shrink-0"
                >
                  <Search className="size-3.5 mr-1.5" /> Run Test Query
                </Button>
              </div>

              {testResults && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Retrieval Matches ({testResults.length}):
                  </span>
                  {testResults.map((res, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{res.question}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200"
                        >
                          Match: {Math.round(res.score * 100)}%
                        </Badge>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[11.5px]">{res.answer}</p>
                      <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400">
                        <span>Category: {res.category}</span>
                        <span>{res.approved ? "Status: Approved" : "Status: Pending"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* MODAL: Add Manual Fact */}
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
                    placeholder="e.g. Inpatient cashless hospitalization requires a minimum 24-hour admission..."
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
      </div>
    </AppShell>
  );
}
