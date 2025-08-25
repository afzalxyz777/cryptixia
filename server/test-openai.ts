import { pinAgentMetadata } from "./api/openai";

async function main() {
  const uri = await pinAgentMetadata({
    name: "Test Agent",
    description: "Testing metadata pinning through openai.ts",
    traits: { curious: true, brave: false },
  });

  console.log("Agent metadata pinned at:", uri);
}

main().catch(console.error);
