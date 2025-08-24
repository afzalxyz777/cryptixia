// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentNFT.sol";

contract Breeding {
    AgentNFT public agentNFT;

    event AgentBred(uint256 indexed parent1, uint256 indexed parent2, uint256 indexed newAgentId);

    constructor(address _agentNFT) {
        agentNFT = AgentNFT(_agentNFT);
    }

    // Placeholder for breeding logic
    function breed(uint256 parent1, uint256 parent2, string memory newTokenURI) external {
        // TODO: implement real breeding logic (check ownership, combine traits, etc.)
        // For now: mint a new Agent NFT directly to sender
        agentNFT.mint(msg.sender, newTokenURI);

        uint256 newAgentId = agentNFT.nextTokenId() - 1;
        emit AgentBred(parent1, parent2, newAgentId);
    }
}
