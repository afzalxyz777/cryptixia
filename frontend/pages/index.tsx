// frontend/pages/index.tsx
import Link from 'next/link'
import Image from 'next/image'
import WalletConnector from '../components/WalletConnector'
import { useAccount, useNetwork } from 'wagmi'
import { Monoton } from 'next/font/google'
import { useState } from 'react'

const monoton = Monoton({
  subsets: ['latin'],
  weight: '400',
})

export default function Home() {
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()
  const [showVoiceCommands, setShowVoiceCommands] = useState(false)

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen space-y-6 p-4"
      style={{ background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)' }}
    >
      <h1 className={`${monoton.className} text-6xl text-white text-center`}>
        CRYPTIXIA
      </h1>

      <p className="text-gray-300 text-lg text-center max-w-2xl">
        AI agents you own. Voice-controlled crypto transfers. The future of personal AI.
      </p>

      {/* Wallet Connect Button */}
      <WalletConnector />

      {/* Network & Address Info */}
      <div className="text-gray-200 text-sm text-center bg-gray-800 rounded-lg p-4 min-w-[300px]">
        <p>Network: {chain?.name || 'No chain detected'}</p>
        {isConnected && (
          <p className="font-mono">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        )}
      </div>

      {/* Card Buttons Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl mt-4">
        {/* Mint Agent Card */}
        <Link href="/mint">
          <div className="bg-gray-800 hover:bg-gray-700 transition-colors rounded-2xl shadow-lg p-6 flex flex-col items-center cursor-pointer">
            <Image
              src="/icons/marketplace-alt.png"
              alt="Mint Agent Icon"
              width={64}
              height={64}
              className="mb-4"
            />
            <span className="text-white font-medium text-center">
              Mint Agent NFT
            </span>
          </div>
        </Link>

        {/* Voice Transfer Demo Card */}
        <Link href="/demo">
          <div className="bg-gray-800 hover:bg-gray-700 transition-colors rounded-2xl shadow-lg p-6 flex flex-col items-center cursor-pointer">
            <Image
              src="/icons/voice-bot (1).png"
              alt="Voice Transfer Icon"
              width={64}
              height={64}
              className="mb-4"
            />
            <span className="text-white font-medium text-center">
              Voice Transfer Demo
            </span>
          </div>
        </Link>

        {/* View Agent #1 Card */}
        <Link href="/agent/1">
          <div className="bg-gray-800 hover:bg-gray-700 transition-colors rounded-2xl shadow-lg p-6 flex flex-col items-center cursor-pointer">
            <Image
              src="/icons/voice-command.png"
              alt="Agent Profile Icon"
              width={64}
              height={64}
              className="mb-4"
            />
            <span className="text-white font-medium text-center">
              View Agent 
            </span>
          </div>
        </Link>

        {/* Marketplace Card */}
        <div className="bg-gray-700 rounded-2xl shadow-lg p-6 flex flex-col items-center opacity-60 cursor-not-allowed">
          <Image
            src="/icons/wallet-nft.png"
            alt="Marketplace Icon"
            width={64}
            height={64}
            className="mb-4"
          />
          <span className="text-gray-300 font-medium text-center">
            Marketplace (Soon)
          </span>
        </div>
      </div>

      {/* Feature Highlights - Now same width as card grid */}
      <div className="bg-gray-800 rounded-2xl shadow-lg p-6 w-full max-w-5xl mt-8">
        <h2 className="text-xl font-bold text-white mb-6 text-center">
          What You Can Do
        </h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-3 bg-gray-900 p-4 rounded-full">
              <Image
                src="/icons/wallet-nft.png"
                alt="Mint AI Agents Icon"
                width={40}
                height={40}
              />
            </div>
            <h3 className="text-white font-medium">Mint AI Agents</h3>
            <p className="text-gray-400 text-sm mt-2">
              Create unique AI personalities as NFTs
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="mb-3 bg-gray-900 p-4 rounded-full">
              <Image
                src="/icons/voice-command.png"
                alt="Voice Chat Icon"
                width={40}
                height={40}
              />
            </div>
            <h3 className="text-white font-medium">Voice Chat</h3>
            <p className="text-gray-400 text-sm mt-2">
              Talk to your agents with voice & memory
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="mb-3 bg-gray-900 p-4 rounded-full">
              <Image
                src="/icons/voice-bot (1).png"
                alt="Voice Transfers Icon"
                width={40}
                height={40}
              />
            </div>
            <h3 className="text-white font-medium">Voice Transfers</h3>
            <p className="text-gray-400 text-sm mt-2">
              Send crypto with voice commands
            </p>
          </div>
        </div>
      </div>

      {/* Collapsible Voice Commands Box */}
      <div className="w-full max-w-5xl mt-6">
        <div 
          className="bg-gray-800 hover:bg-gray-700 transition-colors rounded-2xl shadow-lg p-6 flex flex-col items-center cursor-pointer"
          onClick={() => setShowVoiceCommands(!showVoiceCommands)}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🎤</span>
              <span className="text-white font-medium">Try Voice Commands</span>
            </div>
            <svg 
              className={`w-5 h-5 text-white transform transition-transform ${showVoiceCommands ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {showVoiceCommands && (
            <div className="mt-4 w-full text-left">
              <div className="bg-gray-900 rounded-lg p-4">
                <h4 className="text-yellow-200 font-semibold mb-2">Available Commands:</h4>
                <div className="text-yellow-100 text-sm space-y-2">
                  <p className="font-mono">"Send 0.01 AVAX to [address]"</p>
                  <p className="font-mono">"Check my balance"</p>
                  <p className="font-mono">"What's my wallet balance"</p>
                  <p className="font-mono">"Transfer [amount] to [address]"</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-gray-500 text-xs text-center mt-8">
        <p>Built with Wagmi, RainbowKit, and Avalanche Fuji testnet</p>
      </div>
    </div>
  )
}