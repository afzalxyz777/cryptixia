// server/index.ts - Updated with parseIntent route
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./api/chat";
import huggingfaceRoutes from "./api/huggingface";
import parseIntentRoutes from "./api/parseIntent"; // NEW IMPORT
import generateAvatarHandler from "./api/generateAvatar";
import mixTraitsRoutes from "./api/mixTraits";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = "127.0.0.1";

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "Server is working!",
    timestamp: new Date().toISOString(),
  });
});

// Init agent profile
app.post("/api/initAgentProfile", (req: Request, res: Response) => {
  console.log("initAgentProfile endpoint hit!", req.body);
  res.json({ memory_uri: "test://working", status: "success" });
});

// Pin metadata
app.post("/api/pinMetadata", (req: Request, res: Response) => {
  console.log("pinMetadata endpoint hit!", req.body);
  res.json({
    cid: "QmTestCID123456789",
    status: "success",
    message: "Metadata pinned successfully (test mode)",
  });
});

// Mount APIs
app.use("/api/chat", chatRoutes);
app.use("/api/huggingface", huggingfaceRoutes);
app.use("/api/parseIntent", parseIntentRoutes); // NEW ROUTE FOR VOICE INTENTS
app.use("/api/mixTraits", mixTraitsRoutes);
app.get("/api/generateAvatar", generateAvatarHandler);

// NFT metadata
import { loadChildren } from "./api/storage";

app.get("/metadata/:id.json", async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`Metadata requested for token ${id}`);

  try {
    const baseUrl = `http://${HOST}:${PORT}`;

    if (id.startsWith("child_")) {
      const children = await loadChildren();
      const child = children[id];

      if (!child) {
        return res.status(404).json({ error: "Child not found" });
      }

      return res.json({
        name: `Cryptixia Agent #${id}`,
        description: "An AI agent NFT with unique personality and capabilities",
        image: `${baseUrl}/api/generateAvatar?tokenId=${id}&format=png&size=512`,
        attributes: Object.entries(child).map(([trait_type, value]) => ({
          trait_type: String(trait_type),
          value: String(value),
        })),
      });
    }

    // Default fallback for non-child IDs
    res.json({
      name: `Cryptixia Agent #${id}`,
      description: "An AI agent NFT with unique personality and capabilities",
      image: `${baseUrl}/api/generateAvatar?tokenId=${id}&format=png&size=512`,
      attributes: [
        { trait_type: "Agent Type", value: "Conversational AI" },
        { trait_type: "Personality", value: "Friendly" },
        { trait_type: "Capabilities", value: "Text & Voice Chat" },
        { trait_type: "Generation", value: "1" },
      ],
    });
  } catch (err) {
    console.error("Metadata error:", err);
    res.status(500).json({ error: "Failed to load metadata" });
  }
});

// Error middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 fallback
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Cryptixia server running at http://${HOST}:${PORT}`);
  console.log(`📱 Chat API available at http://${HOST}:${PORT}/api/chat`);
  console.log(`🎯 Intent Parser available at http://${HOST}:${PORT}/api/parseIntent`); // NEW LOG
  console.log(
    `🎨 Avatar API available at http://${HOST}:${PORT}/api/generateAvatar`
  );
  console.log(
    `🧬 MixTraits API available at http://${HOST}:${PORT}/api/mixTraits`
  );
});

// Handle server errors
server.on("error", (err: NodeJS.ErrnoException) => {
  console.error("❌ Server error:", err);
  if (err.code === "EADDRINUSE")
    console.error(`Port ${PORT} is already in use.`);
});

export default app;