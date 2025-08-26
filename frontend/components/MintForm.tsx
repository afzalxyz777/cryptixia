import { useState } from "react"
import { useAccount, useContractWrite } from "wagmi"

// Contract details (replace with actual later)
const contractAddress = "0xYourContractAddressHere"
const contractABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenUri", type: "string" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
]

export default function MintForm() {
  const { address } = useAccount()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const { write } = useContractWrite({
    mode: "recklesslyUnprepared",
    address: contractAddress as `0x${string}`,
    abi: contractABI,
    functionName: "mint",
  })

  const handleMint = async () => {
    if (!address) {
      setMessage("Connect wallet first")
      return
    }

    try {
      setLoading(true)
      setMessage("Uploading metadata to IPFS...")

      // Dummy metadata for now
      const metadata = {
        name: "Dummy Agent",
        description: "This is a test NFT for Cryptixia",
        image: "https://via.placeholder.com/300",
      }

      // Call backend API
      const res = await fetch("http://localhost:3001/api/pinMetadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      })

      if (!res.ok) throw new Error("Failed to pin metadata")

      const { cid } = await res.json()
      const tokenUri = `ipfs://${cid}`

      setMessage(`Metadata pinned: ${tokenUri}`)
      console.log("Minting with tokenUri:", tokenUri)

      // Call smart contract
      write?.({ args: [address, tokenUri] })
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
