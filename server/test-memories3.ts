// server/test-memories3.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getPineconeIndex } from "./api/pinecone";
import { embedText } from "./api/huggingface";

async function main() {
  const index = await getPineconeIndex();

  // --- New Agent X memories (additive, not replacing old ones) ---
  const newMemories = [
    {
      id: "memory_4",
      metadata: {
        agent_id: "agent_x_001",
        text: "Agent X is fluent in multiple ancient languages, including Elvish and Draconic.",
      },
    },
    {
      id: "memory_5",
      metadata: {
        agent_id: "agent_x_001",
        text: "Agent X once decrypted a forbidden cryptographic code that revealed a hidden guild conspiracy.",
      },
    },
    {
      id: "memory_6",
      metadata: {
        agent_id: "agent_x_001",
        text: "Agent X often uses rare artifacts as diplomatic gifts to gain trust in negotiations.",
      },
    },
  ];

  console.log("📝 Storing new memories for Agent X (additive)...");

  const vectors = [];
  for (const memory of newMemories) {
    const embedding = await embedText(memory.metadata.text);
    vectors.push({
      id: memory.id,
      values: embedding,
      metadata: memory.metadata,
    });
  }

  await index.upsert(vectors);
  console.log("✅ New memories stored successfully! (Old ones kept)");

  // --- Fixed test queries ---
  const testQueries = ["languages", "cryptography", "diplomatic gifts", "negotiation", "Agent X"];

  for (const query of testQueries) {
    console.log(`\n🔍 Querying for: "${query}"`);
    const queryEmbedding = await embedText(query);

    const results = await index.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
    });

    console.log("Results:", JSON.stringify(results.matches, null, 2));
  }
}

main().catch((err) => {
  console.error("❌ Error in test-memories3.ts:", err);
});
