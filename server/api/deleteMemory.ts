// server/api/deleteMemory.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getPineconeIndex } from "./pinecone";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "DELETE") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { memoryId } = req.body;
    if (!memoryId) {
      return res.status(400).json({ error: "memoryId is required" });
    }

    const index = await getPineconeIndex();

    // Use deleteOne instead of delete
    await index.deleteOne(memoryId);

    console.log(`Deleted memory ${memoryId}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting memory:", error);
    res.status(500).json({ error: "Failed to delete memory" });
  }
}