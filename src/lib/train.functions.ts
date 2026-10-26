import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "crypto";
import { insforgeServer } from "./insforge/client.server";

const UrlInput = z.object({
  businessId: z.string().uuid(),
  url: z.string().url(),
  tags: z.array(z.string()).default([]),
});

const PdfInput = z.object({
  businessId: z.string().uuid(),
  fileName: z.string(),
  dataBase64: z.string(),
  tags: z.array(z.string()).default([]),
});

const ManualFactInput = z.object({
  businessId: z.string().uuid(),
  question: z.string().min(3),
  answer: z.string().min(5),
  category: z.string().default("General Policy"),
  tags: z.array(z.string()).default([]),
});

const UpdateTagsInput = z.object({
  sourceId: z.string().uuid(),
  tags: z.array(z.string()),
});

const DeleteSourceInput = z.object({
  sourceId: z.string().uuid(),
  businessId: z.string().uuid(),
});

const UpdateFactApprovalInput = z.object({
  itemId: z.string().uuid(),
  approved: z.boolean(),
});

export const ingestUrl = createServerFn({ method: "POST" })
  .validator((input: unknown) => UrlInput.parse(input))
  .handler(async ({ data }) => {
    const { scrapeUrl } = await import("./ingest.server");
    const result = await scrapeUrl(data.url);
    const sourceId = randomUUID();

    // Persist to knowledge_sources with explicit UUID
    const { data: source, error: sourceErr } = await insforgeServer.database
      .from("knowledge_sources")
      .insert([
        {
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
            text_preview: result.facts[0]?.answer?.slice(0, 300) || "Scraped web facts",
          },
        },
      ])
      .select("id")
      .maybeSingle();

    if (sourceErr) throw new Error(sourceErr.message);

    // Persist candidate facts to knowledge_items awaiting human review
    if (result.facts.length > 0) {
      await insforgeServer.database.from("knowledge_items").insert(
        result.facts.map((f) => ({
          id: randomUUID(),
          tenant_id: data.businessId,
          business_id: data.businessId,
          source_id: sourceId,
          question: f.question,
          answer: f.answer,
          category: f.category || "General",
          approved: false,
        }))
      );
    }

    return {
      sourceId,
      pagesFound: result.pagesFound,
      factsFound: result.facts.length,
      facts: result.facts,
      skippedByRobots: result.skippedByRobots,
    };
  });

export const ingestPdf = createServerFn({ method: "POST" })
  .validator((input: unknown) => PdfInput.parse(input))
  .handler(async ({ data }) => {
    const { factsFromPdf } = await import("./ingest.server");
    const binary = Buffer.from(data.dataBase64, "base64");
    const result = await factsFromPdf(binary, data.fileName);
    const sourceId = randomUUID();

    const initialTags = data.tags.length > 0 ? data.tags : ["Policy Document", "Customer-safe"];

    // Persist to knowledge_sources with explicit UUID
    const { error: sourceErr } = await insforgeServer.database
      .from("knowledge_sources")
      .insert([
        {
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
            text_preview:
              result.facts.map((f) => f.answer).join("\n\n").slice(0, 500) ||
              "Extracted policy wording",
          },
        },
      ]);

    if (sourceErr) throw new Error(sourceErr.message);

    // Persist candidate facts to knowledge_items
    if (result.facts.length > 0) {
      await insforgeServer.database.from("knowledge_items").insert(
        result.facts.map((f) => ({
          id: randomUUID(),
          tenant_id: data.businessId,
          business_id: data.businessId,
          source_id: sourceId,
          question: f.question,
          answer: f.answer,
          category: f.category || "Policy Coverage",
          approved: false,
        }))
      );
    }

    return {
      sourceId,
      pagesFound: result.pages,
      factsFound: result.facts.length,
      facts: result.facts,
      skippedByRobots: false,
    };
  });

