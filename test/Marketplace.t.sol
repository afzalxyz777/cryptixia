// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/AgentNFT.sol";
import "../contracts/Marketplace.sol";

contract MarketplaceTest is Test {
    AgentNFT public agent;
    Marketplace public market;

    // ✅ switched to makeAddr() so they are payable EOA addresses
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");

    function setUp() public {
        agent = new AgentNFT();
        market = new Marketplace(address(agent));

        // Mint NFT #0 to Alice (Breeding contract owns minting rights)
        agent.mint(alice, "ipfs://agent1");
    }

    function testListAndBuy() public {
        // Alice approves marketplace
        vm.prank(alice);
        agent.setApprovalForAll(address(market), true);

        // Alice lists NFT
        vm.prank(alice);
        market.list(0, 1 ether);

        // Bob gets ETH
        vm.deal(bob, 1 ether);

        // Bob buys NFT
        vm.prank(bob);
        market.buy{value: 1 ether}(0);

        // ✅ assert that ownership & balance updated
        assertEq(agent.ownerOf(0), bob);
        assertEq(alice.balance, 1 ether);
    }
}
