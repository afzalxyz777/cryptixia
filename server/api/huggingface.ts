import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
if (!HF_API_KEY) throw new Error("❌ Missing HUGGINGFACE_API_KEY in .env.local");

const hf = new HfInference(HF_API_KEY);

export async function embedText(text: string): Promise<number[]> {
  const response = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: text,
  });

  // Hugging Face returns `number[][]`, so flatten if needed
  return Array.isArray(response[0]) ? response[0] as number[] : response as number[];
}
