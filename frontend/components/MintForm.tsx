import { useContractWrite } from 'wagmi'

// minimal placeholder ABI for mintAgent
const contractABI = [
  {
    "inputs": [],
    "name": "mintAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

const contractAddress = "0xYourContractAddressHere" // 🔑 replace later with real address

export default function MintForm() {
  const { write } = useContractWrite({
    mode: 'recklesslyUnprepared', // ✅ required in wagmi v0.12
    address: contractAddress,
    abi: contractABI,
    functionName: 'mintAgent',
  })

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => write?.()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Mint Agent
      </button>
    </div>
  )
}
