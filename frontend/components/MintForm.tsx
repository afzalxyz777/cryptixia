"use client"

import { useState } from "react"
import { useAccount, useContractWrite } from "wagmi"
import contractData from "../latest.json"

// ✅ Replace with the actual ABI your contract uses
const contractABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "string", "name": "tokenURI", "type": "string" }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

const MintForm = () => {
  const { address } = useAccount()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  // contract instance
  const { writeAsync: mint } = useContractWrite({
    address: contractData.contractAddress as `0x${string}`,
    abi: contractABI,
    functionName: "mint",
  })

  const handleMint = async () => {
    if (!address) {
      setMessage("⚠️ Connect wallet first")
      return
    }

    try {
      setLoading(true)
      setMessage("🚀 Initializing agent profile...")

      // 1️⃣ Call backend to create memory profile
      const initRes = await fetch("http://localhost:3001/api/initAgentProfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: "MyAgent" }),
      })

      const initData = await initRes.json()
      const memoryUri = initData.memory_uri
      if (!memoryUri) throw new Error("No memory_uri returned from initAgentProfile")

      // 2️⃣ Create metadata with memory_uri
      const metadata = {
        name: "Cryptixia Agent",
        description: "An AI Agent NFT with memory profile",
        image: "https://placekitten.com/300/300", // dummy image
        memory_uri: memoryUri,
      }

      setMessage("📦 Pinning metadata to IPFS...")

      // 3️⃣ Pin metadata via backend
      const pinRes = await fetch("http://localhost:3001/api/pinMetadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      })

      const pinData = await pinRes.json()
      const tokenUri = `ipfs://${pinData.cid}`
      if (!pinData.cid) throw new Error("No CID returned from pinMetadata")

      setMessage("⛓️ Minting on blockchain...")

      // 4️⃣ Call contract mint(to, tokenUri)
      await mint({
        args: [address, tokenUri],
      })

      setMessage(`✅ Success! NFT minted with tokenURI: ${tokenUri}`)
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ Error: ${err.message || "Mint failed"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2">Mint Agent NFT</h2>
      <button
        onClick={handleMint}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? "Minting..." : "Mint Agent"}
      </button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  )
}

export default MintForm
