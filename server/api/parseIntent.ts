// server/api/parseIntent.ts - ENHANCED VERSION with better voice recognition
import express, { Request, Response } from "express";
import { generateChatResponse } from "./huggingface";

const router = express.Router();

interface ParsedIntent {
    action: string;
    amount?: string;
    recipient?: string;
    confidence: number;
    requiresConfirmation: boolean;
    naturalLanguageSummary: string;
    rawInput: string;
}

// Enhanced voice-to-text mapping for common misheard words
const VOICE_ALIASES = {
    // Common recipient aliases that sound similar
    'abc': ['abc', 'abcs', 'ab see', 'a b c', 'absy', 'ab c'],
    'bob': ['bob', 'bobs', 'bobby', 'rob', 'job'],
    'alice': ['alice', 'alices', 'ellis', 'elise', 'alicia'],
    'test': ['test', 'tests', 'guest', 'best', 'vest'],
    'avx': ['avx', 'avax', 'a v x', 'vx', 'wx', 'ax', 'avx2', 'avx1'],
    'dev': ['dev', 'dave', 'deb', 'deaf', 'death'],
    'user': ['user', 'users', 'use', 'uzer', 'user1'],

    // AVAX token variations
    'avax': ['avax', 'avx', 'a vax', 'a v x', 'vax', 'wax', 'ax', 'avx2', 'avx1', 'avalanche'],

    // Action word variations
    'send': ['send', 'sent', 'sand', 'spend', 'lend', 'end'],
    'transfer': ['transfer', 'transfers', 'transferred', 'trans for', 'transform'],
    'pay': ['pay', 'pays', 'paid', 'play', 'way', 'bay'],
    'balance': ['balance', 'balances', 'palace', 'valance', 'balance'],
    'check': ['check', 'checks', 'tech', 'deck', 'wreck']
};

// Function to normalize voice input using aliases
function normalizeVoiceInput(input: string): string {
    let normalized = input.toLowerCase().trim();

    // Replace common voice recognition errors
    for (const [correct, aliases] of Object.entries(VOICE_ALIASES)) {
        for (const alias of aliases) {
            // Use word boundary regex to avoid partial matches
            const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            normalized = normalized.replace(regex, correct);
        }
    }

    console.log(`[VOICE] Normalized: "${input}" -> "${normalized}"`);
    return normalized;
}

