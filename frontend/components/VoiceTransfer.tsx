// frontend/components/VoiceTransfer.tsx - ENHANCED VERSION
import { useState } from 'react';
import { useAccount, useSendTransaction, useBalance } from 'wagmi';
import { utils } from 'ethers';
import VoiceButton from './VoiceButton';

interface ParsedIntent {
    action: string;
    amount?: string;
    recipient?: string;
    confidence: number;
    requiresConfirmation: boolean;
    naturalLanguageSummary: string;
    rawInput: string;
}

interface ConfirmationData {
    amount: string;
    recipient: string;
    recipientDisplay: string; // Original voice input for display
    summary: string;
}

// Enhanced address validation with better voice recognition mapping
const validateAndNormalizeAddress = (voiceInput: string): { address: string; displayName: string } => {
    if (!voiceInput) throw new Error('No address provided');

    // Clean the input
    const cleanInput = voiceInput.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '');

    console.log(`[ADDRESS] Processing voice input: "${voiceInput}" -> "${cleanInput}"`);

    // Check if it's already a valid Ethereum address
    if (utils.isAddress(voiceInput)) {
        return { address: utils.getAddress(voiceInput), displayName: voiceInput };
    }

    // Enhanced voice-to-address mapping with more variations
    const voiceToAddress: { [key: string]: { address: string; displayName: string } } = {
        // ABC variations
        'abc': { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', displayName: 'ABC' },
        'abcs': { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', displayName: 'ABC' },
        'absy': { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', displayName: 'ABC' },
        'absee': { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', displayName: 'ABC' },
        'ab': { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', displayName: 'ABC' },

        // AVX variations (commonly misheard as ABC)
        'avx': { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', displayName: 'AVX' },
        'avx1': { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', displayName: 'AVX' },
        'avx2': { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', displayName: 'AVX' },
        'vx': { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', displayName: 'AVX' },
        'wx': { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', displayName: 'AVX' },
        'ax': { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', displayName: 'AVX' },

        // BOB variations
        'bob': { address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', displayName: 'Bob' },
        'bobby': { address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', displayName: 'Bob' },
        'rob': { address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', displayName: 'Bob' },
        'job': { address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', displayName: 'Bob' },

        // ALICE variations
        'alice': { address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', displayName: 'Alice' },
        'alices': { address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', displayName: 'Alice' },
        'ellis': { address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', displayName: 'Alice' },
        'elise': { address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', displayName: 'Alice' },
        'alicia': { address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', displayName: 'Alice' },

        // TEST variations
        'test': { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', displayName: 'Test' },
        'tests': { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', displayName: 'Test' },
        'guest': { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', displayName: 'Test' },
        'best': { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', displayName: 'Test' },
        'vest': { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', displayName: 'Test' },

        // DEV variations
        'dev': { address: '0x8ba1f109551bD432803012645Hac136c9c659', displayName: 'Dev' },
        'dave': { address: '0x8ba1f109551bD432803012645Hac136c9c659', displayName: 'Dev' },
        'deb': { address: '0x8ba1f109551bD432803012645Hac136c9c659', displayName: 'Dev' }
    };

    // Try exact match first
    if (voiceToAddress[cleanInput]) {
        console.log(`[ADDRESS] Found exact match: ${cleanInput} -> ${voiceToAddress[cleanInput].displayName}`);
        return voiceToAddress[cleanInput];
    }

    // Try fuzzy matching for similar sounding words
    const similarities = Object.keys(voiceToAddress).map(key => ({
        key,
        similarity: calculateSimilarity(cleanInput, key)
    }));

    // Sort by similarity and take the best match if it's above threshold
    similarities.sort((a, b) => b.similarity - a.similarity);
    const bestMatch = similarities[0];

    console.log(`[ADDRESS] Best similarity match: ${bestMatch.key} (${(bestMatch.similarity * 100).toFixed(1)}%)`);

    if (bestMatch.similarity > 0.6) { // 60% similarity threshold
        console.log(`[ADDRESS] Using fuzzy match: ${cleanInput} -> ${voiceToAddress[bestMatch.key].displayName}`);
        return voiceToAddress[bestMatch.key];
    }

    // If no good match, throw error with suggestions
    const suggestions = similarities.slice(0, 3).map(s => voiceToAddress[s.key].displayName).join(', ');
    throw new Error(`Could not recognize "${voiceInput}". Did you mean: ${suggestions}?`);
};

// Simple string similarity function
function calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Levenshtein distance
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1, // insertion
                matrix[j - 1][i] + 1, // deletion
                matrix[j - 1][i - 1] + cost // substitution
            );
        }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - matrix[str2.length][str1.length]) / maxLength;
}

export default function VoiceTransfer() {
    const { address, isConnected } = useAccount();
    const [step, setStep] = useState<'idle' | 'listening' | 'confirming' | 'processing' | 'success' | 'error'>('idle');
    const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
    const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [isWaitingForConfirmation, setIsWaitingForConfirmation] = useState(false);
    const [processingInfo, setProcessingInfo] = useState('');

    // Get wallet balance
    const { data: balance } = useBalance({
        address: address,
        watch: true,
    });

    // Send transaction hook
    const {
        data: txData,
        sendTransaction,
        isLoading: isSending,
        error: sendError,
    } = useSendTransaction({
        mode: 'recklesslyUnprepared',
        onSuccess: (data) => {
            setStep('success');
            setStatus('Transaction sent successfully!');
            console.log('Transaction successful:', data);
        },
        onError: (error: Error) => {
            setStep('error');
            setError(`Transaction failed: ${error.message}`);
            console.error('Transaction error:', error);
        },
    });

    const resetState = () => {
        setStep('idle');
        setParsedIntent(null);
        setConfirmationData(null);
        setStatus('');
        setError('');
        setProcessingInfo('');
        setIsWaitingForConfirmation(false);
    };

    const parseVoiceIntent = async (transcript: string) => {
        try {
            setStep('processing');
            setStatus('Processing your voice command...');
            setProcessingInfo(`Heard: "${transcript}"`);

            console.log('[VOICE] Raw transcript:', transcript);

            const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/parseIntent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: transcript })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Parse intent API error:', errorData);
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log('[VOICE] Server response:', data);

            const intent: ParsedIntent = data.intent;
            if (!intent || !intent.action) {
                throw new Error('Invalid intent data received from server');
            }

            setParsedIntent(intent);
            setProcessingInfo(`Method: ${data.method || 'unknown'}, Confidence: ${(intent.confidence * 100).toFixed(1)}%`);
            setStatus(`Understood: ${intent.naturalLanguageSummary}`);

            // Handle different actions
            if (intent.action === 'send_crypto' && intent.amount && intent.recipient) {
                try {
                    console.log('[VOICE] Processing send_crypto:', { amount: intent.amount, recipient: intent.recipient });

                    // Validate and normalize recipient address
                    const { address: recipientAddress, displayName } = validateAndNormalizeAddress(intent.recipient);
                    console.log('[VOICE] Address resolved:', { original: intent.recipient, address: recipientAddress, display: displayName });

                    // Validate amount
                    const amountFloat = parseFloat(intent.amount);
                    if (isNaN(amountFloat) || amountFloat <= 0) {
                        throw new Error(`Invalid amount: ${intent.amount}`);
                    }

                    // Check if amount is reasonable (not too large)
                    if (amountFloat > 10) {
                        throw new Error(`Amount too large: ${intent.amount} AVAX. Please use smaller amounts for demo.`);
                    }

                    const amountWei = utils.parseEther(intent.amount);

                    setConfirmationData({
                        amount: intent.amount,
                        recipient: recipientAddress,
                        recipientDisplay: displayName,
                        summary: `Send ${intent.amount} AVAX to ${displayName}?`
                    });

                    setStep('confirming');
                    setStatus('Please confirm this transaction');
                    setIsWaitingForConfirmation(true);

                } catch (validationError: any) {
                    console.error('[VOICE] Validation error:', validationError);
                    setStep('error');
                    setError(validationError.message);
                    return;
                }

            } else if (intent.action === 'check_balance') {
                const balanceStr = balance
                    ? `${parseFloat(utils.formatEther(balance.value)).toFixed(6)} ${balance.symbol}`
                    : '0 AVAX';
                setStep('success');
                setStatus(`Your balance: ${balanceStr}`);

            } else if (intent.action === 'general_chat') {
                setStep('success');
                setStatus('I understand you want to chat, but I\'m focused on crypto transfers. Try saying "send X AVAX to [name]" or "check my balance"');

            } else {
                setStep('error');
                setError(`I didn't understand that command. Try: "send 0.01 AVAX to ABC" or "check my balance"`);
            }

        } catch (err: any) {
            console.error('[VOICE] Parse error:', err);
            setStep('error');
            setError(err.message || 'Failed to process voice command');
            setProcessingInfo('');
        }
    };

    const handleVoiceConfirmation = async (transcript: string) => {
        const lowerTranscript = transcript.toLowerCase().trim();
        console.log('[CONFIRM] Voice confirmation:', transcript);

        // Enhanced confirmation patterns
        const yesPatterns = ['yes', 'yeah', 'yep', 'confirm', 'proceed', 'send it', 'do it', 'ok', 'okay'];
        const noPatterns = ['no', 'nope', 'cancel', 'stop', 'abort', 'don\'t', 'dont'];

        const isYes = yesPatterns.some(pattern => lowerTranscript.includes(pattern));
        const isNo = noPatterns.some(pattern => lowerTranscript.includes(pattern));

        if (isYes && !isNo) {
            executeTransaction();
        } else if (isNo) {
            resetState();
            setStatus('Transaction cancelled');
        } else {
            setStatus(`Please say "yes" to confirm or "no" to cancel. You said: "${transcript}"`);
        }
    };

    const executeTransaction = async () => {
        if (!confirmationData || !isConnected || !sendTransaction) return;

        try {
            setStep('processing');
            setStatus('Sending transaction...');
            setIsWaitingForConfirmation(false);

            console.log('[TX] Executing transaction:', {
                to: confirmationData.recipient,
                amount: confirmationData.amount
            });

            // Check balance before sending
            if (balance) {
                const amountWei = utils.parseEther(confirmationData.amount);
                if (amountWei.gt(balance.value)) {
                    throw new Error(`Insufficient balance. You have ${utils.formatEther(balance.value)} AVAX, trying to send ${confirmationData.amount} AVAX`);
                }
            }

            sendTransaction({
                recklesslySetUnpreparedRequest: {
                    to: confirmationData.recipient,
                    value: utils.parseEther(confirmationData.amount),
                },
            });

        } catch (err: any) {
            console.error('[TX] Transaction error:', err);
            setStep('error');
            setError(`Failed to send transaction: ${err.message}`);
        }
    };

    const getStatusColor = () => {
        switch (step) {
            case 'success': return 'text-green-400';
            case 'error': return 'text-red-400';
            case 'confirming': return 'text-yellow-400';
            case 'processing': return 'text-blue-400';
            default: return 'text-gray-300';
        }
    };

    if (!isConnected) {
        return (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
                <h2 className="text-xl font-bold text-white mb-4">🎤 Voice Crypto Transfer</h2>
                <p className="text-red-400">Please connect your wallet first</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white mb-6 text-center">
                🎤 Voice Crypto Transfer
            </h2>

            {/* Balance Display */}
            <div className="bg-gray-700 rounded-lg p-3 mb-4 text-center">
                <p className="text-gray-400 text-sm">Your Balance</p>
                <p className="text-white font-mono">
                    {balance ? `${parseFloat(utils.formatEther(balance.value)).toFixed(4)} ${balance.symbol}` : 'Loading...'}
                </p>
            </div>

            {/* Processing Info */}
            {processingInfo && (
                <div className="mb-4 p-3 rounded-lg bg-blue-900/40 border border-blue-500/30">
                    <p className="text-blue-200 text-sm">
                        🔍 {processingInfo}
                    </p>
                </div>
            )}

            {/* Status Display */}
            {(status || error) && (
                <div className="mb-4 p-3 rounded-lg bg-gray-700">
                    <p className={`text-sm ${getStatusColor()}`}>
                        {error || status}
                    </p>
                </div>
            )}

            {/* Enhanced Confirmation Dialog */}
            {step === 'confirming' && confirmationData && (
                <div className="mb-4 p-4 rounded-lg bg-yellow-900 border border-yellow-600">
                    <p className="text-yellow-200 font-medium mb-3">⚠️ Confirm Transaction</p>
                    <div className="bg-yellow-800/50 rounded-lg p-3 mb-3">
                        <div className="flex justify-between mb-2">
                            <span className="text-yellow-100">Amount:</span>
                            <span className="text-white font-mono">{confirmationData.amount} AVAX</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="text-yellow-100">To:</span>
                            <span className="text-white">{confirmationData.recipientDisplay}</span>
                        </div>
                        <div className="text-xs text-yellow-300 mt-2 break-all">
                            Address: {confirmationData.recipient}
                        </div>
                    </div>
                    <p className="text-gray-300 text-sm">Say "yes" to confirm or "no" to cancel</p>
                </div>
            )}

            {/* Transaction Hash */}
            {txData?.hash && (
                <div className="mb-4 p-3 rounded-lg bg-green-900 border border-green-600">
                    <p className="text-green-200 text-sm mb-2">✅ Transaction Sent!</p>
                    <p className="text-green-300 text-xs">Hash:</p>
                    <p className="text-green-100 font-mono text-xs break-all mb-2">
                        {txData.hash}
                    </p>
                    <a
                        href={`https://testnet.snowtrace.io/tx/${txData.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300 text-xs underline"
                    >
                        View on Explorer →
                    </a>
                </div>
            )}

            {/* Voice Button */}
            <div className="text-center mb-4">
                <VoiceButton
                    onSpeechResult={isWaitingForConfirmation ? handleVoiceConfirmation : parseVoiceIntent}
                    isDisabled={step === 'processing' || isSending}
                />
            </div>

            {/* Enhanced Instructions */}
            <div className="text-gray-400 text-xs text-center space-y-2 mb-4">
                {step === 'idle' && (
                    <div className="bg-gray-700/50 rounded-lg p-3">
                        <p className="font-medium text-gray-300 mb-2">Try these commands:</p>
                        <div className="space-y-1">
                            <p className="font-mono text-xs bg-gray-600/50 rounded px-2 py-1">"Send 0.01 AVAX to ABC"</p>
                            <p className="font-mono text-xs bg-gray-600/50 rounded px-2 py-1">"Send 0.005 to AVX"</p>
                            <p className="font-mono text-xs bg-gray-600/50 rounded px-2 py-1">"Check my balance"</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Supports: ABC, AVX, Bob, Alice, Test, Dev
                        </p>
                    </div>
                )}
                {isWaitingForConfirmation && (
                    <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-600/30">
                        <p className="text-yellow-300">Say "yes" to confirm or "no" to cancel</p>
                        <p className="text-xs text-yellow-400 mt-1">Voice variations like "yeah", "okay", "proceed" also work</p>
                    </div>
                )}
                {step === 'error' && (
                    <div className="bg-red-900/30 rounded-lg p-2 border border-red-600/30">
                        <p className="text-red-300 text-xs">Try speaking more clearly or use simpler commands</p>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
                <button
                    onClick={resetState}
                    disabled={step === 'processing' || isSending}
                    className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                    Reset
                </button>

                {step === 'confirming' && (
                    <>
                        <button
                            onClick={executeTransaction}
                            disabled={isSending}
                            className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                            {isSending ? 'Sending...' : 'Confirm'}
                        </button>
                        <button
                            onClick={() => {
                                resetState();
                                setStatus('Transaction cancelled');
                            }}
                            className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </>
                )}
            </div>

            {/* Debug Info (only in development) */}
            {process.env.NODE_ENV === 'development' && parsedIntent && (
                <div className="mt-4 p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
                    <p className="text-purple-300 text-xs font-medium mb-2">Debug Info:</p>
                    <pre className="text-xs text-purple-200 whitespace-pre-wrap">
                        {JSON.stringify(parsedIntent, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}