// server/api/huggingface.ts
import express, { Request, Response } from "express";
import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
if (!HF_API_KEY) throw new Error("Missing HUGGINGFACE_API_KEY in .env.local");

const hf = new HfInference(HF_API_KEY);
const router = express.Router();

//generateChatResponse
export async function generateChatResponse(
  message: string,
  context: string[] = []
): Promise<string> {
  const fullPrompt = `${context.join("\n")}\nUser: ${message}\nAgent:`;

  const response = await hf.textGeneration({
    model: "gpt2", // ⚠️ replace with a better model, e.g. meta-llama/Llama-2-7b-chat
    inputs: fullPrompt,
    parameters: { max_new_tokens: 200, temperature: 0.7 }
  });

  return response.generated_text || "No response";
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

// ✅ POST /api/huggingface/embed
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

export default router;
