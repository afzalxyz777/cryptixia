// frontend/lib/breedingContract.ts

// Import ABI directly from Foundry build artifacts
// (after running `forge build`, Foundry generates JSONs in /out)
import BreedingArtifact from "../contracts/Breeding.json";

export const BREEDING_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_BREEDING_ADDRESS as `0x${string}`) ||
  "0xB4c1EF251291c9a85de077F0be73Ee6803B037ab";

// Full ABI from compiled contract
export const BREEDING_CONTRACT_ABI = (BreedingArtifact as any).abi;

// Export full contract object (useful for wagmi or ethers)
export const BreedingContract = {
  address: BREEDING_CONTRACT_ADDRESS,
  abi: BREEDING_CONTRACT_ABI,
} as const;
