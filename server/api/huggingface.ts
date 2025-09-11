// server/api/huggingface.ts - FIXED VERSION
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { chatRateLimit } from "../middleware/throttle";

dotenv.config({ path: ".env.local" });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
console.log("🔑 API Key loaded:", GROQ_API_KEY ? "YES" : "NO");

const router = express.Router();

// Use Llama 3.1 8B - fast, reliable, and currently supported
const WORKING_MODEL = "llama-3.1-8b-instant";
console.log("✅ Using model:", WORKING_MODEL);

// Fixed helper function to check API key
function checkApiKey(): boolean {
  if (!GROQ_API_KEY) {
    console.error("❌ Missing GROQ_API_KEY in .env.local");
    return false;
  }
  return true;
}

export async function generateChatResponse(message: string, memoryContext: string[] = [], agentId?: string): Promise<string> {
  console.log("🎯 generateChatResponse called with:", message.substring(0, 50) + "...");

  // Check API key and provide fallback if missing
  if (!checkApiKey()) {
    console.error("❌ No API key available - returning fallback response");
    return "I'm having some configuration issues right now. Please check that the GROQ_API_KEY is set in your .env.local file. For now, I can see you said: '" + message + "'. How can I help you with that?";
  }

  console.log("🧠 Memory context length:", memoryContext.length);

  try {
    console.log("📤 Sending to Groq...");

    // Create system message that includes memory context
    let systemMessage = 'You are Cryptixia, a helpful AI assistant for a voice-controlled cryptocurrency transfer demo. ';
    systemMessage += 'Keep responses concise and friendly. ';
    systemMessage += 'If users mention crypto transfers like "send AVAX", acknowledge their command but explain this is a demo. ';

    if (memoryContext.length > 0) {
      systemMessage += '\n\nHere are relevant memories from previous conversations:\n';
      systemMessage += memoryContext.join('\n');
      systemMessage += '\n\nUse these memories to provide personalized and context-aware responses.';
    }

    const requestBody = {
      model: WORKING_MODEL,
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 500, // Reduced to avoid long responses
      temperature: 0.7,
      stream: false
    };

    console.log("📤 Request body:", JSON.stringify(requestBody, null, 2));



    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Cryptixia/1.0'
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    console.log("📥 Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Groq API Error Response:", errorText);

      // Handle specific Groq rate limiting
      if (response.status === 429) {
        console.log("[GROQ] Rate limit hit from Groq API");
        return "I'm getting too many requests right now. Please try again in a moment!";
      }

      if (response.status === 401) {
        console.error("[GROQ] Authentication failed - check API key");
        return "There's an authentication issue with my API. Please check the GROQ_API_KEY configuration.";
      }

      // For other errors, provide a helpful fallback
      return `I encountered an issue (${response.status}). You said: "${message}". I'm still here to help though! Could you try rephrasing?`;
    }

    const data = await response.json() as any;
    console.log("📥 Raw response structure:", {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0,
      hasContent: !!data.choices?.[0]?.message?.content
    });

    let result = data.choices?.[0]?.message?.content || "";

    // Clean up the response
    result = result.trim();

    // Fallback if empty or too short
    if (!result || result.length < 3) {
      console.warn("⚠️ Empty or very short response from API");
      const fallbackResponses = [
        `I heard you say "${message}". Could you tell me more about what you'd like to do?`,
        `Thanks for your message "${message}". How can I assist you today?`,
        `I received "${message}" but I'm not sure how to respond. Could you try rephrasing?`,
        "I'm here and listening! What would you like to talk about?",
        "Hello! I'm ready to help. What can I do for you?"
      ];
      result = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    console.log("✅ Final response length:", result.length, "chars");
    return result;

  } catch (error: any) {
    console.error("❌ generateChatResponse Error:");
    console.error("Message:", error.message);
    console.error("Name:", error.name);
    console.error("Stack:", error.stack);

    // Specific error handling
    const msg = (error.message || "").toLowerCase();

    if (msg.includes("timeout") || msg.includes("aborted")) {
      return "The request took too long. Please try again with a shorter message.";
    }

    if (msg.includes("network") || msg.includes("fetch")) {
      return "I'm having trouble connecting to my AI service. Please check your internet connection and try again.";
    }

    if (msg.includes("rate limit") || msg.includes("429")) {
      return "I'm getting too many requests right now. Please try again in a moment!";
    }

    if (msg.includes("unauthorized") || msg.includes("401")) {
      return "There's an issue with my API configuration. Please check the GROQ_API_KEY setup.";
    }

    // Generic fallback with the original message
    return `I'm having a technical hiccup right now. You said: "${message}". Could you try asking that again in a different way?`;
  }
}

