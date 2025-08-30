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
      "", // empty query to fetch all? Pinecone doesn’t support empty → can use dummy query and topK
      Number(topK) || 10
    );

    // Format results with timestamp + text
    const memories = results.map((match) => ({
      id: match.id,
      text: match.metadata.text,
      timestamp: match.id.split("-")[1], // assuming id format: `${userId}-${Date.now()}`
      metadata: match.metadata,
      score: match.score, // optional, for debugging
    }));

    res.status(200).json({ memories });
  } catch (error) {
    console.error("Error fetching memories:", error);
    res.status(500).json({ error: "Failed to fetch memories" });
  }
}
