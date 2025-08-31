// server/pinecone.ts - Fixed location and implementation
import { Pinecone } from '@pinecone-database/pinecone';

let pineconeInstance: Pinecone | null = null;

export async function getPineconeClient(): Promise<Pinecone> {
  if (!pineconeInstance) {
    const apiKey = process.env.PINECONE_API_KEY;

    console.log("Initializing Pinecone client...");
    console.log("API Key exists:", !!apiKey);

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not set in environment variables');
    }

    pineconeInstance = new Pinecone({
      apiKey: apiKey,
    });

    console.log("Pinecone client initialized successfully");
  }

  return pineconeInstance;
}

export async function getPineconeIndex() {
  try {
    const client = await getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME;

    console.log("Getting Pinecone index...");
    console.log("Index name:", indexName);

    if (!indexName) {
      throw new Error('PINECONE_INDEX_NAME is not set in environment variables');
    }

    const index = client.index(indexName);
    console.log(`Connected to Pinecone index: ${indexName}`);

    return index;
  } catch (error) {
    console.error("Error getting Pinecone index:", error);
    throw error;
  }
}