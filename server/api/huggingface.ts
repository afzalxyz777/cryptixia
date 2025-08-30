// server/api/huggingface.ts
import express from "express";
import { HfInference } from "@huggingface/inference";

const router = express.Router();

// ✅ Initialize Hugging Face client with API key
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY as string);
// Debug route to test HF API key
router.get("/test", async (req, res) => {
  try {
    const response = await hf.chatCompletion({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 10,
    });
    res.json({ status: "HF API working", response: response.choices[0].message?.content });
  } catch (err: any) {
    res.status(500).json({ error: err.message, details: err });
  }
});
// ✅ POST /api/huggingface/chat
router.post("/chat", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No input text provided" });
    }

    // ✅ Call Hugging Face model (you can swap with Llama 2, Falcon, etc.)
    const response = await hf.chatCompletion({
      model: "mistralai/Mistral-7B-Instruct-v0.2", // good free instruct model
      messages: [{ role: "user", content: text }],
      max_tokens: 200,
    });

    // ✅ Return AI reply
    return res.json({ reply: response.choices[0].message?.content });
  } catch (err: any) {
    console.error("Hugging Face API error:", err);
    return res.status(500).json({ error: "Failed to get AI response" });
  }
});

// ✅ Export router for use in index.ts
export default router;
