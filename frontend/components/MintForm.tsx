import { useState } from "react"
import { useAccount } from "wagmi"

export default function MintForm() {
  const { address } = useAccount()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleMint = async () => {
    if (!address) {
      setMessage("Connect wallet first")
      return
    }

    try {
      setLoading(true)
      setMessage("Requesting memory store...")

      // 1️⃣ Create memory store via backend
      const initRes = await fetch("http://localhost:3001/api/initAgentProfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const { memory_uri } = await initRes.json()

      setMessage("Pinning metadata with memory_uri...")

      // 2️⃣ Pin metadata with memory_uri
      const metadata = {
        name: "Cryptixia Agent",
        description: "Your on-chain AI agent",
        memory_uri,
      }

      const pinRes = await fetch("http://localhost:3001/api/pinMetadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      })
      const data = await pinRes.json()

      setMessage(`Pinned to IPFS: ${data.gatewayUrl}`)
    } catch (err) {
      console.error(err)
      setMessage("Mint failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleMint}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Minting..." : "Mint Agent"}
      </button>
      {message && <p className="mt-4 text-white">{message}</p>}
    </div>
  )
}
