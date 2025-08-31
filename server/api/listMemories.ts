// server/api/listMemories.ts
import { NextApiRequest, NextApiResponse } from "next";
import { query as queryVectorStore } from "../lib/vectorstore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { tokenId, topK } = req.query;

    if (!tokenId) {
      return res.status(400).json({ error: "tokenId is required" });
    }

    const results = await queryVectorStore(
      tokenId as string,
      "memory", // Use a generic query term instead of empty string
      Number(topK) || 10
    );

    // Format results with null checks
    const memories = results.map((match) => ({
      id: match.id,
      text: match.metadata?.text || 'No text available',
      timestamp: match.id.split("-")[1] || Date.now().toString(),
      metadata: match.metadata || {},
      score: match.score || 0,
    }));

    res.status(200).json({ memories });
  } catch (error) {
    console.error("Error fetching memories:", error);
    res.status(500).json({ error: "Failed to fetch memories" });
  }
}