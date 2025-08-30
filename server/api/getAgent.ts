// server/api/getAgent.ts
import type { NextApiRequest, NextApiResponse } from "next";

// Example function to fetch metadata from Pinata/IPFS
const fetchFromIPFS = async (cid: string) => {
  const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
  if (!res.ok) throw new Error("Failed to fetch IPFS metadata");
  return res.json();
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Agent ID is required" });
  }

  try {
    // Replace this with your actual mapping of agent IDs → pinned metadata CIDs
    // For demo, assume `agentIdToCID` is a local object
    const agentIdToCID: Record<string, string> = {
      "1": "QmExampleCID1",
      "2": "QmExampleCID2",
      // add more agents here
    };

    const cid = agentIdToCID[id];
    if (!cid) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const metadata = await fetchFromIPFS(cid);

    // Ensure avatar key exists
    const agent = {
      id,
      name: metadata.name || `Agent ${id}`,
      personality: metadata.personality || "Neutral",
      traits: metadata.traits || {},
      avatar: metadata.avatar || "", // optional: fallback to a default avatar URL
    };

    res.status(200).json({ agent });
  } catch (err: any) {
    console.error("getAgent error:", err);
    res.status(500).json({ error: "Failed to fetch agent metadata" });
  }
}
