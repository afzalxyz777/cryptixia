// server/lib/embedder.ts
import { HfInference } from '@huggingface/inference';

let hf: HfInference | null = null;

function getHuggingFaceClient() {
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.warn("⚠️ HUGGINGFACE_API_KEY not found - embeddings disabled");
    return null;
  }

  if (!hf) {
    hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
  }

  return hf;
}

/**
 * Generate embedding for text using Hugging Face's sentence-transformers
 */
export async function embedText(text: string): Promise<number[]> {
  const client = getHuggingFaceClient();
  
  if (!client) {
    console.warn("⚠️ HuggingFace client not available, returning dummy embedding");
    // Return a dummy embedding vector (384 dimensions for sentence-transformers/all-MiniLM-L6-v2)
    return new Array(384).fill(0);
  }

  try {
    const response = await client.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: text,
    });

    // Handle different response types from HF
    if (Array.isArray(response)) {
      // If it's a 2D array, take the first row
      if (Array.isArray(response[0])) {
        return response[0] as number[];
      }
      // If it's already a 1D array
      return response as number[];
    }
    
    return [];
  } catch (error) {
    console.error("❌ Failed to generate embedding:", error);
    // Return dummy embedding on error
    return new Array(384).fill(0);
  }
}