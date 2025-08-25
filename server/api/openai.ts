import { uploadMetadata } from "./ipfs";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ path: ".env.local" });

export type AgentMetadata = {
  name: string;
  description: string;
  traits: Record<string, any>;
  memory_uri?: string;
};

// Pin metadata to IPFS via Pinata
export async function pinAgentMetadata(input: AgentMetadata): Promise<string> {
  const metadata = {
    name: input.name,
    description: input.description,
    traits: input.traits,
    memory_uri: input.memory_uri ?? "",
    created_at: new Date().toISOString(),
  };

  const uri = await uploadMetadata(metadata);
  return uri; // e.g., ipfs://Qm...
}

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Generate embeddings from text
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });

  return response.data[0].embedding;
}
