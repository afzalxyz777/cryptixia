// server/index.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './api/chat';
import huggingfaceRoutes from './api/huggingface';
import generateAvatarHandler from './api/generateAvatar'; // 👈 new import

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '127.0.0.1'; // Explicitly bind to localhost

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Server is working!',
    timestamp: new Date().toISOString()
  });
});

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

// Mount Chat API - make sure this comes before the 404 handler
app.use('/api/chat', chatRoutes);

// Mount HuggingFace API routes
app.use('/api/huggingface', huggingfaceRoutes);

// Avatar generator endpoint 👇
app.get('/api/generateAvatar', generateAvatarHandler);

// Add metadata endpoint for NFTs
app.get('/metadata/:id.json', (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`Metadata requested for token ${id}`);

  // Return mock metadata for now
  res.json({
    name: `Cryptixia Agent #${id}`,
    description: `An AI agent NFT with unique personality and capabilities`,
    image: `https://example.com/agent-${id}.png`,
    attributes: [
      { trait_type: "Agent Type", value: "Conversational AI" },
      { trait_type: "Personality", value: "Friendly" },
      { trait_type: "Capabilities", value: "Text & Voice Chat" },
      { trait_type: "Generation", value: "1" }
    ]
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 fallback - this should be last
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server once
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Cryptixia server running at http://${HOST}:${PORT}`);
  console.log(`📱 Chat API available at http://${HOST}:${PORT}/api/chat`);
  console.log(`🎨 Avatar API available at http://${HOST}:${PORT}/api/generateAvatar`);
});

// Handle server errors
server.on('error', (err: NodeJS.ErrnoException) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill existing process or use different port.`);
  }
});

export default app;
