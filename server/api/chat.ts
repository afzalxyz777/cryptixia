// server/api/chat.ts
import express, { Request, Response } from "express";
import { generateChatResponse } from "./huggingface";

const router = express.Router();

// POST /api/chat/ endpoint
router.post("/", async (req: Request, res: Response) => {
    try {
        const { message, tokenId, agentName, context } = req.body;

        // Input validation
        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "Message is required" });
        }

        if (message.length > 1000) {
            return res.status(400).json({ error: "Message too long" });
        }

        console.log(`Received message: "${message}" for token ${tokenId} (agent: ${agentName})`);

        // Generate AI response using HuggingFace
        const response = await generateChatResponse(message, context || []);

        return res.status(200).json({
            response,
            success: true,
            tokenId: tokenId || null,
            agentName: agentName || null
        });

    } catch (error: unknown) {
        console.error("Chat API Error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

        // Handle rate limiting
        if (errorMessage.includes("Rate limit exceeded")) {
            return res.status(429).json({ error: "Too many requests. Please wait." });
        }

        // Handle validation errors
        if (errorMessage.includes("Invalid") || errorMessage.includes("too long")) {
            return res.status(400).json({ error: errorMessage });
        }

        // Generic error
        return res.status(500).json({ error: "Failed to generate response" });
    }
});

export default router;