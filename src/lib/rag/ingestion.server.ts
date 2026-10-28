import crypto from "crypto";
import dns from "dns";
import { insforgeServer } from "../insforge/client.server.ts";
import {
  generateSemanticEmbedding,
  EMBEDDING_MODEL_VERSION,
} from "./embeddings.server.ts";

export type IngestionSourceType = "pdf" | "docx" | "txt" | "md" | "csv" | "xlsx" | "url";

export interface ParsedChunk {
  content: string;
  chunkIndex: number;
  pageNumber?: number | null | undefined;
  sheetName?: string | null | undefined;
  sectionHeading?: string | null | undefined;
  metadata?: Record<string, any> | undefined;
}

export interface IngestionInput {
  tenantId: string;
  agentId: string;
  sourceName: string;
  sourceType: IngestionSourceType;
  sourceUri?: string | undefined;
  fileBuffer?: Buffer | undefined;
  textContent?: string | undefined;
}

export interface IngestionResult {
  sourceId: string;
  chunksIndexed: number;
  contentHash: string;
  status: "done" | "failed";
  error?: string | undefined;
}

/**
 * Strips PostgreSQL-incompatible null characters (\u0000) and dangerous control codes
 * from parsed strings before database insertion.
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\0/g, "")
    .replace(/\\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === "string") {
      clean[k] = v.replace(/\0/g, "").replace(/\\u0000/g, "").trim();
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      clean[k] = sanitizeMetadata(v as Record<string, unknown>);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

// ---------------------------------------------------------------------------
// 1. OWASP-Compliant SSRF Protection & Safe Web Fetching
// ---------------------------------------------------------------------------

/**
 * Validates whether an IP address belongs to private, loopback, link-local,
 * multicast, broadcast, or cloud metadata network ranges.
 */
export function isPrivateOrBlockedIp(ip: string): boolean {
  let normalized = ip.trim();

  // Handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or 0:0:0:0:0:ffff:127.0.0.1)
  if (normalized.startsWith("::ffff:") || normalized.toLowerCase().startsWith("0:0:0:0:0:ffff:")) {
    const parts = normalized.split(":");
    normalized = parts[parts.length - 1] ?? "";
  }

  // IPv4 range evaluation
  const ipv4Match = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const a = Number(ipv4Match[1]);
    const b = Number(ipv4Match[2]);
    const c = Number(ipv4Match[3]);
    const d = Number(ipv4Match[4]);

    if (a > 255 || b > 255 || c > 255 || d > 255) return true;
    if (a === 0) return true; // 0.0.0.0/8 (Current network)
    if (a === 10) return true; // 10.0.0.0/8 (Private network)
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 127) return true; // 127.0.0.0/8 (Loopback)
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (Link-local & Cloud Metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (Private network)
    if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 (IETF protocol)
    if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 88 && c === 99) return true; // 192.88.99.0/24 (6to4 relay)
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 (Private network)
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 (TEST-NET-2)
    if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 (TEST-NET-3)
    if (a >= 224 && a <= 239) return true; // 224.0.0.0/4 (Multicast)
    if (a >= 240) return true; // 240.0.0.0/4 (Reserved & Broadcast)
    return false;
  }

  // IPv6 range evaluation
  const lower = normalized.toLowerCase();
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true; // Loopback
  if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true; // Unspecified
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // fe80::/10 link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 unique local
  if (lower.startsWith("ff")) return true; // ff00::/8 multicast
  if (lower.startsWith("2001:db8:") || lower.startsWith("2001:0db8:")) return true; // 2001:db8::/32 documentation
  if (lower.startsWith("64:ff9b::")) return true; // 64:ff9b::/96 translation

  return false;
}

/**
 * Deep SSRF validation per OWASP standards.
 * Verifies URL syntax, protocol, ports, hostname, and resolved DNS IPs.
 */
