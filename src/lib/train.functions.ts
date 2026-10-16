import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

    return {
      pagesFound: result.pages,
      factsFound: result.facts.length,
      facts: result.facts,
      skippedByRobots: false,
    };
  });
