import { t as createServerFn } from "./createServerFn-CIHAFgYl.js";
import { h as createSsrRpc } from "./insurance.functions-BLePgOSY.js";
import { n as Button, t as Badge } from "./badge-CjGhifle.js";
import { t as AppShell } from "./app-shell-DAPYFpRb.js";
import { t as Card } from "./card-3hIMutoJ.js";
import { t as Input } from "./input-U8cX-69P.js";
import { t as Textarea } from "./textarea-B4p8JS7Y.js";
import { n as useBusiness, t as insforge } from "./client-BntXr5t7.js";
import { t as InsurCallLoadingScreen } from "./loading-screen-C2BweBhg.js";
import { useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, CheckCircle2, FileText, HelpCircle, Plus, RefreshCw, Search, ShieldCheck, Tag, Trash2, UploadCloud, X } from "lucide-react";
//#region src/lib/train.functions.ts
var UrlInput = z.object({
	businessId: z.string().uuid(),
	url: z.string().url(),
	tags: z.array(z.string()).default([])
});
var PdfInput = z.object({
	businessId: z.string().uuid(),
	fileName: z.string(),
	dataBase64: z.string(),
	tags: z.array(z.string()).default([])
});
var ManualFactInput = z.object({
	businessId: z.string().uuid(),
	question: z.string().min(3),
	answer: z.string().min(5),
	category: z.string().default("General Policy"),
	tags: z.array(z.string()).default([])
});
var UpdateTagsInput = z.object({
	sourceId: z.string().uuid(),
	tags: z.array(z.string())
});
var DeleteSourceInput = z.object({
	sourceId: z.string().uuid(),
	businessId: z.string().uuid()
});
var UpdateFactApprovalInput = z.object({
	itemId: z.string().uuid(),
	approved: z.boolean()
});
createServerFn({ method: "POST" }).validator((input) => UrlInput.parse(input)).handler(createSsrRpc("30b3c40666e3a649c722016e64cf27e46474ea264e221b35fa0ce9a5f353bc3f"));
var ingestPdf = createServerFn({ method: "POST" }).validator((input) => PdfInput.parse(input)).handler(createSsrRpc("a9a6d23ed07ddbebe173310a0a6c061a2b8bec4ffe73fbfa9d76133f8a8e3bf1"));
var addManualKnowledgeFact = createServerFn({ method: "POST" }).validator((input) => ManualFactInput.parse(input)).handler(createSsrRpc("dc62199feb418d8ca8b63a4755a7c7d289be696a8347f1dbc86cea837fc1d3ca"));
var updateSourceTags = createServerFn({ method: "POST" }).validator((input) => UpdateTagsInput.parse(input)).handler(createSsrRpc("2f498c0c8405a7751d754d77003ccac5dd23f9f4c332523ea07c041e9fc40280"));
var deleteKnowledgeSource = createServerFn({ method: "POST" }).validator((input) => DeleteSourceInput.parse(input)).handler(createSsrRpc("7454f1d6c992b9658394646b9371701a0b47f208f8f3eb043b311ddb4ed48be5"));
var updateFactApproval = createServerFn({ method: "POST" }).validator((input) => UpdateFactApprovalInput.parse(input)).handler(createSsrRpc("dd7bf7e8224729a1ba7957ee2a3e3dbc0edebc3be59143233cd914063e87b05b"));
var IngestFileInput = z.object({
	tenantId: z.string().uuid(),
	agentId: z.string().uuid(),
	fileName: z.string(),
	fileBase64: z.string(),
	fileType: z.enum([
		"pdf",
		"docx",
		"txt",
		"md",
		"csv",
		"xlsx"
	])
});
createServerFn({ method: "POST" }).validator((input) => IngestFileInput.parse(input)).handler(createSsrRpc("4eb17008fca282d08c58dab8295c203017f5afa0af2beafca75413bb0d495c0f"));
var IngestApprovedUrlInput = z.object({
	tenantId: z.string().uuid(),
	agentId: z.string().uuid(),
	url: z.string().url()
});
createServerFn({ method: "POST" }).validator((input) => IngestApprovedUrlInput.parse(input)).handler(createSsrRpc("c43b8be1c8464b3786c5737303caae42b2a627ac15566079bfec301eec8d3b0a"));
var QueryGroundedInput = z.object({
	tenantId: z.string().uuid(),
	agentId: z.string().uuid(),
	query: z.string().min(2)
});
createServerFn({ method: "POST" }).validator((input) => QueryGroundedInput.parse(input)).handler(createSsrRpc("8396ad4bde3c18d1f5b79c4271ecf98c8f9fca02c6cf052fd377c2bbea800d29"));
//#endregion
//#region src/routes/_authenticated/train.tsx?tsr-split=component
var PRESET_CATEGORIES = [
	"All Sources",
	"Policy Documents",
	"Coverage & Exclusions",
	"Claims Procedures",
	"FNOL Guidelines",
	"Renewal Information",
	"Approved Facts"
];
var PRESET_TAGS = [
	"Health",
	"Motor",
	"Life",
	"Property",
	"FNOL",
	"Claims",
	"Renewal",
	"Customer-safe",
	"Staff-only",
	"IRDAI Guidelines"
];
function KnowledgeBasePage() {
	const { data: business, isLoading: isBusinessLoading } = useBusiness();
	const businessId = business?.id;
	const queryClient = useQueryClient();
	const [selectedCategory, setSelectedCategory] = useState("All Sources");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTag, setSelectedTag] = useState(null);
	const [selectedSourceId, setSelectedSourceId] = useState(null);
	const [showAddFactModal, setShowAddFactModal] = useState(false);
	const [showTagInfo, setShowTagInfo] = useState(false);
	const [newTagInput, setNewTagInput] = useState("");
	const [factQuestion, setFactQuestion] = useState("");
	const [factAnswer, setFactAnswer] = useState("");
	const [factCategory, setFactCategory] = useState("Coverage & Exclusions");
	const [factTags, setFactTags] = useState(["Customer-safe"]);
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef(null);
	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ["training", businessId] });
	};
	const sourcesQuery = useQuery({
		queryKey: [
			"training",
			"sources",
			businessId
		],
		enabled: !!businessId,
		queryFn: async () => {
			const { data, error } = await insforge.database.from("knowledge_sources").select("id, type, name, source_uri, status, metadata, created_at, updated_at").or(`tenant_id.eq.${businessId},business_id.eq.${businessId}`).order("created_at", { ascending: false });
			if (error) throw error;
			return (data || []).map((s) => ({
				id: s.id,
				type: s.type || "document",
				name: s.name,
				sourceUri: s.source_uri,
				status: s.status || "done",
				tags: s.metadata?.tags || [],
				textPreview: s.metadata?.text_preview || "",
				pagesFound: s.metadata?.pages_found ?? 1,
				factsFound: s.metadata?.facts_found ?? 1,
				createdAt: s.created_at,
				updatedAt: s.updated_at
			}));
		}
	});
	const itemsQuery = useQuery({
		queryKey: [
			"training",
			"items",
			businessId
		],
		enabled: !!businessId,
		queryFn: async () => {
			const { data, error } = await insforge.database.from("knowledge_items").select("id, question, answer, category, approved, source_id, created_at").or(`tenant_id.eq.${businessId},business_id.eq.${businessId}`).order("created_at", { ascending: false });
			if (error) throw error;
			return data || [];
		}
	});
	const sources = sourcesQuery.data || [];
	const items = itemsQuery.data || [];
	const filteredSources = sources.filter((s) => {
		const matchesSearch = searchQuery === "" || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) || s.textPreview.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesTag = !selectedTag || s.tags.includes(selectedTag);
		const matchesCategory = selectedCategory === "All Sources" || selectedCategory === "Policy Documents" && s.type === "pdf" || selectedCategory === "Approved Facts" && s.type === "approved_response" || s.tags.some((t) => t.toLowerCase().includes(selectedCategory.toLowerCase()));
		return matchesSearch && matchesTag && matchesCategory;
	});
	const selectedSource = sources.find((s) => s.id === selectedSourceId) || filteredSources[0] || null;
	const selectedSourceItems = selectedSource ? items.filter((i) => i.source_id === selectedSource.id) : [];
	const handleFileUpload = async (files) => {
		if (!files || files.length === 0 || !businessId) return;
		const file = files[0];
		if (!file) return;
		setIsUploading(true);
		try {
			const reader = new FileReader();
			reader.onload = async () => {
				try {
					const base64 = reader.result.split(",")[1];
					if (!base64) throw new Error("Could not read file data.");
					await ingestPdf({ data: {
						businessId,
						fileName: file.name,
						dataBase64: base64,
						tags: ["Policy Document", "Customer-safe"]
					} });
					toast.success(`Successfully uploaded and extracted facts from ${file.name}`);
					invalidate();
				} catch (e) {
					toast.error(e?.message || "Failed to process PDF.");
				} finally {
					setIsUploading(false);
				}
			};
			reader.readAsDataURL(file);
		} catch (e) {
			toast.error(e?.message || "File upload error.");
			setIsUploading(false);
		}
	};
	const addFactMutation = useMutation({
		mutationFn: async () => {
			if (!businessId) throw new Error("Tenant session missing.");
			return addManualKnowledgeFact({ data: {
				businessId,
				question: factQuestion.trim(),
				answer: factAnswer.trim(),
				category: factCategory,
				tags: factTags
			} });
		},
		onSuccess: () => {
			toast.success("Approved insurance fact saved to knowledge store.");
			setShowAddFactModal(false);
			setFactQuestion("");
			setFactAnswer("");
			invalidate();
		},
		onError: (err) => {
			toast.error(err?.message || "Failed to save fact.");
		}
	});
	const updateTagsMutation = useMutation({
		mutationFn: async ({ sourceId, tags }) => {
			return updateSourceTags({ data: {
				sourceId,
				tags
			} });
		},
		onSuccess: () => {
			toast.success("Document tags updated.");
			invalidate();
		},
		onError: (err) => {
			toast.error(err?.message || "Failed to update tags.");
		}
	});
	const deleteSourceMutation = useMutation({
		mutationFn: async (sourceId) => {
			if (!businessId) throw new Error("Tenant session missing.");
			return deleteKnowledgeSource({ data: {
				sourceId,
				businessId
			} });
		},
		onSuccess: () => {
			toast.success("Knowledge source deleted.");
			if (selectedSourceId) setSelectedSourceId(null);
			invalidate();
		},
		onError: (err) => {
			toast.error(err?.message || "Failed to delete knowledge source.");
		}
	});
	const approvalMutation = useMutation({
		mutationFn: async ({ itemId, approved }) => {
			return updateFactApproval({ data: {
				itemId,
				approved
			} });
		},
		onSuccess: () => {
			toast.success("Fact approval status updated.");
			invalidate();
		},
		onError: (err) => {
			toast.error(err?.message || "Failed to update approval.");
		}
	});
	if (isBusinessLoading) return /* @__PURE__ */ jsx(InsurCallLoadingScreen, {
		message: "Loading policy knowledge store...",
		submessage: "Connecting to insurance document repository and indexing verified facts."
	});
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Policy Knowledge Store",
		subtitle: "Organized insurance document workspace with verified facts, tag management, and retrieval inspection.",
		children: /* @__PURE__ */ jsxs("div", {
			className: "space-y-6",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "space-y-1",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "inline-flex items-center gap-1.5 rounded-full bg-[#E6F6F7] px-2.5 py-0.5 text-xs font-semibold text-[#087F8C] border border-[#087F8C]/20",
									children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "size-3.5" }), "Verified Knowledge Only"]
								}), /* @__PURE__ */ jsxs("span", {
									className: "text-xs font-mono text-slate-400",
									children: [
										sources.length,
										" sources • ",
										items.filter((i) => i.approved).length,
										" approved facts"
									]
								})]
							}),
							/* @__PURE__ */ jsx("h2", {
								className: "font-display text-lg font-bold text-slate-900",
								children: "Autonomous Assistant Grounding"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-xs text-slate-500 max-w-xl",
								children: "Documents uploaded here are extracted into structured facts. The AI strictly answers queries using approved facts, avoiding hallucinations."
							})
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2.5 shrink-0",
						children: [/* @__PURE__ */ jsxs(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => setShowTagInfo(true),
							className: "text-xs gap-1.5 border-slate-200 text-slate-600",
							children: [/* @__PURE__ */ jsx(HelpCircle, { className: "size-3.5 text-[#087F8C]" }), " How Tags Work"]
						}), /* @__PURE__ */ jsxs(Button, {
							size: "sm",
							onClick: () => setShowAddFactModal(true),
							className: "bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono gap-1.5 shadow-xs",
							children: [/* @__PURE__ */ jsx(Plus, { className: "size-3.5" }), " Add Approved Fact"]
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "lg:col-span-3 space-y-4",
							children: /* @__PURE__ */ jsxs(Card, {
								className: "border border-slate-200 bg-white shadow-xs rounded-3xl p-4 space-y-4",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2",
									children: "Knowledge Categories"
								}), /* @__PURE__ */ jsx("div", {
									className: "space-y-1",
									children: PRESET_CATEGORIES.map((cat) => {
										const isActive = selectedCategory === cat;
										return /* @__PURE__ */ jsxs("button", {
											onClick: () => setSelectedCategory(cat),
											className: `w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${isActive ? "bg-[#087F8C] text-white font-semibold shadow-2xs" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`,
											children: [/* @__PURE__ */ jsx("span", { children: cat }), isActive && /* @__PURE__ */ jsx(Check, { className: "size-3" })]
										}, cat);
									})
								})] }), /* @__PURE__ */ jsxs("div", {
									className: "pt-3 border-t border-slate-100",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-between mb-2",
										children: [/* @__PURE__ */ jsx("span", {
											className: "text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block",
											children: "Filter by Tag"
										}), selectedTag && /* @__PURE__ */ jsx("button", {
											onClick: () => setSelectedTag(null),
											className: "text-[10px] font-mono text-[#087F8C] hover:underline",
											children: "Clear"
										})]
									}), /* @__PURE__ */ jsx("div", {
										className: "flex flex-wrap gap-1.5",
										children: PRESET_TAGS.map((tag) => {
											const isSelected = selectedTag === tag;
											return /* @__PURE__ */ jsxs("button", {
												onClick: () => setSelectedTag(isSelected ? null : tag),
												className: `px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${isSelected ? "bg-[#172033] text-white border-[#172033]" : "bg-[#FAF9F6] text-slate-600 border-slate-200 hover:border-slate-300"}`,
												children: ["#", tag]
											}, tag);
										})
									})]
								})]
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "lg:col-span-5 space-y-4",
							children: [
								/* @__PURE__ */ jsxs("div", {
									onDragOver: (e) => {
										e.preventDefault();
										setIsDragging(true);
									},
									onDragLeave: () => setIsDragging(false),
									onDrop: (e) => {
										e.preventDefault();
										setIsDragging(false);
										handleFileUpload(e.dataTransfer.files);
									},
									onClick: () => fileInputRef.current?.click(),
									className: `cursor-pointer rounded-3xl border-2 border-dashed p-6 text-center transition-all ${isDragging ? "border-[#087F8C] bg-[#E6F6F7]/40 scale-[0.99]" : "border-slate-200 bg-white hover:border-[#087F8C]/50 hover:bg-[#FAF9F6]"}`,
									children: [
										/* @__PURE__ */ jsx("input", {
											ref: fileInputRef,
											type: "file",
											accept: ".pdf,.txt,.md",
											className: "hidden",
											onChange: (e) => handleFileUpload(e.target.files)
										}),
										/* @__PURE__ */ jsx("div", {
											className: "grid size-12 place-items-center rounded-2xl bg-[#FAF9F6] border border-slate-200 text-[#087F8C] mx-auto mb-3 shadow-2xs",
											children: isUploading ? /* @__PURE__ */ jsx(RefreshCw, { className: "size-5 animate-spin" }) : /* @__PURE__ */ jsx(UploadCloud, { className: "size-5" })
										}),
										/* @__PURE__ */ jsx("h4", {
											className: "text-xs font-bold text-slate-900",
											children: isUploading ? "Extracting policy text..." : "Drop policy PDF, guidelines, or rate card here"
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-[11px] text-slate-400 mt-1 max-w-xs mx-auto",
											children: "Supports PDF, TXT, or Markdown. Text is extracted locally with zero external leaks."
										})
									]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "relative",
									children: [/* @__PURE__ */ jsx(Search, { className: "absolute left-3.5 top-3 size-4 text-slate-400" }), /* @__PURE__ */ jsx(Input, {
										placeholder: "Search documents, tags, or extracted policy wording...",
										value: searchQuery,
										onChange: (e) => setSearchQuery(e.target.value),
										className: "pl-10 text-xs bg-white border-slate-200 rounded-2xl h-10 shadow-2xs"
									})]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "space-y-3",
									children: filteredSources.length === 0 ? /* @__PURE__ */ jsxs("div", {
										className: "rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-2",
										children: [
											/* @__PURE__ */ jsx(FileText, { className: "size-8 text-slate-300 mx-auto" }),
											/* @__PURE__ */ jsx("h4", {
												className: "text-xs font-semibold text-slate-700",
												children: "No Knowledge Sources Found"
											}),
											/* @__PURE__ */ jsx("p", {
												className: "text-[11px] text-slate-400 max-w-xs mx-auto",
												children: "Upload a policy PDF or click \"Add Approved Fact\" to populate your carrier knowledge base."
											})
										]
									}) : filteredSources.map((source) => {
										const isSelected = selectedSource?.id === source.id;
										return /* @__PURE__ */ jsx("div", {
											onClick: () => setSelectedSourceId(source.id),
											className: `cursor-pointer rounded-2xl border p-4 transition-all ${isSelected ? "border-[#087F8C] bg-white ring-1 ring-[#087F8C] shadow-xs" : "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"}`,
											children: /* @__PURE__ */ jsxs("div", {
												className: "flex items-start justify-between gap-3",
												children: [/* @__PURE__ */ jsxs("div", {
													className: "flex items-start gap-3",
													children: [/* @__PURE__ */ jsx("span", {
														className: `grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${source.type === "pdf" ? "bg-rose-50 text-rose-700 border border-rose-200" : source.type === "url" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`,
														children: source.type === "pdf" ? "PDF" : source.type === "url" ? "WEB" : "FACT"
													}), /* @__PURE__ */ jsxs("div", {
														className: "space-y-1",
														children: [
															/* @__PURE__ */ jsx("h4", {
																className: "text-xs font-bold text-slate-900 line-clamp-1",
																children: source.name
															}),
															/* @__PURE__ */ jsx("p", {
																className: "text-[11px] text-slate-500 line-clamp-2 leading-relaxed",
																children: source.textPreview || "Extracted policy wording ready for retrieval."
															}),
															/* @__PURE__ */ jsx("div", {
																className: "flex flex-wrap items-center gap-1.5 pt-1",
																children: source.tags.map((t) => /* @__PURE__ */ jsxs("span", {
																	className: "inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600",
																	children: ["#", t]
																}, t))
															})
														]
													})]
												}), /* @__PURE__ */ jsx(Badge, {
													variant: "outline",
													className: "shrink-0 text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200",
													children: "Indexed"
												})]
											})
										}, source.id);
									})
								})
							]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "lg:col-span-4 space-y-4",
							children: selectedSource ? /* @__PURE__ */ jsxs(Card, {
								className: "border border-slate-200 bg-white shadow-xs rounded-3xl p-5 space-y-5 sticky top-20",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-start justify-between gap-2 pb-3 border-b border-slate-100",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-[10px] font-mono text-slate-400 uppercase tracking-wider",
												children: "Selected Document"
											}), /* @__PURE__ */ jsx("h3", {
												className: "text-sm font-bold text-slate-900 line-clamp-2",
												children: selectedSource.name
											})]
										}), /* @__PURE__ */ jsx(Button, {
											variant: "ghost",
											size: "sm",
											onClick: () => {
												if (confirm(`Delete knowledge source "${selectedSource.name}"?`)) deleteSourceMutation.mutate(selectedSource.id);
											},
											className: "size-8 p-0 text-slate-400 hover:text-rose-600 rounded-lg",
											children: /* @__PURE__ */ jsx(Trash2, { className: "size-4" })
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-2 gap-2 text-xs",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "rounded-xl border border-slate-100 bg-[#FAF9F6] p-2.5",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-[10px] font-mono text-slate-400 block",
												children: "Status"
											}), /* @__PURE__ */ jsxs("span", {
												className: "font-semibold text-emerald-700 flex items-center gap-1 mt-0.5",
												children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "size-3" }), " Indexed & Ready"]
											})]
										}), /* @__PURE__ */ jsxs("div", {
											className: "rounded-xl border border-slate-100 bg-[#FAF9F6] p-2.5",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-[10px] font-mono text-slate-400 block",
												children: "Facts Extracted"
											}), /* @__PURE__ */ jsxs("span", {
												className: "font-semibold text-slate-800 mt-0.5 block",
												children: [selectedSourceItems.length || selectedSource.factsFound || 1, " Facts"]
											})]
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-2",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ jsxs("span", {
													className: "text-xs font-semibold text-slate-700 flex items-center gap-1",
													children: [/* @__PURE__ */ jsx(Tag, { className: "size-3.5 text-[#087F8C]" }), " Tags"]
												}), /* @__PURE__ */ jsx("span", {
													className: "text-[10px] font-mono text-slate-400",
													children: "Controls retrieval scope"
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "flex flex-wrap gap-1.5 min-h-8 p-2 rounded-xl border border-slate-200 bg-[#FAF9F6]",
												children: [selectedSource.tags.map((t) => /* @__PURE__ */ jsxs("span", {
													className: "inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-700 shadow-2xs",
													children: [
														"#",
														t,
														/* @__PURE__ */ jsx("button", {
															type: "button",
															onClick: () => {
																const newTags = selectedSource.tags.filter((x) => x !== t);
																updateTagsMutation.mutate({
																	sourceId: selectedSource.id,
																	tags: newTags
																});
															},
															className: "text-slate-400 hover:text-rose-600",
															children: /* @__PURE__ */ jsx(X, { className: "size-3" })
														})
													]
												}, t)), selectedSource.tags.length === 0 && /* @__PURE__ */ jsx("span", {
													className: "text-xs text-slate-400",
													children: "No tags assigned"
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "flex gap-1.5 pt-1",
												children: [/* @__PURE__ */ jsx(Input, {
													placeholder: "Add tag (e.g. Health, Motor)...",
													value: newTagInput,
													onChange: (e) => setNewTagInput(e.target.value),
													onKeyDown: (e) => {
														if (e.key === "Enter" && newTagInput.trim()) {
															const tagToAdd = newTagInput.trim().replace(/^#/, "");
															if (!selectedSource.tags.includes(tagToAdd)) updateTagsMutation.mutate({
																sourceId: selectedSource.id,
																tags: [...selectedSource.tags, tagToAdd]
															});
															setNewTagInput("");
														}
													},
													className: "text-xs h-8 border-slate-200 bg-white"
												}), /* @__PURE__ */ jsx(Button, {
													type: "button",
													size: "sm",
													onClick: () => {
														if (newTagInput.trim()) {
															const tagToAdd = newTagInput.trim().replace(/^#/, "");
															if (!selectedSource.tags.includes(tagToAdd)) updateTagsMutation.mutate({
																sourceId: selectedSource.id,
																tags: [...selectedSource.tags, tagToAdd]
															});
															setNewTagInput("");
														}
													},
													className: "text-xs h-8 px-2.5 bg-[#087F8C] text-white hover:bg-[#076C77]",
													children: "Add"
												})]
											})
										]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5 pt-2 border-t border-slate-100",
										children: [/* @__PURE__ */ jsx("span", {
											className: "text-xs font-semibold text-slate-700 block",
											children: "Extracted Content Preview"
										}), /* @__PURE__ */ jsx("div", {
											className: "rounded-xl border border-slate-100 bg-[#FAF9F6] p-3 text-xs text-slate-600 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap font-sans",
											children: selectedSource.textPreview || "No raw text available for this item."
										})]
									}),
									selectedSourceItems.length > 0 && /* @__PURE__ */ jsxs("div", {
										className: "space-y-2 pt-2 border-t border-slate-100",
										children: [/* @__PURE__ */ jsxs("span", {
											className: "text-xs font-semibold text-slate-700 block",
											children: [
												"Structured Facts (",
												selectedSourceItems.length,
												")"
											]
										}), /* @__PURE__ */ jsx("div", {
											className: "space-y-2 max-h-52 overflow-y-auto pr-1",
											children: selectedSourceItems.map((item) => /* @__PURE__ */ jsxs("div", {
												className: "rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1.5 shadow-2xs",
												children: [
													/* @__PURE__ */ jsx("div", {
														className: "font-semibold text-slate-900",
														children: item.question
													}),
													/* @__PURE__ */ jsx("p", {
														className: "text-slate-600 text-[11.5px] leading-relaxed",
														children: item.answer
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]",
														children: [/* @__PURE__ */ jsx("span", {
															className: "font-mono text-slate-400",
															children: item.category
														}), /* @__PURE__ */ jsx("button", {
															onClick: () => approvalMutation.mutate({
																itemId: item.id,
																approved: !item.approved
															}),
															className: `font-semibold flex items-center gap-1 ${item.approved ? "text-emerald-700" : "text-amber-700"}`,
															children: item.approved ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Check, { className: "size-3" }), " Approved"] }) : "Pending Approval"
														})]
													})
												]
											}, item.id))
										})]
									})
								]
							}) : /* @__PURE__ */ jsx("div", {
								className: "rounded-3xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400",
								children: "Select a document from the workspace to inspect tags and extracted text."
							})
						})
					]
				}),
				showAddFactModal && /* @__PURE__ */ jsx("div", {
					className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4",
					children: /* @__PURE__ */ jsxs("div", {
						className: "w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between pb-3 border-b border-slate-100",
								children: [/* @__PURE__ */ jsx("h3", {
									className: "font-display text-base font-bold text-slate-900",
									children: "Add Approved Insurance Fact"
								}), /* @__PURE__ */ jsx("button", {
									onClick: () => setShowAddFactModal(false),
									className: "rounded-lg p-1 text-slate-400 hover:text-slate-600",
									children: /* @__PURE__ */ jsx(X, { className: "size-4" })
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-3 text-xs",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ jsx("label", {
											className: "font-semibold text-slate-700",
											children: "Question or Caller Trigger"
										}), /* @__PURE__ */ jsx(Input, {
											placeholder: "e.g. What is the waiting period for cashless hospitalization?",
											value: factQuestion,
											onChange: (e) => setFactQuestion(e.target.value),
											className: "border-slate-200 text-xs"
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ jsx("label", {
											className: "font-semibold text-slate-700",
											children: "Approved Official Answer"
										}), /* @__PURE__ */ jsx(Textarea, {
											rows: 4,
											placeholder: "e.g. Inpatient cashless hospitalization requires a minimum 24-hour admission. Daycare procedures listed in Annexure B are covered without 24-hour stay.",
											value: factAnswer,
											onChange: (e) => setFactAnswer(e.target.value),
											className: "border-slate-200 text-xs leading-relaxed"
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ jsx("label", {
											className: "font-semibold text-slate-700",
											children: "Category"
										}), /* @__PURE__ */ jsxs("select", {
											value: factCategory,
											onChange: (e) => setFactCategory(e.target.value),
											className: "w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-xs",
											children: [
												/* @__PURE__ */ jsx("option", {
													value: "Coverage & Exclusions",
													children: "Coverage & Exclusions"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "Claims Procedures",
													children: "Claims Procedures"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "FNOL Guidelines",
													children: "FNOL Guidelines"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "Renewal Information",
													children: "Renewal Information"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "Operating Hours & Contact",
													children: "Operating Hours & Contact"
												})
											]
										})]
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-end gap-2 pt-3 border-t border-slate-100",
								children: [/* @__PURE__ */ jsx(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => setShowAddFactModal(false),
									className: "text-xs border-slate-200",
									children: "Cancel"
								}), /* @__PURE__ */ jsx(Button, {
									size: "sm",
									disabled: !factQuestion.trim() || !factAnswer.trim() || addFactMutation.isPending,
									onClick: () => addFactMutation.mutate(),
									className: "bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono",
									children: addFactMutation.isPending ? "Saving..." : "Save Approved Fact"
								})]
							})
						]
					})
				}),
				showTagInfo && /* @__PURE__ */ jsx("div", {
					className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4",
					children: /* @__PURE__ */ jsxs("div", {
						className: "w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between pb-3 border-b border-slate-100",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ jsx(Tag, { className: "size-4 text-[#087F8C]" }), /* @__PURE__ */ jsx("h3", {
										className: "font-display text-base font-bold text-slate-900",
										children: "How Document Tags Work"
									})]
								}), /* @__PURE__ */ jsx("button", {
									onClick: () => setShowTagInfo(false),
									className: "rounded-lg p-1 text-slate-400 hover:text-slate-600",
									children: /* @__PURE__ */ jsx(X, { className: "size-4" })
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-3 text-xs text-slate-600 leading-relaxed",
								children: [
									/* @__PURE__ */ jsx("p", { children: "Tags help organize your insurance documents and provide targeted semantic retrieval when callers ask specialized questions." }),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-2 pt-1",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-xl border border-slate-100 bg-[#FAF9F6] p-3",
												children: [/* @__PURE__ */ jsx("span", {
													className: "font-bold text-slate-900 block mb-0.5",
													children: "Product Line Tags"
												}), /* @__PURE__ */ jsx("span", { children: "#Health, #Motor, #Life, #Property: filter answers by policy product." })]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-xl border border-slate-100 bg-[#FAF9F6] p-3",
												children: [/* @__PURE__ */ jsx("span", {
													className: "font-bold text-slate-900 block mb-0.5",
													children: "Workflow Tags"
												}), /* @__PURE__ */ jsx("span", { children: "#FNOL, #Claims, #Renewal: activate documents during specific call workflows." })]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-xl border border-slate-100 bg-[#FAF9F6] p-3",
												children: [/* @__PURE__ */ jsx("span", {
													className: "font-bold text-slate-900 block mb-0.5",
													children: "Audience Scope"
												}), /* @__PURE__ */ jsx("span", { children: "#Customer-safe, #Staff-only: ensures internal guidelines are not read to policyholders." })]
											})
										]
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-[11px] text-slate-400 italic",
										children: "Note: A tag organizes and indexes information. It does not certify legal validity or amend official policy contract terms."
									})
								]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "pt-2 text-right",
								children: /* @__PURE__ */ jsx(Button, {
									size: "sm",
									onClick: () => setShowTagInfo(false),
									className: "bg-[#087F8C] text-white hover:bg-[#076C77] text-xs font-mono",
									children: "Got It"
								})
							})
						]
					})
				})
			]
		})
	});
}
//#endregion
export { KnowledgeBasePage as component };
