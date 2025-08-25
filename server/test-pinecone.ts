import { upsertVector, queryVector } from "./api/pinecone";

async function main() {
  // Example 3-dimensional vector
  const testVector = [0.1, 0.2, 0.3];

  console.log("Upserting vector...");
  await upsertVector("test-1", testVector, { name: "DemoAgent" });

  console.log("Querying vector...");
  const results = await queryVector(testVector, 3);

  console.log("Results:", results);
}

main().catch(console.error);
