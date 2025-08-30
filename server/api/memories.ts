// server/api/memories.ts
import { v4 as uuidv4 } from "uuid";
import { getPineconeIndex } from "./pinecone";
import { pipeline } from "@xenova/transformers";

// Load HuggingFace embedding pipeline once
let embedder: any;
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "sentence-transformers/all-MiniLM-L6-v2");
  }
  return embedder;
}

// Store a new memory
export async function storeMemory(agentId: string, text: string) {
  const index = await getPineconeIndex();

  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  const embedding = Array.from(output.data as number[]);

  const id = uuidv4();
  await index.upsert([
    {
      id,
      values: embedding,
      metadata: {
        agent_id: agentId,
        text,
      },
    },
  ]);

  return id;
}

// Search memories
export async function searchMemories(agentId: string, query: string, topK = 3) {
  const index = await getPineconeIndex();

  const embedder = await getEmbedder();
  const output = await embedder(query, { pooling: "mean", normalize: true });
  const embedding = Array.from(output.data as number[]);

  const results = await index.query({
    topK,
    vector: embedding,
    filter: { agent_id: agentId },
    includeMetadata: true,
  });

  return results.matches || [];
}

// Add this function to your server/api/memories.ts file

// Delete a memory by ID
export async function deleteMemory(memoryId: string) {
  const index = await getPineconeIndex();

  try {
    // First get the memory data before deletion for logging
    const fetchResult = await index.fetch([memoryId]);
    const memoryData = fetchResult.records?.[memoryId];

    if (!memoryData) {
      throw new Error("Memory not found");
    }

    // Delete from Pinecone
    await index.deleteOne(memoryId);

    // Return memory data for on-chain logging
    return {
      id: memoryId,
      text: memoryData.metadata?.text,
      agentId: memoryData.metadata?.agent_id,
    };
  } catch (error) {
    console.error("Failed to delete memory:", error);
    throw error;
  }
}

// List all memories for an agent (for UI display)
export async function listMemories(agentId: string, limit = 50) {
  const index = await getPineconeIndex();

  try {
    // Query with empty vector to get all records for this agent
    const results = await index.query({
      topK: limit,
      vector: new Array(384).fill(0), // all-MiniLM-L6-v2 has 384 dimensions
      filter: { agent_id: agentId },
      includeMetadata: true,
    });

    return results.matches?.map(match => ({
      id: match.id,
      text: match.metadata?.text,
      score: match.score,
    })) || [];
  } catch (error) {
    console.error("Failed to list memories:", error);
    throw error;
  }
}