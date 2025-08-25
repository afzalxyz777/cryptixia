// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentNFT.sol";

contract Marketplace {
    AgentNFT public agentNFT;

    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price; // in wei
    }

    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Bought(uint256 indexed tokenId, address indexed buyer, uint256 price);

    constructor(address _agentNFT) {
        agentNFT = AgentNFT(_agentNFT);
    }

    // List an NFT for sale
    function list(uint256 tokenId, uint256 price) external {
        require(agentNFT.ownerOf(tokenId) == msg.sender, "Not owner");
        listings[tokenId] = Listing(msg.sender, tokenId, price);
        emit Listed(tokenId, msg.sender, price);
    }

    // Buy an NFT
    function buy(uint256 tokenId) external payable {
        Listing memory item = listings[tokenId];
        require(item.price > 0, "Not for sale");
        require(msg.value >= item.price, "Insufficient payment");

        // Transfer NFT to buyer
        agentNFT.safeTransferFrom(item.seller, msg.sender, tokenId);

        // Transfer funds to seller
        payable(item.seller).transfer(msg.value);

        // Clear listing
        delete listings[tokenId];

        emit Bought(tokenId, msg.sender, item.price);
    }
}
