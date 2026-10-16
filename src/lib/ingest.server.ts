/* eslint-disable no-misleading-character-class -- Devanagari ranges below intentionally
   include combining marks; matching them is the whole point of Hindi detection. */
/**
 * In-house document ingestion for the training portal — no third-party
 * crawler, no external AI. What leaves this file is: polite HTTP fetches that
 * honour robots.txt, HTML/PDF text extraction, and small "fact" chunks ready
 * for the owner's human review. Nothing reaches the agent's prompt until an
 * owner approves a fact (knowledge_items.approved).
 */

export type ExtractedFact = {
  question: string;
  answer: string;
  category: string;
};

export type PageExtract = {
  title: string | null;
  text: string;
  chars: number;
};

/* ---------------- polite fetch ---------------- */

const UA = "MissedCallMoneyBot/1.0 (self-hosted owner-requested import)";
const MAX_BYTES = 400_000;
const FETCH_TIMEOUT_MS = 9_000;

async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Minimal robots.txt courtesy check. If the file exists and a `*` rule
 * disallows the path, we refuse. Anything unreadable is treated as allowed
 * (the site did not tell us no), matching common crawler practice.
 */
export async function robotsAllowed(target: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  try {
    const res = await timedFetch(`${parsed.origin}/robots.txt`, { headers: { "User-Agent": UA } });
    if (!res.ok) return true;
    const body = (await res.text()).toLowerCase();
    let applies = false;
    let disallowExact = false;
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.split("#")[0]?.trim() ?? "";
      if (/^user-agent:/i.test(line)) {
        const agent = line.slice("user-agent:".length).trim();
        applies = agent === "*";
        continue;
      }
      if (!applies || !line.startsWith("disallow:")) continue;
      const path = line.slice("disallow:".length).trim();
      if (!path) continue;
      if (path === "/") return false;
      if (parsed.pathname.toLowerCase().startsWith(path)) {
        disallowExact = true;
      }
    }
    return !disallowExact;
  } catch {
    return true;
  }
}

/* ---------------- html -> text ---------------- */

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|amp|nbsp|lt|gt|quot|apos|ndash|mdash|hellip|rsquo|lsquo|rdquo|ldquo|copy|reg|trade);/gi,
    (m) => {
      const named: Record<string, string> = {
        amp: "&",
        nbsp: " ",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
        ndash: "–",
        mdash: "—",
        hellip: "…",
        rsquo: "’",
        lsquo: "‘",
        rdquo: "”",
        ldquo: "“",
        copy: "©",
        reg: "®",
        trade: "™",
      };
      const key = m.slice(1, -1).toLowerCase();
      if (named[key]) return named[key];
      const code = key.startsWith("#x") ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : " ";
    },
  );
}

/** Strip boilerplate elements and tags, keeping readable block structure. */
export function htmlToText(html: string): PageExtract {
  let s = html.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of [
    "script",
    "style",
    "noscript",
    "template",
    "svg",
    "iframe",
    "canvas",
    "form",
    "nav",
    "footer",
    "header",
    "aside",
  ]) {
    s = s.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi"), " ");
    s = s.replace(new RegExp(`<${tag}\\b[^>]*/?>`, "gi"), " ");
  }
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]
    ? decodeEntities(titleMatch[1].replace(/\s+/g, " ").trim()).slice(0, 160)
    : null;

  s = s
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  const text = s
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  return { title, text, chars: text.length };
}

/* ---------------- text -> facts ---------------- */

const NOISE =
  /(cookie|privacy policy|terms of service|sign in|log in|subscribe to our|follow us|facebook|instagram|twitter|linkedin|whatsapp|copyright|all rights reserved|javascript|newsletter|skip to|menu|cart|checkout|sign up|download the app)/i;

const VALUABLE =
  /(\d|₹|rs\.?|rupee|open|close|timing|hour|price|charge|cost|book|appointment|offer|discount|\bcontact\b|\bcall\b|\baddress\b|\bphone\b|mon|tues|wedn|thurs|fri|satur|sun|am\b|pm\b|free|warranty|service|min\b|minute|days?\b)/i;

function scoreFact(sentence: string): number {
  let score = 0;
  if (VALUABLE.test(sentence)) score += 2;
  if (/\d/.test(sentence)) score += 1;
  if (/[:：–—-]/.test(sentence)) score += 1;
  if (sentence.length >= 40 && sentence.length <= 200) score += 1;
  return score;
}

