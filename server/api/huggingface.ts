// ===== 1. server/api/huggingface.ts - Enhanced with Action Classification =====
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { chatRateLimit } from "../middleware/throttle";
import { executeAction } from "./actions"; // We'll create this

dotenv.config({ path: ".env.local" });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY in .env.local");

const router = express.Router();
const WORKING_MODEL = "llama-3.1-8b-instant";

// Action classification function
async function classifyIntent(message: string): Promise<{
  intent: string;
  confidence: number;
  parameters: any;
}> {
  const lowerMessage = message.toLowerCase();

  // Email detection
  if (lowerMessage.includes("send") && (lowerMessage.includes("email") || lowerMessage.includes("mail"))) {
    const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const recipient = emailMatch ? emailMatch[1] : null;

    let subject = "Message from AI Assistant";
    let body = message;

    if (message.includes("about") || message.includes("regarding")) {
      const aboutIndex = Math.max(
        message.indexOf("about"),
        message.indexOf("regarding")
      );
      if (aboutIndex !== -1) {
        const content = message.substring(aboutIndex).replace(/^(about|regarding)\s+/i, "");
        subject = content.split(" ").slice(0, 5).join(" ");
        body = content;
      }
    }

    return {
      intent: "send_email",
      confidence: 0.9,
      parameters: { recipient, subject, body }
    };
  }

  // Weather detection
  if (lowerMessage.includes("weather") || lowerMessage.includes("temperature")) {
    const cityMatch = message.match(/weather\s+(?:in|for|at)\s+([a-zA-Z\s]+)/i) ||
      message.match(/temperature\s+(?:in|for|at)\s+([a-zA-Z\s]+)/i);
    const city = cityMatch ? cityMatch[1].trim() : "London";

    return {
      intent: "get_weather",
      confidence: 0.8,
      parameters: { city }
    };
  }

  // Reminder detection
  if (lowerMessage.includes("remind") || lowerMessage.includes("reminder")) {
    const timeMatch = message.match(/(?:at|in|on)\s+([0-9:apm\s]+)/i);
    const time = timeMatch ? timeMatch[1] : "1 hour";

    return {
      intent: "set_reminder",
      confidence: 0.8,
      parameters: { message, time }
    };
  }

  // Web search detection
  if (lowerMessage.includes("search") || lowerMessage.includes("look up") || lowerMessage.includes("find")) {
    const query = message.replace(/^(search|look up|find)\s+/i, "").trim();
    return {
      intent: "web_search",
      confidence: 0.7,
      parameters: { query }
    };
  }

  // Crypto operations (for your CRYPTIXIA project)
  if (lowerMessage.includes("send") && (lowerMessage.includes("avax") || lowerMessage.includes("crypto") || lowerMessage.includes("token"))) {
    const amountMatch = message.match(/send\s+(\d+(?:\.\d+)?)\s*(avax|eth|btc|usdc)/i);
    const addressMatch = message.match(/to\s+([a-zA-Z0-9]{40,})/i);

    return {
      intent: "send_crypto",
      confidence: 0.9,
      parameters: {
        amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
        token: amountMatch ? amountMatch[2].toLowerCase() : "avax",
        recipient: addressMatch ? addressMatch[1] : null
      }
    };
  }

  // Balance check
  if (lowerMessage.includes("balance") || lowerMessage.includes("wallet")) {
    return {
      intent: "check_balance",
      confidence: 0.8,
      parameters: {}
    };
  }

  // Default to chat
  return {
    intent: "chat",
    confidence: 1.0,
    parameters: {}
  };
}

