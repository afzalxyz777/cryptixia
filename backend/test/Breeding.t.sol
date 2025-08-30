// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/AgentNFT.sol";
import "../contracts/Breeding.sol";

contract BreedingTest is Test {
    AgentNFT public agent;
    Breeding public breeding;

    // ✅ use normal payable addresses instead of 0x1/0x2
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        agent = new AgentNFT();
        breeding = new Breeding(address(agent));
        agent.transferOwnership(address(breeding));

        // ✅ Mint parent NFTs for Alice, otherwise parent1/parent2 don't exist
        vm.prank(alice);
        breeding.breed(0, 0, "ipfs://parent1");

        vm.prank(alice);
        breeding.breed(0, 0, "ipfs://parent2");
    }

    function testBreedCreatesChild() public {
        // ✅ prank so Alice is the caller (EOA, not the test contract)
        vm.prank(alice);
        breeding.breed(0, 1, "ipfs://child");

        uint256 newId = agent.nextTokenId() - 1;

        assertEq(agent.ownerOf(newId), alice);
        assertEq(agent.tokenURI(newId), "http://localhost:3001/metadata/ipfs://child");
    }
}
