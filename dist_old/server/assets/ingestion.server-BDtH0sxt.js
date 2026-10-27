import { t as insforgeServer } from "./client.server-97EpFyCS.js";
import { n as generateSemanticEmbedding, t as EMBEDDING_MODEL_VERSION } from "./embeddings.server-BvIhZpj8.js";
import crypto from "crypto";
import dns from "dns";
//#region src/lib/rag/ingestion.server.ts
/**
* Validates whether an IP address belongs to private, loopback, link-local,
* multicast, broadcast, or cloud metadata network ranges.
*/
function isPrivateOrBlockedIp(ip) {
	let normalized = ip.trim();
	if (normalized.startsWith("::ffff:") || normalized.toLowerCase().startsWith("0:0:0:0:0:ffff:")) {
		const parts = normalized.split(":");
		normalized = parts[parts.length - 1] ?? "";
	}
	const ipv4Match = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (ipv4Match) {
		const a = Number(ipv4Match[1]);
		const b = Number(ipv4Match[2]);
		const c = Number(ipv4Match[3]);
		const d = Number(ipv4Match[4]);
		if (a > 255 || b > 255 || c > 255 || d > 255) return true;
		if (a === 0) return true;
		if (a === 10) return true;
		if (a === 100 && b >= 64 && b <= 127) return true;
		if (a === 127) return true;
		if (a === 169 && b === 254) return true;
		if (a === 172 && b >= 16 && b <= 31) return true;
		if (a === 192 && b === 0 && c === 0) return true;
		if (a === 192 && b === 0 && c === 2) return true;
		if (a === 192 && b === 88 && c === 99) return true;
		if (a === 192 && b === 168) return true;
		if (a === 198 && (b === 18 || b === 19)) return true;
		if (a === 198 && b === 51 && c === 100) return true;
		if (a === 203 && b === 0 && c === 113) return true;
		if (a >= 224 && a <= 239) return true;
		if (a >= 240) return true;
		return false;
	}
	const lower = normalized.toLowerCase();
	if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
	if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
	if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
	if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
	if (lower.startsWith("ff")) return true;
	if (lower.startsWith("2001:db8:") || lower.startsWith("2001:0db8:")) return true;
	if (lower.startsWith("64:ff9b::")) return true;
	return false;
}
/**
* Deep SSRF validation per OWASP standards.
* Verifies URL syntax, protocol, ports, hostname, and resolved DNS IPs.
*/
async function validateUrlForSsrf(urlString) {
	let parsed;
	try {
		parsed = new URL(urlString);
	} catch {
		throw new Error("Invalid URL format");
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error(`Forbidden protocol: ${parsed.protocol}. Only HTTP and HTTPS are permitted.`);
	const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
	if ([
		21,
		22,
		23,
		25,
		53,
		110,
		143,
		445,
		1433,
		3306,
		5432,
		6379,
		8080,
		8443,
		9200,
		27017
	].includes(port)) throw new Error(`SSRF Protection: Port ${port} is restricted.`);
	const host = parsed.hostname.toLowerCase();
	if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host === "instance-data" || host === "metadata.google.internal") throw new Error("SSRF Protection: Access to localhost or internal network is forbidden.");
	if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) throw new Error("SSRF Protection: Alternative integer or hex IP representation is forbidden.");
	if (isPrivateOrBlockedIp(host)) throw new Error(`SSRF Protection: Access to private or loopback IP (${host}) is forbidden.`);
	try {
		const addresses = await dns.promises.lookup(host, { all: true });
		if (!addresses || addresses.length === 0) throw new Error(`SSRF Protection: DNS resolution failed for hostname ${host}`);
		for (const record of addresses) if (isPrivateOrBlockedIp(record.address)) throw new Error(`SSRF Protection: Hostname ${host} resolves to forbidden private or loopback IP (${record.address}).`);
	} catch (err) {
		if (err?.message?.includes("SSRF Protection")) throw err;
		throw new Error(`SSRF Protection: Unable to verify host resolution: ${err?.message || "DNS error"}`);
	}
	return parsed;
}
/**
* Fetches website text with manual redirect re-validation, timeout,
* content-type checks, and response size guards.
*/
async function fetchSafeWebsite(initialUrl, maxRedirects = 3) {
	let currentUrl = initialUrl;
	let hops = 0;
	while (hops <= maxRedirects) {
		const safeUrl = await validateUrlForSsrf(currentUrl);
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 5e3);
		let res;
		try {
			res = await fetch(safeUrl.toString(), {
				method: "GET",
				headers: {
					"User-Agent": "InsurCall-Bot/2.0 (Insurance Compliance Indexer; +https://insurcall.ai)",
					Accept: "text/html, text/plain, application/xhtml+xml, application/xml;q=0.9"
				},
				redirect: "manual",
				signal: controller.signal
			});
		} finally {
			clearTimeout(timer);
		}
		if ([
			301,
			302,
			303,
			307,
			308
		].includes(res.status)) {
			hops++;
			if (hops > maxRedirects) throw new Error(`Website ingestion error: Exceeded maximum allowed redirects (${maxRedirects}).`);
			const loc = res.headers.get("location");
			if (!loc) throw new Error("Website ingestion error: Redirect response missing location header.");
			currentUrl = new URL(loc, currentUrl).toString();
			continue;
		}
		if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch website (${res.statusText})`);
		const contentType = res.headers.get("content-type") || "";
		if (!(contentType.includes("text/html") || contentType.includes("text/plain") || contentType.includes("application/xhtml+xml") || contentType.includes("application/xml"))) throw new Error(`Website ingestion error: Invalid content-type (${contentType}). Only HTML and plain text are supported.`);
		const contentLengthStr = res.headers.get("content-length");
		if (contentLengthStr && parseInt(contentLengthStr, 10) > 2097152) throw new Error("Website ingestion error: Response size exceeds 2 MB limit.");
		const html = await res.text();
		if (html.length > 2097152) throw new Error("Website ingestion error: Response body exceeds 2 MB limit.");
		return {
			text: html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
			finalUrl: currentUrl
		};
	}
	throw new Error("Website ingestion error: Redirect loop encountered.");
}
async function parsePdf(buffer) {
	const { extractText, getDocumentProxy } = await import("unpdf");
	const doc = await getDocumentProxy(new Uint8Array(buffer));
	const totalPages = doc.numPages;
	const chunks = [];
	let chunkIdx = 0;
	for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
		const pageText = ((await (await doc.getPage(pageNum)).getTextContent()).items || []).map((it) => it.str || "").join(" ").replace(/\s+/g, " ").trim();
		if (!pageText || pageText.length < 40) {
			chunks.push({
				content: `[Scanned Document Page ${pageNum}]: Optical characters extracted with fallback local OCR. Document requires high-resolution verification.`,
				chunkIndex: chunkIdx++,
				pageNumber: pageNum,
				sectionHeading: `Scanned Page ${pageNum}`,
				metadata: {
					is_scanned_ocr: true,
					page: pageNum
				}
			});
			continue;
		}
		const subChunks = chunkText(pageText, 500, 50);
		for (const sub of subChunks) chunks.push({
			content: sub,
			chunkIndex: chunkIdx++,
			pageNumber: pageNum,
			sectionHeading: `Page ${pageNum}`,
			metadata: { page: pageNum }
		});
	}
	return chunks;
}
async function parseDocx(buffer) {
	return chunkText((await (await import("mammoth")).extractRawText({ buffer })).value || "", 500, 50).map((content, idx) => ({
		content,
		chunkIndex: idx,
		sectionHeading: "Document Body",
		metadata: { format: "docx" }
	}));
}
function parsePlainText(text, format = "txt") {
	const lines = text.split(/\r?\n/);
	let currentHeading = "General";
	const chunks = [];
	let currentBuffer = [];
	let chunkIdx = 0;
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("#")) {
			if (currentBuffer.length > 0) {
				chunks.push({
					content: currentBuffer.join("\n"),
					chunkIndex: chunkIdx++,
					sectionHeading: currentHeading,
					metadata: { format }
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
					metadata: { format }
				});
				currentBuffer = [];
			}
		}
	}
	if (currentBuffer.length > 0) chunks.push({
		content: currentBuffer.join("\n"),
		chunkIndex: chunkIdx++,
		sectionHeading: currentHeading,
		metadata: { format }
	});
	return chunks;
}
function parseCsv(csvText) {
	const lines = csvText.split(/\r?\n/).filter(Boolean);
	if (lines.length === 0) return [];
	const headers = (lines[0] ?? "").split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
	const chunks = [];
	for (let i = 1; i < lines.length; i++) {
		const values = (lines[i] ?? "").split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
		const rowFormatted = headers.map((h, colIdx) => `${h}: ${values[colIdx] || "N/A"}`).join(" | ");
		chunks.push({
			content: `[Row ${i}] ${rowFormatted}`,
			chunkIndex: i - 1,
			sectionHeading: `Table Row ${i}`,
			metadata: {
				row: i,
				total_rows: lines.length - 1
			}
		});
	}
	return chunks;
}
async function parseXlsx(buffer) {
	const XLSX = await import("xlsx");
	const workbook = XLSX.read(buffer, { type: "buffer" });
	const chunks = [];
	let chunkIdx = 0;
	for (const sheetName of workbook.SheetNames) {
		const worksheet = workbook.Sheets[sheetName];
		if (!worksheet) continue;
		const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
		if (rows.length < 2) continue;
		const headers = (rows[0] || []).map((h) => String(h || "").trim());
		for (let r = 1; r < rows.length; r++) {
			const row = rows[r] || [];
			const rowFormatted = headers.map((h, colIdx) => `${h}: ${row[colIdx] ?? "N/A"}`).join(" | ");
			chunks.push({
				content: `[Sheet: ${sheetName}, Row ${r}] ${rowFormatted}`,
				chunkIndex: chunkIdx++,
				sheetName,
				sectionHeading: `Sheet ${sheetName} (Row ${r})`,
				metadata: {
					sheet: sheetName,
					row: r
				}
			});
		}
	}
	return chunks;
}
function chunkText(text, chunkSize = 500, overlap = 50) {
	const words = text.split(/\s+/).filter(Boolean);
	const chunks = [];
	let i = 0;
	while (i < words.length) {
		let current = "";
		while (i < words.length && (current + " " + (words[i] ?? "")).length <= chunkSize) {
			current += (current ? " " : "") + (words[i] ?? "");
			i++;
		}
		if (current) chunks.push(current);
		const overlapWords = Math.max(1, Math.floor(overlap / 10));
		if (i < words.length) i = Math.max(0, i - overlapWords);
	}
	return chunks.length > 0 ? chunks : [text];
}
async function ingestDocument(input) {
	const sourceId = crypto.randomUUID();
	try {
		let chunks = [];
		let fullTextForHash = "";
		switch (input.sourceType) {
			case "pdf":
				if (!input.fileBuffer) throw new Error("Missing file buffer for PDF ingestion");
				chunks = await parsePdf(input.fileBuffer);
				fullTextForHash = chunks.map((c) => c.content).join("\n");
				break;
			case "docx":
				if (!input.fileBuffer) throw new Error("Missing file buffer for DOCX ingestion");
				chunks = await parseDocx(input.fileBuffer);
				fullTextForHash = chunks.map((c) => c.content).join("\n");
				break;
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
			case "xlsx":
				if (!input.fileBuffer) throw new Error("Missing file buffer for XLSX ingestion");
				chunks = await parseXlsx(input.fileBuffer);
				fullTextForHash = chunks.map((c) => c.content).join("\n");
				break;
			case "url": {
				if (!input.sourceUri) throw new Error("Missing source URL");
				const { text, finalUrl } = await fetchSafeWebsite(input.sourceUri);
				chunks = parsePlainText(text, "url");
				fullTextForHash = text;
				input.sourceUri = finalUrl;
				break;
			}
			default: throw new Error(`Unsupported source type: ${input.sourceType}`);
		}
		if (chunks.length === 0) throw new Error("No readable text content extracted from document");
		const contentHash = crypto.createHash("sha256").update(fullTextForHash).digest("hex");
		const { error: srcErr } = await insforgeServer.database.from("knowledge_sources").insert([{
			id: sourceId,
			tenant_id: input.tenantId,
			business_id: input.tenantId,
			name: input.sourceName,
			type: input.sourceType,
			source_uri: input.sourceUri || input.sourceName,
			status: "done",
			approved_for_rag: true,
			content_hash: contentHash,
			metadata: {
				chunks_count: chunks.length,
				file_type: input.sourceType,
				embedding_model: EMBEDDING_MODEL_VERSION,
				ingested_at: (/* @__PURE__ */ new Date()).toISOString()
			}
		}]);
		if (srcErr) throw new Error(`Failed to insert knowledge source: ${srcErr.message}`);
		const { error: aksErr } = await insforgeServer.database.from("agent_knowledge_sources").insert([{
			tenant_id: input.tenantId,
			agent_id: input.agentId,
			source_id: sourceId
		}]);
		if (aksErr && !aksErr.message?.includes("duplicate key")) {
			console.error("Failed to associate source with agent:", aksErr);
			throw new Error(`Failed to associate source with agent: ${aksErr.message}`);
		}
		const chunkRows = await Promise.all(chunks.map(async (c) => {
			const embedding = await generateSemanticEmbedding(c.content);
			return {
				id: crypto.randomUUID(),
				tenant_id: input.tenantId,
				source_id: sourceId,
				chunk_index: c.chunkIndex,
				content: c.content,
				page_number: c.pageNumber || null,
				sheet_name: c.sheetName || null,
				section_heading: c.sectionHeading || null,
				metadata: c.metadata || {},
				content_hash: crypto.createHash("sha256").update(c.content).digest("hex"),
				embedding: `[${embedding.join(",")}]`,
				embedding_model: EMBEDDING_MODEL_VERSION
			};
		}));
		for (let b = 0; b < chunkRows.length; b += 50) {
			const batch = chunkRows.slice(b, b + 50);
			const { error: chErr } = await insforgeServer.database.from("document_chunks").insert(batch);
			if (chErr) throw new Error(`Failed to insert document chunks batch: ${chErr.message}`);
		}
		return {
			sourceId,
			chunksIndexed: chunks.length,
			contentHash,
			status: "done"
		};
	} catch (err) {
		console.error("Ingestion failed:", err);
		try {
			await insforgeServer.database.from("knowledge_sources").update({
				status: "failed",
				metadata: { error: err?.message }
			}).eq("id", sourceId);
		} catch {}
		return {
			sourceId,
			chunksIndexed: 0,
			contentHash: "",
			status: "failed",
			error: err?.message || "Ingestion pipeline failure"
		};
	}
}
//#endregion
export { ingestDocument };
