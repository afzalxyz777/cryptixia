// server/api/embeddings.ts - Fixed version
import { Router } from "express";
import { upsert, query } from "../lib/vectorstore";
import embedText from "../lib/embedder";  // 👈 Fixed: Use embedder.ts consistently

const router = Router();

// Store a memory
router.post("/upsert", async (req, res) => {
  try {
    const { userId, text, metadata } = req.body;

    console.log("Embeddings upsert request:", { userId, text: text?.substring(0, 50) });

    if (!userId || !text) {
      return res.status(400).json({ error: "Missing userId or text" });
    }

    await upsert(userId, text, metadata || {});

    console.log("Successfully stored memory for user:", userId);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Upsert error:", err);
    res.status(500).json({
      error: "Failed to store memory",
      details: err.message
    });
  }
});

// Query memories
router.post("/query", async (req, res) => {
  try {
    const { userId, queryText, topK } = req.body;

    console.log("Embeddings query request:", { userId, queryText });

    if (!userId || !queryText) {
      return res.status(400).json({ error: "Missing userId or queryText" });
    }

    const results = await query(userId, queryText, topK || 3);

    console.log("Query results count:", results.length);
    res.json({ results });
  } catch (err: any) {
    console.error("Query error:", err);
    res.status(500).json({
      error: "Failed to query memories",
      details: err.message
    });
  }
});

// Direct embedding endpoint (for testing)
router.post("/embed", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    console.log("Generating embedding for text:", text.substring(0, 50));

    const embedding = await embedText(text);

    res.json({
      embedding,
      dimensions: embedding.length,
      success: true
    });
  } catch (err: any) {
    console.error("Embed error:", err);
    res.status(500).json({
      error: "Failed to generate embedding",
      details: err.message
    });
  }
});

export default router;