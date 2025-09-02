// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
    }

    IERC721 public immutable agentNFT;

    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;
    uint256 public marketplaceFee = 250; // 2.5% in basis points

    event AgentListed(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 price);
    event AgentSold(
        uint256 indexed listingId, uint256 indexed tokenId, address indexed buyer, address seller, uint256 price
    );
    event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId);

    constructor(address _agentNFT) Ownable(msg.sender) {
        agentNFT = IERC721(_agentNFT);
    }

    function list(uint256 tokenId, uint256 price) external returns (uint256 listingId) {
        require(agentNFT.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(price > 0, "Price must be greater than 0");
        require(
            agentNFT.isApprovedForAll(msg.sender, address(this)) || agentNFT.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );

        listingId = nextListingId++;
        listings[listingId] = Listing({tokenId: tokenId, seller: msg.sender, price: price, active: true});

        emit AgentListed(listingId, tokenId, msg.sender, price);
    }

    function buy(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");
        require(agentNFT.ownerOf(listing.tokenId) == listing.seller, "Seller no longer owns token");

        listing.active = false;

        // Calculate fees
        uint256 fee = (listing.price * marketplaceFee) / 10000;
        uint256 sellerAmount = listing.price - fee;

        // Transfer NFT
        agentNFT.safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        // Transfer payments
        (bool success,) = payable(listing.seller).call{value: sellerAmount}("");
        require(success, "Transfer to seller failed");

        // Refund excess payment
        if (msg.value > listing.price) {
            (bool refundSuccess,) = payable(msg.sender).call{value: msg.value - listing.price}("");
            require(refundSuccess, "Refund failed");
        }

        emit AgentSold(listingId, listing.tokenId, msg.sender, listing.seller, listing.price);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not listing owner");
        require(listing.active, "Listing not active");

        listing.active = false;
        emit ListingCancelled(listingId, listing.tokenId);
    }

    function getActiveListing(uint256 listingId) external view returns (Listing memory) {
        require(listings[listingId].active, "Listing not active");
        return listings[listingId];
    }

    function getAllActiveListings() external view returns (uint256[] memory activeListingIds) {
        uint256 activeCount = 0;

        // Count active listings
        for (uint256 i = 0; i < nextListingId; i++) {
            if (listings[i].active) {
                activeCount++;
            }
        }

        // Create array of active listing IDs
        activeListingIds = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < nextListingId; i++) {
            if (listings[i].active) {
                activeListingIds[index] = i;
                index++;
            }
        }
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool success,) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    function setMarketplaceFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        marketplaceFee = _fee;
    }
}
