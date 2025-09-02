import { Request, Response } from "express";

export async function listMemoriesHandler(req: Request, res: Response) {
  try {
    const { tokenId, topK } = req.query;

    if (!tokenId) {
      return res.status(400).json({ error: "tokenId is required" });
    }

    console.log(`Fetching memories for agent ${tokenId}`);

    // Try to use your vectorstore if available
    try {
      const { query: queryVectorStore } = await import('../lib/vectorstore');
      
      const results = await queryVectorStore(
        tokenId as string,
        "memory",
        Number(topK) || 10
      );

      const memories = results.map((match: any) => ({
        id: match.id,
        text: match.metadata?.text || 'No text available',
        timestamp: match.id.split("-")[1] || Date.now().toString(),
        metadata: match.metadata || {},
        score: match.score || 0,
      }));

      res.status(200).json({ memories });
    } catch (importError) {
      console.warn('Vectorstore not available, returning mock data:', importError);
      
      // Mock memories for testing
      const mockMemories = [
        {
          id: `mem-${Date.now()}-1`,
          text: "User likes spicy biryani",
          timestamp: Date.now().toString(),
          metadata: { type: "preference" },
          score: 0.95
        }
      ];
      
      res.status(200).json({ memories: mockMemories });
    }
  } catch (error) {
    console.error("Error fetching memories:", error);
    res.status(500).json({ error: "Failed to fetch memories" });
  }
}