// server/api/initAgentProfile.ts - Enhanced version with better debugging
import express, { Request, Response } from "express"
import axios from "axios"

const router = express.Router()

router.post("/", async (req: Request, res: Response) => {
  console.log("🚀 initAgentProfile endpoint hit");
  console.log("Request body:", req.body);

  try {
    // Enhanced environment variable checking
    const pinataApiKey = process.env.PINATA_API_KEY
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY

    console.log("Environment check:");
    console.log("- PINATA_API_KEY exists:", !!pinataApiKey);
    console.log("- PINATA_SECRET_API_KEY exists:", !!pinataSecretApiKey);

    if (!pinataApiKey || !pinataSecretApiKey) {
      console.error("❌ Missing Pinata API keys");
      return res.status(500).json({
        error: "Missing Pinata API keys in .env.local",
        details: {
          hasApiKey: !!pinataApiKey,
          hasSecretKey: !!pinataSecretApiKey
        }
      })
    }

    // Log the personality received
    const { personality } = req.body;
    console.log("Personality received:", personality);

    // Placeholder empty memory store
    const emptyMemory = {
      messages: [],
      personality: personality || "friendly",
      created_at: new Date().toISOString()
    }

    console.log("📦 Attempting to pin to IPFS:", emptyMemory);

    const pin = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      emptyMemory,
      {
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey,
        },
        timeout: 10000 // 10 second timeout
      }
    )

    console.log("✅ Pinata response:", pin.data);

    const data = pin.data as { IpfsHash: string }
    const cid = data.IpfsHash
    const memory_uri = `ipfs://${cid}`

    console.log("🎉 Success! Memory URI:", memory_uri);

    return res.json({ memory_uri, cid })
  } catch (error: any) {
    console.error("❌ Error in initAgentProfile:");
    console.error("Error type:", typeof error);
    console.error("Error message:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      console.error("Response headers:", error.response.headers);
    }

    if (error.request) {
      console.error("Request details:", error.request);
    }

    // Return detailed error info for debugging
    return res.status(500).json({
      error: "Failed to init agent profile",
      details: {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        type: error.code || "unknown"
      }
    })
  }
})

export default router