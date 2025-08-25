import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config({ path: ".env.local" });

export async function uploadMetadata(metadata: object) {
  console.log("Using Pinata JWT:", process.env.PINATA_JWT?.slice(0, 10) + "..."); // Debug (first 10 chars)

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as any;

  if (!data.IpfsHash) {
    throw new Error(`API error: ${JSON.stringify(data)}`);
  }

  return `ipfs://${data.IpfsHash}`;
}
