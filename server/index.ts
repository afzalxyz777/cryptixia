// server/index.ts - FIXED VERSION
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

// LOAD ENVIRONMENT VARIABLES FIRST
dotenv.config({ path: ".env.local" });

// NOW IMPORT THE ROUTES (they'll have access to env vars)
import chatRoutes from "./api/chat";
import huggingfaceRoutes from "./api/huggingface";
import mixTraitsRoutes from "./api/mixTraits";
import ttsRoutes from "./api/tts";
import memoriesRoutes from "./api/memories";
import parseIntentRoutes from "./api/parseIntent";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = "127.0.0.1";

// Type definitions
interface ChatResponse {
  response?: string;
  message?: string;
  [key: string]: any;
}

interface TTSConfig {
  enabled: boolean;
  voice?: string;
  speed?: number;
}

interface RequestBody {
  message: string;
  sessionId?: string;
  tokenId?: string;
  agentId?: string;
  ttsConfig?: TTSConfig;
}

interface AudioResponse {
  type: 'buffer' | 'web_speech';
  data?: number[];
  contentType?: string;
  text?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

// Body parser middleware with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';

  console.log(`${timestamp} - ${method} ${url} - ${userAgent}`);
  next();
});

// Health check endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "Cryptixia server is running!",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    endpoints: {
      chat: "/api/chat",
      chatWithTTS: "/api/chat-with-tts",
      tts: "/api/tts",
      avatar: "/api/generateAvatar",
      mixTraits: "/api/mixTraits",
      huggingface: "/api/huggingface",
      memories: "/api/memories",
      parseIntent: "/api/parseIntent"
    }
  });
});

