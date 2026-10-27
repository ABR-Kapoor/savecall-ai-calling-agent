import { t as createServerFn } from "./createServerFn-CIHAFgYl.js";
import { t as insforgeServer } from "./client.server-97EpFyCS.js";
import { t as createServerRpc } from "./createServerRpc-B90ckaqP.js";
import { z } from "zod";
import { randomUUID } from "crypto";
//#region src/lib/train.functions.ts?tss-serverfn-split
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
var ingestUrl_createServerFn_handler = createServerRpc({
	id: "30b3c40666e3a649c722016e64cf27e46474ea264e221b35fa0ce9a5f353bc3f",
	name: "ingestUrl",
	filename: "src/lib/train.functions.ts"
}, (opts) => ingestUrl.__executeServer(opts));
var ingestUrl = createServerFn({ method: "POST" }).validator((input) => UrlInput.parse(input)).handler(ingestUrl_createServerFn_handler, async ({ data }) => {
	const { scrapeUrl } = await import("./ingest.server-C3yFfdFg.js");
	const result = await scrapeUrl(data.url);
	const sourceId = randomUUID();
	const { data: source, error: sourceErr } = await insforgeServer.database.from("knowledge_sources").insert([{
		id: sourceId,
		tenant_id: data.businessId,
		business_id: data.businessId,
		type: "url",
		name: data.url,
		source_uri: data.url,
		status: result.skippedByRobots ? "blocked" : "done",
		metadata: {
			pages_found: result.pagesFound,
			facts_found: result.facts.length,
			tags: data.tags.length > 0 ? data.tags : ["Web Source", "FAQ"],
			text_preview: result.facts[0]?.answer?.slice(0, 300) || "Scraped web facts"
		}
	}]).select("id").maybeSingle();
	if (sourceErr) throw new Error(sourceErr.message);
	if (result.facts.length > 0) await insforgeServer.database.from("knowledge_items").insert(result.facts.map((f) => ({
		id: randomUUID(),
		tenant_id: data.businessId,
		business_id: data.businessId,
		source_id: sourceId,
		question: f.question,
		answer: f.answer,
		category: f.category || "General",
		approved: false
	})));
	return {
		sourceId,
		pagesFound: result.pagesFound,
		factsFound: result.facts.length,
		facts: result.facts,
		skippedByRobots: result.skippedByRobots
	};
});
var ingestPdf_createServerFn_handler = createServerRpc({
	id: "a9a6d23ed07ddbebe173310a0a6c061a2b8bec4ffe73fbfa9d76133f8a8e3bf1",
	name: "ingestPdf",
	filename: "src/lib/train.functions.ts"
}, (opts) => ingestPdf.__executeServer(opts));
var ingestPdf = createServerFn({ method: "POST" }).validator((input) => PdfInput.parse(input)).handler(ingestPdf_createServerFn_handler, async ({ data }) => {
	const { factsFromPdf } = await import("./ingest.server-C3yFfdFg.js");
	const result = await factsFromPdf(Buffer.from(data.dataBase64, "base64"), data.fileName);
	const sourceId = randomUUID();
	const initialTags = data.tags.length > 0 ? data.tags : ["Policy Document", "Customer-safe"];
	const { error: sourceErr } = await insforgeServer.database.from("knowledge_sources").insert([{
		id: sourceId,
		tenant_id: data.businessId,
		business_id: data.businessId,
		type: "pdf",
		name: data.fileName,
		source_uri: `file://${data.fileName}`,
		status: "done",
		metadata: {
			pages_found: result.pages,
			facts_found: result.facts.length,
			tags: initialTags,
			text_preview: result.facts.map((f) => f.answer).join("\n\n").slice(0, 500) || "Extracted policy wording"
		}
	}]);
	if (sourceErr) throw new Error(sourceErr.message);
	if (result.facts.length > 0) await insforgeServer.database.from("knowledge_items").insert(result.facts.map((f) => ({
		id: randomUUID(),
		tenant_id: data.businessId,
		business_id: data.businessId,
		source_id: sourceId,
		question: f.question,
		answer: f.answer,
		category: f.category || "Policy Coverage",
		approved: false
	})));
	return {
		sourceId,
		pagesFound: result.pages,
		factsFound: result.facts.length,
		facts: result.facts,
		skippedByRobots: false
	};
});
var addManualKnowledgeFact_createServerFn_handler = createServerRpc({
	id: "dc62199feb418d8ca8b63a4755a7c7d289be696a8347f1dbc86cea837fc1d3ca",
	name: "addManualKnowledgeFact",
	filename: "src/lib/train.functions.ts"
}, (opts) => addManualKnowledgeFact.__executeServer(opts));
var addManualKnowledgeFact = createServerFn({ method: "POST" }).validator((input) => ManualFactInput.parse(input)).handler(addManualKnowledgeFact_createServerFn_handler, async ({ data }) => {
	const sourceId = randomUUID();
	const itemId = randomUUID();
	const { error: srcErr } = await insforgeServer.database.from("knowledge_sources").insert([{
		id: sourceId,
		tenant_id: data.businessId,
		business_id: data.businessId,
		type: "approved_response",
		name: data.question,
		source_uri: "manual://fact",
		status: "done",
		metadata: {
			pages_found: 1,
			facts_found: 1,
			tags: data.tags.length > 0 ? data.tags : ["Approved response", "Customer-safe"],
			text_preview: data.answer
		}
	}]);
	if (srcErr) throw new Error(srcErr.message);
	const { error: itemErr } = await insforgeServer.database.from("knowledge_items").insert([{
		id: itemId,
		tenant_id: data.businessId,
		business_id: data.businessId,
		source_id: sourceId,
		question: data.question,
		answer: data.answer,
		category: data.category,
		approved: true
	}]);
	if (itemErr) throw new Error(itemErr.message);
	return {
		ok: true,
		sourceId,
		itemId
	};
});
var updateSourceTags_createServerFn_handler = createServerRpc({
	id: "2f498c0c8405a7751d754d77003ccac5dd23f9f4c332523ea07c041e9fc40280",
	name: "updateSourceTags",
	filename: "src/lib/train.functions.ts"
}, (opts) => updateSourceTags.__executeServer(opts));
var updateSourceTags = createServerFn({ method: "POST" }).validator((input) => UpdateTagsInput.parse(input)).handler(updateSourceTags_createServerFn_handler, async ({ data }) => {
	const { data: source, error: fetchErr } = await insforgeServer.database.from("knowledge_sources").select("id, metadata").eq("id", data.sourceId).maybeSingle();
	if (fetchErr || !source) throw new Error("Knowledge source not found.");
	const meta = source.metadata || {};
	meta.tags = data.tags;
	const { error: updateErr } = await insforgeServer.database.from("knowledge_sources").update({
		metadata: meta,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", data.sourceId);
	if (updateErr) throw new Error(updateErr.message);
	return { ok: true };
});
var deleteKnowledgeSource_createServerFn_handler = createServerRpc({
	id: "7454f1d6c992b9658394646b9371701a0b47f208f8f3eb043b311ddb4ed48be5",
	name: "deleteKnowledgeSource",
	filename: "src/lib/train.functions.ts"
}, (opts) => deleteKnowledgeSource.__executeServer(opts));
var deleteKnowledgeSource = createServerFn({ method: "POST" }).validator((input) => DeleteSourceInput.parse(input)).handler(deleteKnowledgeSource_createServerFn_handler, async ({ data }) => {
	await insforgeServer.database.from("document_chunks").delete().eq("source_id", data.sourceId);
	await insforgeServer.database.from("agent_knowledge_sources").delete().eq("source_id", data.sourceId);
	await insforgeServer.database.from("knowledge_items").delete().eq("source_id", data.sourceId);
	const { error } = await insforgeServer.database.from("knowledge_sources").delete().eq("id", data.sourceId);
	if (error) throw new Error(error.message);
	return { ok: true };
});
var updateFactApproval_createServerFn_handler = createServerRpc({
	id: "dd7bf7e8224729a1ba7957ee2a3e3dbc0edebc3be59143233cd914063e87b05b",
	name: "updateFactApproval",
	filename: "src/lib/train.functions.ts"
}, (opts) => updateFactApproval.__executeServer(opts));
var updateFactApproval = createServerFn({ method: "POST" }).validator((input) => UpdateFactApprovalInput.parse(input)).handler(updateFactApproval_createServerFn_handler, async ({ data }) => {
	const { error } = await insforgeServer.database.from("knowledge_items").update({ approved: data.approved }).eq("id", data.itemId);
	if (error) throw new Error(error.message);
	return { ok: true };
});
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
var ingestKnowledgeFile_createServerFn_handler = createServerRpc({
	id: "4eb17008fca282d08c58dab8295c203017f5afa0af2beafca75413bb0d495c0f",
	name: "ingestKnowledgeFile",
	filename: "src/lib/train.functions.ts"
}, (opts) => ingestKnowledgeFile.__executeServer(opts));
var ingestKnowledgeFile = createServerFn({ method: "POST" }).validator((input) => IngestFileInput.parse(input)).handler(ingestKnowledgeFile_createServerFn_handler, async ({ data }) => {
	const { ingestDocument } = await import("./ingestion.server-BDtH0sxt.js");
	const buffer = Buffer.from(data.fileBase64, "base64");
	return ingestDocument({
		tenantId: data.tenantId,
		agentId: data.agentId,
		sourceName: data.fileName,
		sourceType: data.fileType,
		fileBuffer: buffer
	});
});
var IngestApprovedUrlInput = z.object({
	tenantId: z.string().uuid(),
	agentId: z.string().uuid(),
	url: z.string().url()
});
var ingestApprovedUrl_createServerFn_handler = createServerRpc({
	id: "c43b8be1c8464b3786c5737303caae42b2a627ac15566079bfec301eec8d3b0a",
	name: "ingestApprovedUrl",
	filename: "src/lib/train.functions.ts"
}, (opts) => ingestApprovedUrl.__executeServer(opts));
var ingestApprovedUrl = createServerFn({ method: "POST" }).validator((input) => IngestApprovedUrlInput.parse(input)).handler(ingestApprovedUrl_createServerFn_handler, async ({ data }) => {
	const { ingestDocument } = await import("./ingestion.server-BDtH0sxt.js");
	return ingestDocument({
		tenantId: data.tenantId,
		agentId: data.agentId,
		sourceName: data.url,
		sourceType: "url",
		sourceUri: data.url
	});
});
var QueryGroundedInput = z.object({
	tenantId: z.string().uuid(),
	agentId: z.string().uuid(),
	query: z.string().min(2)
});
var queryKnowledgeGrounded_createServerFn_handler = createServerRpc({
	id: "8396ad4bde3c18d1f5b79c4271ecf98c8f9fca02c6cf052fd377c2bbea800d29",
	name: "queryKnowledgeGrounded",
	filename: "src/lib/train.functions.ts"
}, (opts) => queryKnowledgeGrounded.__executeServer(opts));
var queryKnowledgeGrounded = createServerFn({ method: "POST" }).validator((input) => QueryGroundedInput.parse(input)).handler(queryKnowledgeGrounded_createServerFn_handler, async ({ data }) => {
	const { generateGroundedAnswer } = await import("./retrieval.server-CAqKWWld.js").then((n) => n.n);
	return generateGroundedAnswer({
		tenantId: data.tenantId,
		agentId: data.agentId,
		query: data.query
	});
});
//#endregion
export { addManualKnowledgeFact_createServerFn_handler, deleteKnowledgeSource_createServerFn_handler, ingestApprovedUrl_createServerFn_handler, ingestKnowledgeFile_createServerFn_handler, ingestPdf_createServerFn_handler, ingestUrl_createServerFn_handler, queryKnowledgeGrounded_createServerFn_handler, updateFactApproval_createServerFn_handler, updateSourceTags_createServerFn_handler };
