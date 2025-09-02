// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IAgentMetadata
 * @dev Interface defining the expected metadata standard for Agent NFTs
 * This ensures consistency between contract expectations and server-generated metadata
 */
interface IAgentMetadata {
    /**
     * @dev Standard NFT metadata structure that server should generate
     * and pin to IPFS for each Agent NFT
     *
     * Expected JSON structure:
     * {
     *   "name": "Agent #1",
     *   "description": "An intelligent AI companion",
     *   "image": "ipfs://QmAvatarCID",  // or data:image/svg+xml;base64,...
     *   "avatar_data_url": "ipfs://QmAvatarCID", // same as image or separate
     *   "traits": [
     *     "curious",
     *     "analytical",
     *     "friendly"
     *   ],
     *   "attributes": [
     *     {
     *       "trait_type": "Personality",
     *       "value": "Curious"
     *     },
     *     {
     *       "trait_type": "Skill Level",
     *       "value": "Beginner"
     *     }
     *   ],
     *   "memory_uri": "ipfs://QmMemoryCID",
     *   "generation": 0,
     *   "parent_a": null,
     *   "parent_b": null,
     *   "created_at": "2025-09-01T12:00:00Z"
     * }
     */
    struct AgentMetadata {
        string name;
        string description;
        string avatarDataUrl;
        string[] traits;
        string memoryUri;
        uint256 generation;
        uint256 parentA; // 0 if no parent
        uint256 parentB; // 0 if no parent
    }
}