export async function embedText(text: string): Promise<number[]> {
  try {
    // For now, return a dummy embedding since Groq doesn't have embeddings
    console.log("📝 Note: Using dummy embedding for text length:", text.length);
    return new Array(384).fill(0).map(() => Math.random() - 0.5);
  } catch (error) {
    console.error("Embedding error:", error);
    return new Array(384).fill(0);
  }
}

// POST /api/huggingface/embed
router.post("/embed", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing 'text'" });

    const embedding = await embedText(text);
    res.json({ embedding });
  } catch (err: any) {
    console.error("Embedding endpoint error:", err);
    res.status(500).json({ error: "Failed to generate embedding" });
  }
});

// POST /api/huggingface/chat - with throttling applied
router.post("/chat", chatRateLimit, async (req: Request, res: Response) => {
  console.log("🎯 /api/huggingface/chat endpoint hit");
  console.log("📥 Request body keys:", Object.keys(req.body));

  try {
    const { text, message, sessionId, tokenId } = req.body;
    const inputText = text || message;

    if (!inputText) {
      console.log("❌ No input text provided");
      return res.status(400).json({ error: "Missing 'text' or 'message'" });
    }

    console.log(`📝 Processing message: "${inputText.substring(0, 50)}..."`);

    // Search for relevant memories (with error handling)
    let memoryContext: string[] = [];
    if (tokenId) {
      try {
        const { searchMemories } = await import("./memories");
        console.log(`🧠 Searching memories for agent: ${tokenId}`);
        const relevantMemories = await searchMemories(tokenId, inputText, 3);

        if (relevantMemories && relevantMemories.length > 0) {
          console.log(`📚 Found ${relevantMemories.length} relevant memories`);
          memoryContext = relevantMemories.map((memory: any, index: number) =>
            `Memory ${index + 1}: ${memory.metadata?.text || memory.text} (relevance: ${((memory.score || 0) * 100).toFixed(1)}%)`
          );
        } else {
          console.log(`📚 No relevant memories found`);
        }
      } catch (memoryError) {
        console.error("❌ Memory search error:", memoryError);
        // Continue without memories if search fails
      }
    }

    console.log(`🚀 Calling generateChatResponse for session: ${sessionId || 'default'}...`);
    const reply = await generateChatResponse(inputText, memoryContext, tokenId);

    if (!reply || typeof reply !== 'string') {
      throw new Error('Invalid reply from generateChatResponse');
    }

    console.log("✅ Got reply, length:", reply.length);

    res.json({
      reply,
      success: true,
      model: WORKING_MODEL,
      inputReceived: inputText,
      sessionId: sessionId || 'default',
      timestamp: new Date().toISOString(),
      memoriesUsed: memoryContext.length
    });

  } catch (err: any) {
    console.error("❌ Chat endpoint error:", err);

    // Handle rate limiting errors
    if (err.message && err.message.toLowerCase().includes("rate limit")) {
      return res.status(429).json({
        error: "I'm getting too many requests right now. Please try again in a moment!",
        success: false,
        retryAfter: 60
      });
    }

    // Return a user-friendly error instead of failing completely
    res.status(200).json({
      reply: "I'm experiencing some technical difficulties right now, but I'm still here to help! Could you try your message again?",
      success: true,
      model: WORKING_MODEL,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;