export async function generateChatResponse(message: string, memoryContext: string[] = [], agentId?: string): Promise<string> {
  console.log("🎯 generateChatResponse called with:", message);

  try {
    // First, classify the intent
    const classification = await classifyIntent(message);
    console.log("🤖 Intent classification:", classification);

    // If it's an action intent with high confidence, execute the action
    if (classification.intent !== "chat" && classification.confidence > 0.7) {
      console.log(`🚀 Executing action: ${classification.intent}`);
      const actionResult = await executeAction(classification.intent, classification.parameters);
      return actionResult;
    }

    // Otherwise, proceed with normal chat generation
    let systemMessage = 'You are Cryptixia, a helpful AI assistant that can perform actions and remember conversations. ';
    systemMessage += 'You can help users with tasks like sending emails, checking weather, setting reminders, and managing crypto wallets. ';
    systemMessage += 'Keep responses concise and friendly. ';

    if (memoryContext.length > 0) {
      systemMessage += '\n\nHere are relevant memories from previous conversations:\n';
      systemMessage += memoryContext.join('\n');
      systemMessage += '\n\nUse these memories to provide personalized and context-aware responses.';
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: WORKING_MODEL,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error("Groq API rate limit exceeded");
      }
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let result = data.choices?.[0]?.message?.content || "";
    result = result.trim();

    if (!result || result.length < 3) {
      const responses = [
        "Hello! How can I help you today? I can send emails, check weather, set reminders, and more!",
        "Hi there! I'm ready to assist you with various tasks. What would you like me to do?",
        "Hey! I can help you with emails, weather updates, reminders, and crypto operations. What do you need?"
      ];
      result = responses[Math.floor(Math.random() * responses.length)];
    }

    return result;

  } catch (error: any) {
    console.error("❌ Error in generateChatResponse:", error);

    if (error.message?.includes("rate limit")) {
      return "I'm getting too many requests right now. Please try again in a moment!";
    }

    return "I'm having a small technical hiccup. Could you try asking that again?";
  }
}

export async function embedText(text: string): Promise<number[]> {
  console.log("📝 Using dummy embedding for:", text.substring(0, 50));
  return new Array(384).fill(0).map(() => Math.random() - 0.5);
}

router.post("/embed", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing 'text'" });

    const embedding = await embedText(text);
    res.json({ embedding });
  } catch (err: any) {
    console.error("Embedding endpoint error:", err);
    res.status(500).json({ error: "Failed to generate embedding" });
  }
});

router.post("/chat", chatRateLimit, async (req: Request, res: Response) => {
  console.log("🎯 /chat endpoint hit");

  try {
    const { text, message, sessionId, tokenId } = req.body;
    const inputText = text || message;

    if (!inputText) {
      return res.status(400).json({ error: "Missing 'text' or 'message'" });
    }

    let memoryContext: string[] = [];
    if (tokenId) {
      try {
        const { searchMemories } = await import("./memories");
        const relevantMemories = await searchMemories(tokenId, inputText, 3);

        if (relevantMemories.length > 0) {
          memoryContext = relevantMemories.map((memory: any, index: number) =>
            `Memory ${index + 1}: ${memory.metadata?.text} (relevance: ${(memory.score * 100).toFixed(1)}%)`
          );
        }
      } catch (memoryError) {
        console.error("❌ Memory search error:", memoryError);
      }
    }

    const reply = await generateChatResponse(inputText, memoryContext, tokenId);

    res.json({
      reply,
      success: true,
      model: WORKING_MODEL,
      inputReceived: inputText,
      sessionId: sessionId || 'default',
      timestamp: new Date().toISOString(),
      memoriesUsed: memoryContext.length
    });

  } catch (err: any) {
    console.error("❌ Chat endpoint error:", err);

    if (err.message?.includes("rate limit")) {
      return res.status(429).json({
        error: "I'm getting too many requests right now. Please try again in a moment!",
        success: false,
        retryAfter: 60
      });
    }

    res.status(500).json({
      error: "Chat endpoint failed",
      details: err.message,
      success: false
    });
  }
});

export default router;

// ===== 2. server/api/actions.ts - Action Execution System =====
import nodemailer from 'nodemailer';
import axios from 'axios';
import { Web3 } from 'web3';

interface ActionParameters {
  [key: string]: any;
}

// Gmail transporter setup
let gmailTransporter: nodemailer.Transporter | null = null;

function getGmailTransporter() {
  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD, // Use app password, not regular password
      },
    });
  }
  return gmailTransporter;
}

// Web3 setup for crypto operations
function getWeb3Instance() {
  const rpcUrl = process.env.AVALANCHE_FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc';
  return new Web3(rpcUrl);
}

