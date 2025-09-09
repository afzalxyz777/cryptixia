// frontend/lib/contract.ts
import AgentNFT from "../contracts/AgentNFT.json";

// ✅ Contract address from your deployment
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AGENTNFT_ADDRESS || "0x2BDaBBa9831E84f9f94995Ef4B174b08c88E3b1D";

// ✅ AgentNFT is already the ABI array
export const CONTRACT_ABI = AgentNFT;

// Additional ABI functions that might be missing from your JSON file
// If these functions exist in your contract but not in the JSON, add them here
export const ADDITIONAL_ABI_FUNCTIONS = [
  // Read functions
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "getTraits",
    "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "getMemoryHash",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "exists",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextTokenId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Write functions
  {
    "inputs": [
      {"internalType": "string", "name": "tokenUri", "type": "string"},
      {"internalType": "string[]", "name": "initialTraits", "type": "string[]"}
    ],
    "name": "publicMint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "string[]", "name": "traits", "type": "string[]"}
    ],
    "name": "setTraits",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "string", "name": "hash", "type": "string"}
    ],
    "name": "setMemoryHash",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "tokenUri", "type": "string"}
    ],
    "name": "AgentMinted",
    "type": "event"
  }
] as const;

// If you need to combine with additional functions:
// export const FULL_CONTRACT_ABI = [...CONTRACT_ABI, ...ADDITIONAL_ABI_FUNCTIONS];