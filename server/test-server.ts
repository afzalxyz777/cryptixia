// Create this file as: server/test-server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const app = express();
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Request body:', req.body);
    next();
});

// Health check
app.get("/", (req, res) => {
    console.log("Health check hit");
    res.json({
        message: "Test server running!",
        timestamp: new Date().toISOString(),
        env: {
            hasPinataKey: !!process.env.PINATA_API_KEY,
            pinataKeyLength: process.env.PINATA_API_KEY?.length || 0
        }
    });
});

// Minimal initAgentProfile endpoint
app.post("/api/initAgentProfile", async (req, res) => {
    console.log("🚀 initAgentProfile endpoint hit!");
    console.log("Request body:", req.body);

    try {
        const pinataApiKey = process.env.PINATA_API_KEY;
        const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

        console.log("Pinata keys check:");
        console.log("- API Key exists:", !!pinataApiKey);
        console.log("- Secret Key exists:", !!pinataSecretApiKey);

        if (!pinataApiKey || !pinataSecretApiKey) {
            console.error("Missing Pinata keys!");
            return res.status(500).json({
                error: "Missing Pinata API keys",
                hasApiKey: !!pinataApiKey,
                hasSecretKey: !!pinataSecretApiKey
            });
        }

        // Simple test response without actually calling Pinata
        const testResponse = {
            memory_uri: "ipfs://QmTestHash123",
            success: true,
            debug: {
                personality: req.body.personality,
                timestamp: new Date().toISOString()
            }
        };

        console.log("Sending response:", testResponse);
        res.json(testResponse);

    } catch (error: any) {
        console.error("Error in initAgentProfile:", error);
        res.status(500).json({
            error: "Server error",
            details: error.message
        });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Test server running on http://localhost:${PORT}`);
    console.log("Environment variables loaded:");
    console.log("- PINATA_API_KEY:", !!process.env.PINATA_API_KEY ? "✅ Found" : "❌ Missing");
    console.log("- PINATA_SECRET_API_KEY:", !!process.env.PINATA_SECRET_API_KEY ? "✅ Found" : "❌ Missing");
});