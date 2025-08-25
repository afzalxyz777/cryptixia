import { embedText } from "./api/huggingface";
import { getPineconeIndex } from "./api/pinecone";

async function test(query: string) {
  console.log(`\n🔍 Querying for: "${query}"`);
  const index = await getPineconeIndex();

  // Embed query
  const queryVector = await embedText(query);

  // Query Pinecone
  const results = await index.query({
    vector: queryVector,
    topK: 3,
    includeMetadata: true,
  });

  console.log("Results:", JSON.stringify(results.matches, null, 2));
}

async function main() {
  await test("cryptography");
  await test("negotiation");
  await test("conflict resolution");
  await test("Agent X");
}

main().catch((err) => {
  console.error("❌ Error in test-embed.ts:", err);
});
