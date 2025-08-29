// server/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import pinMetadataRoute from "./api/pinMetadata";
import initAgentProfileRoute from "./api/initAgentProfile";
import huggingfaceRoute from "./api/huggingface";
import embeddingsRoute from "./api/embeddings"; // ✅ NEW

// ✅ Catch silent crashes
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

dotenv.config({ path: ".env.local" });

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Routes
app.use("/api/pinMetadata", pinMetadataRoute);
app.use("/api/initAgentProfile", initAgentProfileRoute);
app.use("/api/huggingface", huggingfaceRoute);
app.use("/api/embeddings", embeddingsRoute); // ✅ NEW

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
