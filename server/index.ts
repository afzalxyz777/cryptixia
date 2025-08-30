// server/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import pinMetadataRoute from "./api/pinMetadata";
import initAgentProfileRoute from "./api/initAgentProfile";
import huggingfaceRoute from "./api/huggingface";
// Import embeddings route properly (check if it has default export)
import embeddingsRoute from "./api/embeddings";

// Try to load .env.local from multiple locations
const possibleEnvPaths = [
  ".env.local",                    // Current directory
  "../.env.local",                // Parent directory
  path.join(__dirname, ".env.local"),
  path.join(__dirname, "../.env.local")
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  try {
    dotenv.config({ path: envPath });
    console.log(`✅ Loaded environment from: ${envPath}`);
    envLoaded = true;
    break;
  } catch (error) {
    // Continue trying other paths
  }
}

if (!envLoaded) {
  console.warn("⚠️ No .env.local file found. Using system environment variables only.");
}

// Debug ENV load
console.log("🔑 ENV CHECK:", {
  PINECONE_API_KEY: process.env.PINECONE_API_KEY ? "Loaded ✅" : "Missing ❌",
  PINECONE_ENV: process.env.PINECONE_ENV ? "Loaded ✅" : "Missing ❌",
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY ? "Loaded ✅" : "Missing ❌",
});

// Catch silent crashes
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/pinMetadata", pinMetadataRoute);
app.use("/api/initAgentProfile", initAgentProfileRoute);
app.use("/api/huggingface", huggingfaceRoute);
app.use("/api/embeddings", embeddingsRoute);     // Embeddings (Pinecone)

// Health check route
app.get("/", (_, res) => {
  res.json({ status: "ok", message: "Server is running 🚀" });
});

// Check environment configuration
app.get("/check-env", (_, res) => {
  const envStatus = {
    pinecone: process.env.PINECONE_API_KEY && process.env.PINECONE_ENV ? "✅ Configured" : "❌ Missing API key or ENV",
    huggingface: process.env.HUGGINGFACE_API_KEY ? "✅ Configured" : "❌ Missing API key",
    nft_storage: process.env.NFT_STORAGE_API_KEY ? "✅ Configured" : "❌ Missing API key"
  };
  res.json(envStatus);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});