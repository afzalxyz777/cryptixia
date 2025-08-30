// server/testmemories.ts
import 'dotenv/config';
import { embedText } from './api/huggingface';
import { initPinecone } from './api/pinecone';

async function main() {
  const memories = [
    "Agent X negotiated a ceasefire between rival guilds in 2023.",
    "Agent X is a master negotiator, skilled in persuasion and conflict resolution.",
    "Known weakness: avoids direct combat, relies on diplomacy instead.",
    "Recent success: secured an alliance by brokering a high-stakes deal in 2025."
  ];

  console.log("Embedding memories...");
  const vectors = await Promise.all(memories.map((m) => embedText(m)));

  console.log("Upserting memories into Pinecone...");
  const pc = initPinecone();
  await pc.index(process.env.PINECONE_INDEX_NAME!).upsert(
    vectors.map((values: any, i: any) => ({
      id: `memory_${i}`,
      values,
      metadata: { text: memories[i], agent_id: "agent_x_001" }
    }))
  );

  console.log("Querying Pinecone for: cryptography...");
  const query = await pc.index(process.env.PINECONE_INDEX_NAME!).query({
    vector: vectors[1],
    topK: 2,
    includeMetadata: true
  });

  console.log("Results:", JSON.stringify(query.matches, null, 2));
}

main().catch(console.error);