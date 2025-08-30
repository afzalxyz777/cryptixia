// server/api/embeddings.ts
import { Router } from "express";
import { upsert, query } from "../lib/vectorstore";
import { embedText } from "./huggingface";  // 👈 import helper

const router = Router();

// ✅ Upsert text into vector DB
router.post("/upsert", async (req, res) => {
  try {
    const { userId, text, metadata } = req.body;
    if (!userId || !text) {
      return res.status(400).json({ error: "Missing userId or text" });
    }

    await upsert(userId, text, metadata || {});
    res.json({ success: true });
  } catch (err: any) {
    console.error("Upsert error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Query vector DB
router.post("/query", async (req, res) => {
  try {
    const { userId, queryText, topK } = req.body;
    if (!userId || !queryText) {
      return res.status(400).json({ error: "Missing userId or queryText" });
    }

    const results = await query(userId, queryText, topK || 3);
    res.json({ results });
  } catch (err: any) {
    console.error("Query error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Direct embedding route (optional, for debugging/testing)
router.post("/embed", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const embedding = await embedText(text);
    res.json({ embedding });
  } catch (err: any) {
    console.error("Embed error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
export { embedText }; // 👈 makes embedText reusable elsewhere
