// frontend/pages/index.tsx - Updated with Voice Transfer Demo
import Link from 'next/link'
import WalletConnector from '../components/WalletConnector'
import { useAccount, useNetwork } from 'wagmi'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 space-y-6 p-4">
      <h1 className="text-4xl font-bold text-white text-center">
        Welcome to Cryptixia 🤖
      </h1>

      <p className="text-gray-300 text-lg text-center max-w-2xl">
        AI agents you own. Voice-controlled crypto transfers. The future of personal AI.
      </p>

      {/* Wallet Connect Button */}
      <WalletConnector />

      {/* Network & Address Info */}
      <div className="text-gray-200 text-sm text-center bg-gray-800 rounded-lg p-4 min-w-[300px]">
        <p>Network: {chain?.name || "No chain detected"}</p>
        {isConnected && (
          <p className="font-mono">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        )}
      </div>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">

        {/* Mint Agent Button */}
        <Link href="/mint">
          <button className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg font-medium transition-colors">
            🎨 Mint Agent NFT
          </button>
        </Link>

        {/* NEW: Voice Transfer Demo Button */}
        <Link href="/demo">
          <button className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg font-medium transition-colors">
            🎤 Voice Transfer Demo
          </button>
        </Link>

        {/* Agent Profile Button */}
        <Link href="/agent/1">
          <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg font-medium transition-colors">
            👤 View Agent #1
          </button>
        </Link>

        {/* Marketplace Button (placeholder) */}
        <button
          disabled
          className="w-full px-6 py-3 bg-gray-600 text-gray-300 rounded-lg shadow-lg font-medium cursor-not-allowed"
        >
          🛒 Marketplace (Soon)
        </button>

      </div>

      {/* Feature Highlights */}
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mt-8">
        <h2 className="text-xl font-bold text-white mb-4 text-center">
          What You Can Do
        </h2>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl mb-2">🎨</div>
            <h3 className="text-white font-medium">Mint AI Agents</h3>
            <p className="text-gray-400 text-sm">Create unique AI personalities as NFTs</p>
          </div>
          <div>
            <div className="text-2xl mb-2">💬</div>
            <h3 className="text-white font-medium">Voice Chat</h3>
            <p className="text-gray-400 text-sm">Talk to your agents with voice & memory</p>
          </div>
          <div>
            <div className="text-2xl mb-2">💸</div>
            <h3 className="text-white font-medium">Voice Transfers</h3>
            <p className="text-gray-400 text-sm">Send crypto with voice commands</p>
          </div>
        </div>
      </div>

      {/* Demo Instructions */}
      <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4 max-w-2xl w-full">
        <h3 className="text-yellow-200 font-semibold mb-2">🎤 Try Voice Commands:</h3>
        <div className="text-yellow-100 text-sm space-y-1">
          <p>"Send 0.01 AVAX to abc"</p>
          <p>"Check my balance"</p>
          <p>"What's my wallet balance"</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-gray-500 text-xs text-center mt-8">
        <p>Built with Wagmi, RainbowKit, and Avalanche Fuji testnet</p>
      </div>

    </div>
  )
}