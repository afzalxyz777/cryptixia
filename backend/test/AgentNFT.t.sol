// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AgentNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 public nextTokenId;

    // Mapping tokenId -> memory hash (points to off-chain memory integrity proof)
    mapping(uint256 => string) private _memoryHashes;

    // Memory logging for audit trail
    mapping(uint256 => bytes32[]) private _memoryAuditLog;

    // Agent traits storage
    mapping(uint256 => string[]) private _agentTraits;
    mapping(uint256 => string) private _agentAvatarHash;

    // Gas optimization: Pack multiple values into single storage slot where possible
    struct AgentMetadata {
        uint128 creationTime;
        uint128 lastUpdate;
    }

    mapping(uint256 => AgentMetadata) private _agentMetadata;

    // Access control: Authorized minters (for breeding contract, etc.)
    mapping(address => bool) public authorizedMinters;

    // Security: Max traits per agent to prevent gas attacks
    uint256 public constant MAX_TRAITS_PER_AGENT = 20;
    uint256 public constant MAX_MEMORY_LOGS_PER_AGENT = 1000;

    // Events
    event AgentMinted(uint256 indexed tokenId, address indexed owner, string tokenUri);
    event MemoryHashSet(uint256 indexed tokenId, string memoryHash);
    event MemoryLogged(uint256 indexed tokenId, bytes32 indexed hash, uint256 timestamp);
    event MemoryForgotten(uint256 indexed tokenId, bytes32 indexed hash, uint256 timestamp);
    event TraitsUpdated(uint256 indexed tokenId, string[] traits);
    event AvatarUpdated(uint256 indexed tokenId, string avatarHash);
    event AuthorizedMinterAdded(address indexed minter);
    event AuthorizedMinterRemoved(address indexed minter);

    constructor() ERC721("AgentNFT", "AGNT") Ownable(msg.sender) {}

    modifier onlyOwnerOrAuthorized() {
        require(msg.sender == owner() || authorizedMinters[msg.sender], "AgentNFT: Not authorized");
        _;
    }

    modifier validTokenId(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "AgentNFT: Token does not exist");
        _;
    }

    modifier onlyTokenOwnerOrApproved(uint256 tokenId) {
        address tokenOwner = ownerOf(tokenId);
        require(
            msg.sender == tokenOwner || msg.sender == owner() || getApproved(tokenId) == msg.sender
                || isApprovedForAll(tokenOwner, msg.sender),
            "AgentNFT: Not authorized"
        );
        _;
    }

    // Add/remove authorized minters (for breeding contract)
    function addAuthorizedMinter(address minter) external onlyOwner {
        require(minter != address(0), "AgentNFT: Invalid minter address");
        authorizedMinters[minter] = true;
        emit AuthorizedMinterAdded(minter);
    }

    function removeAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit AuthorizedMinterRemoved(minter);
    }

    // Mint a new Agent NFT - only owner or authorized minters
    function mint(address to, string memory tokenUri) external onlyOwnerOrAuthorized nonReentrant {
        require(to != address(0), "AgentNFT: Mint to zero address");
        require(bytes(tokenUri).length > 0, "AgentNFT: Empty token URI");

        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);

        // Set metadata
        _agentMetadata[tokenId] =
            AgentMetadata({creationTime: uint128(block.timestamp), lastUpdate: uint128(block.timestamp)});

        emit AgentMinted(tokenId, to, tokenUri);
        nextTokenId++;
    }

    // Public mint function with traits initialization and payment (optional)
    function publicMint(string memory tokenUri, string[] memory initialTraits) external payable nonReentrant {
        require(bytes(tokenUri).length > 0, "AgentNFT: Empty token URI");
        require(initialTraits.length <= MAX_TRAITS_PER_AGENT, "AgentNFT: Too many traits");

        uint256 tokenId = nextTokenId;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenUri);

        // Set initial traits
        _agentTraits[tokenId] = initialTraits;

        // Set metadata
        _agentMetadata[tokenId] =
            AgentMetadata({creationTime: uint128(block.timestamp), lastUpdate: uint128(block.timestamp)});

        emit AgentMinted(tokenId, msg.sender, tokenUri);
        emit TraitsUpdated(tokenId, initialTraits);
        nextTokenId++;
    }

    // Set or update memory hash for a given tokenId with reentrancy protection
    function setMemoryHash(uint256 tokenId, string memory hash)
        external
        validTokenId(tokenId)
        onlyTokenOwnerOrApproved(tokenId)
        nonReentrant
    {
        require(bytes(hash).length > 0, "AgentNFT: Empty memory hash");

        _memoryHashes[tokenId] = hash;
        _agentMetadata[tokenId].lastUpdate = uint128(block.timestamp);

        emit MemoryHashSet(tokenId, hash);
    }

    // Set agent traits with validation
    function setTraits(uint256 tokenId, string[] memory traits)
        external
        validTokenId(tokenId)
        onlyTokenOwnerOrApproved(tokenId)
        nonReentrant
    {
        require(traits.length <= MAX_TRAITS_PER_AGENT, "AgentNFT: Too many traits");

        // Validate trait strings are not empty
        for (uint256 i = 0; i < traits.length; i++) {
            require(bytes(traits[i]).length > 0, "AgentNFT: Empty trait");
        }

        _agentTraits[tokenId] = traits;
        _agentMetadata[tokenId].lastUpdate = uint128(block.timestamp);

        emit TraitsUpdated(tokenId, traits);
    }

    // Set avatar hash with validation
    function setAvatarHash(uint256 tokenId, string memory avatarHash)
        external
        validTokenId(tokenId)
        onlyTokenOwnerOrApproved(tokenId)
        nonReentrant
    {
        require(bytes(avatarHash).length > 0, "AgentNFT: Empty avatar hash");

        _agentAvatarHash[tokenId] = avatarHash;
        _agentMetadata[tokenId].lastUpdate = uint128(block.timestamp);

        emit AvatarUpdated(tokenId, avatarHash);
    }

    // Log memory hash for audit trail with limits
    function logMemoryHash(uint256 tokenId, bytes32 hash)
        external
        validTokenId(tokenId)
        onlyTokenOwnerOrApproved(tokenId)
        nonReentrant
    {
        require(hash != bytes32(0), "AgentNFT: Invalid hash");
        require(_memoryAuditLog[tokenId].length < MAX_MEMORY_LOGS_PER_AGENT, "AgentNFT: Memory log limit reached");

        _memoryAuditLog[tokenId].push(hash);
        emit MemoryLogged(tokenId, hash, block.timestamp);
    }

    // Log memory deletion for audit trail
    function logMemoryForgotten(uint256 tokenId, bytes32 hash)
        external
        validTokenId(tokenId)
        onlyTokenOwnerOrApproved(tokenId)
        nonReentrant
    {
        require(hash != bytes32(0), "AgentNFT: Invalid hash");
        emit MemoryForgotten(tokenId, hash, block.timestamp);
    }

    // View functions
    function getMemoryHash(uint256 tokenId) external view validTokenId(tokenId) returns (string memory) {
        return _memoryHashes[tokenId];
    }

    function getTraits(uint256 tokenId) external view validTokenId(tokenId) returns (string[] memory) {
        return _agentTraits[tokenId];
    }

    function getAvatarHash(uint256 tokenId) external view validTokenId(tokenId) returns (string memory) {
        return _agentAvatarHash[tokenId];
    }

    function getMemoryAuditLog(uint256 tokenId) external view validTokenId(tokenId) returns (bytes32[] memory) {
        return _memoryAuditLog[tokenId];
    }

    function getMemoryAuditLogCount(uint256 tokenId) external view validTokenId(tokenId) returns (uint256) {
        return _memoryAuditLog[tokenId].length;
    }

    function getAgentMetadata(uint256 tokenId)
        external
        view
        validTokenId(tokenId)
        returns (uint128 creationTime, uint128 lastUpdate)
    {
        AgentMetadata memory metadata = _agentMetadata[tokenId];
        return (metadata.creationTime, metadata.lastUpdate);
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // Gas optimization: Batch operations
    function getMultipleTraits(uint256[] calldata tokenIds) external view returns (string[][] memory) {
        string[][] memory results = new string[][](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (_ownerOf(tokenIds[i]) != address(0)) {
                results[i] = _agentTraits[tokenIds[i]];
            }
        }
        return results;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "http://localhost:3001/metadata/";
    }

    // Emergency functions
    function pause() external onlyOwner {
        // Implementation would depend on having a Pausable contract
        // For now, this is a placeholder for emergency stops
    }

    // Upgrade safety: Prevent accidental burning
    function burn(uint256 /*tokenId*/ ) external pure {
        require(false, "AgentNFT: Burning not allowed");
    }
}
