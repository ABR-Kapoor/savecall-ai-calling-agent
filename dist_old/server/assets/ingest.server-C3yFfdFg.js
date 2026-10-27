//#region src/lib/ingest.server.ts
var UA = "MissedCallMoneyBot/1.0 (self-hosted owner-requested import)";
var MAX_BYTES = 4e5;
var FETCH_TIMEOUT_MS = 9e3;
async function timedFetch(url, init) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		return await fetch(url, {
			...init,
			signal: controller.signal,
			redirect: "follow"
		});
	} finally {
		clearTimeout(timer);
	}
}
/**
* Minimal robots.txt courtesy check. If the file exists and a `*` rule
* disallows the path, we refuse. Anything unreadable is treated as allowed
* (the site did not tell us no), matching common crawler practice.
*/
async function robotsAllowed(target) {
	let parsed;
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
				applies = line.slice(11).trim() === "*";
				continue;
			}
			if (!applies || !line.startsWith("disallow:")) continue;
			const path = line.slice(9).trim();
			if (!path) continue;
			if (path === "/") return false;
			if (parsed.pathname.toLowerCase().startsWith(path)) disallowExact = true;
		}
		return !disallowExact;
	} catch {
		return true;
	}
}
function decodeEntities(text) {
	return text.replace(/&(#x[0-9a-f]+|#\d+|amp|nbsp|lt|gt|quot|apos|ndash|mdash|hellip|rsquo|lsquo|rdquo|ldquo|copy|reg|trade);/gi, (m) => {
		const named = {
			amp: "&",
			nbsp: " ",
			lt: "<",
			gt: ">",
			quot: "\"",
			apos: "'",
			ndash: "–",
			mdash: ": ",
			hellip: "…",
			rsquo: "’",
			lsquo: "‘",
			rdquo: "”",
			ldquo: "“",
			copy: "©",
			reg: "®",
			trade: "™"
		};
		const key = m.slice(1, -1).toLowerCase();
		if (named[key]) return named[key];
		const code = key.startsWith("#x") ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
		return Number.isFinite(code) && code > 0 && code <= 1114111 ? String.fromCodePoint(code) : " ";
	});
}
/** Strip boilerplate elements and tags, keeping readable block structure. */
function htmlToText(html) {
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
		"aside"
	]) {
		s = s.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi"), " ");
		s = s.replace(new RegExp(`<${tag}\\b[^>]*/?>`, "gi"), " ");
	}
	const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	const title = titleMatch?.[1] ? decodeEntities(titleMatch[1].replace(/\s+/g, " ").trim()).slice(0, 160) : null;
	s = s.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ");
	s = decodeEntities(s);
	const text = s.split("\n").map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
	return {
		title,
		text,
		chars: text.length
	};
}
var NOISE = /(cookie|privacy policy|terms of service|sign in|log in|subscribe to our|follow us|facebook|instagram|twitter|linkedin|whatsapp|copyright|all rights reserved|javascript|newsletter|skip to|menu|cart|checkout|sign up|download the app)/i;
var VALUABLE = /(\d|₹|rs\.?|rupee|open|close|timing|hour|price|charge|cost|book|appointment|offer|discount|\bcontact\b|\bcall\b|\baddress\b|\bphone\b|mon|tues|wedn|thurs|fri|satur|sun|am\b|pm\b|free|warranty|service|min\b|minute|days?\b)/i;
function scoreFact(sentence) {
	let score = 0;
	if (VALUABLE.test(sentence)) score += 2;
	if (/\d/.test(sentence)) score += 1;
	if (/[:：–: -]/.test(sentence)) score += 1;
	if (sentence.length >= 40 && sentence.length <= 200) score += 1;
	return score;
}
/** Split into sentence-ish units. Keeps Devanagari and Latin text intact. */
function toSentences(text) {
	const out = [];
	for (const line of text.split("\n")) {
		const parts = line.replace(/([.!?।])\s+(?=[A-Z\u0900-\u097F0-9"'(])/g, "$1\n").split(/\n|(?<=\S)\s{2,}(?=\S)/);
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
function extractFacts(text, pageTitle, limit = 30) {
	const seen = /* @__PURE__ */ new Set();
	const facts = [];
	for (const sentence of toSentences(text)) {
		if (NOISE.test(sentence)) continue;
		const key = sentence.toLowerCase().replace(/[^a-z\u0900-\u097F0-9]+/g, " ");
		if (seen.has(key)) continue;
		seen.add(key);
		facts.push({
			question: `${pageTitle ? `${pageTitle.slice(0, 40)}: ` : ""}"${sentence.length > 52 ? `${sentence.slice(0, 49)}...` : sentence}"`,
			answer: sentence,
			category: "website"
		});
		if (facts.length >= limit * 3) break;
	}
	return facts.map((f, index) => ({
		f,
		index,
		score: scoreFact(f.answer)
	})).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit).map(({ f }) => f);
}
/**
* Fetch the target page (plus up to 4 same-origin, same-path prefix pages)
* and turn the readable text into candidate facts.
*/
async function scrapeUrl(startUrl) {
	const url = new URL(startUrl);
	if (!await robotsAllowed(url.toString())) return {
		pagesFound: 0,
		charsRead: 0,
		facts: [],
		skippedByRobots: true
	};
	const queue = [url];
	const visited = /* @__PURE__ */ new Set();
	let pagesFound = 0;
	let charsRead = 0;
	const allFacts = [];
	while (queue.length && pagesFound < 5) {
		const next = queue.shift();
		if (!next || visited.has(next.pathname)) continue;
		visited.add(next.pathname);
		let res;
		try {
			res = await timedFetch(next.toString(), { headers: {
				"User-Agent": UA,
				Accept: "text/html"
			} });
		} catch {
			continue;
		}
		if (!res.ok) continue;
		const html = (await res.text()).slice(0, MAX_BYTES);
		if (!/<|href|body/i.test(html)) continue;
		pagesFound += 1;
		const page = htmlToText(html);
		charsRead += page.chars;
		allFacts.push(...extractFacts(page.text, page.title, pagesFound === 1 ? 30 : 10));
		if (pagesFound === 1) for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#?]+)["']/gi)) {
			const href = m[1];
			if (!href || /^(mailto|tel|javascript):/i.test(href)) continue;
			try {
				const link = new URL(href, next);
				if (link.origin !== url.origin || link.pathname === "/" || visited.has(link.pathname)) continue;
				if (/\/(en\/)?(about|service|price|pricing|contact|faq|team|menu|book|timing|gallery)/i.test(link.pathname)) {
					if (await robotsAllowed(link.toString())) queue.push(link);
				}
			} catch {}
			if (queue.length >= 4) break;
		}
	}
	const seen = /* @__PURE__ */ new Set();
	const facts = allFacts.filter((f) => {
		const key = f.answer.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
	return {
		pagesFound,
		charsRead,
		facts: facts.slice(0, 40),
		skippedByRobots: false
	};
}
/** Extract text with the bundled unpdf: fully offline. */
async function factsFromPdf(bytes, fileName) {
	const { extractText, getDocumentProxy } = await import("unpdf");
	const { totalPages, text } = await extractText(await getDocumentProxy(bytes), { mergePages: true });
	return {
		pages: totalPages,
		facts: extractFacts(Array.isArray(text) ? text.join("\n") : text, fileName, 40)
	};
}
//#endregion
export { factsFromPdf, scrapeUrl };