export async function executeAction(intent: string, parameters: ActionParameters): Promise<string> {
  console.log(`🎯 Executing action: ${intent}`, parameters);

  try {
    switch (intent) {
      case 'send_email':
        return await sendEmail(parameters);

      case 'get_weather':
        return await getWeather(parameters);

      case 'set_reminder':
        return await setReminder(parameters);

      case 'web_search':
        return await webSearch(parameters);

      case 'send_crypto':
        return await sendCrypto(parameters);

      case 'check_balance':
        return await checkBalance(parameters);

      default:
        return `I understand you want me to ${intent}, but I'm not sure how to do that yet. Let me learn more about this task!`;
    }
  } catch (error: any) {
    console.error(`❌ Action execution failed for ${intent}:`, error);
    return `I tried to ${intent.replace('_', ' ')} but encountered an error: ${error.message}. Let me try a different approach next time!`;
  }
}

async function sendEmail(params: ActionParameters): Promise<string> {
  const { recipient, subject, body } = params;

  if (!recipient) {
    return "I'd love to send that email, but I need a recipient email address. Could you provide one?";
  }

  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    return "Email functionality isn't set up yet. The admin needs to configure Gmail credentials in the environment variables.";
  }

  try {
    const transporter = getGmailTransporter();

    const mailOptions = {
      from: process.env.GMAIL_EMAIL,
      to: recipient,
      subject: subject || 'Message from your AI Assistant',
      text: body || 'This message was sent via your AI assistant.',
      html: `
        <h3>Message from your AI Assistant</h3>
        <p>${(body || 'This message was sent via your AI assistant.').replace(/\n/g, '<br>')}</p>
        <hr>
        <small>Sent via Cryptixia AI Assistant</small>
      `
    };

    await transporter.sendMail(mailOptions);
    return `✅ Email sent successfully to ${recipient}! Subject: "${subject || 'Message from your AI Assistant'}"`;

  } catch (error: any) {
    console.error('Email sending error:', error);
    return `❌ Failed to send email to ${recipient}. Error: ${error.message}`;
  }
}

async function getWeather(params: ActionParameters): Promise<string> {
  const { city } = params;

  if (!process.env.OPENWEATHER_API_KEY) {
    return "Weather functionality isn't available yet. The admin needs to set up an OpenWeatherMap API key.";
  }

  try {
    const response = await axios.get(
      `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`,
      { timeout: 10000 }
    );

    const data = response.data;
    const temp = Math.round(data.main.temp);
    const description = data.weather[0].description;
    const humidity = data.main.humidity;

    return `🌤️ Weather in ${city}: ${temp}°C, ${description}. Humidity: ${humidity}%. Perfect weather to stay productive!`;

  } catch (error: any) {
    if (error.response?.status === 404) {
      return `❌ Couldn't find weather data for "${city}". Could you check the city name?`;
    }
    return `❌ Unable to fetch weather for ${city}. The weather service might be temporarily unavailable.`;
  }
}

async function setReminder(params: ActionParameters): Promise<string> {
  const { message, time } = params;

  // For now, this is a mock implementation
  // In production, you'd integrate with calendar APIs or a database
  console.log(`⏰ Reminder set: "${message}" for ${time}`);

  return `⏰ Reminder set: "${message}" for ${time}. (Note: This is currently a demo - in the full version, I'll integrate with your calendar!)`;
}

async function webSearch(params: ActionParameters): Promise<string> {
  const { query } = params;

  try {
    // Using a simple search API or web scraping
    // For production, integrate with Google Custom Search API or Bing API

    return `🔍 I would search for "${query}" but web search isn't fully implemented yet. In the full version, I'll provide you with real search results from the web!`;

  } catch (error: any) {
    return `❌ Search failed for "${query}". Error: ${error.message}`;
  }
}

async function sendCrypto(params: ActionParameters): Promise<string> {
  const { amount, token, recipient } = params;

  if (!recipient) {
    return "I need a recipient wallet address to send crypto. Could you provide one?";
  }

  if (!amount || amount <= 0) {
    return "I need a valid amount to send. How much would you like to send?";
  }

  try {
    // This is a demo implementation - in production you'd need proper wallet integration
    const web3 = getWeb3Instance();

    // Mock transaction for demo
    console.log(`💰 Mock crypto transaction: Sending ${amount} ${token.toUpperCase()} to ${recipient}`);

    return `💰 Successfully sent ${amount} ${token.toUpperCase()} to ${recipient.substring(0, 10)}...${recipient.slice(-8)}! 
    
⚠️ Note: This is currently a demo transaction. In the full version, this would execute a real blockchain transaction after requesting your wallet signature for security.`;

  } catch (error: any) {
    return `❌ Crypto transaction failed: ${error.message}`;
  }
}