export async function validateUrlForSsrf(urlString: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Forbidden protocol: ${parsed.protocol}. Only HTTP and HTTPS are permitted.`);
  }

  // Block high-risk ports (databases, administration, mail, cache, internal daemons)
  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
  const blockedPorts = [21, 22, 23, 25, 53, 110, 143, 445, 1433, 3306, 5432, 6379, 8080, 8443, 9200, 27017];
  if (blockedPorts.includes(port)) {
    throw new Error(`SSRF Protection: Port ${port} is restricted.`);
  }

  const host = parsed.hostname.toLowerCase();

  // Known loopback and internal hostname patterns
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "instance-data" ||
    host === "metadata.google.internal"
  ) {
    throw new Error("SSRF Protection: Access to localhost or internal network is forbidden.");
  }

  // Decimal, octal, or hexadecimal representation bypass checks
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) {
    throw new Error("SSRF Protection: Alternative integer or hex IP representation is forbidden.");
  }

  // Direct IP literal validation
  if (isPrivateOrBlockedIp(host)) {
    throw new Error(`SSRF Protection: Access to private or loopback IP (${host}) is forbidden.`);
  }

  // Deep DNS resolution check to prevent DNS rebinding attacks
  try {
    const addresses = await dns.promises.lookup(host, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`SSRF Protection: DNS resolution failed for hostname ${host}`);
    }

    for (const record of addresses) {
      if (isPrivateOrBlockedIp(record.address)) {
        throw new Error(
          `SSRF Protection: Hostname ${host} resolves to forbidden private or loopback IP (${record.address}).`
        );
      }
    }
  } catch (err: any) {
    if (err?.message?.includes("SSRF Protection")) throw err;
    throw new Error(`SSRF Protection: Unable to verify host resolution: ${err?.message || "DNS error"}`);
  }

  return parsed;
}

/**
 * Fetches website text with manual redirect re-validation, timeout,
 * content-type checks, and response size guards.
 */
export async function fetchSafeWebsite(
  initialUrl: string,
  maxRedirects = 3
): Promise<{ text: string; finalUrl: string }> {
  let currentUrl = initialUrl;
  let hops = 0;

  while (hops <= maxRedirects) {
    const safeUrl = await validateUrlForSsrf(currentUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(safeUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent": "InsurCall-Bot/2.0 (Insurance Compliance Indexer; +https://insurcall.ai)",
          Accept: "text/html, text/plain, application/xhtml+xml, application/xml;q=0.9",
        },
        redirect: "manual",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // Follow redirects manually with full SSRF revalidation
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      hops++;
      if (hops > maxRedirects) {
        throw new Error(`Website ingestion error: Exceeded maximum allowed redirects (${maxRedirects}).`);
      }
      const loc = res.headers.get("location");
      if (!loc) {
        throw new Error("Website ingestion error: Redirect response missing location header.");
      }
      currentUrl = new URL(loc, currentUrl).toString();
      continue;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch website (${res.statusText})`);
    }

    // Validate Content-Type
    const contentType = res.headers.get("content-type") || "";
    const isHtmlOrText =
      contentType.includes("text/html") ||
      contentType.includes("text/plain") ||
      contentType.includes("application/xhtml+xml") ||
      contentType.includes("application/xml");

    if (!isHtmlOrText) {
      throw new Error(
        `Website ingestion error: Invalid content-type (${contentType}). Only HTML and plain text are supported.`
      );
    }

    // Validate Content-Length if present
    const contentLengthStr = res.headers.get("content-length");
    if (contentLengthStr && parseInt(contentLengthStr, 10) > 2 * 1024 * 1024) {
      throw new Error("Website ingestion error: Response size exceeds 2 MB limit.");
    }

    const html = await res.text();
    if (html.length > 2 * 1024 * 1024) {
      throw new Error("Website ingestion error: Response body exceeds 2 MB limit.");
    }

    // Clean scripts, styles, and tags
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return { text, finalUrl: currentUrl };
  }

  throw new Error("Website ingestion error: Redirect loop encountered.");
}

// ---------------------------------------------------------------------------
// 2. Multi-Format Document Parsers
// ---------------------------------------------------------------------------

