// server/api/huggingface.ts - FULL WORKING VERSION WITH THROTTLING
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { chatRateLimit } from "../middleware/throttle";

dotenv.config({ path: ".env.local" });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
console.log("🔑 API Key loaded:", GROQ_API_KEY ? "YES" : "NO");

if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY in .env.local");

const router = express.Router();

// Use Llama 3.1 8B - fast, reliable, and currently supported
const WORKING_MODEL = "llama-3.1-8b-instant";
console.log("✅ Using model:", WORKING_MODEL);

export async function generateChatResponse(message: string, memoryContext: string[] = [], agentId?: string): Promise<string> {
  console.log("🎯 generateChatResponse called with:", message);
  console.log("🧠 Memory context:", memoryContext);

  try {
    console.log("📤 Sending to Groq:", message);

    // Create system message that includes memory context
    let systemMessage = 'You are Cryptixia, a helpful AI assistant with memory. ';
    systemMessage += 'Keep responses concise and friendly. ';
    
    if (memoryContext.length > 0) {
      systemMessage += '\n\nHere are relevant memories from previous conversations:\n';
      systemMessage += memoryContext.join('\n');
      systemMessage += '\n\nUse these memories to provide personalized and context-aware responses. ';
      systemMessage += 'If the user asks about something mentioned before, refer to these memories.';
    } else if (agentId) {
      systemMessage += '\n\nYou have the ability to remember past conversations, but no specific memories are relevant to this query yet.';
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ Groq API Error Response:", errorText);

      // Handle specific Groq rate limiting
      if (response.status === 429) {
        console.log("[GROQ] Rate limit hit from Groq API");
        throw new Error("Groq API rate limit exceeded");
      }

      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as any;
    console.log("📥 Raw response:", JSON.stringify(data, null, 2));

    let result = data.choices?.[0]?.message?.content || "";

    // Clean up the response
    result = result.trim();

    // Fallback if empty
    if (!result || result.length < 3) {
      const responses = [
        "Hello! How can I help you today?",
        "Hi there! What would you like to chat about?",
        "Hey! I'm here and ready to talk.",
        "Hello! What's on your mind?",
        "Hi! How are you doing today?"
      ];
      result = responses[Math.floor(Math.random() * responses.length)];
    }

    console.log("✅ Final response:", result);
    return result;

  } catch (error: any) {
    console.error("❌ Error details:");
    console.error("Message:", error.message);
    console.error("Name:", error.name);
    console.error("Full error:", error);

    // Specific error handling
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("rate limit") || msg.includes("429")) {
      return "I'm getting too many requests right now. Please try again in a moment!";
    }
    if (msg.includes("unauthorized") || msg.includes("401")) {
      return "There's an issue with my API configuration. Please check the setup.";
    }

    // Friendly fallback
    return "I'm having a small technical hiccup. Could you try asking that again?";
  }
}

export async function embedText(text: string): Promise<number[]> {
  try {
    // For now, return a dummy embedding since Groq doesn't have embeddings
    // You can implement this with a different service later if needed
    console.log("📝 Note: Using dummy embedding for:", text);
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
  console.log("🎯 /chat endpoint hit");
  console.log("📥 Request body:", JSON.stringify(req.body, null, 2));

  try {
    const { text, message, sessionId, tokenId } = req.body;
    const inputText = text || message;

    if (!inputText) {
      console.log("❌ No input text provided");
      return res.status(400).json({ error: "Missing 'text' or 'message'" });
    }

    // 🔍 SEARCH FOR RELEVANT MEMORIES (for direct API calls)
    let memoryContext: string[] = [];
    if (tokenId) {
      try {
        const { searchMemories } = await import("./memories");
        console.log(`🧠 Searching memories for agent: ${tokenId}, query: "${inputText}"`);
        const relevantMemories = await searchMemories(tokenId, inputText, 3);
        
        if (relevantMemories.length > 0) {
          console.log(`📚 Found ${relevantMemories.length} relevant memories`);
          memoryContext = relevantMemories.map((memory: any, index: number) => 
            `Memory ${index + 1}: ${memory.metadata?.text} (relevance: ${(memory.score * 100).toFixed(1)}%)`
          );
        }
      } catch (memoryError) {
        console.error("❌ Memory search error:", memoryError);
      }
    }

    console.log(`🚀 Calling generateChatResponse for session: ${sessionId || 'default'}...`);
    const reply = await generateChatResponse(inputText, memoryContext, tokenId);

    console.log("✅ Got reply:", reply);
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

    res.status(500).json({
      error: "Chat endpoint failed",
      details: err.message,
      success: false
    });
  }
});

export default router;