// Enhanced manual parsing with better voice recognition
function manualParseIntent(input: string): ParsedIntent {
    const normalized = normalizeVoiceInput(input);
    const lowerInput = normalized.toLowerCase().trim();

    console.log(`[INTENT] Processing normalized input: "${normalized}"`);

    // Enhanced send patterns with more flexibility
    const sendPatterns = [
        // Standard patterns with normalized input
        /(?:send|transfer|pay)\s+(\d+\.?\d*)\s*(?:avax|avalanche)?\s+to\s+(\w+)/i,
        /(?:send|transfer|pay)\s+(\d+\.?\d*)\s+to\s+(\w+)/i,
        /(?:send|transfer|pay)\s+(\d+\.?\d*)\s*(?:avax|avalanche)?\s+for\s+(\w+)/i,
        /(?:send|transfer|pay)\s+(\d+\.?\d*)\s+(\w+)(?:\s+avax|\s+avalanche)?/i,
        /(?:send|transfer|pay)\s+(\d+\.?\d*)\s*(?:avax|avalanche)\s+(\w+)/i,

        // More flexible patterns for voice recognition
        /(\d+\.?\d*)\s*(?:avax|avalanche)?\s*(?:to|for)\s+(\w+)/i,
        /(?:give|sent|sand)\s+(\d+\.?\d*)\s*(?:avax|avalanche)?\s*(?:to|for)\s+(\w+)/i,
        /(\d+\.?\d*)\s+(?:avax|avalanche)\s+(\w+)/i,

        // Handle cases where numbers come after recipient
        /(?:send|transfer|pay)\s+(\w+)\s+(\d+\.?\d*)\s*(?:avax|avalanche)?/i,
        /(?:give|sent)\s+(\w+)\s+(\d+\.?\d*)/i
    ];

    for (const pattern of sendPatterns) {
        const match = normalized.match(pattern);
        if (match) {
            let amount = match[1];
            let recipient = match[2];

            // Handle reversed order (recipient first, then amount)
            if (isNaN(parseFloat(amount)) && !isNaN(parseFloat(recipient))) {
                [amount, recipient] = [recipient, amount];
            }

            // Validate that we have valid amount and recipient
            if (!isNaN(parseFloat(amount)) && recipient && isNaN(parseFloat(recipient))) {
                console.log(`[INTENT] Found send command: ${amount} -> ${recipient}`);
                return {
                    action: "send_crypto",
                    amount: amount,
                    recipient: recipient,
                    confidence: 0.9,
                    requiresConfirmation: true,
                    naturalLanguageSummary: `Send ${amount} AVAX to ${recipient}`,
                    rawInput: input
                };
            }
        }
    }

    // Enhanced balance patterns
    const balancePatterns = [
        /(?:check|what.*is|what's|whats).*(?:balance|my balance)/i,
        /(?:how much).*(?:avax|avalanche|money|crypto)/i,
        /(?:balance|amount).*(?:avax|avalanche|do i have)/i,
        /(?:my).*(?:balance|wallet|money)/i,
        /(?:show|tell|display).*(?:balance|wallet|funds)/i,
        /(?:wallet|account).*(?:balance|amount)/i
    ];

    for (const pattern of balancePatterns) {
        if (pattern.test(lowerInput)) {
            console.log(`[INTENT] Found balance check`);
            return {
                action: "check_balance",
                confidence: 0.8,
                requiresConfirmation: false,
                naturalLanguageSummary: "Check wallet balance",
                rawInput: input
            };
        }
    }

    // General chat fallback with lower confidence
    return {
        action: "general_chat",
        confidence: 0.3,
        requiresConfirmation: false,
        naturalLanguageSummary: "General conversation",
        rawInput: input
    };
}

// AI parsing function with better prompting
async function parseIntentWithAI(input: string): Promise<ParsedIntent> {
    const normalizedInput = normalizeVoiceInput(input);

    const intentPrompt = `
You are a voice command parser for cryptocurrency operations. Parse this voice input and return ONLY a JSON object.

Voice input may have recognition errors. Common patterns:
- "abc" might be heard as "abcs", "a b c", "avx2", etc.
- "avax" might be heard as "avx", "vax", "wax", etc.
- "send" might be heard as "sent", "sand", etc.

Parse this input: "${normalizedInput}"
Original input: "${input}"

Return JSON with these exact fields:
{
  "action": "send_crypto" | "check_balance" | "general_chat",
  "amount": "string amount if found",
  "recipient": "recipient name/address if found",
  "confidence": 0.0 to 1.0,
  "requiresConfirmation": true if money transfer, false otherwise,
  "naturalLanguageSummary": "human readable description",
  "rawInput": "${input}"
}

Examples:
Input: "send 0.01 avx to abc" -> {"action":"send_crypto","amount":"0.01","recipient":"abc","confidence":0.9,"requiresConfirmation":true,"naturalLanguageSummary":"Send 0.01 AVAX to abc","rawInput":"send 0.01 avx to abc"}
Input: "check balance" -> {"action":"check_balance","confidence":0.8,"requiresConfirmation":false,"naturalLanguageSummary":"Check wallet balance","rawInput":"check balance"}

JSON:`;

    try {
        const aiResponse = await generateChatResponse(intentPrompt);
        console.log(`[AI] Raw AI response: ${aiResponse}`);

        // Try to extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log(`[AI] Parsed intent:`, parsed);

            // Validate required fields and normalize
            if (parsed.action && parsed.confidence !== undefined) {
                return {
                    action: parsed.action,
                    amount: parsed.amount?.toString(),
                    recipient: parsed.recipient?.toString(),
                    confidence: Math.max(0.6, parsed.confidence), // Boost AI confidence slightly
                    requiresConfirmation: parsed.action === "send_crypto" ? true : (parsed.requiresConfirmation !== false),
                    naturalLanguageSummary: parsed.naturalLanguageSummary || `Processed: ${normalizedInput}`,
                    rawInput: input
                };
            }
        }
    } catch (parseError) {
        console.warn("[AI] JSON parsing failed:", parseError);
    }

    // Enhanced fallback - try manual parsing on normalized input
    console.log(`[AI] Falling back to manual parsing`);
    return manualParseIntent(input);
}

// POST /api/parseIntent - Parse voice commands for crypto actions
router.post("/", async (req: Request, res: Response) => {
    try {
        const { text, message } = req.body;
        const input = text || message;

        if (!input || typeof input !== "string") {
            return res.status(400).json({ error: "Input text is required" });
        }

        console.log(`[INTENT] Processing input: "${input}"`);

        // Always try manual parsing first with enhanced patterns
        const manualIntent = manualParseIntent(input);
        console.log(`[INTENT] Manual parse result:`, manualIntent);

        // Use manual parsing if confidence is decent, otherwise try AI
        if (manualIntent.confidence >= 0.7) {
            console.log(`[INTENT] Using manual parse (confidence: ${manualIntent.confidence})`);
            return res.json({
                success: true,
                intent: manualIntent,
                method: "manual",
                timestamp: new Date().toISOString()
            });
        }

        // Try AI parsing for ambiguous cases
        console.log(`[INTENT] Manual confidence low (${manualIntent.confidence}), trying AI...`);
        try {
            const aiIntent = await parseIntentWithAI(input);
            console.log(`[INTENT] AI parse result:`, aiIntent);

            return res.json({
                success: true,
                intent: aiIntent,
                method: "ai",
                timestamp: new Date().toISOString()
            });
        } catch (aiError) {
            console.error(`[INTENT] AI parsing failed:`, aiError);
            // Return manual parsing as fallback
            return res.json({
                success: true,
                intent: manualIntent,
                method: "manual_fallback",
                timestamp: new Date().toISOString()
            });
        }

    } catch (error: any) {
        console.error("[INTENT] Error:", error);
        return res.status(500).json({
            error: "Failed to parse intent",
            success: false,
            details: error.message
        });
    }
});

export default router;