// server/api/chat.ts
import express, { Request, Response } from "express";
import { generateChatResponse } from "./huggingface";

const router = express.Router();

// POST /api/chat/ endpoint
router.post("/", async (req: Request, res: Response) => {
  try {
    const { message, tokenId, agentName, context, sessionId } = req.body;

    // Input validation
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: "Message too long" });
    }

    console.log(`Received message: "${message}" for token ${tokenId} (agent: ${agentName})`);

    // Use provided sessionId or default
    const sid = sessionId || "default";

    // Generate AI response using HuggingFace
    const responseText = await generateChatResponse(message, context || []);

    // Return structured response
    return res.status(200).json({
      response: responseText,
      success: true,
      tokenId: tokenId || null,
      agentName: agentName || null,
      sessionId: sid,
    });

  } catch (error: unknown) {
    console.error("Chat API Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Handle rate limiting
    if (errorMessage.toLowerCase().includes("rate limit")) {
      return res.status(429).json({ error: "Too many requests. Please wait." });
    }

    // Handle validation errors
    if (errorMessage.toLowerCase().includes("invalid") || errorMessage.toLowerCase().includes("too long")) {
      return res.status(400).json({ error: errorMessage });
    }

    // Generic fallback error
    return res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