export const addManualKnowledgeFact = createServerFn({ method: "POST" })
  .validator((input: unknown) => ManualFactInput.parse(input))
  .handler(async ({ data }) => {
    const sourceId = randomUUID();
    const itemId = randomUUID();

    // Create an approved manual fact entry
    const { error: srcErr } = await insforgeServer.database.from("knowledge_sources").insert([
      {
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
          text_preview: data.answer,
        },
      },
    ]);
    if (srcErr) throw new Error(srcErr.message);

    const { error: itemErr } = await insforgeServer.database.from("knowledge_items").insert([
      {
        id: itemId,
        tenant_id: data.businessId,
        business_id: data.businessId,
        source_id: sourceId,
        question: data.question,
        answer: data.answer,
        category: data.category,
        approved: true,
      },
    ]);
    if (itemErr) throw new Error(itemErr.message);

    return { ok: true, sourceId, itemId };
  });

export const updateSourceTags = createServerFn({ method: "POST" })
  .validator((input: unknown) => UpdateTagsInput.parse(input))
  .handler(async ({ data }) => {
    const { data: source, error: fetchErr } = await insforgeServer.database
      .from("knowledge_sources")
      .select("id, metadata")
      .eq("id", data.sourceId)
      .maybeSingle();

    if (fetchErr || !source) throw new Error("Knowledge source not found.");

    const meta = (source.metadata as any) || {};
    meta.tags = data.tags;

    const { error: updateErr } = await insforgeServer.database
      .from("knowledge_sources")
      .update({
        metadata: meta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.sourceId);

    if (updateErr) throw new Error(updateErr.message);
    return { ok: true };
  });

export const deleteKnowledgeSource = createServerFn({ method: "POST" })
  .validator((input: unknown) => DeleteSourceInput.parse(input))
  .handler(async ({ data }) => {
    await insforgeServer.database
      .from("document_chunks")
      .delete()
      .eq("source_id", data.sourceId);

    await insforgeServer.database
      .from("agent_knowledge_sources")
      .delete()
      .eq("source_id", data.sourceId);

    await insforgeServer.database
      .from("knowledge_items")
      .delete()
      .eq("source_id", data.sourceId);

    const { error } = await insforgeServer.database
      .from("knowledge_sources")
      .delete()
      .eq("id", data.sourceId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateFactApproval = createServerFn({ method: "POST" })
  .validator((input: unknown) => UpdateFactApprovalInput.parse(input))
  .handler(async ({ data }) => {
    const { error } = await insforgeServer.database
      .from("knowledge_items")
      .update({ approved: data.approved })
      .eq("id", data.itemId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

const IngestFileInput = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  fileName: z.string(),
  fileBase64: z.string(),
  fileType: z.enum(["pdf", "docx", "txt", "md", "csv", "xlsx"]),
});

export const ingestKnowledgeFile = createServerFn({ method: "POST" })
  .validator((input: unknown) => IngestFileInput.parse(input))
  .handler(async ({ data }) => {
    const { ingestDocument } = await import("./rag/ingestion.server");
    const buffer = Buffer.from(data.fileBase64, "base64");
    return ingestDocument({
      tenantId: data.tenantId,
      agentId: data.agentId,
      sourceName: data.fileName,
      sourceType: data.fileType,
      fileBuffer: buffer,
    });
  });

const IngestApprovedUrlInput = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  url: z.string().url(),
});

export const ingestApprovedUrl = createServerFn({ method: "POST" })
  .validator((input: unknown) => IngestApprovedUrlInput.parse(input))
  .handler(async ({ data }) => {
    const { ingestDocument } = await import("./rag/ingestion.server");
    return ingestDocument({
      tenantId: data.tenantId,
      agentId: data.agentId,
      sourceName: data.url,
      sourceType: "url",
      sourceUri: data.url,
    });
  });

const QueryGroundedInput = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  query: z.string().min(2),
});

export const queryKnowledgeGrounded = createServerFn({ method: "POST" })
  .validator((input: unknown) => QueryGroundedInput.parse(input))
  .handler(async ({ data }) => {
    const { generateGroundedAnswer } = await import("./rag/retrieval.server");
    return generateGroundedAnswer({
      tenantId: data.tenantId,
      agentId: data.agentId,
      query: data.query,
    });
  });
