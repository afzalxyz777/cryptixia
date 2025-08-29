// server/lib/vectorstore.ts
import embedText from "./embedder";  // ✅ points to lib/embedder.ts
import { getPineconeIndex } from "../api/pinecone";

export async function upsert(userId: string, text: string, metadata: any = {}) {
  const index = await getPineconeIndex();
  const vector = await embedText(text);

  await index.upsert([
    {
      id: `${userId}-${Date.now()}`,
      values: vector,
      metadata: { userId, text, ...metadata },
    },
  ]);

  console.log(`Upserted memory for user ${userId}`);
}

export async function query(userId: string, queryText: string, topK: number = 3) {
  const index = await getPineconeIndex();
  const queryVector = await embedText(queryText);

  const results = await index.query({
    vector: queryVector,
    topK,
    filter: { userId },
    includeMetadata: true,
  });

  console.log(`Retrieved ${results.matches?.length || 0} memories for user ${userId}`);
  return results.matches || [];
}
