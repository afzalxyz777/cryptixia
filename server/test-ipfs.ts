import { uploadMetadata } from "./api/ipfs";

async function main() {
  const metadata = {
    name: "Agent #1",
    description: "Seed agent for CRYPTIXIA",
    traits: { curious: true },
  };

  const uri = await uploadMetadata(metadata);
  console.log("Stored at:", uri);
}

main().catch(console.error);
