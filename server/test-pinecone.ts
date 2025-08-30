// server/api/pinecone.ts
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

let pineconeClient: Pinecone | null = null;

export function initPinecone(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error("PINECONE_API_KEY is required in .env.local");
    }

    pineconeClient = new Pinecone({
      apiKey: apiKey,
    });
  }

  return pineconeClient;
}

export async function getPineconeIndex() {
  const pc = initPinecone();
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!indexName) {
    throw new Error("PINECONE_INDEX_NAME is required in .env.local");
  }

  return pc.index(indexName);
}

// Additional utility functions that your test files are expecting
export async function upsertVector(
  id: string,
  values: number[],
  metadata: Record<string, any>
) {
  const index = await getPineconeIndex();
  return await index.upsert([
    {
      id,
      values,
      metadata,
    },
  ]);
}

export async function queryVector(
  vector: number[],
  topK: number = 5,
  filter?: Record<string, any>
) {
  const index = await getPineconeIndex();
  return await index.query({
    vector,
    topK,
    includeMetadata: true,
    filter,
  });
}