// server/index.ts - DEBUG VERSION to isolate the issue
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '127.0.0.1';

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

console.log("Setting up basic routes...");

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Cryptixia server is working!',
    timestamp: new Date().toISOString()
  });
});

console.log("Basic routes set up successfully");

// Try importing HuggingFace router
try {
  console.log("Attempting to import huggingface router...");
  const huggingfaceRouter = require('./api/huggingface').default;
  app.use('/api/huggingface', huggingfaceRouter);
  console.log("HuggingFace router imported successfully");
} catch (error) {
  console.error("Failed to import huggingface router:", error);
}

// Try adding other routes one by one
console.log("Adding embeddings routes...");

app.post('/api/embeddings/upsert', (req: Request, res: Response) => {
  console.log('Embeddings upsert:', req.body);
  res.json({
    success: true,
    message: 'Memory stored (mock)',
    id: `mem_${Date.now()}`
  });
});

app.post('/api/embeddings/query', (req: Request, res: Response) => {
  console.log('Embeddings query:', req.body);
  res.json({
    success: true,
    results: [
      {
        text: "Previous conversation context",
        score: 0.8,
        metadata: { type: "user_message" }
      }
    ]
  });
});

console.log("Embeddings routes added successfully");

// Try importing memory handlers
try {
  console.log("Attempting to import memory handlers...");
  const { listMemoriesHandler } = require('./api/listMemories');
  const { deleteMemoryHandler } = require('./api/deleteMemory');
  
  app.get('/listMemories', listMemoriesHandler);
  app.delete('/deleteMemory', deleteMemoryHandler);
  console.log("Memory handlers imported successfully");
} catch (error) {
  console.error("Failed to import memory handlers:", error);
  
  // Add fallback handlers
  app.get('/listMemories', (req: Request, res: Response) => {
    res.json({ success: true, memories: [], message: "Mock memory list" });
  });
  
  app.delete('/deleteMemory', (req: Request, res: Response) => {
    res.json({ success: true, message: "Mock memory deletion" });
  });
}

console.log("Adding other API routes...");

// Init agent profile
app.post('/api/initAgentProfile', (req: Request, res: Response) => {
  console.log('initAgentProfile endpoint hit!', req.body);
  res.json({
    memory_uri: 'test://working',
    status: 'success'
  });
});

// Pin metadata
app.post('/api/pinMetadata', (req: Request, res: Response) => {
  console.log('pinMetadata endpoint hit!', req.body);
  res.json({
    cid: 'QmTestCID123456789',
    status: 'success',
    message: 'Metadata pinned successfully (test mode)'
  });
});

console.log("Adding metadata route...");

// NFT metadata endpoint - Simple version
app.get('/metadata/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`Metadata requested for token ${id}`);

  const tokenId = id.replace('.json', '');

  res.json({
    name: `Cryptixia Agent #${tokenId}`,
    description: `An AI agent NFT with unique personality and capabilities`,
    image: `https://example.com/agent-${tokenId}.png`,
    attributes: [
      { trait_type: "Agent Type", value: "Conversational AI" },
      { trait_type: "Personality", value: "Friendly" },
      { trait_type: "Capabilities", value: "Text & Voice Chat" },
      { trait_type: "Generation", value: "1" }
    ]
  });
});

console.log("All routes added successfully");

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 fallback
app.use((req: Request, res: Response) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

console.log("Starting server...");

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Cryptixia server running at http://${HOST}:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  / (health check)`);
  console.log(`   GET  /api/huggingface/test (test HuggingFace)`);
  console.log(`   POST /api/huggingface/chat (actual AI chat)`);
  console.log(`   POST /api/embeddings/upsert (store memory)`);
  console.log(`   POST /api/embeddings/query (retrieve memory)`);
  console.log(`   GET  /listMemories?tokenId=1&topK=20`);
  console.log(`   DELETE /deleteMemory (body: {memoryId})`);
  console.log(`   POST /api/initAgentProfile`);
  console.log(`   POST /api/pinMetadata`);
  console.log(`   GET  /metadata/:id`);
});

// Handle server errors
server.on('error', (err: NodeJS.ErrnoException) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill existing process or use different port.`);
  }
});

export default app;