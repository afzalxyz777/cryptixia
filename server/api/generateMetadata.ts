// server/api/generateMetadata.ts
import { Router } from "express"
import fs from "fs"
import path from "path"

const router = Router()

// Example endpoint: /api/generateMetadata
router.post("/", async (req, res) => {
    try {
        const { name, description, image, tokenId } = req.body

        // Construct the metadata JSON
        const metadata = {
            name: name || "Agent NFT",
            description: description || "An AI-powered agent NFT",
            image: image || "ipfs://your_image_cid_here", // replace later with real CID
            attributes: [
                { trait_type: "Intelligence", value: "High" },
                { trait_type: "Personality", value: "Adaptive" }
            ]
        }

        // ✅ Ensure metadata folder exists
        const metadataDir = path.join(__dirname, "../metadata")
        if (!fs.existsSync(metadataDir)) {
            fs.mkdirSync(metadataDir, { recursive: true })
        }

        // ✅ Save file as metadata/{tokenId}.json (default = 1.json)
        const fileName = `${tokenId || 1}.json`
        const filePath = path.join(metadataDir, fileName)
        fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2))

        res.json({
            message: `Metadata saved to ${filePath}`,
            metadata
        })
    } catch (err) {
        console.error("Error generating metadata:", err)
        res.status(500).json({ error: "Failed to generate metadata" })
    }
})

export default router