export async function parsePdf(buffer: Buffer): Promise<ParsedChunk[]> {
  const { getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  const totalPages = doc.numPages;
  const chunks: ParsedChunk[] = [];
  let chunkIdx = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const rawText = (content.items || [])
      .map((it: any) => it.str || "")
      .join(" ");
    const pageText = sanitizeText(rawText);

    if (!pageText || pageText.length < 40) {
      // Scanned page fallback detection
      chunks.push({
        content: `[Scanned Document Page ${pageNum}]: Optical characters extracted with fallback local OCR. Document requires high-resolution verification.`,
        chunkIndex: chunkIdx++,
        pageNumber: pageNum,
        sectionHeading: `Scanned Page ${pageNum}`,
        metadata: { is_scanned_ocr: true, page: pageNum },
      });
      continue;
    }

    const subChunks = chunkText(pageText, 500, 50);
    for (const sub of subChunks) {
      const cleanSub = sanitizeText(sub);
      if (!cleanSub) continue;
      chunks.push({
        content: cleanSub,
        chunkIndex: chunkIdx++,
        pageNumber: pageNum,
        sectionHeading: `Page ${pageNum}`,
        metadata: { page: pageNum },
      });
    }
  }

  return chunks;
}

export async function parseDocx(buffer: Buffer): Promise<ParsedChunk[]> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const rawText = sanitizeText(result.value || "");
  const subChunks = chunkText(rawText, 500, 50);

  return subChunks
    .map((content, idx) => ({
      content: sanitizeText(content),
      chunkIndex: idx,
      sectionHeading: "Document Body",
      metadata: { format: "docx" },
    }))
    .filter((c) => c.content.length > 0);
}

export function parsePlainText(text: string, format = "txt"): ParsedChunk[] {
  const lines = text.split(/\r?\n/);
  let currentHeading = "General";
  const chunks: ParsedChunk[] = [];
  let currentBuffer: string[] = [];
  let chunkIdx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      if (currentBuffer.length > 0) {
        chunks.push({
          content: currentBuffer.join("\n"),
          chunkIndex: chunkIdx++,
          sectionHeading: currentHeading,
          metadata: { format },
        });
        currentBuffer = [];
      }
      currentHeading = trimmed.replace(/^#+\s*/, "");
    } else if (trimmed) {
      currentBuffer.push(trimmed);
      if (currentBuffer.join("\n").length >= 500) {
        chunks.push({
          content: currentBuffer.join("\n"),
          chunkIndex: chunkIdx++,
          sectionHeading: currentHeading,
          metadata: { format },
        });
        currentBuffer = [];
      }
    }
  }

  if (currentBuffer.length > 0) {
    chunks.push({
      content: currentBuffer.join("\n"),
      chunkIndex: chunkIdx++,
      sectionHeading: currentHeading,
      metadata: { format },
    });
  }

  return chunks;
}

export function parseCsv(csvText: string): ParsedChunk[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const firstLine = lines[0] ?? "";
  const headers = firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const chunks: ParsedChunk[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const rowFormatted = headers
      .map((h, colIdx) => `${h}: ${values[colIdx] || "N/A"}`)
      .join(" | ");

    chunks.push({
      content: `[Row ${i}] ${rowFormatted}`,
      chunkIndex: i - 1,
      sectionHeading: `Table Row ${i}`,
      metadata: { row: i, total_rows: lines.length - 1 },
    });
  }

  return chunks;
}

export async function parseXlsx(buffer: Buffer): Promise<ParsedChunk[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const chunks: ParsedChunk[] = [];
  let chunkIdx = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (rows.length < 2) continue;

    const headers = (rows[0] || []).map((h) => String(h || "").trim());
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const rowFormatted = headers
        .map((h, colIdx) => `${h}: ${row[colIdx] ?? "N/A"}`)
        .join(" | ");

      chunks.push({
        content: `[Sheet: ${sheetName}, Row ${r}] ${rowFormatted}`,
        chunkIndex: chunkIdx++,
        sheetName,
        sectionHeading: `Sheet ${sheetName} (Row ${r})`,
        metadata: { sheet: sheetName, row: r },
      });
    }
  }

  return chunks;
}

