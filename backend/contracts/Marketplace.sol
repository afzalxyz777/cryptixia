// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentNFT.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Marketplace is ReentrancyGuard {
    AgentNFT public agentNFT;

    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Listing) public listings;

    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);

    constructor(address _agentNFT) {
        agentNFT = AgentNFT(_agentNFT);
    }

    function list(uint256 tokenId, uint256 price) external {
        require(agentNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");
        require(
            agentNFT.getApproved(tokenId) == address(this) ||
                agentNFT.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        listings[tokenId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true
        });

        emit NFTListed(tokenId, msg.sender, price);
    }

    function buy(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.active, "NFT not for sale");
        require(msg.value == listing.price, "Incorrect payment amount");
        require(
            agentNFT.ownerOf(tokenId) == listing.seller,
            "Seller no longer owns NFT"
        );

        // Mark as inactive first
        listings[tokenId].active = false;

        // Transfer NFT
        agentNFT.safeTransferFrom(listing.seller, msg.sender, tokenId);

        // Transfer payment
        (bool success, ) = listing.seller.call{value: msg.value}("");
        require(success, "Payment transfer failed");

        emit NFTSold(tokenId, listing.seller, msg.sender, listing.price);
    }

    function cancelListing(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not your listing");
        require(listings[tokenId].active, "Listing not active");

        listings[tokenId].active = false;
        emit ListingCancelled(tokenId, msg.sender);
    }

    function getListing(
        uint256 tokenId
    ) external view returns (Listing memory) {
        return listings[tokenId];
    }
}
