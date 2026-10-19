import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { insforgeServer } from "./insforge/client.server";

const UrlInput = z.object({
  businessId: z.string().uuid(),
  url: z.string().url(),
});

const PdfInput = z.object({
  businessId: z.string().uuid(),
  fileName: z.string(),
  dataBase64: z.string(),
});

export const ingestUrl = createServerFn({ method: "POST" })
  .validator((input: unknown) => UrlInput.parse(input))
  .handler(async ({ data }) => {
    const { scrapeUrl } = await import("./ingest.server");
    const result = await scrapeUrl(data.url);

    // Persist to knowledge_sources
    const { data: source } = await insforgeServer.database
      .from("knowledge_sources")
      .insert([
        {
          tenant_id: data.businessId,
          business_id: data.businessId,
          type: "url",
          name: data.url,
          source_uri: data.url,
          status: result.skippedByRobots ? "blocked" : "done",
          metadata: {
            pages_found: result.pagesFound,
            facts_found: result.facts.length,
          },
        },
      ])
      .select("id")
      .maybeSingle();

    // Persist candidate facts to knowledge_items awaiting human review
    if (result.facts.length > 0) {
      await insforgeServer.database.from("knowledge_items").insert(
        result.facts.map((f) => ({
          tenant_id: data.businessId,
          business_id: data.businessId,
          source_id: source?.id || null,
          question: f.question,
          answer: f.answer,
          category: f.category || "General",
          approved: false,
        }))
      );
    }

    return {
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

    // Persist to knowledge_sources
    const { data: source } = await insforgeServer.database
      .from("knowledge_sources")
      .insert([
        {
          tenant_id: data.businessId,
          business_id: data.businessId,
          type: "pdf",
          name: data.fileName,
          source_uri: `file://${data.fileName}`,
          status: "done",
          metadata: {
            pages_found: result.pages,
            facts_found: result.facts.length,
          },
        },
      ])
      .select("id")
      .maybeSingle();

    // Persist candidate facts to knowledge_items awaiting human review
    if (result.facts.length > 0) {
      await insforgeServer.database.from("knowledge_items").insert(
        result.facts.map((f) => ({
          tenant_id: data.businessId,
          business_id: data.businessId,
          source_id: source?.id || null,
          question: f.question,
          answer: f.answer,
          category: f.category || "General",
          approved: false,
        }))
      );
    }

    return {
      pagesFound: result.pages,
      factsFound: result.facts.length,
      facts: result.facts,
      skippedByRobots: false,
    };
  });
