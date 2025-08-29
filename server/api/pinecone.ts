// server/pinecone.ts
import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";

if (!process.env.PINECONE_API_KEY) {
  throw new Error("Missing PINECONE_API_KEY in .env.local");
}
if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error("Missing PINECONE_INDEX_NAME in .env.local");
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

/**
 * Get a Pinecone index instance.
 * Always uses the index name from `.env.local`
 */
export async function getPineconeIndex() {
  const indexName = process.env.PINECONE_INDEX_NAME!;
  console.log(`Connecting to Pinecone index: ${indexName}`);
  return pinecone.index(indexName);
}
