// server/test-memories2.ts
import "dotenv/config";
import { storeMemory, searchMemories } from "./api/memories";

async function main() {
  const agentId = "agent_x_001";

  console.log("🔹 Storing new memory for Agent X...");
  const memoryId = await storeMemory(
    agentId,
    "Agent X is a master negotiator, skilled in persuasion and conflict resolution."
  );
  console.log(`✅ Stored memory with ID: ${memoryId}`);

  console.log("🔍 Querying Pinecone for: negotiation...");
  const results = await searchMemories(agentId, "negotiation");

  console.log("📌 Results:");
  results.forEach((res: any, idx: any) => {
    const score = res.score ?? 0; // fallback in case score is undefined
    console.log(
      `#${idx + 1} (score: ${score.toFixed(3)}) - ID: ${res.id}`
    );
    console.log(`   Text: ${res.metadata?.text}`);
  });
}

main().catch((err) => {
  console.error("❌ Error:", err);
});
