// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import{ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AgentNFT is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    // Event emitted when a new Agent NFT is minted
    event AgentMinted(uint256 indexed tokenId, address indexed owner, string tokenUri);

    // Constructor sets NFT name, symbol and contract owner
    constructor() ERC721("AgentNFT", "AGNT") Ownable(msg.sender){
        // Ownable automatically sets msg.sender as owner
    }

    // Mint a new Agent NFT to address `to` with metadata URI
    function mint(address to, string memory tokenUri) external onlyOwner {
        _safeMint(to, nextTokenId);      // Mint token
        _setTokenURI(nextTokenId, tokenUri); // Set token metadata
        emit AgentMinted(nextTokenId, to, tokenUri); // Emit event
        nextTokenId++;                   // Increment ID for next mint
    }
}
