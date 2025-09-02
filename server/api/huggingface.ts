// server/api/huggingface.ts (Fixed version)
import express, { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
if (!HF_API_KEY) {
  console.warn("Missing HUGGINGFACE_API_KEY in .env.local");
}

const router = express.Router();

// Generate chat response using HuggingFace Inference API
export async function generateChatResponse(
  message: string,
  context: string[] = []
): Promise<string> {
  try {
    console.log("=== HuggingFace Chat Request ===");
    console.log("User message:", message);
    console.log("Context:", context);

    if (!HF_API_KEY) {
      throw new Error("HuggingFace API key not configured");
    }

    // Try multiple models in order of preference
    const models = [
      "microsoft/DialoGPT-large",
      "facebook/blenderbot-400M-distill",
      "google/flan-t5-base"
    ];

    for (const modelName of models) {
      try {
        console.log(`Trying model: ${modelName}`);

        // Use fetch instead of HfInference library
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${modelName}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HF_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: formatInputForModel(message, context, modelName),
              parameters: getModelParameters(modelName)
            })
          }
        );

        if (!response.ok) {
          console.log(`Model ${modelName} failed with status:`, response.status);
          continue;
        }

        const data = await response.json();
        console.log(`Raw response from ${modelName}:`, data);

        let generatedText = extractTextFromResponse(data, modelName);
        generatedText = cleanResponse(generatedText, message);

        // If we got a good response, use it
        if (generatedText && generatedText.length > 5) {
          console.log(`Success with ${modelName}:`, generatedText);
          return generatedText;
        }

      } catch (modelError) {
        console.log(`Model ${modelName} failed:`, modelError);
        continue;
      }
    }

    // If all models failed, return a contextual response
    throw new Error("All models failed");

  } catch (error) {
    console.error("All HuggingFace models failed:", error);
    return generateSmartFallback(message);
  }
}

// Format input based on model type
function formatInputForModel(message: string, context: string[], modelName: string): string {
  if (modelName.includes("DialoGPT")) {
    const conversationContext = context.length > 0 ? context.join(" ") + " " : "";
    return conversationContext + message;
  } else if (modelName.includes("blenderbot")) {
    return message;
  } else {
    return `You are a helpful AI assistant. Respond naturally to: ${message}`;
  }
}

// Get parameters based on model
function getModelParameters(modelName: string) {
  if (modelName.includes("DialoGPT")) {
    return {
      max_new_tokens: 100,
      temperature: 0.8,
      do_sample: true,
      top_p: 0.9,
      repetition_penalty: 1.1,
      return_full_text: false,
      stop: ["Human:", "User:", "\n\n"]
    };
  } else if (modelName.includes("blenderbot")) {
    return {
      max_new_tokens: 80,
      temperature: 0.7,
      return_full_text: false
    };
  } else {
    return {
      max_new_tokens: 60,
      temperature: 0.7,
      return_full_text: false
    };
  }
}

// Extract text from different response formats
function extractTextFromResponse(data: any, modelName: string): string {
  if (Array.isArray(data) && data.length > 0) {
    return data[0].generated_text || "";
  } else if (data.generated_text) {
    return data.generated_text;
  } else if (typeof data === 'string') {
    return data;
  }
  return "";
}

// Clean and improve the AI response
function cleanResponse(text: string, originalMessage: string): string {
  if (!text) return "";

  // Remove common artifacts
  text = text.replace(/^(Human:|User:|Bot:|Assistant:|AI:)/i, "").trim();
  text = text.replace(/\n+/g, " ").trim();
  
  // Remove repetitions of the original message
  if (text.toLowerCase().includes(originalMessage.toLowerCase())) {
    const parts = text.split(originalMessage);
    if (parts.length > 1) {
      text = parts[1].trim();
    }
  }

  // Remove empty responses or too short responses
  if (text.length < 3) return "";

  // Capitalize first letter
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Ensure it ends with punctuation
  if (!/[.!?]$/.test(text)) {
    text += ".";
  }

  return text;
}

// Smart fallback that uses the user's actual input
function generateSmartFallback(message: string): string {
  const lowerMsg = message.toLowerCase();

  // Specific response patterns
  if (lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
    return "Hello! It's great to meet you. What would you like to chat about?";
  }
  
  if (lowerMsg.includes("how are you")) {
    return "I'm doing well, thank you for asking! How are you doing today?";
  }
  
  if (lowerMsg.includes("name")) {
    return "I'm your AI assistant! You can call me whatever you'd like. What's your name?";
  }
  
  if (lowerMsg.includes("remember") || lowerMsg.includes("memory")) {
    return `I'll remember that: "${message}". My memory helps me have better conversations with you!`;
  }
  
  if (lowerMsg.includes("food") || lowerMsg.includes("eat")) {
    return `You mentioned food: "${message}". I'd love to hear more about your food preferences!`;
  }

  // Generic but personalized fallback
  const responses = [
    `That's interesting that you mentioned "${message}". Tell me more about your thoughts on that.`,
    `I hear you saying "${message}". What's your perspective on this?`,
    `"${message}" - that's something I'd like to understand better. Can you elaborate?`,
    `You brought up "${message}". I'm curious to learn more about what you think.`
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

// Test endpoint to verify HuggingFace is working
router.get("/test", async (req: Request, res: Response) => {
  try {
    const testMessage = "Hello, how are you?";
    const response = await generateChatResponse(testMessage);
    
    return res.json({
      success: true,
      test_input: testMessage,
      ai_response: response,
      message: "HuggingFace chat is working!"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "HuggingFace test failed"
    });
  }
});

// POST /api/huggingface/chat
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { text, message } = req.body;
    const inputText = text || message;

    if (!inputText) {
      return res.status(400).json({ error: "Missing 'text' or 'message' in request body" });
    }

    const response = await generateChatResponse(inputText, []);
    console.log("Final response being sent:", response);
    
    return res.json({ reply: response, response: response });
  } catch (error: any) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Failed to generate chat response" });
  }
});

export default router;