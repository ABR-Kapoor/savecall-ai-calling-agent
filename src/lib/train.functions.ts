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
    const chunkId = randomUUID();

    // 1. Resolve active agent for this tenant to establish agent isolation
    const { data: agent } = await insforgeServer.database
      .from("ai_agents")
      .select("id")
      .or(`tenant_id.eq.${data.businessId},business_id.eq.${data.businessId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetAgentId = agent?.id;

    // 2. Persist knowledge source with approved_for_rag flag
    const { error: srcErr } = await insforgeServer.database.from("knowledge_sources").insert([
      {
        id: sourceId,
        tenant_id: data.businessId,
        business_id: data.businessId,
        type: "approved_response",
        name: data.question,
        source_uri: "manual://fact",
        status: "done",
        approved_for_rag: true,
        metadata: {
          pages_found: 1,
          facts_found: 1,
          tags: data.tags.length > 0 ? data.tags : ["Approved response", "Customer-safe"],
          text_preview: data.answer,
        },
      },
    ]);
    if (srcErr) throw new Error(srcErr.message);

    // 3. Persist knowledge item for human review and audits
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

    // 4. Generate genuine semantic vector embedding and insert into document_chunks
    const { generateSemanticEmbedding, EMBEDDING_MODEL_VERSION } = await import("./rag/embeddings.server.ts");
    const fullContent = `Q: ${data.question}\nA: ${data.answer}`;
    const embedding = await generateSemanticEmbedding(fullContent);

    const { error: chkErr } = await insforgeServer.database.from("document_chunks").insert([
      {
        id: chunkId,
        tenant_id: data.businessId,
        source_id: sourceId,
        chunk_index: 0,
        content: fullContent,
        section_heading: data.category || "Approved Q&A",
        metadata: { question: data.question, answer: data.answer, tags: data.tags },
        embedding: `[${embedding.join(",")}]`,
        embedding_model: EMBEDDING_MODEL_VERSION,
      },
    ]);
    if (chkErr) console.warn("Notice inserting fact chunk:", chkErr.message);

    // 5. Explicitly link source to active agent in agent_knowledge_sources
    if (targetAgentId) {
      try {
        await insforgeServer.database.from("agent_knowledge_sources").insert([
          {
            tenant_id: data.businessId,
            agent_id: targetAgentId,
            source_id: sourceId,
          },
        ]);
      } catch (_) {}
    }

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

    const meta = (source.metadata as Record<string, unknown> | null) || {};
    meta["tags"] = data.tags;

    const { error: updateErr } = await insforgeServer.database
      .from("knowledge_sources")
      .update({
        metadata: meta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.sourceId);

    if (updateErr) throw new Error(updateErr.message);

    // Also update document_chunks metadata with new tags
    try {
      const { data: chunks } = await insforgeServer.database
        .from("document_chunks")
        .select("id, metadata")
        .eq("source_id", data.sourceId);

      if (chunks && chunks.length > 0) {
        for (const ch of chunks) {
          const chMeta = (ch.metadata as Record<string, unknown> | null) || {};
          chMeta["tags"] = data.tags;
          await insforgeServer.database
            .from("document_chunks")
            .update({ metadata: chMeta })
            .eq("id", ch.id);
        }
      }
    } catch (_) {}

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
  agentId: z.string().uuid().optional(),
  fileName: z.string(),
  fileBase64: z.string(),
  fileType: z.enum(["pdf", "docx", "txt", "md", "csv", "xlsx"]),
  tags: z.array(z.string()).optional(),
});

export const ingestKnowledgeFile = createServerFn({ method: "POST" })
  .validator((input: unknown) => IngestFileInput.parse(input))
  .handler(async ({ data }) => {
    const { ingestDocument } = await import("./rag/ingestion.server.ts");
    let targetAgentId = data.agentId;
    if (!targetAgentId) {
      const { data: agent } = await insforgeServer.database
        .from("ai_agents")
        .select("id")
        .or(`tenant_id.eq.${data.tenantId},business_id.eq.${data.tenantId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      targetAgentId = agent?.id;
    }
    if (!targetAgentId) {
      const { data: createdAgent } = await insforgeServer.database
        .from("ai_agents")
        .insert([
          {
            tenant_id: data.tenantId,
            name: "AI Assistant",
            greeting: "Hello! Welcome to our agency assistance. How may I help you today?",
            tone: "Professional",
            role: "AI Receptionist & Support Specialist",
            deployment_mode: "test",
          },
        ])
        .select("id")
        .maybeSingle();
      targetAgentId = createdAgent?.id;
    }
    if (!targetAgentId) throw new Error("Could not initialize AI agent for this workspace.");

    // Auto-infer initial domain tags if not explicitly supplied
    const fileNameLower = data.fileName.toLowerCase();
    const inferredTags: string[] = [...(data.tags || [])];
    if (fileNameLower.includes("life")) inferredTags.push("Life");
    if (fileNameLower.includes("motor") || fileNameLower.includes("car") || fileNameLower.includes("vehicle")) inferredTags.push("Motor");
    if (fileNameLower.includes("health") || fileNameLower.includes("mediclaim")) inferredTags.push("Health");
    if (fileNameLower.includes("home") || fileNameLower.includes("property") || fileNameLower.includes("fire")) inferredTags.push("Property");
    if (fileNameLower.includes("claim") || fileNameLower.includes("fnol")) inferredTags.push("Claims", "FNOL");
    if (!inferredTags.includes("Customer-safe")) inferredTags.push("Customer-safe");
    const uniqueTags = Array.from(new Set(inferredTags));

    const buffer = Buffer.from(data.fileBase64, "base64");
    const result = await ingestDocument({
      tenantId: data.tenantId,
      agentId: targetAgentId,
      sourceName: data.fileName,
      sourceType: data.fileType,
      fileBuffer: buffer,
    });

    if (result.status === "failed") {
      throw new Error(result.error || "Failed to process and index document.");
    }

    // Attach initial tags to newly created knowledge source and chunks
    if (result.sourceId && uniqueTags.length > 0) {
      try {
        const { data: createdSource } = await insforgeServer.database
          .from("knowledge_sources")
          .select("metadata")
          .eq("id", result.sourceId)
          .maybeSingle();

        const meta = (createdSource?.metadata as Record<string, unknown> | null) || {};
        meta["tags"] = uniqueTags;
        await insforgeServer.database
          .from("knowledge_sources")
          .update({ metadata: meta })
          .eq("id", result.sourceId);

        const { data: chunks } = await insforgeServer.database
          .from("document_chunks")
          .select("id, metadata")
          .eq("source_id", result.sourceId);

        if (chunks && chunks.length > 0) {
          for (const ch of chunks) {
            const chMeta = (ch.metadata as Record<string, unknown> | null) || {};
            chMeta["tags"] = uniqueTags;
            await insforgeServer.database
              .from("document_chunks")
              .update({ metadata: chMeta })
              .eq("id", ch.id);
          }
        }
      } catch (_) {}
    }

    return result;
  });

