import Link from 'next/link'
import WalletConnector from '../components/WalletConnector'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 space-y-6">
      <h1 className="text-3xl font-bold text-white">
        Hello Cryptixia 👋
      </h1>

      {/* Wallet Connect Button */}
      <WalletConnector />

      {/* Link to Mint Page */}
      <Link href="/mint">
        <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 mt-4">
          Go to Mint Page
        </button>
      </Link>
    </div>
  )
}
