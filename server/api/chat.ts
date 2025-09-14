// server/api/chat.ts
import express, { Request, Response } from "express";
import { generateChatResponse } from "./huggingface";
import { chatRateLimit } from "../middleware/throttle";
import { searchMemories } from "./memories"; // ADD THIS IMPORT

const router = express.Router();

// POST /api/chat/ endpoint with throttling
router.post("/", chatRateLimit, async (req: Request, res: Response) => {
  try {
    const { message, tokenId, agentName, context, sessionId } = req.body;

    // Input validation
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: "Message too long" });
    }

    console.log(`[CHAT] Received message: "${message}" for token ${tokenId} (agent: ${agentName}) session: ${sessionId || 'default'}`);

    // Use provided sessionId or default
    const sid = sessionId || "default";

    // 🔍 SEARCH FOR RELEVANT MEMORIES BEFORE GENERATING RESPONSE
    let memoryContext: string[] = [];
    if (tokenId) {
      try {
        console.log(`🧠 Searching memories for agent: ${tokenId}, query: "${message}"`);
        const relevantMemories = await searchMemories(tokenId, message, 3); // Get top 3 relevant memories

        if (relevantMemories.length > 0) {
          console.log(`📚 Found ${relevantMemories.length} relevant memories`);
          memoryContext = relevantMemories.map((memory: any, index: number) =>
            `Memory ${index + 1}: ${memory.metadata?.text} (relevance: ${(memory.score * 100).toFixed(1)}%)`
          );
        } else {
          console.log("📚 No relevant memories found");
        }
      } catch (memoryError) {
        console.error("❌ Memory search error:", memoryError);
        // Don't fail the chat if memory search fails
      }
    }

    // Generate AI response using HuggingFace WITH memory context
    const responseText = await generateChatResponse(message, memoryContext, tokenId);

    console.log(`[CHAT] Generated response for session ${sid}: "${responseText}"`);

    // Return structured response
    return res.status(200).json({
      response: responseText,
      success: true,
      tokenId: tokenId || null,
      agentName: agentName || null,
      sessionId: sid,
      memoriesUsed: memoryContext.length // Add info about memories used
    });

  } catch (error: unknown) {
    console.error("[CHAT] API Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Handle rate limiting (should be caught by middleware, but backup check)
    if (errorMessage.toLowerCase().includes("rate limit") || errorMessage.toLowerCase().includes("too many requests")) {
      return res.status(429).json({
        error: "I'm getting too many requests right now. Please try again in a moment!",
        success: false
      });
    }

    // Handle validation errors
    if (errorMessage.toLowerCase().includes("invalid") || errorMessage.toLowerCase().includes("too long")) {
      return res.status(400).json({ error: errorMessage });
    }

    // Generic fallback error
    return res.status(500).json({
      error: "Failed to generate response",
      success: false
    });
  }
});

export default router;