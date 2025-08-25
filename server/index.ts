import express from "express";
import dotenv from "dotenv";
import pinMetadataRouter from "./api/pinMetadata";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse JSON
app.use(express.json());

// Routes
app.use("/api/pinMetadata", pinMetadataRouter);

app.get("/", (req, res) => {
  res.send("✅ Cryptixia server is running");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