/** Split into sentence-ish units. Keeps Devanagari and Latin text intact. */
export function toSentences(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    const parts = line
      .replace(/([.!?।])\s+(?=[A-Z\u0900-\u097F0-9"'(])/g, "$1\n")
      .split(/\n|(?<=\S)\s{2,}(?=\S)/);
    for (const part of parts) {
      const t = part.replace(/\s+/g, " ").trim();
      if (t.length >= 24 && t.length <= 320) out.push(t);
    }
  }
  return out;
}

/**
 * Concise reviewable facts from one page: deduped, noise-filtered,
 * value-scored, capped. `question` is a short human label; `answer` is the
 * verbatim line so owners see exactly what the AI would repeat.
 */
export function extractFacts(text: string, pageTitle: string | null, limit = 30): ExtractedFact[] {
  const seen = new Set<string>();
  const facts: ExtractedFact[] = [];
  for (const sentence of toSentences(text)) {
    if (NOISE.test(sentence)) continue;
    const key = sentence.toLowerCase().replace(/[^a-z\u0900-\u097F0-9]+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push({
      question: `${pageTitle ? `${pageTitle.slice(0, 40)} — ` : ""}"${sentence.length > 52 ? `${sentence.slice(0, 49)}...` : sentence}"`,
      answer: sentence,
      category: "website",
    });
    if (facts.length >= limit * 3) break;
  }
  return facts
    .map((f, index) => ({ f, index, score: scoreFact(f.answer) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ f }) => f);
}

/* ---------------- public entry points ---------------- */

export type ScrapeResult = {
  pagesFound: number;
  charsRead: number;
  facts: ExtractedFact[];
  skippedByRobots: boolean;
};

/**
 * Fetch the target page (plus up to 4 same-origin, same-path prefix pages)
 * and turn the readable text into candidate facts.
 */
export async function scrapeUrl(startUrl: string): Promise<ScrapeResult> {
  const url = new URL(startUrl);
  if (!(await robotsAllowed(url.toString()))) {
    return { pagesFound: 0, charsRead: 0, facts: [], skippedByRobots: true };
  }

  const queue = [url];
  const visited = new Set<string>();
  let pagesFound = 0;
  let charsRead = 0;
  const allFacts: ExtractedFact[] = [];

  while (queue.length && pagesFound < 5) {
    const next = queue.shift();
    if (!next || visited.has(next.pathname)) continue;
    visited.add(next.pathname);
    let res: Response;
    try {
      res = await timedFetch(next.toString(), {
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
    } catch {
      continue;
    }
    if (!res.ok) continue;
    const html = (await res.text()).slice(0, MAX_BYTES);
    if (!/<|href|body/i.test(html)) continue; // not HTML at all
    pagesFound += 1;
    const page = htmlToText(html);
    charsRead += page.chars;
    allFacts.push(...extractFacts(page.text, page.title, pagesFound === 1 ? 30 : 10));

    if (pagesFound === 1) {
      // Discover a few same-site links: about/services/contact-style pages
      // are where salon shops keep the answers.
      for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#?]+)["']/gi)) {
        const href = m[1];
        if (!href || /^(mailto|tel|javascript):/i.test(href)) continue;
        try {
          const link = new URL(href, next);
          if (link.origin !== url.origin || link.pathname === "/" || visited.has(link.pathname))
            continue;
          if (
            /\/(en\/)?(about|service|price|pricing|contact|faq|team|menu|book|timing|gallery)/i.test(
              link.pathname,
            )
          ) {
            if (await robotsAllowed(link.toString())) queue.push(link);
          }
        } catch {
          /* relative garbage */
        }
        if (queue.length >= 4) break;
      }
    }
  }

  // Global dedupe + cap.
  const seen = new Set<string>();
  const facts = allFacts.filter((f) => {
    const key = f.answer.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { pagesFound, charsRead, facts: facts.slice(0, 40), skippedByRobots: false };
}

export type PdfResult = { pages: number; facts: ExtractedFact[] };

/** Extract text with the bundled unpdf — fully offline. */
export async function factsFromPdf(bytes: Uint8Array, fileName: string | null): Promise<PdfResult> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(doc, { mergePages: true });
  const joined = Array.isArray(text) ? text.join("\n") : text;
  const facts = extractFacts(joined, fileName, 40);
  return { pages: totalPages, facts };
}
