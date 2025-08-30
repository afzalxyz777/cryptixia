// server/api/pinecone.ts
import { Pinecone } from "@pinecone-database/pinecone";

let client: Pinecone | null = null;

/**
 * Initialize and return Pinecone client
 * Returns null if API key is missing (graceful fallback)
 */
export function getPineconeClient(): Pinecone | null {
  // Check if API key exists
  if (!process.env.PINECONE_API_KEY) {
    console.warn("⚠️ PINECONE_API_KEY not found - vector memory disabled");
    return null;
  }

  // Initialize client only once
  if (!client) {
    try {
      client = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
      console.log("✅ Pinecone client initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Pinecone client:", error);
      return null;
    }
  }
  
  return client;
}

/**
 * Get Pinecone index instance
 * Returns null if Pinecone is not available
 */
export async function getPineconeIndex(indexName = "cryptixia-memory") {
  const pinecone = getPineconeClient();
  if (!pinecone) {
    console.warn("⚠️ Pinecone client not available - skipping index access");
    return null;
  }

  try {
    const index = pinecone.index(indexName);
    console.log(`✅ Connected to Pinecone index: ${indexName}`);
    return index;
  } catch (error) {
    console.error(`❌ Failed to access Pinecone index '${indexName}':`, error);
    return null;
  }
}

/**
 * Check if Pinecone is properly configured
 */
export function isPineconeConfigured(): boolean {
  return !!process.env.PINECONE_API_KEY;
}