// Agent profile initialization endpoint
app.post("/api/initAgentProfile", (req: Request, res: Response) => {
  try {
    const { tokenId, agentData } = req.body;

    console.log("initAgentProfile endpoint hit!", { tokenId, agentData });

    // In a real implementation, you would save this to a database
    // For now, return a mock response
    res.json({
      memory_uri: `agent://${tokenId}/profile`,
      status: "success",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("initAgentProfile error:", error);
    res.status(500).json({
      error: "Failed to initialize agent profile",
      status: "error"
    });
  }
});

// Metadata pinning endpoint
app.post("/api/pinMetadata", (req: Request, res: Response) => {
  try {
    const { metadata, tokenId } = req.body;

    console.log("pinMetadata endpoint hit!", { tokenId, metadataKeys: Object.keys(metadata || {}) });

    // In a real implementation, you would pin this to IPFS
    // For now, return a mock response
    const mockCID = `QmTest${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    res.json({
      cid: mockCID,
      status: "success",
      message: "Metadata pinned successfully (test mode)",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("pinMetadata error:", error);
    res.status(500).json({
      error: "Failed to pin metadata",
      status: "error"
    });
  }
});

// Enhanced chat endpoint with TTS support
app.post('/api/chat-with-tts', async (req: Request, res: Response) => {
  try {
    const { message, sessionId = 'default', tokenId, agentId, ttsConfig }: RequestBody = req.body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required and must be a string'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: 'Message too long (max 2000 characters)'
      });
    }

    console.log(`💬 Chat request from session ${sessionId}: "${message.substring(0, 50)}..."`);

    // Forward to existing chat API
    const chatResponse = await fetch(`http://${HOST}:${PORT}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cryptixia-Server/1.0'
      },
      body: JSON.stringify({ message, sessionId, tokenId, agentId }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error(`Chat API failed: ${chatResponse.status} - ${errorText}`);
      throw new Error(`Chat API failed: ${chatResponse.status}`);
    }

    const chatData = (await chatResponse.json()) as ChatResponse;
    const responseText = chatData.response || chatData.message || String(chatData);

    // Validate response text
    if (!responseText || typeof responseText !== 'string') {
      console.warn('Invalid response from chat API:', chatData);
      return res.status(500).json({
        error: 'Invalid response from chat service'
      });
    }

    // Generate TTS if requested and text is valid
    if (ttsConfig?.enabled && responseText.length > 0) {
      try {
        console.log(`🎤 Generating TTS for: "${responseText.substring(0, 50)}..."`);

        const ttsResponse = await fetch(`http://${HOST}:${PORT}/api/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Cryptixia-Server/1.0'
          },
          body: JSON.stringify({
            text: responseText,
            voice: ttsConfig.voice || 'en_US-amy-medium',
            speed: Math.max(0.5, Math.min(2.0, ttsConfig.speed || 1.0)),
            useCache: true
          }),
          signal: AbortSignal.timeout(45000) // 45 second timeout for TTS
        });

        if (ttsResponse.ok) {
          const contentType = ttsResponse.headers.get('content-type');

          if (contentType?.includes('audio')) {
            // TTS audio generated successfully
            const audioBuffer = await ttsResponse.arrayBuffer();
            const audioResponse: AudioResponse = {
              type: 'buffer',
              data: Array.from(new Uint8Array(audioBuffer)),
              contentType: 'audio/wav'
            };

            console.log(`✅ TTS audio generated: ${audioBuffer.byteLength} bytes`);

            return res.json({
              ...chatData,
              response: responseText,
              audio: audioResponse
            });
          } else {
            // Fallback to web speech API
            const fallbackData = await ttsResponse.json();
            return res.json({
              ...chatData,
              response: responseText,
              audio: fallbackData
            });
          }
        } else {
          console.warn(`TTS API returned ${ttsResponse.status}`);
          throw new Error(`TTS API failed: ${ttsResponse.status}`);
        }
      } catch (ttsError) {
        console.error('🎤 TTS generation failed:', ttsError);
        // Send response without TTS but include the error info
        return res.json({
          ...chatData,
          response: responseText,
          audio: null,
          ttsError: 'TTS generation failed, but chat response succeeded'
        });
      }
    } else {
      // No TTS requested or invalid response text
      return res.json({
        ...chatData,
        response: responseText
      });
    }

  } catch (error) {
    console.error('💬 Chat with TTS error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = errorMessage.includes('timeout') ? 408 : 500;

    res.status(statusCode).json({
      error: 'Chat generation failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Mount API routes
app.use("/api/chat", chatRoutes);
app.use("/api/huggingface", huggingfaceRoutes);
app.use("/api/mixTraits", mixTraitsRoutes);
app.use("/api/parseIntent", parseIntentRoutes);
app.use("/api", ttsRoutes);
app.use("/api/memories", memoriesRoutes);

// Avatar generation endpoint (supports both GET and POST)
const generateAvatarHandler = async (req: Request, res: Response) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Handle both GET and POST requests
    const params = req.method === 'GET' ? req.query : req.body;
    const { templateId, traits, seed, tokenId, format = 'svg', size = '256' } = params;

    // Use tokenId if provided, otherwise use templateId and seed
    const avatarSeed = tokenId || `${templateId || 'default'}-${seed || Date.now()}`;

    if (!avatarSeed) {
      return res.status(400).json({
        error: 'Missing required parameter: either tokenId or (templateId and seed) are required'
      });
    }

    console.log(`🎨 Generating avatar for seed: ${avatarSeed}, format: ${format}, size: ${size}`);

    // Generate avatar URL using DiceBear API
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}&size=${size}&backgroundColor=b6e3f4,c0aede,d1d4f9&randomizeIds=true`;

    console.log(`✅ Generated avatar URL: ${avatarUrl}`);

    // Return avatar metadata
    const response = {
      avatarUrl,
      status: 'success',
      templateId: templateId || 'auto',
      seed: avatarSeed,
      format,
      size,
      source: 'dicebear',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Avatar generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      error: 'Failed to generate avatar',
      details: errorMessage,
      timestamp: new Date().toISOString(),
      fallback_url: `https://api.dicebear.com/7.x/bottts/svg?seed=fallback-${Date.now()}`
    });
  }
};

app.get("/api/generateAvatar", generateAvatarHandler);
app.post("/api/generateAvatar", generateAvatarHandler);

// NFT metadata endpoint
import { loadChildren } from "./api/storage";

// NEW: Handle metadata requests with full URLs (fix for 404 errors)
app.get("/metadata/*", async (req: Request, res: Response) => {
  try {
    const fullPath = req.params[0]; // Get the entire path after /metadata/

    console.log(`📄 Metadata requested: ${fullPath}`);

    // Extract token ID from various URL formats
    let tokenId = "1"; // default

    // Handle different URL patterns that might come from the frontend
    if (fullPath.includes('QmTest')) {
      // Extract from QmTest URLs: https://gateway.pinata.cloud/ipfs/QmTest123456
      const match = fullPath.match(/QmTest(\d+)/);
      tokenId = match ? match[1] : fullPath.replace(/\D/g, '') || '1';
    } else if (fullPath.endsWith('.json')) {
      // Handle /metadata/something.json
      tokenId = fullPath.replace('.json', '').replace(/\D/g, '') || '1';
    } else {
      // Extract numbers from any other format
      tokenId = fullPath.replace(/\D/g, '') || '1';
    }

    // Ensure tokenId is valid
    tokenId = tokenId || '1';
    console.log(`📄 Extracted token ID: ${tokenId}`);

    const baseUrl = `http://${HOST}:${PORT}`;

    if (tokenId.startsWith("child_")) {
      try {
        const children = await loadChildren();
        const child = children[tokenId];

        if (!child) {
          console.warn(`Child token ${tokenId} not found`);
          return res.status(404).json({ error: "Child not found" });
        }

        const metadata = {
          name: `Cryptixia Agent #${tokenId}`,
          description: "An AI agent NFT with unique personality and capabilities from the Cryptixia ecosystem",
          image: `${baseUrl}/api/generateAvatar?tokenId=${tokenId}&format=png&size=512`,
          external_url: `${baseUrl}/agent/${tokenId}`,
          attributes: Object.entries(child)
            .filter(([key, value]) => value !== null && value !== undefined)
            .map(([trait_type, value]) => ({
              trait_type: String(trait_type).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              value: String(value),
            })),
          compiler: "Cryptixia Agent Generator v1.0"
        };

        return res.json(metadata);
      } catch (storageError) {
        console.error("Storage error:", storageError);
        return res.status(500).json({ error: "Failed to load child data" });
      }
    }

    // Default metadata for non-child tokens
    const defaultMetadata = {
      name: `Cryptixia Agent #${tokenId}`,
      description: "An AI agent NFT with unique personality and capabilities from the Cryptixia ecosystem",
      image: `${baseUrl}/api/generateAvatar?tokenId=${tokenId}&format=png&size=512`,
      external_url: `${baseUrl}/agent/${tokenId}`,
      attributes: [
        { trait_type: "Agent Type", value: "Conversational AI" },
        { trait_type: "Personality", value: "Adaptive" },
        { trait_type: "Capabilities", value: "Text & Voice Chat" },
        { trait_type: "Generation", value: "1" },
        { trait_type: "Platform", value: "Cryptixia" }
      ],
      compiler: "Cryptixia Agent Generator v1.0"
    };

    res.json(defaultMetadata);
  } catch (err) {
    console.error("Metadata error:", err);
    res.status(500).json({
      error: "Failed to load metadata",
      timestamp: new Date().toISOString()
    });
  }
});

// Global error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("❌ Unhandled error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(500).json({
    error: "Internal server error",
    timestamp: new Date().toISOString()
  });
});

