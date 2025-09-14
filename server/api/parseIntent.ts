// server/api/parseIntent.ts - UPDATED VERSION
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

// POST /api/parseIntent - Parse voice commands for crypto actions
router.post("/", async (req: Request, res: Response) => {
    try {
        const { text, message } = req.body;
        const input = text || message;

        if (!input || typeof input !== "string") {
            return res.status(400).json({ error: "Input text is required" });
        }

        console.log(`[INTENT] Parsing: "${input}"`);

        // First try manual parsing for better reliability
        const manualIntent = manualParseIntent(input);
        if (manualIntent.confidence > 0.7) {
            console.log(`[INTENT] Manual parse successful:`, manualIntent);
            return res.json({
                success: true,
                intent: manualIntent,
                timestamp: new Date().toISOString()
            });
        }

        // Fall back to AI if manual parsing isn't confident
        console.log(`[INTENT] Falling back to AI parsing`);
        const aiIntent = await parseIntentWithAI(input);

        return res.json({
            success: true,
            intent: aiIntent,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("[INTENT] Error:", error);
        return res.status(500).json({
            error: "Failed to parse intent",
            success: false,
            details: error.message
        });
    }
});

// Improved manual parsing function
function manualParseIntent(input: string): ParsedIntent {
    const lowerInput = input.toLowerCase().trim();

    // Send/transfer patterns
    // Add more patterns to manualParseIntent function
    // Update the sendPatterns array to be more specific
    const sendPatterns = [
        /(?:send|transfer|pay)\s+(\d+\.?\d*)\s*(?:avax|avalanche)?\s+to\s+(\w+)/i,
        /(?:send|transfer|pay)\s+(\d+\.?\d*)\s+to\s+(\w+)/i,
        /(?:send|transfer|pay)\s+(\d+\.?\d*)\s*(?:avax|avalanche)?\s+for\s+(\w+)/i,
        /(?:send|transfer|pay)\s+(\d+\.?\d*)\s+(\w+)(?:\s+avax|\s+avalanche)?/i, // Modified this line
        /(?:send|transfer|pay)\s+(\d+\.?\d*)\s*(?:avax|avalanche)\s+(\w+)/i, // Added this pattern
    ];

    for (const pattern of sendPatterns) {
        const match = input.match(pattern);
        if (match) {
            return {
                action: "send_crypto",
                amount: match[1],
                recipient: match[2],
                confidence: 0.9,
                requiresConfirmation: true,
                naturalLanguageSummary: `Send ${match[1]} AVAX to ${match[2]}`,
                rawInput: input
            };
        }
    }

    // Balance patterns
    const balancePatterns = [
        /(?:check|what.*is|what's).*balance/i,
        /(?:how much).*(?:avax|avalanche)/i,
        /(?:balance|amount).*(?:avax|avalanche)/i,
        /(?:my).*(?:balance)/i,
    ];

    for (const pattern of balancePatterns) {
        if (pattern.test(lowerInput)) {
            return {
                action: "check_balance",
                confidence: 0.8,
                requiresConfirmation: false,
                naturalLanguageSummary: "Check wallet balance",
                rawInput: input
            };
        }
    }

    // General chat fallback
    return {
        action: "general_chat",
        confidence: 0.5,
        requiresConfirmation: false,
        naturalLanguageSummary: "General conversation",
        rawInput: input
    };
}

// AI parsing function
async function parseIntentWithAI(input: string): Promise<ParsedIntent> {
    const intentPrompt = `
Parse this voice command for cryptocurrency actions. Return ONLY a JSON object with these fields:
- action: "send_crypto", "check_balance", or "general_chat"
- amount: the crypto amount (if any, as string)
- recipient: the recipient address/name (if any)
- confidence: 0.0 to 1.0
- requiresConfirmation: true if it involves money transfer
- naturalLanguageSummary: human-readable description
- rawInput: the original input

Input: "${input}"

Examples:
"send 0.01 AVAX to abc" -> {"action":"send_crypto","amount":"0.01","recipient":"abc","confidence":0.9,"requiresConfirmation":true,"naturalLanguageSummary":"Send 0.01 AVAX to abc","rawInput":"send 0.01 AVAX to abc"}
"what's my balance" -> {"action":"check_balance","confidence":0.8,"requiresConfirmation":false,"naturalLanguageSummary":"Check wallet balance","rawInput":"what's my balance"}
"hello how are you" -> {"action":"general_chat","confidence":0.9,"requiresConfirmation":false,"naturalLanguageSummary":"General conversation","rawInput":"hello how are you"}

JSON Response:`;

    try {
        const aiResponse = await generateChatResponse(intentPrompt);

        // Extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            // Validate required fields
            if (parsed.action && parsed.confidence !== undefined) {
                return {
                    action: parsed.action,
                    amount: parsed.amount,
                    recipient: parsed.recipient,
                    confidence: parsed.confidence,
                    requiresConfirmation: parsed.requiresConfirmation !== false,
                    naturalLanguageSummary: parsed.naturalLanguageSummary || `Parsed: ${input}`,
                    rawInput: input
                };
            }
        }
    } catch (parseError) {
        console.warn("[INTENT] AI JSON parsing failed:", parseError);
    }

    // Fallback if AI parsing fails
    return manualParseIntent(input);
}

export default router;