// frontend/pages/index.tsx
import Link from 'next/link'
import WalletConnector from '../components/WalletConnector'
import { useAccount, useNetwork } from 'wagmi'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 space-y-6">
      <h1 className="text-3xl font-bold text-white">
        Welcome to Cryptixia 🤖
      </h1>

      {/* Wallet Connect Button */}
      <WalletConnector />

      {/* Always show network info */}
      <div className="text-gray-200 text-sm text-center">
        <p>Detected network: {chain?.name || "No chain detected"}</p>
        {isConnected && (
          <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
        )}
      </div>

      {/* Link to Mint Page */}
      <Link href="/mint">
  <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 mt-4 shadow-lg">
    Go to Mint Page
  </button>
</Link>

    </div>
  )
}
