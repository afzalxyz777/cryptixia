// server/pinecone.ts
import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";

if (!process.env.PINECONE_API_KEY) {
  throw new Error("Missing PINECONE_API_KEY in .env.local");
}
if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error("Missing PINECONE_INDEX_NAME in .env.local");
}

let pinecone: Pinecone | null = null;

/**
 * Initialize Pinecone client (only once).
 */
export function initPinecone() {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    console.log("✅ Pinecone client initialized");
  }
  return pinecone;
}

/**
 * Get a Pinecone index instance.
 * Always uses the index name from `.env.local`
 */
export async function getPineconeIndex() {
  if (!pinecone) initPinecone(); // ensure initialized
  const indexName = process.env.PINECONE_INDEX_NAME!;
  console.log(`Connecting to Pinecone index: ${indexName}`);
  return pinecone!.index(indexName);
}
