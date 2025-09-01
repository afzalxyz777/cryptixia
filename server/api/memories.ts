// server/api/memories.ts
import { v4 as uuidv4 } from "uuid";
import { NextApiRequest, NextApiResponse } from "next";
import { getPineconeIndex } from "./pinecone";
import { pipeline } from "@xenova/transformers";

// ----------------- Embedding Setup -----------------
let embedder: any;
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline(
      "feature-extraction",
      "sentence-transformers/all-MiniLM-L6-v2"
    );
  }
  return embedder;
}

// ----------------- Core Functions -----------------
export async function storeMemory(agentId: string, text: string) {
  const index = await getPineconeIndex();
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  const embedding = Array.from(output.data as number[]);

  const id = `${agentId}-${uuidv4()}`;
  await index.upsert([
    {
      id,
      values: embedding,
      metadata: { agent_id: agentId, text },
    },
  ]);
  return id;
}

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

export async function deleteMemory(memoryId: string) {
  const index = await getPineconeIndex();

  try {
    const fetchResult = await index.fetch([memoryId]);
    const memoryData = fetchResult.records?.[memoryId];

    if (!memoryData) {
      throw new Error("Memory not found");
    }

    await index.deleteOne(memoryId);

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

export async function listMemories(agentId: string, limit = 50) {
  const index = await getPineconeIndex();

  try {
    const results = await index.query({
      topK: limit,
      vector: new Array(384).fill(0), // all-MiniLM-L6-v2 embedding size
      filter: { agent_id: agentId },
      includeMetadata: true,
    });

    return (
      results.matches?.map((match) => ({
        id: match.id,
        text: match.metadata?.text || "No text",
        score: match.score,
      })) || []
    );
  } catch (error) {
    console.error("Failed to list memories:", error);
    throw error;
  }
}

// ----------------- API Handler -----------------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "POST") {
      const { agentId, text } = req.body;
      if (!agentId || !text) return res.status(400).json({ error: "Missing params" });
      const id = await storeMemory(agentId, text);
      return res.status(200).json({ id });
    }

    if (req.method === "GET") {
      const { agentId, topK } = req.query;
      if (!agentId) return res.status(400).json({ error: "agentId required" });
      const memories = await listMemories(agentId as string, Number(topK) || 50);
      return res.status(200).json({ memories });
    }

    if (req.method === "DELETE") {
      const { memoryId } = req.body;
      if (!memoryId) return res.status(400).json({ error: "memoryId required" });
      const deleted = await deleteMemory(memoryId);
      return res.status(200).json({ deleted });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Memory API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
