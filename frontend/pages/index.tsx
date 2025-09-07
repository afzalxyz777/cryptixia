// frontend/pages/index.tsx
import Link from 'next/link'
import WalletConnector from '../components/WalletConnector'
import { useAccount, useNetwork } from 'wagmi'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 space-y-10 p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-white text-center">
        Welcome to Cryptixia 🤖
      </h1>

      {/* Wallet Connect Button */}
      <WalletConnector />

      {/* Network Info */}
      <div className="text-gray-200 text-sm text-center">
        <p>Detected network: {chain?.name || "No chain detected"}</p>
        {isConnected && (
          <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
        )}
      </div>

      {/* ✅ Main Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
        {/* Mint Agent */}
        <Link 
          href="/mint"
          className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg text-center block shadow-lg"
        >
          <h3 className="text-xl font-bold mb-2">Mint Agent</h3>
          <p className="text-blue-100">Create your first AI companion</p>
        </Link>

        {/* NEW: Breeding */}
        <Link 
          href="/breed"
          className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg text-center block shadow-lg"
        >
          <h3 className="text-xl font-bold mb-2">Breed Agents</h3>
          <p className="text-purple-100">Combine two agents to create offspring</p>
        </Link>

        {/* Marketplace */}
        <Link 
          href="/marketplace"
          className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg text-center block shadow-lg"
        >
          <h3 className="text-xl font-bold mb-2">Marketplace</h3>
          <p className="text-green-100">Buy and sell agents</p>
        </Link>
      </div>

      {/* Example Direct Agent Link (optional) */}
      <Link href="/agent/1">
        <button className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 mt-4 shadow-lg">
          Go to Agent #1
        </button>
      </Link>
    </div>
  )
}
