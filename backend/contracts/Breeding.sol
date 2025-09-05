// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AgentNFT} from "./AgentNFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract Breeding is Ownable, ReentrancyGuard, IERC721Receiver {
    AgentNFT public immutable agentNFT;

    // Breeding parameters with safety limits
    uint256 public breedingFee = 0.01 ether;
    uint256 public constant MAX_BREEDING_FEE = 1 ether;
    uint256 public constant MIN_BREEDING_FEE = 0.001 ether;

    // Cooldown period between breeding with safety limits
    mapping(uint256 => uint256) public lastBreedTime;
    uint256 public breedingCooldown = 1 hours;
    uint256 public constant MAX_BREEDING_COOLDOWN = 30 days;
    uint256 public constant MIN_BREEDING_COOLDOWN = 1 minutes;

    // Anti-spam and safety measures
    mapping(uint256 => uint256) public breedingCount; // Track breeding frequency
    uint256 public constant MAX_BREEDS_PER_AGENT = 100;

    // Gas optimization: Track total breeds
    uint256 public totalBreeds;

    // Security: Emergency pause
    bool public paused = false;

    // Prevent certain breeding combinations
    mapping(uint256 => mapping(uint256 => bool)) public forbiddenPairs;

    // Events
    event AgentBred(
        uint256 indexed parentA,
        uint256 indexed parentB,
        uint256 indexed childId,
        address breeder,
        uint256 fee
    );
    event BreedingFeeUpdated(uint256 oldFee, uint256 newFee);
    event CooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
    event PairForbidden(uint256 indexed tokenA, uint256 indexed tokenB);
    event PairAllowed(uint256 indexed tokenA, uint256 indexed tokenB);
    event BreedingPaused();
    event BreedingUnpaused();

    modifier notPaused() {
        require(!paused, "Breeding: Contract is paused");
        _;
    }

    modifier validToken(uint256 tokenId) {
        require(agentNFT.exists(tokenId), "Breeding: Token does not exist");
        _;
    }

    modifier canBreedToken(uint256 tokenId) {
        require(
            block.timestamp >= lastBreedTime[tokenId] + breedingCooldown,
            "Breeding: Token on cooldown"
        );
        require(
            breedingCount[tokenId] < MAX_BREEDS_PER_AGENT,
            "Breeding: Max breeds reached"
        );
        _;
    }

    constructor(address _agentNFT) Ownable(msg.sender) {
        require(_agentNFT != address(0), "Breeding: Invalid NFT contract");
        agentNFT = AgentNFT(_agentNFT);
    }

    /**
     * @dev Breed two agents to create a new child agent with enhanced safety
     */
    function breed(
        uint256 parentA,
        uint256 parentB
    ) external payable notPaused nonReentrant returns (uint256 childId) {
        // Enhanced validation
        require(parentA != parentB, "Breeding: Cannot breed with self");

        // Check existence with specific error messages
        require(agentNFT.exists(parentA), "Breeding: Parent A does not exist");
        require(agentNFT.exists(parentB), "Breeding: Parent B does not exist");

        // Check cooldowns with specific error messages
        require(
            block.timestamp >= lastBreedTime[parentA] + breedingCooldown,
            "Breeding: Parent A on cooldown"
        );
        require(
            block.timestamp >= lastBreedTime[parentB] + breedingCooldown,
            "Breeding: Parent B on cooldown"
        );

        require(
            breedingCount[parentA] < MAX_BREEDS_PER_AGENT,
            "Breeding: Parent A max breeds reached"
        );
        require(
            breedingCount[parentB] < MAX_BREEDS_PER_AGENT,
            "Breeding: Parent B max breeds reached"
        );

        require(
            !forbiddenPairs[parentA][parentB] &&
                !forbiddenPairs[parentB][parentA],
            "Breeding: Forbidden pair"
        );

        address parentAOwner = agentNFT.ownerOf(parentA);
        address parentBOwner = agentNFT.ownerOf(parentB);

        // Enhanced authorization checks
        require(
            _isAuthorizedForToken(parentA, parentAOwner),
            "Breeding: Not authorized for parent A"
        );

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

        // Payment validation
        require(
            msg.value >= breedingFee,
            "Breeding: Insufficient breeding fee"
        );

        // Get parent traits with safety checks
        string[] memory traitsA = agentNFT.getTraits(parentA);
        string[] memory traitsB = agentNFT.getTraits(parentB);

        // Combine traits with validation
        string[] memory childTraits = _combineTraits(traitsA, traitsB);
        require(childTraits.length > 0, "Breeding: Failed to generate traits");

        // Generate child metadata URI
        string memory childTokenURI = _generateChildTokenURI(parentA, parentB);

        // Get the child token ID that will be minted
        childId = agentNFT.nextTokenId();

        // Mint the child to the breeder
        agentNFT.mint(msg.sender, childTokenURI);

        // Set the child's traits
        agentNFT.setTraits(childId, childTraits);

        // Update breeding statistics
        lastBreedTime[parentA] = block.timestamp;
        lastBreedTime[parentB] = block.timestamp;
        breedingCount[parentA]++;
        breedingCount[parentB]++;
        totalBreeds++;

        // Emit breeding event
        emit AgentBred(parentA, parentB, childId, msg.sender, breedingFee);

        // Return excess payment
        uint256 excess = msg.value - breedingFee;
        if (excess > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excess}(
                ""
            );
            require(refundSuccess, "Breeding: Refund failed");
        }

        return childId;
    }

    /**
     * @dev Enhanced trait combination with validation
     */
    function _combineTraits(
        string[] memory traitsA,
        string[] memory traitsB
    ) internal pure returns (string[] memory) {
        // Prevent gas attacks
        require(traitsA.length <= 20, "Breeding: Too many traits A");
        require(traitsB.length <= 20, "Breeding: Too many traits B");

        uint256 maxTraits = traitsA.length + traitsB.length + 1; // +1 for "bred" trait
        string[] memory combined = new string[](maxTraits);
        uint256 combinedCount = 0;

        // Add all traits from parent A
        for (uint256 i = 0; i < traitsA.length; i++) {
            if (bytes(traitsA[i]).length > 0) {
                // Skip empty traits
                combined[combinedCount] = traitsA[i];
                combinedCount++;
            }
        }

        // Add traits from parent B (avoiding duplicates in production would be more complex)
        for (uint256 i = 0; i < traitsB.length; i++) {
            if (bytes(traitsB[i]).length > 0) {
                // Skip empty traits
                combined[combinedCount] = traitsB[i];
                combinedCount++;
            }
        }

        // Add "bred" trait to identify children
        combined[combinedCount] = "bred";
        combinedCount++;

        // Resize array to actual count
        string[] memory result = new string[](combinedCount);
        for (uint256 i = 0; i < combinedCount; i++) {
            result[i] = combined[i];
        }

        return result;
    }

    /**
     * @dev Generate token URI for child with enhanced validation
     */
    function _generateChildTokenURI(
        uint256 parentA,
        uint256 parentB
    ) internal view returns (string memory) {
        // Enhanced implementation with validation
        require(parentA != parentB, "Breeding: Parents must be different");
        return
            string(
                abi.encodePacked(
                    "https://api.cryptixia.io/metadata/child/",
                    _toString(parentA),
                    "x",
                    _toString(parentB),
                    "/",
                    _toString(block.timestamp)
                )
            );
    }

    /**
     * @dev Check if caller is authorized to use a token for breeding
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
     * @dev Check direct authorization without contract approval fallback
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

    // Enhanced admin functions
    function setBreedingFee(uint256 _fee) external onlyOwner {
        require(_fee >= MIN_BREEDING_FEE, "Breeding: Fee too low");
        require(_fee <= MAX_BREEDING_FEE, "Breeding: Fee too high");

        uint256 oldFee = breedingFee;
        breedingFee = _fee;

        emit BreedingFeeUpdated(oldFee, _fee);
    }

    function setCooldown(uint256 _cooldown) external onlyOwner {
        require(
            _cooldown >= MIN_BREEDING_COOLDOWN,
            "Breeding: Cooldown too short"
        );
        require(
            _cooldown <= MAX_BREEDING_COOLDOWN,
            "Breeding: Cooldown too long"
        );

        uint256 oldCooldown = breedingCooldown;
        breedingCooldown = _cooldown;

        emit CooldownUpdated(oldCooldown, _cooldown);
    }

    // Pair management for forbidden combinations
    function forbidPair(uint256 tokenA, uint256 tokenB) external onlyOwner {
        require(tokenA != tokenB, "Breeding: Cannot forbid self-pair");
        forbiddenPairs[tokenA][tokenB] = true;
        forbiddenPairs[tokenB][tokenA] = true;
        emit PairForbidden(tokenA, tokenB);
    }

    function allowPair(uint256 tokenA, uint256 tokenB) external onlyOwner {
        forbiddenPairs[tokenA][tokenB] = false;
        forbiddenPairs[tokenB][tokenA] = false;
        emit PairAllowed(tokenA, tokenB);
    }

    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "Breeding: No fees to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Breeding: Withdrawal failed");
    }

    // Enhanced view functions
    function getBreedingCost() external view returns (uint256) {
        return breedingFee;
    }

    function canBreed(uint256 tokenId) external view returns (bool) {
        if (!agentNFT.exists(tokenId)) return false;
        if (breedingCount[tokenId] >= MAX_BREEDS_PER_AGENT) return false;
        return block.timestamp >= lastBreedTime[tokenId] + breedingCooldown;
    }

    function getBreedingCooldownRemaining(
        uint256 tokenId
    ) external view returns (uint256) {
        if (!agentNFT.exists(tokenId)) return 0;

        uint256 cooldownEnd = lastBreedTime[tokenId] + breedingCooldown;
        if (block.timestamp >= cooldownEnd) {
            return 0;
        }
        return cooldownEnd - block.timestamp;
    }

    function getBreedingStats(
        uint256 tokenId
    )
        external
        view
        returns (
            uint256 breeds,
            uint256 lastBreed,
            uint256 cooldownRemaining,
            bool canBreedNow
        )
    {
        breeds = breedingCount[tokenId];
        lastBreed = lastBreedTime[tokenId];
        cooldownRemaining = this.getBreedingCooldownRemaining(tokenId);
        canBreedNow = this.canBreed(tokenId);
    }

    function isPairForbidden(
        uint256 tokenA,
        uint256 tokenB
    ) external view returns (bool) {
        return forbiddenPairs[tokenA][tokenB];
    }

    function canBreedPair(
        uint256 parentA,
        uint256 parentB
    ) external view returns (bool, string memory reason) {
        if (paused) return (false, "Contract paused");
        if (parentA == parentB) return (false, "Cannot breed with self");
        if (!agentNFT.exists(parentA))
            return (false, "Parent A does not exist");
        if (!agentNFT.exists(parentB))
            return (false, "Parent B does not exist");
        if (forbiddenPairs[parentA][parentB]) return (false, "Forbidden pair");
        if (!this.canBreed(parentA)) return (false, "Parent A cannot breed");
        if (!this.canBreed(parentB)) return (false, "Parent B cannot breed");

        return (true, "Can breed");
    }

    // Emergency functions
    function pause() external onlyOwner {
        require(!paused, "Breeding: Already paused");
        paused = true;
        emit BreedingPaused();
    }

    function unpause() external onlyOwner {
        require(paused, "Breeding: Not paused");
        paused = false;
        emit BreedingUnpaused();
    }

    function emergencyWithdraw() external onlyOwner {
        require(paused, "Breeding: Contract must be paused");
        payable(owner()).transfer(address(this).balance);
    }

    // Batch operations for gas efficiency
    function batchCheckBreeding(
        uint256[] calldata tokenIds
    ) external view returns (bool[] memory canBreedResults) {
        canBreedResults = new bool[](tokenIds.length);
        for (uint i = 0; i < tokenIds.length; i++) {
            canBreedResults[i] = this.canBreed(tokenIds[i]);
        }
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

    // Prevent direct ETH deposits
    receive() external payable {
        require(false, "Breeding: Direct payments not accepted");
    }

    fallback() external payable {
        require(false, "Breeding: Fallback not supported");
    }
}