// 404 fallback middleware
app.use((req: Request, res: Response) => {
  console.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      chat: "/api/chat",
      chatWithTTS: "/api/chat-with-tts",
      tts: "/api/tts",
      voices: "/api/voices",
      avatar: "/api/generateAvatar",
      mixTraits: "/api/mixTraits",
      huggingface: "/api/huggingface",
      memories: "/api/memories",
      parseIntent: "/api/parseIntent",
      metadata: "/metadata/*"
    }
  });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Cryptixia server running at http://${HOST}:${PORT}`);
  console.log(`📱 Chat API available at http://${HOST}:${PORT}/api/chat`);
  console.log(`💬 Chat with TTS API available at http://${HOST}:${PORT}/api/chat-with-tts`);
  console.log(`🎤 TTS API available at http://${HOST}:${PORT}/api/tts`);
  console.log(`🎵 Voices API available at http://${HOST}:${PORT}/api/voices`);
  console.log(`🎨 Avatar API available at http://${HOST}:${PORT}/api/generateAvatar`);
  console.log(`🧬 MixTraits API available at http://${HOST}:${PORT}/api/mixTraits`);
  console.log(`🤖 HuggingFace API available at http://${HOST}:${PORT}/api/huggingface`);
  console.log(`🧠 Memories API available at http://${HOST}:${PORT}/api/memories`);
  console.log(`🗣️ ParseIntent API available at http://${HOST}:${PORT}/api/parseIntent`);
  console.log(`📄 Metadata API available at http://${HOST}:${PORT}/metadata/*`);
  console.log(`✅ Server ready for connections`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }

    console.log('✅ Server closed successfully');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle server errors
server.on("error", (err: NodeJS.ErrnoException) => {
  console.error("❌ Server error:", err);

  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Please choose a different port.`);
    process.exit(1);
  } else if (err.code === "EACCES") {
    console.error(`❌ Permission denied. Cannot bind to port ${PORT}.`);
    process.exit(1);
  }
});

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

export default app;