async function checkBalance(params: ActionParameters): Promise<string> {
  try {
    const web3 = getWeb3Instance();

    // Mock balance check for demo
    const mockBalance = {
      AVAX: (Math.random() * 10).toFixed(4),
      USDC: (Math.random() * 1000).toFixed(2)
    };

    return `💰 Your wallet balance:
    
• AVAX: ${mockBalance.AVAX}
• USDC: ${mockBalance.USDC}

⚠️ Note: This is demo data. In the full version, I'll show your actual wallet balances by connecting to your Web3 wallet.`;

  } catch (error: any) {
    return `❌ Unable to check balance: ${error.message}`;
  }
}

// ===== 3. server/api/memories.ts - Memory Management System =====
import { getPineconeIndex } from '../pinecone';
import { embedText } from './huggingface';

interface Memory {
  id: string;
  text: string;
  timestamp: string;
  agentId: string;
  metadata?: {
    text: string;
    type?: string;
    [key: string]: any;
  };
}

export async function storeMemory(agentId: string, text: string, type: string = 'conversation'): Promise<string> {
  try {
    console.log(`💾 Storing memory for agent ${agentId}: "${text.substring(0, 50)}..."`);

    const index = await getPineconeIndex();
    const embedding = await embedText(text);

    const memoryId = `${agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const memory: Memory = {
      id: memoryId,
      text,
      timestamp: new Date().toISOString(),
      agentId,
      metadata: {
        text,
        type,
        agentId,
        timestamp: new Date().toISOString()
      }
    };

    await index.upsert([{
      id: memoryId,
      values: embedding,
      metadata: memory.metadata
    }]);

    console.log(`✅ Memory stored successfully: ${memoryId}`);
    return memoryId;

  } catch (error: any) {
    console.error('❌ Memory storage error:', error);
    throw new Error(`Failed to store memory: ${error.message}`);
  }
}

export async function searchMemories(agentId: string, query: string, topK: number = 5) {
  try {
    console.log(`🔍 Searching memories for agent ${agentId} with query: "${query}"`);

    const index = await getPineconeIndex();
    const queryEmbedding = await embedText(query);

    const searchResults = await index.query({
      vector: queryEmbedding,
      topK,
      filter: {
        agentId: { $eq: agentId }
      },
      includeMetadata: true,
      includeValues: false
    });

    console.log(`📚 Found ${searchResults.matches?.length || 0} memories`);
    return searchResults.matches || [];

  } catch (error: any) {
    console.error('❌ Memory search error:', error);
    return [];
  }
}

export async function getAllMemories(agentId: string): Promise<Memory[]> {
  try {
    const memories = await searchMemories(agentId, "", 100);
    return memories.map((match: any) => ({
      id: match.id,
      text: match.metadata?.text || '',
      timestamp: match.metadata?.timestamp || new Date().toISOString(),
      agentId: match.metadata?.agentId || agentId,
      metadata: match.metadata
    }));
  } catch (error: any) {
    console.error('❌ Get all memories error:', error);
    return [];
  }
}

import express, { Request, Response } from 'express';
const memoriesRouter = express.Router();

memoriesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { agentId, text, type = 'conversation' } = req.body;

    if (!agentId || !text) {
      return res.status(400).json({ error: 'agentId and text are required' });
    }

    const memoryId = await storeMemory(agentId, text, type);

    res.json({
      success: true,
      memoryId,
      message: 'Memory stored successfully'
    });

  } catch (error: any) {
    console.error('Memory storage endpoint error:', error);
    res.status(500).json({
      error: 'Failed to store memory',
      details: error.message
    });
  }
});

memoriesRouter.get('/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { query, limit = '10' } = req.query;

    let memories;
    if (query && typeof query === 'string') {
      memories = await searchMemories(agentId, query, parseInt(limit as string));
    } else {
      memories = await getAllMemories(agentId);
    }

    res.json({
      success: true,
      memories,
      count: memories.length
    });

  } catch (error: any) {
    console.error('Memory retrieval endpoint error:', error);
    res.status(500).json({
      error: 'Failed to retrieve memories',
      details: error.message
    });
  }
});

export default memoriesRouter;

// ===== 4. Updated server/index.ts =====
// [Your existing index.ts remains the same, just make sure memoriesRoutes is imported and mounted as shown in your current code]