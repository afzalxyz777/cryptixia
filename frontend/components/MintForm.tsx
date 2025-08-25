import { useContractWrite, useAccount } from 'wagmi'
import axios from "axios"

// ABI with mintAgent(address to, string tokenUri)
const contractABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "string", "name": "tokenUri", "type": "string" }
    ],
    "name": "mintAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

const contractAddress = "0xYourContractAddressHere" // 🔑 replace later

export default function MintForm() {
  const { address } = useAccount()   // ✅ Get connected wallet
  const { write } = useContractWrite({
    mode: 'recklesslyUnprepared',
    address: contractAddress,
    abi: contractABI,
    functionName: 'mintAgent',
  })

  const handleMint = async () => {
    if (!address) {
      console.error("❌ No wallet connected")
      return
    }

    try {
      // 1️⃣ Call backend to pin metadata
      const res = await axios.post("http://localhost:3001/api/pinMetadata", {
        name: "Agent X",
        description: "A skilled negotiator from Cryptixia",
      })

      const cid = res.data.cid
      const tokenUri = `ipfs://${cid}`

      // 2️⃣ Call contract with connected wallet + metadata
      write?.({ args: [address, tokenUri] })
    } catch (err) {
      console.error("❌ Mint error:", err)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleMint}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Mint Agent
      </button>
    </div>
  )
}
