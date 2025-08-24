// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/AgentNFT.sol";

contract AgentNFTTest is Test {
    AgentNFT public agent;

    address deployer = address(this);
    address alice = address(0x1);

    function setUp() public {
        agent = new AgentNFT();
    }

    function testMintAgent() public {
        string memory uri = "ipfs://agent1";
        agent.mint(alice, uri);

        // tokenId starts from 0
        assertEq(agent.ownerOf(0), alice);
        assertEq(agent.tokenURI(0), uri);
        assertEq(agent.nextTokenId(), 1);
    }
}
