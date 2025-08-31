// server/lib/vectorstore.ts - Fixed version
import embedText from "./embedder";  // Consistent import
import { getPineconeIndex } from "../api/pinecone";  // 👈 Fixed: Corrected relative path to the pinecone module

export async function upsert(userId: string, text: string, metadata: any = {}) {
  try {
    console.log(`Upserting memory for user: ${userId}`);

    const index = await getPineconeIndex();
    const vector = await embedText(text);

    const recordId = `${userId}-${Date.now()}`;

    await index.upsert([
      {
        id: recordId,
        values: vector,
        metadata: {
          userId,
          text,
          createdAt: new Date().toISOString(),
          ...metadata
        },
      },
    ]);

    console.log(`Successfully upserted memory ${recordId} for user ${userId}`);
    return recordId;
  } catch (error) {
    console.error("Error in upsert:", error);
    throw error;
  }
}

export async function query(userId: string, queryText: string, topK: number = 3) {
  try {
    console.log(`Querying memories for user: ${userId}, query: "${queryText}"`);

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
  } catch (error) {
    console.error("Error in query:", error);
    throw error;
  }
}