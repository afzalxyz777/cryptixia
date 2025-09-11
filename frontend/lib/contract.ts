// frontend/lib/contract.ts
import AgentNFTArtifact from "../contracts/AgentNFT.json";
import MarketplaceArtifact from "../contracts/Marketplace.json";
import BreedingArtifact from "../contracts/Breeding.json";

// ===== CONTRACT ADDRESSES =====
export const CONTRACT_ADDRESSES = {
  AGENT_NFT: process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS || "0x1159854A9c38EC6740016d7c7FD18Cf0a8f94727",
  MARKETPLACE: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0x8AfC1e8DD07602Ea4007d3D9673062247a08Dd11",
  BREEDING: process.env.NEXT_PUBLIC_BREEDING_ADDRESS || "0xB4c1EF251291c9a85de077F0be73Ee6803B037ab",
} as const;

// ===== CONTRACT ABIs =====
// More robust ABI extraction with fallbacks
const getABI = (artifact: any) => {
  // Check if artifact is already an array (direct ABI)
  if (Array.isArray(artifact)) {
    return artifact;
  }

  // Try different possible ABI locations in the artifact
  return artifact.abi ||
    artifact.output?.abi ||
    artifact.contracts?.[Object.keys(artifact.contracts)[0]]?.abi ||
    [];
};

export const AGENT_NFT_ABI = getABI(AgentNFTArtifact);
export const MARKETPLACE_ABI = getABI(MarketplaceArtifact);
export const BREEDING_ABI = getABI(BreedingArtifact);

// Debug logging to help identify the issue
if (typeof window !== 'undefined') {
  console.log('AgentNFT Artifact structure:', AgentNFTArtifact);
  console.log('Extracted ABI:', AGENT_NFT_ABI);
  console.log('ABI length:', AGENT_NFT_ABI?.length);
}

// Validate ABI
if (!AGENT_NFT_ABI || AGENT_NFT_ABI.length === 0) {
  console.error('❌ AgentNFT ABI is empty or undefined');
  console.error('Available keys in artifact:', Object.keys(AgentNFTArtifact));
}

// ===== LEGACY EXPORTS (for backward compatibility) =====
export const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.AGENT_NFT;
export const CONTRACT_ABI = AGENT_NFT_ABI;

// ===== NETWORK CONFIGURATION =====
export const NETWORK_CONFIG = {
  CHAIN_ID: 43113, // Avalanche Fuji testnet
  RPC_URL: "https://api.avax-test.network/ext/bc/C/rpc",
  EXPLORER_URL: "https://testnet.snowtrace.io",
} as const;

// ===== TYPE DEFINITIONS =====
export type ContractName = keyof typeof CONTRACT_ADDRESSES;

// ===== UTILITY FUNCTIONS =====
export const getContractAddress = (contractName: ContractName): string => {
  return CONTRACT_ADDRESSES[contractName];
};

export const getExplorerUrl = (address: string): string => {
  return `${NETWORK_CONFIG.EXPLORER_URL}/address/${address}`;
};

export const getTxUrl = (txHash: string): string => {
  return `${NETWORK_CONFIG.EXPLORER_URL}/tx/${txHash}`;
};

// ===== CONTRACT CONFIGURATION =====
export const CONTRACT_CONFIG = {
  AGENT_NFT: {
    address: CONTRACT_ADDRESSES.AGENT_NFT,
    abi: AGENT_NFT_ABI,
  },
  MARKETPLACE: {
    address: CONTRACT_ADDRESSES.MARKETPLACE,
    abi: MARKETPLACE_ABI,
  },
  BREEDING: {
    address: CONTRACT_ADDRESSES.BREEDING,
    abi: BREEDING_ABI,
  },
} as const;