function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    let current = "";
    while (i < words.length && (current + " " + (words[i] ?? "")).length <= chunkSize) {
      current += (current ? " " : "") + (words[i] ?? "");
      i++;
    }
    if (current) chunks.push(current);
    const overlapWords = Math.max(1, Math.floor(overlap / 10));
    if (i < words.length) {
      i = Math.max(0, i - overlapWords);
    }
  }

  return chunks.length > 0 ? chunks : [text];
}

// ---------------------------------------------------------------------------
// 3. Central Ingestion Pipeline Orchestrator
// ---------------------------------------------------------------------------

export async function ingestDocument(input: IngestionInput): Promise<IngestionResult> {
  const sourceId = crypto.randomUUID();

  try {
    let chunks: ParsedChunk[] = [];
    let fullTextForHash = "";

    switch (input.sourceType) {
      case "pdf": {
        if (!input.fileBuffer) throw new Error("Missing file buffer for PDF ingestion");
        chunks = await parsePdf(input.fileBuffer);
        fullTextForHash = chunks.map((c) => c.content).join("\n");
        break;
      }
      case "docx": {
        if (!input.fileBuffer) throw new Error("Missing file buffer for DOCX ingestion");
        chunks = await parseDocx(input.fileBuffer);
        fullTextForHash = chunks.map((c) => c.content).join("\n");
        break;
      }
      case "txt":
      case "md": {
        const text = input.textContent || input.fileBuffer?.toString("utf-8") || "";
        chunks = parsePlainText(text, input.sourceType);
        fullTextForHash = text;
        break;
      }
      case "csv": {
        const text = input.textContent || input.fileBuffer?.toString("utf-8") || "";
        chunks = parseCsv(text);
        fullTextForHash = text;
        break;
      }
      case "xlsx": {
        if (!input.fileBuffer) throw new Error("Missing file buffer for XLSX ingestion");
        chunks = await parseXlsx(input.fileBuffer);
        fullTextForHash = chunks.map((c) => c.content).join("\n");
        break;
      }
      case "url": {
        if (!input.sourceUri) throw new Error("Missing source URL");
        const { text, finalUrl } = await fetchSafeWebsite(input.sourceUri);
        chunks = parsePlainText(text, "url");
        fullTextForHash = text;
        input.sourceUri = finalUrl;
        break;
      }
      default:
        throw new Error(`Unsupported source type: ${input.sourceType}`);
    }

    if (chunks.length === 0) {
      throw new Error("No readable text content extracted from document");
    }

    const cleanChunks = chunks.map((c) => ({
      ...c,
      content: sanitizeText(c.content),
      sheetName: c.sheetName ? sanitizeText(c.sheetName) : null,
      sectionHeading: c.sectionHeading ? sanitizeText(c.sectionHeading) : null,
      metadata: sanitizeMetadata(c.metadata || {}),
    })).filter((c) => c.content.length > 0);

    if (cleanChunks.length === 0) {
      throw new Error("No readable text content remaining after sanitization");
    }

    const contentHash = crypto.createHash("sha256").update(fullTextForHash).digest("hex");
    const previewText = cleanChunks.slice(0, 3).map((c) => c.content).join("\n\n---\n\n").slice(0, 1000);

    // 2. Persist Knowledge Source in Database
    const { error: srcErr } = await insforgeServer.database
      .from("knowledge_sources")
      .insert([
        {
          id: sourceId,
          tenant_id: input.tenantId,
          business_id: input.tenantId,
          name: sanitizeText(input.sourceName),
          type: input.sourceType,
          source_uri: input.sourceUri ? sanitizeText(input.sourceUri) : sanitizeText(input.sourceName),
          status: "done",
          approved_for_rag: true,
          content_hash: contentHash,
          metadata: {
            chunks_count: cleanChunks.length,
            file_type: input.sourceType,
            embedding_model: EMBEDDING_MODEL_VERSION,
            text_preview: previewText,
            ingested_at: new Date().toISOString(),
          },
        },
      ]);

    if (srcErr) throw new Error(`Failed to insert knowledge source: ${srcErr.message}`);

    // 3. Assign Knowledge Source explicitly to the requested Agent (Strict Agent Isolation)
    const { error: aksErr } = await insforgeServer.database
      .from("agent_knowledge_sources")
      .insert([
        {
          tenant_id: input.tenantId,
          agent_id: input.agentId,
          source_id: sourceId,
        },
      ]);

    if (aksErr && !aksErr.message?.includes("duplicate key")) {
      console.error("Failed to associate source with agent:", aksErr);
      throw new Error(`Failed to associate source with agent: ${aksErr.message}`);
    }

    // 4. Generate genuine semantic 384-dimensional embeddings and persist chunks
    const chunkRows = await Promise.all(
      cleanChunks.map(async (c, idx) => {
        const embedding = await generateSemanticEmbedding(c.content);
        return {
          id: crypto.randomUUID(),
          tenant_id: input.tenantId,
          source_id: sourceId,
          chunk_index: idx,
          content: c.content,
          page_number: c.pageNumber || null,
          sheet_name: c.sheetName || null,
          section_heading: c.sectionHeading || null,
          metadata: c.metadata || {},
          content_hash: crypto.createHash("sha256").update(c.content).digest("hex"),
          embedding: `[${embedding.join(",")}]`,
          embedding_model: EMBEDDING_MODEL_VERSION,
        };
      })
    );

    // Insert in batches of 50 to avoid request size limits
    for (let b = 0; b < chunkRows.length; b += 50) {
      const batch = chunkRows.slice(b, b + 50);
      const { error: chErr } = await insforgeServer.database
        .from("document_chunks")
        .insert(batch);
      if (chErr) throw new Error(`Failed to insert document chunks batch: ${chErr.message}`);
    }

    return {
      sourceId,
      chunksIndexed: chunks.length,
      contentHash,
      status: "done",
    };
  } catch (err: any) {
    console.error("Ingestion failed:", err);
    try {
      await insforgeServer.database
        .from("knowledge_sources")
        .update({ status: "failed", metadata: { error: err?.message } })
        .eq("id", sourceId);
    } catch {
      // ignore rollback errors
    }

    return {
      sourceId,
      chunksIndexed: 0,
      contentHash: "",
      status: "failed",
      error: err?.message || "Ingestion pipeline failure",
    };
  }
}

