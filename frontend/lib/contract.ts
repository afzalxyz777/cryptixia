import AgentNFT from "../contracts/AgentNFT.json";

// ✅ Contract address from your deployment
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AGENTNFT_ADDRESS || "0x2BDaBBa9831E84f9f94995Ef4B174b08c88E3b1D";

// ✅ AgentNFT is already the ABI array
export const CONTRACT_ABI = AgentNFT;
