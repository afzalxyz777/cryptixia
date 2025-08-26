import express, { Request, Response } from "express"
import axios from "axios"

const router = express.Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const pinataApiKey = process.env.PINATA_API_KEY
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY

    if (!pinataApiKey || !pinataSecretApiKey) {
      return res.status(500).json({ error: "Missing Pinata API keys in .env.local" })
    }

    // Placeholder empty memory store
    const emptyMemory = { messages: [] }

    const pin = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      emptyMemory,
      {
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey,
        },
      }
    )

    const data = pin.data as { IpfsHash: string }
    const cid = data.IpfsHash
    const memory_uri = `ipfs://${cid}`

    return res.json({ memory_uri })
  } catch (error: any) {
    console.error("Error initializing agent profile:", error.response?.data || error.message)
    return res.status(500).json({ error: "Failed to init agent profile" })
  }
})

export default router
