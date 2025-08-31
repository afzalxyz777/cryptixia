// server/api/huggingface.ts
import express, { Request, Response } from "express";
import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
if (!HF_API_KEY) throw new Error("Missing HUGGINGFACE_API_KEY in .env.local");

const hf = new HfInference(HF_API_KEY);
const router = express.Router();

// Generate chat response
export async function generateChatResponse(
  message: string,
  context: string[] = []
): Promise<string> {
  try {
    // Create a more structured prompt
    const systemPrompt = "You are a friendly AI agent. Respond helpfully and concisely.";
    const contextStr = context.length > 0 ? context.join("\n") + "\n" : "";
    const fullPrompt = `${systemPrompt}\n${contextStr}Human: ${message}\nAssistant:`;

    console.log("Sending to HuggingFace:", fullPrompt);

    const response = await hf.textGeneration({
      model: "microsoft/DialoGPT-medium", // Better chat model
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: 150,
        temperature: 0.7,
        return_full_text: false,
        do_sample: true
      }
    });

    // Extract the generated text and clean it up
    let generatedText = response.generated_text || "I'm not sure how to respond to that.";

    // Remove the prompt from the response if it's included
    if (generatedText.includes("Assistant:")) {
      generatedText = generatedText.split("Assistant:").pop() || generatedText;
    }

    // Clean up the response
    generatedText = generatedText.trim();

    // If response is empty or too short, provide a fallback
    if (!generatedText || generatedText.length < 3) {
      generatedText = "I understand what you're saying! Could you tell me more?";
    }

    console.log("Generated response:", generatedText);
    return generatedText;

  } catch (error) {
    console.error("HuggingFace API error:", error);
    return "I'm having trouble processing that right now. Could you try rephrasing?";
  }
}

// Helper: Embed text
export async function embedText(text: string): Promise<number[]> {
  const response = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: text,
  });

  // Hugging Face returns `number[][]`, so flatten if needed
  return Array.isArray(response[0]) ? (response[0] as number[]) : (response as number[]);
}

// POST /api/huggingface/embed
router.post("/embed", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing 'text' in request body" });

    const embedding = await embedText(text);
    return res.json({ embedding });
  } catch (error: any) {
    console.error("Error from HuggingFace:", error.message || error);
    return res.status(500).json({ error: "Failed to generate embedding" });
  }
});

// POST /api/huggingface/chat - Alternative chat endpoint
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { text, message } = req.body;
    const inputText = text || message;

    if (!inputText) {
      return res.status(400).json({ error: "Missing 'text' or 'message' in request body" });
    }

    const response = await generateChatResponse(inputText, []);
    return res.json({ reply: response });
  } catch (error: any) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Failed to generate chat response" });
  }
});

export default router;