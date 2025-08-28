// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/AgentNFT.sol";

contract AgentNFTTest is Test {
    AgentNFT public agent;

    address deployer = address(this);
    address alice = address(0x1);
    address bob = address(0x2);

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

    function testSetAndGetMemoryHash() public {
        string memory uri = "ipfs://agent1";
        agent.mint(alice, uri);

        // Alice sets memory hash
        vm.prank(alice); // impersonate alice
        agent.setMemoryHash(0, "hash123");

        string memory stored = agent.getMemoryHash(0);
        assertEq(stored, "hash123");
    }

    function testSetMemoryHashByDeployerOwner() public {
        string memory uri = "ipfs://agent2";
        agent.mint(alice, uri);

        // Deployer (contract owner) can also set
        agent.setMemoryHash(0, "ownerHash");

        string memory stored = agent.getMemoryHash(0);
        assertEq(stored, "ownerHash");
    }

    function testRevertWhenUnauthorizedSetMemoryHash() public {
        string memory uri = "ipfs://agent3";
        agent.mint(alice, uri);

        // Expect revert before Bob calls
        vm.prank(bob);
        vm.expectRevert("AgentNFT: Not authorized");
        agent.setMemoryHash(0, "badHash");
    }
}
