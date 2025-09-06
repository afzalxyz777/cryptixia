// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import "../contracts/AgentNFT.sol";

contract MemoryLoggingTest is Test {
    AgentNFT public agentNFT;
    address public owner = address(0x1);
    address public user = address(0x2);

    function setUp() public {
        vm.prank(owner);
        agentNFT = new AgentNFT();

        // Mint a test agent to user address
        vm.prank(owner);
        agentNFT.mint(user, "ipfs://test-metadata");
    }

    function testLogMemoryHash() public {
        uint256 tokenId = 0;
        bytes32 testHash = keccak256("test memory content");

        // User owns the token, so they can log memories
        vm.prank(user);
        agentNFT.logMemoryHash(tokenId, testHash);

        // Check audit log
        bytes32[] memory auditLog = agentNFT.getMemoryAuditLog(tokenId);
        assertEq(auditLog.length, 1);
        assertEq(auditLog[0], testHash);

        // Check count
        uint256 count = agentNFT.getMemoryAuditLogCount(tokenId);
        assertEq(count, 1);
    }

    function testLogMemoryForgotten() public {
        uint256 tokenId = 0;
        bytes32 testHash = keccak256("memory to forget");

        vm.prank(user);
        agentNFT.logMemoryForgotten(tokenId, testHash);
    }

    function testMultipleMemoryLogs() public {
        uint256 tokenId = 0;
        bytes32 hash1 = keccak256("memory 1");
        bytes32 hash2 = keccak256("memory 2");

        vm.prank(user);
        agentNFT.logMemoryHash(tokenId, hash1);

        vm.prank(user);
        agentNFT.logMemoryHash(tokenId, hash2);

        bytes32[] memory auditLog = agentNFT.getMemoryAuditLog(tokenId);
        assertEq(auditLog.length, 2);
        assertEq(auditLog[0], hash1);
        assertEq(auditLog[1], hash2);
    }

    function testUnauthorizedMemoryLogging() public {
        uint256 tokenId = 0;
        bytes32 testHash = keccak256("unauthorized memory");
        address unauthorized = address(0x3);

        vm.prank(unauthorized);
        vm.expectRevert("AgentNFT: Not authorized");
        agentNFT.logMemoryHash(tokenId, testHash);
    }

    function testMemoryLoggingNonexistentToken() public {
        uint256 nonexistentTokenId = 999;
        bytes32 testHash = keccak256("test memory");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, nonexistentTokenId));
        agentNFT.logMemoryHash(nonexistentTokenId, testHash);
    }
}
