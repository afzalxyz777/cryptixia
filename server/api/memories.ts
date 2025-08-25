// server/api/memories.ts
import { v4 as uuidv4 } from "uuid";
import { initPinecone } from "./pinecone";
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
  const pinecone = await initPinecone();
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  const embedding = Array.from(output.data);

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
  const pinecone = await initPinecone();
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

  const embedder = await getEmbedder();
  const output = await embedder(query, { pooling: "mean", normalize: true });
  const embedding = Array.from(output.data);

  const results = await index.query({
    topK,
    vector: embedding,
    filter: { agent_id: agentId },
    includeMetadata: true,
  });

  return results.matches || [];
}
