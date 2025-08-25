// server/api/pinMetadata.ts
import express, { Request, Response } from "express";
import axios from "axios";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

    if (!pinataApiKey || !pinataSecretApiKey) {
      return res.status(500).json({ error: "Missing Pinata API keys in .env.local" });
    }

    const metadata = req.body;

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey,
        },
      }
    );

    const data = response.data as { IpfsHash: string };

    const cid = data.IpfsHash;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

    return res.json({ cid, gatewayUrl });
  } catch (error: any) {
    console.error("❌ Error pinning metadata:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to pin metadata" });
  }
});

export default router;
