// frontend/pages/demo.tsx
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import WalletConnector from '../components/WalletConnector';
import VoiceTransfer from '../components/VoiceTransfer';
import Link from 'next/link';
import Image from 'next/image';

export default function DemoPage() {
    const [mounted, setMounted] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const { isConnected } = useAccount();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div 
                className="min-h-screen flex items-center justify-center px-4"
                style={{ background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)' }}
            >
                <div className="text-white">Loading demo...</div>
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen py-8 px-4"
            style={{ background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)' }}
        >
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-between items-start mb-6">
                        <Link href="/">
                            <button className="text-blue-200 hover:text-white transition-colors flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Home
                            </button>
                        </Link>
                    </div>
                    
                    <div className="flex items-center justify-center mb-4">
                        <Image 
                            src="/icons/voice-bot (1).png" 
                            alt="Voice Bot" 
                            width={48} 
                            height={48} 
                            className="mr-3"
                        />
                        <h1 className="text-4xl font-bold text-white">
                            Cryptixia Voice Transfer Demo
                        </h1>
                    </div>
                    
                    <p className="text-gray-200 text-lg">
                        Seamless voice-controlled cryptocurrency transfers
                    </p>
                </div>

                {/* Wallet Connection */}
                <div className="mb-8 text-center">
                    <WalletConnector />
                </div>

                {/* Main Demo Component */}
                <div className="flex justify-center mb-8">
                    <VoiceTransfer />
                </div>

                {/* Collapsible Instructions */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 mb-8 cursor-pointer"
                    onClick={() => setShowInstructions(!showInstructions)}
                >
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">📋 How to Use</h2>
                        <svg 
                            className={`w-5 h-5 text-white transform transition-transform ${showInstructions ? 'rotate-180' : ''}`}
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    
                    {showInstructions && (
                        <div className="mt-4">
                            <div className="grid md:grid-cols-2 gap-6 text-gray-200">
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
                    )}
                </div>

                {/* Safety Notice */}
                <div className="bg-yellow-900/80 border border-yellow-600 rounded-2xl p-6 mb-8">
                    <h3 className="text-yellow-200 font-semibold mb-2">⚠️ Safety Features</h3>
                    <ul className="text-yellow-100 text-sm space-y-2">
                        <li>• Voice commands always require explicit confirmation</li>
                        <li>• You can say "no" or "cancel" to abort any transaction</li>
                        <li>• All transactions are processed through your connected wallet</li>
                        <li>• This demo uses Avalanche Fuji testnet (fake AVAX)</li>
                    </ul>
                </div>

                {/* Technical Details */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">🔧 Technical Implementation</h2>
                    <div className="grid md:grid-cols-2 gap-6 text-gray-200 text-sm">
                        <div>
                            <h3 className="font-semibold text-white mb-2">Voice Processing:</h3>
                            <ul className="space-y-2">
                                <li>• Web Speech API for voice recognition</li>
                                <li>• AI intent parsing with Groq/Llama</li>
                                <li>• Natural language understanding</li>
                                <li>• Confidence scoring</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white mb-2">Blockchain Integration:</h3>
                            <ul className="space-y-2">
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