// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {AgentNFT} from "../contracts/AgentNFT.sol";

contract AgentNFTTest is Test {
    AgentNFT public agent;
    address public owner;
    address public alice;
    address public bob;
    address public user1;
    address public user2;

    string constant TEST_TOKEN_URI = "ipfs://QmTestMetadata123";
    string constant TEST_MEMORY_HASH = "QmMemoryHash456";
    string constant TEST_AVATAR_HASH = "QmAvatarHash789";

    function setUp() public {
        owner = address(this);
        alice = address(0x1);
        bob = address(0x2);
        user1 = address(0x3);
        user2 = address(0x4);

        // Deploy the AgentNFT contract
        agent = new AgentNFT();
    }

    function testMintAgent() public {
        // Test owner can mint
        agent.mint(alice, TEST_TOKEN_URI);

        assertEq(agent.ownerOf(0), alice);
        assertEq(agent.tokenURI(0), "http://localhost:3001/metadata/ipfs://QmTestMetadata123");
        assertEq(agent.nextTokenId(), 1);
    }

    function testPublicMint() public {
        // Test public minting with traits
        string[] memory traits = new string[](3);
        traits[0] = "curious";
        traits[1] = "analytical";
        traits[2] = "friendly";

        vm.prank(user1);
        agent.publicMint(TEST_TOKEN_URI, traits);

        assertEq(agent.ownerOf(0), user1);
        assertEq(agent.tokenURI(0), "http://localhost:3001/metadata/ipfs://QmTestMetadata123");

        // Check traits were set
        string[] memory storedTraits = agent.getTraits(0);
        assertEq(storedTraits.length, 3);
        assertEq(storedTraits[0], "curious");
        assertEq(storedTraits[1], "analytical");
        assertEq(storedTraits[2], "friendly");
    }

    function testSetMemoryHash() public {
        // Mint first
        agent.mint(user1, TEST_TOKEN_URI);

        // Owner can set memory hash
        vm.prank(user1);
        agent.setMemoryHash(0, TEST_MEMORY_HASH);

        assertEq(agent.getMemoryHash(0), TEST_MEMORY_HASH);
    }

    function testSetTraits() public {
        // Mint with initial traits
        string[] memory initialTraits = new string[](2);
        initialTraits[0] = "beginner";
        initialTraits[1] = "curious";

        vm.prank(user1);
        agent.publicMint(TEST_TOKEN_URI, initialTraits);

        // Update traits
        string[] memory newTraits = new string[](3);
        newTraits[0] = "expert";
        newTraits[1] = "analytical";
        newTraits[2] = "strategic";

        vm.prank(user1);
        agent.setTraits(0, newTraits);

        string[] memory storedTraits = agent.getTraits(0);
        assertEq(storedTraits.length, 3);
        assertEq(storedTraits[0], "expert");
        assertEq(storedTraits[1], "analytical");
        assertEq(storedTraits[2], "strategic");
    }

    function testSetAvatarHash() public {
        // Mint first
        agent.mint(user1, TEST_TOKEN_URI);

        // Set avatar hash
        vm.prank(user1);
        agent.setAvatarHash(0, TEST_AVATAR_HASH);

        assertEq(agent.getAvatarHash(0), TEST_AVATAR_HASH);
    }

    function testUnauthorizedCannotSetTraits() public {
        // Mint to user1
        agent.mint(user1, TEST_TOKEN_URI);

        string[] memory traits = new string[](1);
        traits[0] = "hacker";

        // user2 cannot set traits for user1's token
        vm.prank(user2);
        vm.expectRevert("AgentNFT: Not authorized");
        agent.setTraits(0, traits);
    }

    function testUnauthorizedCannotSetAvatar() public {
        // Mint to user1
        agent.mint(user1, TEST_TOKEN_URI);

        // user2 cannot set avatar for user1's token
        vm.prank(user2);
        vm.expectRevert("AgentNFT: Not authorized");
        agent.setAvatarHash(0, "malicious_avatar");
    }

    function testLogMemoryHash() public {
        // Mint first
        agent.mint(user1, TEST_TOKEN_URI);

        bytes32 memoryHash = keccak256("test memory content");

        vm.prank(user1);
        agent.logMemoryHash(0, memoryHash);

        bytes32[] memory auditLog = agent.getMemoryAuditLog(0);
        assertEq(auditLog.length, 1);
        assertEq(auditLog[0], memoryHash);
        assertEq(agent.getMemoryAuditLogCount(0), 1);
    }

    function testLogMemoryForgotten() public {
        // Mint first
        agent.mint(user1, TEST_TOKEN_URI);

        bytes32 memoryHash = keccak256("forgotten memory");

        vm.prank(user1);
        agent.logMemoryForgotten(0, memoryHash);

        // Note: this just emits an event, doesn't modify audit log
        // The actual deletion happens off-chain in vector DB
    }

    function testTokenExists() public {
        // Test exists function
        assertEq(agent.exists(0), false);

        agent.mint(user1, TEST_TOKEN_URI);
        assertEq(agent.exists(0), true);
    }

    function testGetNonexistentToken() public {
        // Should revert when trying to get traits of non-existent token
        vm.expectRevert();
        agent.getTraits(999);

        vm.expectRevert();
        agent.getAvatarHash(999);

        vm.expectRevert();
        agent.getMemoryHash(999);
    }
}
