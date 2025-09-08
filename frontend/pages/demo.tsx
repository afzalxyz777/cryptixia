// frontend/pages/demo.tsx
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import WalletConnector from '../components/WalletConnector';
import VoiceTransfer from '../components/VoiceTransfer';
import Link from 'next/link';

export default function DemoPage() {
    const [mounted, setMounted] = useState(false);
    const { isConnected } = useAccount();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white">Loading demo...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="text-center mb-8">
                    <Link href="/">
                        <button className="text-blue-400 hover:text-blue-300 mb-4">
                            ← Back to Home
                        </button>
                    </Link>
                    <h1 className="text-4xl font-bold text-white mb-4">
                        🎤 Cryptixia Voice Transfer Demo
                    </h1>
                    <p className="text-gray-300 text-lg">
                        Seamless voice-controlled cryptocurrency transfers
                    </p>
                </div>

                {/* Demo Instructions */}
                <div className="bg-gray-800 rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">📋 How to Use</h2>
                    <div className="grid md:grid-cols-2 gap-6 text-gray-300">
                        <div>
                            <h3 className="font-semibold text-white mb-2">Voice Commands:</h3>
                            <ul className="space-y-2 text-sm">
                                <li>• "Send 0.01 AVAX to abc"</li>
                                <li>• "Transfer 0.5 AVAX to bob"</li>
                                <li>• "Check my balance"</li>
                                <li>• "What's my wallet balance"</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white mb-2">Demo Recipients:</h3>
                            <ul className="space-y-2 text-sm font-mono">
                                <li>• abc → 0x742...9C</li>
                                <li>• bob → 0x8C4...0D</li>
                                <li>• alice → 0x9c4...2F</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Wallet Connection */}
                <div className="mb-8 text-center">
                    <WalletConnector />
                </div>

                {/* Main Demo Component */}
                <div className="flex justify-center">
                    <VoiceTransfer />
                </div>

                {/* Safety Notice */}
                <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4 mt-8">
                    <h3 className="text-yellow-200 font-semibold mb-2">⚠️ Safety Features</h3>
                    <ul className="text-yellow-100 text-sm space-y-1">
                        <li>• Voice commands always require explicit confirmation</li>
                        <li>• You can say "no" or "cancel" to abort any transaction</li>
                        <li>• All transactions are processed through your connected wallet</li>
                        <li>• This demo uses Avalanche Fuji testnet (fake AVAX)</li>
                    </ul>
                </div>

                {/* Technical Details */}
                <div className="bg-gray-800 rounded-lg p-6 mt-8">
                    <h2 className="text-xl font-bold text-white mb-4">🔧 Technical Implementation</h2>
                    <div className="grid md:grid-cols-2 gap-6 text-gray-300 text-sm">
                        <div>
                            <h3 className="font-semibold text-white mb-2">Voice Processing:</h3>
                            <ul className="space-y-1">
                                <li>• Web Speech API for voice recognition</li>
                                <li>• AI intent parsing with Groq/Llama</li>
                                <li>• Natural language understanding</li>
                                <li>• Confidence scoring</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white mb-2">Blockchain Integration:</h3>
                            <ul className="space-y-1">
                                <li>• Wagmi hooks for wallet integration</li>
                                <li>• Automatic transaction preparation</li>
                                <li>• Real-time balance checking</li>
                                <li>• Avalanche Fuji testnet</li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}