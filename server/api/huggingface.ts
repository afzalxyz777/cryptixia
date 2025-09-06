// server/api/huggingface.ts - UPDATED FOR GROQ
import express, { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
console.log("🔑 API Key loaded:", GROQ_API_KEY ? "YES" : "NO");

if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY in .env.local");

const router = express.Router();

// Use Llama 3.1 8B - fast, reliable, and currently supported
const WORKING_MODEL = "llama-3.1-8b-instant";
console.log("✅ Using model:", WORKING_MODEL);

export async function generateChatResponse(message: string, context: string[] = []): Promise<string> {
  console.log("🎯 generateChatResponse called with:", message);
  
  try {
    console.log("📤 Sending to Groq:", message);
    
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
            content: 'You are Cryptixia, a helpful AI assistant. Keep responses concise and friendly.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ Groq API Error Response:", errorText);
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

// POST /api/huggingface/chat
router.post("/chat", async (req: Request, res: Response) => {
  console.log("🎯 /chat endpoint hit");
  console.log("📥 Request body:", JSON.stringify(req.body, null, 2));
  
  try {
    const { text, message, sessionId } = req.body;
    const inputText = text || message;
    
    if (!inputText) {
      console.log("❌ No input text provided");
      return res.status(400).json({ error: "Missing 'text' or 'message'" });
    }

    console.log("🚀 Calling generateChatResponse...");
    const reply = await generateChatResponse(inputText, []);
    
    console.log("✅ Got reply:", reply);
    res.json({ 
      reply, 
      success: true,
      model: WORKING_MODEL,
      inputReceived: inputText,
      timestamp: new Date().toISOString()
    });
    
  } catch (err: any) {
    console.error("❌ Chat endpoint error:", err);
    res.status(500).json({ 
      error: "Chat endpoint failed",
      details: err.message,
      success: false
    });
  }
});

export default router;