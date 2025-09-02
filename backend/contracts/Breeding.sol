// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AgentNFT} from "./AgentNFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract Breeding is Ownable, ReentrancyGuard, IERC721Receiver {
    AgentNFT public immutable agentNFT;

    // Breeding fee (optional)
    uint256 public breedingFee = 0.01 ether;

    // Cooldown period between breeding (optional)
    mapping(uint256 => uint256) public lastBreedTime;
    uint256 public breedingCooldown = 1 hours;

    // Events
    event AgentBred(
        uint256 indexed parentA,
        uint256 indexed parentB,
        uint256 indexed childId,
        address breeder
    );
    event BreedingFeeUpdated(uint256 newFee);
    event CooldownUpdated(uint256 newCooldown);

    constructor(address _agentNFT) Ownable(msg.sender) {
        agentNFT = AgentNFT(_agentNFT);
    }

    /**
     * @dev Breed two agents to create a new child agent
     * @param parentA Token ID of first parent
     * @param parentB Token ID of second parent
     * @return childId Token ID of the newly created child
     */
    function breed(
        uint256 parentA,
        uint256 parentB
    ) external payable nonReentrant returns (uint256 childId) {
        // Validate inputs
        require(parentA != parentB, "Breeding: Cannot breed with self");
        require(agentNFT.exists(parentA), "Breeding: Parent A does not exist");
        require(agentNFT.exists(parentB), "Breeding: Parent B does not exist");

        // Check ownership or approval for both parents
        address parentAOwner = agentNFT.ownerOf(parentA);
        address parentBOwner = agentNFT.ownerOf(parentB);

        require(
            _isAuthorizedForToken(parentA, parentAOwner),
            "Breeding: Not authorized for parent A"
        );

        // Enhanced authorization check for parentB
        // Allow if caller is authorized OR both owners approved the contract
        bool callerAuthorizedForB = _isDirectlyAuthorizedForToken(
            parentB,
            parentBOwner
        );
        bool bothOwnersApprovedContract = agentNFT.isApprovedForAll(
            parentAOwner,
            address(this)
        ) && agentNFT.isApprovedForAll(parentBOwner, address(this));

        require(
            callerAuthorizedForB || bothOwnersApprovedContract,
            "Breeding: Not authorized for parent B"
        );

        // Check cooldown
        require(
            block.timestamp >= lastBreedTime[parentA] + breedingCooldown,
            "Breeding: Parent A on cooldown"
        );
        require(
            block.timestamp >= lastBreedTime[parentB] + breedingCooldown,
            "Breeding: Parent B on cooldown"
        );

        // Check breeding fee
        require(
            msg.value >= breedingFee,
            "Breeding: Insufficient breeding fee"
        );

        // Get parent traits
        string[] memory traitsA = agentNFT.getTraits(parentA);
        string[] memory traitsB = agentNFT.getTraits(parentB);

        // Combine traits (simple mixing algorithm)
        string[] memory childTraits = _combineTraits(traitsA, traitsB);

        // Generate child metadata URI
        string memory childTokenURI = _generateChildTokenURI(parentA, parentB);

        // Store the original caller (breeder)
        address breeder = msg.sender;

        // Get the child token ID that will be minted
        childId = agentNFT.nextTokenId();

        // Mint the child to the breeder
        agentNFT.mint(breeder, childTokenURI);

        // Set the child's traits
        agentNFT.setTraits(childId, childTraits);

        // Update cooldowns
        lastBreedTime[parentA] = block.timestamp;
        lastBreedTime[parentB] = block.timestamp;

        // Emit breeding event
        emit AgentBred(parentA, parentB, childId, msg.sender);

        // Return excess payment
        if (msg.value > breedingFee) {
            payable(msg.sender).transfer(msg.value - breedingFee);
        }

        return childId;
    }

    /**
     * @dev Combine traits from two parents to create child traits
     */
    function _combineTraits(
        string[] memory traitsA,
        string[] memory traitsB
    ) internal pure returns (string[] memory) {
        // Simple trait mixing: combine all unique traits
        // In production, this would be more sophisticated

        uint256 maxTraits = traitsA.length + traitsB.length;
        string[] memory combined = new string[](maxTraits);
        uint256 combinedCount = 0;

        // Add all traits from parent A
        for (uint256 i = 0; i < traitsA.length; i++) {
            combined[combinedCount] = traitsA[i];
            combinedCount++;
        }

        // Add traits from parent B (avoiding duplicates would be more complex)
        for (uint256 i = 0; i < traitsB.length; i++) {
            combined[combinedCount] = traitsB[i];
            combinedCount++;
        }

        // Resize array to actual count (simplified - in production use better approach)
        string[] memory result = new string[](combinedCount);
        for (uint256 i = 0; i < combinedCount; i++) {
            result[i] = combined[i];
        }

        // Add a new "bred" trait to show this is a child
        string[] memory finalResult = new string[](result.length + 1);
        for (uint256 i = 0; i < result.length; i++) {
            finalResult[i] = result[i];
        }
        finalResult[result.length] = "bred";

        return finalResult;
    }

    /**
     * @dev Generate token URI for child based on parents
     */
    function _generateChildTokenURI(
        uint256 parentA,
        uint256 parentB
    ) internal pure returns (string memory) {
        // Simple implementation - in production this would call IPFS service
        return
            string(
                abi.encodePacked(
                    "ipfs://QmChild",
                    _toString(parentA),
                    "x",
                    _toString(parentB)
                )
            );
    }

    /**
     * @dev Check if caller is authorized to use a token for breeding (original logic)
     */
    function _isAuthorizedForToken(
        uint256 tokenId,
        address tokenOwner
    ) internal view returns (bool) {
        return
            msg.sender == tokenOwner ||
            agentNFT.getApproved(tokenId) == msg.sender ||
            agentNFT.isApprovedForAll(tokenOwner, msg.sender);
    }

    /**
     * @dev Check direct authorization (without contract approval fallback)
     */
    function _isDirectlyAuthorizedForToken(
        uint256 tokenId,
        address tokenOwner
    ) internal view returns (bool) {
        return
            msg.sender == tokenOwner ||
            agentNFT.getApproved(tokenId) == msg.sender ||
            agentNFT.isApprovedForAll(tokenOwner, msg.sender);
    }

    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // Admin functions
    function setBreedingFee(uint256 _fee) external onlyOwner {
        breedingFee = _fee;
        emit BreedingFeeUpdated(_fee);
    }

    function setCooldown(uint256 _cooldown) external onlyOwner {
        breedingCooldown = _cooldown;
        emit CooldownUpdated(_cooldown);
    }

    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // View functions
    function getBreedingCost() external view returns (uint256) {
        return breedingFee;
    }

    function canBreed(uint256 tokenId) external view returns (bool) {
        return block.timestamp >= lastBreedTime[tokenId] + breedingCooldown;
    }

    function getBreedingCooldownRemaining(
        uint256 tokenId
    ) external view returns (uint256) {
        uint256 cooldownEnd = lastBreedTime[tokenId] + breedingCooldown;
        if (block.timestamp >= cooldownEnd) {
            return 0;
        }
        return cooldownEnd - block.timestamp;
    }

    // IERC721Receiver implementation
    function onERC721Received(
        address, // operator
        address, // from
        uint256, // tokenId
        bytes calldata // data
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
