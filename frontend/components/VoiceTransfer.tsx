// frontend/components/VoiceTransfer.tsx
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
    summary: string;
}

// Add the helper function here (outside the component but in the same file)
// Replace the validateAndNormalizeAddress function with this corrected version
const validateAndNormalizeAddress = (address: string): string => {
    if (!address) throw new Error('No address provided');

    // Remove any file path characters or invalid prefixes
    const cleanAddress = address.replace(/[^a-zA-Z0-9]/g, '');

    // Check if it's already a valid Ethereum-style address
    if (utils.isAddress(cleanAddress)) {
        return utils.getAddress(cleanAddress); // Normalizes to checksum format
    }

    // Use valid test addresses (these are standard testnet addresses)
    const mockAddresses: { [key: string]: string } = {
        'abc': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Valid test address
        'bob': '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Valid test address
        'alice': '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Valid test address
        'test': '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', // Valid test address
    };

    const lowercaseAddress = address.toLowerCase();
    if (mockAddresses[lowercaseAddress]) {
        return utils.getAddress(mockAddresses[lowercaseAddress]);
    }

    throw new Error(`Invalid address: ${address}`);
};

export default function VoiceTransfer() {
    const { address, isConnected } = useAccount();
    const [step, setStep] = useState<'idle' | 'listening' | 'confirming' | 'processing' | 'success' | 'error'>('idle');
    const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
    const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [isWaitingForConfirmation, setIsWaitingForConfirmation] = useState(false);

    // Get wallet balance
    const { data: balance } = useBalance({
        address: address,
        watch: true,
    });

    // Send transaction hook for wagmi v0.12.7 - Fixed
    const {
        data: txData,
        sendTransaction,
        isLoading: isSending,
        error: sendError,
    } = useSendTransaction({
        mode: 'recklesslyUnprepared',
        onSuccess: () => {
            setStep('success');
            setStatus('Transaction sent successfully!');
        },
        onError: (error: Error) => {
            setStep('error');
            setError(`Transaction failed: ${error.message}`);
        },
    });

    const resetState = () => {
        setStep('idle');
        setParsedIntent(null);
        setConfirmationData(null);
        setStatus('');
        setError('');
        setIsWaitingForConfirmation(false);
    };

    const parseVoiceIntent = async (transcript: string) => {
        try {
            setStep('processing');
            setStatus('Processing your command...');

            const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/parseIntent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: transcript })
            });

            if (!response.ok) {
                throw new Error('Failed to parse voice command');
            }

            const data = await response.json();
            console.log('Server response:', data); // Debugging
            const intent: ParsedIntent = data.intent;
            console.log('Parsed intent:', intent); // Debugging

            setParsedIntent(intent);
            setStatus(`Understood: ${intent.naturalLanguageSummary}`);

            // Handle different actions
            if (intent.action === 'send_crypto' && intent.amount && intent.recipient) {
                try {
                    // Validate and normalize recipient address
                    const recipientAddress = validateAndNormalizeAddress(intent.recipient);

                    // Validate amount
                    const amountWei = utils.parseEther(intent.amount);

                    setConfirmationData({
                        amount: intent.amount,
                        recipient: recipientAddress,
                        summary: `Send ${intent.amount} AVAX to ${intent.recipient}?`
                    });

                    setStep('confirming');
                    setStatus('Please confirm this transaction');
                    setIsWaitingForConfirmation(true);

                } catch (err: any) {
                    setStep('error');
                    setError(`Invalid transaction details: ${err.message}`);
                    return;
                }

            } else if (intent.action === 'check_balance') {
                const balanceStr = balance ? `${parseFloat(utils.formatEther(balance.value)).toFixed(4)} ${balance.symbol}` : '0 AVAX';
                setStep('success');
                setStatus(`Your balance: ${balanceStr}`);

            } else if (intent.action === 'general_chat') {
                setStep('success');
                setStatus('I understand you want to chat, but I\'m focused on crypto transfers. Try saying "send X AVAX to Y" or "check my balance"');

            } else {
                setStep('error');
                setError('I didn\'t understand that command. Try: "send 0.01 AVAX to abc" or "check my balance"');
            }

        } catch (err: any) {
            setStep('error');
            setError(err.message || 'Failed to process voice command');
        }
    };

    const handleVoiceConfirmation = async (transcript: string) => {
        const lowerTranscript = transcript.toLowerCase().trim();

        if (lowerTranscript.includes('yes') || lowerTranscript.includes('confirm') || lowerTranscript.includes('proceed')) {
            executeTransaction();
        } else if (lowerTranscript.includes('no') || lowerTranscript.includes('cancel') || lowerTranscript.includes('stop')) {
            setStep('idle');
            setStatus('Transaction cancelled');
            setIsWaitingForConfirmation(false);
        } else {
            setStatus('Please say "yes" to confirm or "no" to cancel');
        }
    };

    const executeTransaction = async () => {
        if (!confirmationData || !isConnected || !sendTransaction) return;

        try {
            setStep('processing');
            setStatus('Sending transaction...');
            setIsWaitingForConfirmation(false);

            // Fixed wagmi v0.12.7 sendTransaction syntax with recklesslyUnprepared mode
            sendTransaction({
                recklesslySetUnpreparedRequest: {
                    to: confirmationData.recipient,
                    value: utils.parseEther(confirmationData.amount),
                },
            });

        } catch (err: any) {
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
                Voice Crypto Transfer
            </h2>

            {/* Balance Display */}
            <div className="bg-gray-700 rounded-lg p-3 mb-4 text-center">
                <p className="text-gray-400 text-sm">Your Balance</p>
                <p className="text-white font-mono">
                    {balance ? `${parseFloat(utils.formatEther(balance.value)).toFixed(4)} ${balance.symbol}` : 'Loading...'}
                </p>
            </div>

            {/* Status Display */}
            {(status || error) && (
                <div className="mb-4 p-3 rounded-lg bg-gray-700">
                    <p className={`text-sm ${getStatusColor()}`}>
                        {error || status}
                    </p>
                </div>
            )}

            {/* Confirmation Dialog */}
            {step === 'confirming' && confirmationData && (
                <div className="mb-4 p-4 rounded-lg bg-yellow-900 border border-yellow-600">
                    <p className="text-yellow-200 font-medium mb-2">⚠️ Confirm Transaction</p>
                    <p className="text-white mb-3">{confirmationData.summary}</p>
                    <p className="text-gray-300 text-sm">Say "yes" to confirm or "no" to cancel</p>
                </div>
            )}

            {/* Transaction Hash */}
            {txData?.hash && (
                <div className="mb-4 p-3 rounded-lg bg-green-900 border border-green-600">
                    <p className="text-green-200 text-sm">Transaction Hash:</p>
                    <p className="text-green-100 font-mono text-xs break-all">
                        {txData.hash}
                    </p>
                </div>
            )}

            {/* Voice Button */}
            <div className="text-center mb-4">
                <VoiceButton
                    onSpeechResult={isWaitingForConfirmation ? handleVoiceConfirmation : parseVoiceIntent}
                    isDisabled={step === 'processing' || isSending}
                />
            </div>

            {/* Instructions */}
            <div className="text-gray-400 text-xs text-center space-y-1">
                {step === 'idle' && (
                    <div>
                        <p>Try saying:</p>
                        <p>"Send 0.01 AVAX to abc"</p>
                        <p>"Check my balance"</p>
                    </div>
                )}
                {isWaitingForConfirmation && (
                    <p>Say "yes" to confirm or "no" to cancel</p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-4">
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
                            Confirm
                        </button>
                        <button
                            onClick={() => {
                                setStep('idle');
                                setIsWaitingForConfirmation(false);
                            }}
                            className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}