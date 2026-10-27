//#region src/lib/rag/embeddings.server.ts
/**
* InsurCall Semantic Embedding Engine
* Utilizes Xenova/all-MiniLM-L6-v2 (384 dimensions) for local, private,
* offline semantic inference compatible with PostgreSQL vector(384).
*/
var EMBEDDING_MODEL_ID = "Xenova/all-MiniLM-L6-v2";
var EMBEDDING_MODEL_VERSION = "all-minilm-l6-v2-v1";
var pipelinePromise = null;
async function getEmbeddingPipeline() {
	if (!pipelinePromise) pipelinePromise = (async () => {
		const { pipeline } = await import("@xenova/transformers");
		return await pipeline("feature-extraction", EMBEDDING_MODEL_ID, { quantized: true });
	})();
	return pipelinePromise;
}
/**
* Standard text preprocessor applied identically to queries and document passages.
* Normalizes whitespace and strips control codes.
*/
function preprocessTextForEmbedding(text) {
	return text.replace(/\r\n|\r/g, "\n").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 4e3);
}
/**
* Generates genuine semantic 384-dimensional normalized vector using all-MiniLM-L6-v2.
*/
async function generateSemanticEmbedding(text) {
	const cleaned = preprocessTextForEmbedding(text);
	if (!cleaned) {
		const fallback = new Array(384).fill(0);
		fallback[0] = 1;
		return fallback;
	}
	const rawData = (await (await getEmbeddingPipeline())(cleaned, {
		pooling: "mean",
		normalize: true
	})).data;
	const result = new Array(384);
	for (let i = 0; i < 384; i++) {
		const val = rawData[i] ?? 0;
		result[i] = Number(val.toFixed(6));
	}
	return result;
}
//#endregion
export { generateSemanticEmbedding as n, EMBEDDING_MODEL_VERSION as t };
