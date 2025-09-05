// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {AgentNFT} from "../contracts/AgentNFT.sol";
import {Breeding} from "../contracts/Breeding.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract BreedingTest is Test, IERC721Receiver {
    AgentNFT public agentNFT;
    Breeding public breeding;

    address public owner;
    address public alice;
    address public bob;
    address public charlie;

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");

        // Deploy contracts
        agentNFT = new AgentNFT();
        breeding = new Breeding(address(agentNFT));

        // Give breeding contract permission to mint
        agentNFT.transferOwnership(address(breeding));

        // Mint parent agents with traits
        string[] memory traitsA = new string[](2);
        traitsA[0] = "curious";
        traitsA[1] = "analytical";
        agentNFT.publicMint("ipfs://parentA", traitsA);
        agentNFT.transferFrom(address(this), alice, 0);

        string[] memory traitsB = new string[](2);
        traitsB[0] = "friendly";
        traitsB[1] = "creative";
        agentNFT.publicMint("ipfs://parentB", traitsB);
        agentNFT.transferFrom(address(this), bob, 1);

        // Give users some ETH for breeding fees
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(charlie, 1 ether);

        // Reset timestamp to ensure clean state for each test
        vm.warp(1000000); // Set to a consistent timestamp
    }

    // IERC721Receiver implementation for test contract
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // Add receive function to accept ETH from withdrawFees
    receive() external payable {}

    function testBreedCreatesChild() public {
        // Both Alice and Bob need to approve breeding contract
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);
        vm.prank(bob);
        agentNFT.setApprovalForAll(address(breeding), true);

        // Alice breeds her token (0) with Bob's token (1)
        vm.prank(alice);
        uint256 childId = breeding.breed{value: 0.01 ether}(0, 1);

        // Verify child was created
        assertEq(childId, 2);
        assertEq(agentNFT.ownerOf(childId), alice);
        assertEq(agentNFT.exists(childId), true);

        // Verify child has combined traits
        string[] memory childTraits = agentNFT.getTraits(childId);
        assertEq(childTraits.length, 5); // 2 + 2 + 1 "bred" trait
        assertEq(childTraits[4], "bred"); // Last trait should be "bred"
    }

    function testBreedRequiresOwnership() public {
        // Charlie (not owner) tries to breed Alice's and Bob's tokens
        vm.prank(charlie);
        vm.expectRevert("Breeding: Not authorized for parent A");
        breeding.breed{value: 0.01 ether}(0, 1);
    }

    function testBreedRequiresApproval() public {
        // Due to our enhanced authorization logic, when Alice has no approvals,
        // the contract checks parent B first and fails there
        vm.prank(alice);
        vm.expectRevert("Breeding: Not authorized for parent B");
        breeding.breed{value: 0.01 ether}(0, 1);

        // Test case 2: Alice approves breeding contract for her token but Bob doesn't
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);

        vm.prank(alice);
        vm.expectRevert("Breeding: Not authorized for parent B");
        breeding.breed{value: 0.01 ether}(0, 1);
    }

    function testCannotBreedWithSelf() public {
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);

        vm.prank(alice);
        vm.expectRevert("Breeding: Cannot breed with self");
        breeding.breed{value: 0.01 ether}(0, 0);
    }

    function testBreedRequiresFee() public {
        // Both need approval first
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);
        vm.prank(bob);
        agentNFT.setApprovalForAll(address(breeding), true);

        // Try to breed without sufficient fee
        vm.prank(alice);
        vm.expectRevert("Breeding: Insufficient breeding fee");
        breeding.breed{value: 0.005 ether}(0, 1);
    }

    function testBreedingCooldown() public {
        // Setup approvals
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);
        vm.prank(bob);
        agentNFT.setApprovalForAll(address(breeding), true);

        // First breeding
        vm.prank(alice);
        breeding.breed{value: 0.01 ether}(0, 1);

        // Try to breed again immediately - should fail
        vm.prank(alice);
        vm.expectRevert("Breeding: Parent A on cooldown");
        breeding.breed{value: 0.01 ether}(0, 1);

        // Fast forward time past cooldown
        vm.warp(block.timestamp + 1 hours + 1);

        // Now breeding should work again
        vm.prank(alice);
        uint256 secondChild = breeding.breed{value: 0.01 ether}(0, 1);
        assertEq(secondChild, 3);
    }

    function testBreedWithNonexistentToken() public {
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);

        vm.prank(alice);
        vm.expectRevert("Breeding: Parent B does not exist");
        breeding.breed{value: 0.01 ether}(0, 999);
    }

    function testBreedingFeeCollection() public {
        uint256 initialBalance = address(breeding).balance;

        // Both need approval
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);
        vm.prank(bob);
        agentNFT.setApprovalForAll(address(breeding), true);

        vm.prank(alice);
        breeding.breed{value: 0.01 ether}(0, 1);

        assertEq(address(breeding).balance, initialBalance + 0.01 ether);
    }

    function testExcessFeeRefund() public {
        uint256 aliceInitialBalance = alice.balance;

        // Both need approval
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);
        vm.prank(bob);
        agentNFT.setApprovalForAll(address(breeding), true);

        // Send more than required fee
        vm.prank(alice);
        breeding.breed{value: 0.02 ether}(0, 1);

        // Alice should get 0.01 ether refunded
        assertEq(alice.balance, aliceInitialBalance - 0.01 ether);
    }

    function testSetBreedingFee() public {
        breeding.setBreedingFee(0.05 ether);
        assertEq(breeding.breedingFee(), 0.05 ether);
    }

    function testOnlyOwnerCanSetFee() public {
        vm.prank(alice);
        vm.expectRevert();
        breeding.setBreedingFee(0.05 ether);
    }

    function testWithdrawFees() public {
        // Setup and breed to generate fees
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);
        vm.prank(bob);
        agentNFT.setApprovalForAll(address(breeding), true);

        vm.prank(alice);
        breeding.breed{value: 0.01 ether}(0, 1);

        // Verify breeding contract received fees
        uint256 contractBalance = address(breeding).balance;
        assertEq(contractBalance, 0.01 ether);

        // Record owner's initial balance
        uint256 ownerInitialBalance = owner.balance;

        // Withdraw fees as contract owner
        breeding.withdrawFees();

        // Verify withdrawal worked
        assertEq(address(breeding).balance, 0);
        assertEq(owner.balance, ownerInitialBalance + 0.01 ether);
    }

    function testCanBreedView() public {
        // Initially should be able to breed
        assertEq(breeding.canBreed(0), true);

        // After breeding, should be on cooldown - both need approval
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);
        vm.prank(bob);
        agentNFT.setApprovalForAll(address(breeding), true);

        vm.prank(alice);
        breeding.breed{value: 0.01 ether}(0, 1);

        assertEq(breeding.canBreed(0), false);
        assertEq(breeding.canBreed(1), false);

        // After cooldown, should be able to breed again
        vm.warp(block.timestamp + 1 hours + 1);
        assertEq(breeding.canBreed(0), true);
        assertEq(breeding.canBreed(1), true);
    }

    // Additional test to verify cooldown mechanics work correctly
    function testCooldownMechanics() public {
        // Setup approvals
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);
        vm.prank(bob);
        agentNFT.setApprovalForAll(address(breeding), true);

        // Check initial cooldown remaining (should be 0)
        assertEq(breeding.getBreedingCooldownRemaining(0), 0);
        assertEq(breeding.getBreedingCooldownRemaining(1), 0);

        // Breed
        vm.prank(alice);
        breeding.breed{value: 0.01 ether}(0, 1);

        // Check cooldown remaining (should be close to 1 hour)
        uint256 cooldownA = breeding.getBreedingCooldownRemaining(0);
        uint256 cooldownB = breeding.getBreedingCooldownRemaining(1);

        assertGt(cooldownA, 3500); // More than ~58 minutes
        assertLe(cooldownA, 3600); // Less than or equal to 1 hour
        assertEq(cooldownA, cooldownB); // Both should be the same

        // Fast forward halfway
        vm.warp(block.timestamp + 30 minutes);

        uint256 halfwayCooldown = breeding.getBreedingCooldownRemaining(0);
        assertGt(halfwayCooldown, 1700); // More than ~28 minutes
        assertLe(halfwayCooldown, 1800); // Less than or equal to 30 minutes

        // Fast forward past cooldown
        vm.warp(block.timestamp + 31 minutes);

        assertEq(breeding.getBreedingCooldownRemaining(0), 0);
        assertEq(breeding.canBreed(0), true);
    }

    // Test to debug withdrawFees if it still fails
    function testWithdrawFeesDebug() public {
        console.log("Breeding contract owner:", breeding.owner());
        console.log("Test contract address:", address(this));
        console.log("Owner variable:", owner);

        // Setup and breed
        vm.prank(alice);
        agentNFT.setApprovalForAll(address(breeding), true);
        vm.prank(bob);
        agentNFT.setApprovalForAll(address(breeding), true);

        vm.prank(alice);
        breeding.breed{value: 0.01 ether}(0, 1);

        console.log(
            "Contract balance after breeding:",
            address(breeding).balance
        );
        console.log("Owner balance before withdrawal:", owner.balance);

        // This should work if everything is set up correctly
        breeding.withdrawFees();

        console.log("Owner balance after withdrawal:", owner.balance);
        console.log(
            "Contract balance after withdrawal:",
            address(breeding).balance
        );
    }
}
