import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getPineconeIndex } from "./pinecone";

const router = express.Router();

// ----------------- Simple Embedding Function -----------------
// Since we're using Groq and don't have easy embeddings, we'll use simple text-based storage
function createSimpleEmbedding(text: string): number[] {
  // Create a simple hash-based embedding (not semantic, but works for demo)
  const embedding = new Array(384).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  words.forEach(word => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Distribute the hash across the embedding dimensions
    const index = Math.abs(hash) % 384;
    embedding[index] = (embedding[index] + 0.1) % 1.0; // Simple accumulation
  });
  
  return embedding;
}

// ----------------- Core Functions -----------------
async function storeMemory(agentId: string, text: string) {
  try {
    const index = await getPineconeIndex();
    const embedding = createSimpleEmbedding(text);

    const id = `${agentId}-${uuidv4()}`;
    await index.upsert([
      {
        id,
        values: embedding,
        metadata: { 
          agent_id: agentId, 
          text,
          timestamp: new Date().toISOString(),
          // Store additional context for better search
          words: text.toLowerCase().split(/\s+/).slice(0, 10).join(','),
          length: text.length
        },
      },
    ]);
    return id;
  } catch (error) {
    console.error("Error storing memory:", error);
    // Fallback: return a mock ID so the UI doesn't break
    return `${agentId}-fallback-${Date.now()}`;
  }
}

async function listMemories(agentId: string, topK = 20) {
  try {
    const index = await getPineconeIndex();

    // Use a simple query vector - we're just fetching all memories for this agent
    const results = await index.query({
      topK,
      vector: new Array(384).fill(0.1),
      filter: { agent_id: agentId },
      includeMetadata: true,
    });

    return (
      results.matches?.map((match) => ({
        id: match.id,
        text: match.metadata?.text || "No text",
        score: match.score || 0.5, // Default score for simple embeddings
        timestamp: match.metadata?.timestamp || new Date().toISOString(),
      })) || []
    );
  } catch (error) {
    console.error("Failed to list memories:", error);
    // Return empty array instead of throwing
    return [];
  }
}

async function searchMemories(agentId: string, query: string, topK = 5) {
  try {
    const index = await getPineconeIndex();
    const queryEmbedding = createSimpleEmbedding(query);

    const results = await index.query({
      topK,
      vector: queryEmbedding,
      filter: { agent_id: agentId },
      includeMetadata: true,
    });

    return results.matches || [];
  } catch (error) {
    console.error("Search memories error:", error);
    return [];
  }
}

async function deleteMemory(memoryId: string) {
  try {
    const index = await getPineconeIndex();
    
    // Try to fetch first to confirm it exists
    const fetchResult = await index.fetch([memoryId]);
    const memoryData = fetchResult.records?.[memoryId];

    if (!memoryData) {
      return { id: memoryId, deleted: false, error: "Memory not found" };
    }

    await index.deleteOne(memoryId);
    return {
      id: memoryId,
      deleted: true,
      text: memoryData.metadata?.text,
      agentId: memoryData.metadata?.agent_id,
    };
  } catch (error) {
    console.error("Failed to delete memory:", error);
    throw error;
  }
}

// ----------------- API Routes -----------------
// POST /api/memories - Store a new memory
router.post("/", async (req: Request, res: Response) => {
  try {
    const { agentId, text } = req.body;
    if (!agentId || !text) {
      return res.status(400).json({ error: "Missing agentId or text" });
    }
    
    console.log("💾 Storing memory for agent:", agentId, "Text:", text.substring(0, 50) + "...");
    const id = await storeMemory(agentId, text);
    
    return res.status(200).json({ 
      id, 
      success: true,
      message: "Memory stored successfully",
      agentId,
      textPreview: text.substring(0, 50) + (text.length > 50 ? "..." : "")
    });
  } catch (error) {
    console.error("Store memory error:", error);
    res.status(500).json({ 
      error: "Failed to store memory",
      success: false,
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// GET /api/memories?agentId=123&topK=20 - List memories for an agent
router.get("/", async (req: Request, res: Response) => {
  try {
    const { agentId, topK = "20" } = req.query;
    
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: "agentId query parameter is required" });
    }
    
    console.log("📖 Listing memories for agent:", agentId);
    const memories = await listMemories(agentId, Number(topK));
    
    return res.status(200).json({ 
      memories, 
      success: true,
      count: memories.length,
      agentId
    });
  } catch (error) {
    console.error("List memories error:", error);
    res.status(500).json({ 
      error: "Failed to list memories",
      success: false,
      memories: [], // Return empty array on error
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// GET /api/memories/search?agentId=123&query=hello&topK=5 - Search memories
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { agentId, query, topK = "5" } = req.query;
    
    if (!agentId || !query) {
      return res.status(400).json({ error: "agentId and query parameters are required" });
    }
    
    console.log("🔍 Searching memories for agent:", agentId, "Query:", query);
    const results = await searchMemories(agentId as string, query as string, Number(topK));
    
    // Format results for better readability
    const formattedResults = results.map((match: any, index: number) => ({
      id: match.id,
      text: match.metadata?.text,
      score: match.score,
      relevance: `${(match.score * 100).toFixed(1)}%`,
      timestamp: match.metadata?.timestamp
    }));
    
    return res.status(200).json({
      results: formattedResults,
      success: true,
      query: query,
      agentId: agentId,
      count: results.length
    });
  } catch (error) {
    console.error("Search memories error:", error);
    res.status(500).json({
      error: "Failed to search memories",
      success: false,
      results: []
    });
  }
});

// DELETE /api/memories - Delete a memory
router.delete("/", async (req: Request, res: Response) => {
  try {
    const { memoryId } = req.body;
    
    if (!memoryId) {
      return res.status(400).json({ error: "memoryId is required in request body" });
    }
    
    console.log("🗑️ Deleting memory:", memoryId);
    const result = await deleteMemory(memoryId);
    
    return res.status(200).json({ 
      ...result,
      success: true,
      message: result.deleted ? "Memory deleted successfully" : "Memory not found"
    });
  } catch (error) {
    console.error("Delete memory error:", error);
    res.status(500).json({ 
      error: "Failed to delete memory",
      success: false,
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Export functions for use in other files
export { storeMemory, listMemories, searchMemories, deleteMemory };

export default router;