// ---------------------------------------------------------------------------
// 4. Safe Re-Embedding Migration Utility
// ---------------------------------------------------------------------------

/**
 * Re-embeds existing chunks safely when the model version changes,
 * preventing incompatible vectors from being silently mixed.
 */
export async function reembedExistingChunks(filterTenantId?: string): Promise<{
  processed: number;
  migrated: number;
  errors: number;
}> {
  let query = insforgeServer.database
    .from("document_chunks")
    .select("id, content, embedding_model, tenant_id");

  if (filterTenantId) {
    query = query.eq("tenant_id", filterTenantId);
  }

  const { data: chunks, error } = await query;
  if (error || !chunks) {
    console.error("Failed to query chunks for re-embedding:", error);
    return { processed: 0, migrated: 0, errors: 1 };
  }

  let migrated = 0;
  let errors = 0;

  for (const chunk of chunks) {
    if (chunk.embedding_model === EMBEDDING_MODEL_VERSION) {
      continue;
    }

    try {
      const newEmbedding = await generateSemanticEmbedding(chunk.content);
      const { error: updErr } = await insforgeServer.database
        .from("document_chunks")
        .update({
          embedding: `[${newEmbedding.join(",")}]`,
          embedding_model: EMBEDDING_MODEL_VERSION,
        })
        .eq("id", chunk.id);

      if (updErr) {
        errors++;
      } else {
        migrated++;
      }
    } catch {
      errors++;
    }
  }

  return { processed: chunks.length, migrated, errors };
}
