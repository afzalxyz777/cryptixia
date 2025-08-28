// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AgentNFT is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    // Mapping tokenId -> memory hash (points to off-chain memory integrity proof)
    mapping(uint256 => string) private _memoryHashes;

    // Events
    event AgentMinted(uint256 indexed tokenId, address indexed owner, string tokenUri);
    event MemoryHashSet(uint256 indexed tokenId, string memoryHash);

    constructor() ERC721("AgentNFT", "AGNT") Ownable(msg.sender) {}

    // Mint a new Agent NFT to `to` with metadata URI
    // Mint a new Agent NFT to `to` with metadata URI
    function mint(address to, string memory tokenUri) external onlyOwner {
        _safeMint(to, nextTokenId);
        _setTokenURI(nextTokenId, tokenUri);
        emit AgentMinted(nextTokenId, to, tokenUri);
        nextTokenId++;
    }

    // Add public mint function
    function publicMint(string memory tokenUri) external {
        _safeMint(msg.sender, nextTokenId);
        _setTokenURI(nextTokenId, tokenUri);
        emit AgentMinted(nextTokenId, msg.sender, tokenUri);
        nextTokenId++;
    }

    // Set or update memory hash for a given tokenId
    function setMemoryHash(uint256 tokenId, string memory hash) external {
        address tokenOwner = ownerOf(tokenId); // will revert if token does not exist

        require(
            msg.sender == tokenOwner || msg.sender == owner() || getApproved(tokenId) == msg.sender
                || isApprovedForAll(tokenOwner, msg.sender),
            "AgentNFT: Not authorized"
        );

        _memoryHashes[tokenId] = hash;
        emit MemoryHashSet(tokenId, hash);
    }

    // View memory hash for a tokenId
    function getMemoryHash(uint256 tokenId) external view returns (string memory) {
        // If token doesn't exist, ownerOf will revert
        ownerOf(tokenId);
        return _memoryHashes[tokenId];
    }
}