const IngestApprovedUrlInput = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  url: z.string().url(),
});

export const ingestApprovedUrl = createServerFn({ method: "POST" })
  .validator((input: unknown) => IngestApprovedUrlInput.parse(input))
  .handler(async ({ data }) => {
    const { ingestDocument } = await import("./rag/ingestion.server.ts");
    let targetAgentId = data.agentId;
    if (!targetAgentId) {
      const { data: agent } = await insforgeServer.database
        .from("ai_agents")
        .select("id")
        .or(`tenant_id.eq.${data.tenantId},business_id.eq.${data.tenantId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      targetAgentId = agent?.id;
    }
    if (!targetAgentId) throw new Error("No active AI agent found for this tenant.");

    return ingestDocument({
      tenantId: data.tenantId,
      agentId: targetAgentId,
      sourceName: data.url,
      sourceType: "url",
      sourceUri: data.url,
    });
  });

const TenantKnowledgeInput = z.object({
  businessId: z.string().uuid(),
});

export const getKnowledgeSources = createServerFn({ method: "GET" })
  .validator((input: unknown) => TenantKnowledgeInput.parse(input))
  .handler(async ({ data }) => {
    const { data: sources, error } = await insforgeServer.database
      .from("knowledge_sources")
      .select("id, type, name, source_uri, status, metadata, created_at, updated_at")
      .or(`tenant_id.eq.${data.businessId},business_id.eq.${data.businessId}`)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return sources ?? [];
  });

export const getKnowledgeItems = createServerFn({ method: "GET" })
  .validator((input: unknown) => TenantKnowledgeInput.parse(input))
  .handler(async ({ data }) => {
    const { data: items, error } = await insforgeServer.database
      .from("knowledge_items")
      .select("id, question, answer, category, approved, source_id, created_at")
      .or(`tenant_id.eq.${data.businessId},business_id.eq.${data.businessId}`)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return items ?? [];
  });

const QueryGroundedInput = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  query: z.string().min(2),
  tags: z.array(z.string()).optional(),
});

export const queryKnowledgeGrounded = createServerFn({ method: "POST" })
  .validator((input: unknown) => QueryGroundedInput.parse(input))
  .handler(async ({ data }) => {
    let targetAgentId = data.agentId;
    if (!targetAgentId) {
      const { data: agent } = await insforgeServer.database
        .from("ai_agents")
        .select("id")
        .or(`tenant_id.eq.${data.tenantId},business_id.eq.${data.tenantId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      targetAgentId = agent?.id;
    }
    if (!targetAgentId) throw new Error("No active agent configured for this tenant.");

    const { retrieveAgentKnowledge, generateGroundedAnswer } = await import("./rag/retrieval.server.ts");
    const chunks = await retrieveAgentKnowledge(data.tenantId, targetAgentId, data.query, 0.2, 5, data.tags);
    const answerResult = await generateGroundedAnswer({
      tenantId: data.tenantId,
      agentId: targetAgentId,
      query: data.query,
      requiredTags: data.tags,
    });

    return {
      chunks: chunks.map((c) => ({
        id: c.id,
        sourceId: c.sourceId,
        sourceName: c.sourceName,
        sourceType: c.sourceType,
        content: c.content,
        similarity: c.similarity,
        sectionHeading: c.sectionHeading || undefined,
        pageNumber: c.pageNumber || undefined,
      })),
      answerResult,
    };
  });
