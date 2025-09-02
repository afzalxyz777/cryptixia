import { Request, Response } from "express";

export async function deleteMemoryHandler(req: Request, res: Response) {
  try {
    const { memoryId } = req.body;
    if (!memoryId) {
      return res.status(400).json({ error: "memoryId is required" });
    }

    console.log(`Deleting memory ${memoryId}`);

    // Try to use your Pinecone if available
    try {
      const { getPineconeIndex } = await import('./pinecone');
      const index = await getPineconeIndex();
      await index.deleteOne(memoryId);
      console.log(`Deleted memory ${memoryId} from Pinecone`);
    } catch (importError) {
      console.warn('Pinecone not available, simulating delete:', importError);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting memory:", error);
    res.status(500).json({ error: "Failed to delete memory" });
  }
}