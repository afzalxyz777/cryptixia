// frontend/lib/breedingContract.ts

// TODO: Replace with your actual deployed Breeding contract address after deployment
export const BREEDING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BREEDING_ADDRESS || "0x0000000000000000000000000000000000000000";

// Breeding contract ABI - only the functions we need
export const BREEDING_CONTRACT_ABI = [
  // Read functions
  {
    "inputs": [],
    "name": "getBreedingCost",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "canBreed",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "parentA", "type": "uint256"},
      {"internalType": "uint256", "name": "parentB", "type": "uint256"}
    ],
    "name": "canBreedPair",
    "outputs": [
      {"internalType": "bool", "name": "", "type": "bool"},
      {"internalType": "string", "name": "reason", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "getBreedingStats",
    "outputs": [
      {"internalType": "uint256", "name": "breeds", "type": "uint256"},
      {"internalType": "uint256", "name": "lastBreed", "type": "uint256"},
      {"internalType": "uint256", "name": "cooldownRemaining", "type": "uint256"},
      {"internalType": "bool", "name": "canBreedNow", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "getBreedingCooldownRemaining",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Write functions
  {
    "inputs": [
      {"internalType": "uint256", "name": "parentA", "type": "uint256"},
      {"internalType": "uint256", "name": "parentB", "type": "uint256"}
    ],
    "name": "breed",
    "outputs": [{"internalType": "uint256", "name": "childId", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },

  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "parentA", "type": "uint256"},
      {"indexed": true, "internalType": "uint256", "name": "parentB", "type": "uint256"},
      {"indexed": true, "internalType": "uint256", "name": "childId", "type": "uint256"},
      {"indexed": false, "internalType": "address", "name": "breeder", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256"}
    ],
    "name": "AgentBred",
    "type": "event"
  }
] as const;