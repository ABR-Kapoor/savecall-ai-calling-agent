/**
 * InsurCall Semantic Embedding Engine
 * Utilizes Xenova/all-MiniLM-L6-v2 (384 dimensions) for local, private,
 * offline semantic inference compatible with PostgreSQL vector(384).
 */

export const EMBEDDING_MODEL_ID = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_MODEL_VERSION = "all-minilm-l6-v2-v1";
export const EMBEDDING_DIMENSIONS = 384;

let pipelinePromise: Promise<any> | null = null;

async function getEmbeddingPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      return await pipeline("feature-extraction", EMBEDDING_MODEL_ID, {
        quantized: true,
      });
    })();
  }
  return pipelinePromise;
}

/**
 * Standard text preprocessor applied identically to queries and document passages.
 * Normalizes whitespace and strips control codes.
 */
export function preprocessTextForEmbedding(text: string): string {
  return text
    .replace(/\r\n|\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}

/**
 * Generates genuine semantic 384-dimensional normalized vector using all-MiniLM-L6-v2.
 */
export async function generateSemanticEmbedding(text: string): Promise<number[]> {
  const cleaned = preprocessTextForEmbedding(text);
  if (!cleaned) {
    const fallback = new Array(EMBEDDING_DIMENSIONS).fill(0);
    fallback[0] = 1.0;
    return fallback;
  }

  const pipe = await getEmbeddingPipeline();
  const output = await pipe(cleaned, { pooling: "mean", normalize: true });
  const rawData: Float32Array = output.data;
  const result: number[] = new Array(EMBEDDING_DIMENSIONS);

  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    const val = rawData[i] ?? 0;
    result[i] = Number(val.toFixed(6));
  }

  return result;
}

/**
 * Backward-compatible async wrapper for semantic embeddings.
 */
export async function generateLocalEmbedding(text: string, _dimensions = 384): Promise<number[]> {
  return generateSemanticEmbedding(text);
}

/**
 * Computes cosine similarity between two 384-dimensional vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const valA = a[i] ?? 0;
    const valB = b[i] ?? 0;
    dot += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
