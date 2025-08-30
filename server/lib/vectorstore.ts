// server/lib/vectorstore.ts
import { getPineconeIndex } from "../api/pinecone";
import { embedText } from "./embedder";

// Store embedding in Pinecone (original function)
export async function storeEmbedding(id: string, values: number[]) {
  const index = await getPineconeIndex();
  if (!index) {
    console.warn("⚠️ Pinecone index not available, skipping upsert.");
    return;
  }

  await index.upsert([
    {
      id,
      values,
    },
  ]);
}

// Query similar embeddings (original function)
export async function queryEmbedding(values: number[], topK = 5) {
  const index = await getPineconeIndex();
  if (!index) {
    console.warn("⚠️ Pinecone index not available, returning empty matches.");
    return [];
  }

  const result = await index.query({
    vector: values,
    topK,
    includeValues: false,
    includeMetadata: true,
  });

  return result.matches || [];
}

// Upsert text into Pinecone (wrapper for embeddings API)
export async function upsert(userId: string, text: string, metadata: any = {}) {
  const index = await getPineconeIndex();
  if (!index) {
    console.warn("⚠️ Pinecone index not initialized. Skipping upsert.");
    return;
  }

  const embedding = await embedText(text);

  await index.upsert([
    {
      id: `${userId}-${Date.now()}`, // Create unique ID with timestamp
      values: embedding,
      metadata: {
        ...metadata,
        userId,
        text,
        timestamp: Date.now(),
      },
    },
  ]);
}

// Query Pinecone for similar results (wrapper for embeddings API)
export async function query(userId: string, queryText: string, topK: number = 5) {
  const index = await getPineconeIndex();
  if (!index) {
    console.warn("⚠️ Pinecone index not initialized. Returning empty results.");
    return [];
  }

  const embedding = await embedText(queryText);

  const response = await index.query({
    topK,
    vector: embedding,
    filter: { userId },
    includeMetadata: true,
  });

  return response.matches || [];
}