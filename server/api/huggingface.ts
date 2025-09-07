// server/api/huggingface.ts
import express, { Request, Response } from "express";
import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
if (!HF_API_KEY) throw new Error("Missing HUGGINGFACE_API_KEY in .env.local");

const hf = new HfInference(HF_API_KEY);
const hfAny = hf as any; // bypass strict TS for experimental methods
const router = express.Router();

// Available models
const CHAT_MODELS = {
  blenderbot: "facebook/blenderbot-400M-distill",
  dialogpt: "microsoft/DialoGPT-large",
  phi35: "microsoft/Phi-3.5-mini-instruct",
  mistral: "mistralai/Mistral-7B-Instruct-v0.3",
  llama: "meta-llama/Meta-Llama-3.1-8B-Instruct",
  flanT5: "google/flan-t5-small", // added Flan-T5
} as const;

// Pick model from env
const rawModel = (process.env.HF_MODEL ?? "flanT5").toString().toLowerCase();
const modelKey = (rawModel in CHAT_MODELS ? rawModel : "flanT5") as keyof typeof CHAT_MODELS;
const CURRENT_MODEL = CHAT_MODELS[modelKey];

console.log("✅ Using HuggingFace model:", CURRENT_MODEL);

// In-memory chat sessions
const chatSessions: Record<string, string[]> = {};

// Extract text safely from HuggingFace responses
function extractGeneratedText(resp: any): string {
  if (!resp) return "";
  if (typeof resp === "string") return resp;
  if (Array.isArray(resp)) {
    const first = resp[0];
    return String(first.generated_text ?? first.text ?? "");
  }
  if (resp.generated_text) return String(resp.generated_text);
  if (resp.text) return String(resp.text);

  // Fallback: try to find any string value
  const maybe = Object.values(resp).find((v) => typeof v === "string");
  return maybe ? String(maybe) : "";
}

// Main chat response generator
export async function generateChatResponse(message: string, context: string[]): Promise<string> {
  try {
    let generatedText = "";

    // Use conversational if blenderbot
    if (hfAny.conversational && CURRENT_MODEL.includes("blenderbot")) {
      console.log("Using hf.conversational()");
      const resp = await hfAny.conversational({
        model: CURRENT_MODEL,
        inputs: { past_user_inputs: context, generated_responses: [], text: message },
      });
      generatedText = extractGeneratedText(resp);

    // Use chatCompletion if available
    } else if (hfAny.chatCompletion) {
      console.log("Using hf.chatCompletion()");
      const resp = await hfAny.chatCompletion({
        model: CURRENT_MODEL,
        messages: [{ role: "user", content: message }],
      });
      generatedText = extractGeneratedText(resp);

    // Fallback: textGeneration
    } else {
      console.log("Using hf.textGeneration()");
      let prompt: string;

      const contextStr = context.length > 0 ? context.join("\n") + "\n" : "";
      if (CURRENT_MODEL.toLowerCase().includes("phi-3.5") ||
          CURRENT_MODEL.toLowerCase().includes("mistral") ||
          CURRENT_MODEL.toLowerCase().includes("llama")) {
        prompt = `<|system|>You are a helpful AI assistant.<|end|>
<|user|>${contextStr}${message}<|end|>
<|assistant|>`;
      } else if (CURRENT_MODEL.toLowerCase().includes("dialogpt")) {
        prompt = `You are a helpful AI assistant.\n${contextStr}Human: ${message}\nAssistant:`;
      } else {
        prompt = message;
      }

      const resp = await hf.textGeneration({
        model: CURRENT_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 150,
          temperature: 0.7,
          return_full_text: false,
          do_sample: true,
          ...(CURRENT_MODEL.toLowerCase().includes("dialogpt") && { pad_token_id: 50256 }),
        },
      });

      console.log("Raw HF response:", resp);
      generatedText = extractGeneratedText(resp);

      // Clean up special tokens
      if (CURRENT_MODEL.toLowerCase().includes("phi-3.5") ||
          CURRENT_MODEL.toLowerCase().includes("mistral") ||
          CURRENT_MODEL.toLowerCase().includes("llama")) {
        generatedText = generatedText.replace(/<\|.*?\|>/g, "").trim();
      } else if (CURRENT_MODEL.toLowerCase().includes("dialogpt")) {
        if (generatedText.includes("Assistant:")) {
          generatedText = generatedText.split("Assistant:").pop()?.trim() || generatedText;
        }
        if (generatedText.includes("Human:")) {
          generatedText = generatedText.split("Human:")[0].trim();
        }
      }
    }

    // Final trimming
    generatedText = generatedText.trim().replace(/^\W+/, "").replace(/\W+$/, "");

    if (!generatedText || generatedText.length < 3) {
      generatedText = "I understand. Could you tell me more about what you'd like to know?";
    }

    console.log("🤖 Generated response:", generatedText);
    return generatedText;

  } catch (err: any) {
    console.error("HuggingFace API error:", err);
    const msg = (err?.message ?? "").toLowerCase();
    if (msg.includes("rate limit")) return "I'm receiving too many requests right now. Please try again.";
    if (msg.includes("model")) return "There's an issue with the AI model. Please try again.";
    return "I'm having trouble processing that right now. Could you try rephrasing your question?";
  }
}

// Embedding helper
export async function embedText(text: string): Promise<number[]> {
  const response = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: text,
  });
  return Array.isArray(response[0]) ? (response[0] as number[]) : (response as number[]);
}

// POST /api/huggingface/embed
router.post("/embed", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing 'text'" });
    const embedding = await embedText(text);
    res.json({ embedding });
  } catch (err: any) {
    console.error("Embedding error:", err.message || err);
    res.status(500).json({ error: "Failed to generate embedding" });
  }
});

// POST /api/huggingface/chat
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { text, message, sessionId } = req.body;
    const inputText = text || message;
    if (!inputText) return res.status(400).json({ error: "Missing 'text' or 'message'" });

    const sid = sessionId || "default";
    if (!chatSessions[sid]) chatSessions[sid] = [];

    const reply = await generateChatResponse(inputText, chatSessions[sid]);

    // Update session memory (cap 10 turns = 20 messages)
    chatSessions[sid].push(inputText, reply);
    if (chatSessions[sid].length > 20) {
      chatSessions[sid] = chatSessions[sid].slice(-20);
    }

    res.json({ reply, context: chatSessions[sid], sessionId: sid });
  } catch (err: any) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to generate chat response" });
  }
});

export default router;
