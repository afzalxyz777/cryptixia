import type { NextApiRequest, NextApiResponse } from 'next';
import { generateChatResponse } from '../api/huggingface';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, tokenId, context } = req.body;

        // Input validation
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (message.length > 1000) {
            return res.status(400).json({ error: 'Message too long' });
        }

        // Generate client identifier for rate limiting
        const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';


        // Get AI response
        const response = await generateChatResponse(
            message,
            context || []// Assuming the third argument is the request object; adjust as needed.
        );

        return res.status(200).json({
            response,
            success: true,
            tokenId: tokenId || null
        });

    } catch (error: unknown) {
        console.error('Chat API Error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        // Handle rate limiting
        if (errorMessage.includes('Rate limit exceeded')) {
            return res.status(429).json({ error: 'Too many requests. Please wait.' });
        }

        // Handle validation errors
        if (errorMessage.includes('Invalid') || errorMessage.includes('too long')) {
            return res.status(400).json({ error: errorMessage });
        }

        // Generic error
        return res.status(500).json({ error: 'Failed to generate response' });
    }
}