// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
        uint256 createdAt;
        uint256 expiresAt; // 0 means never expires
    }

    IERC721 public immutable agentNFT;

    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;
    uint256 public marketplaceFee = 250; // 2.5% in basis points (100 = 1%)

    // Security limits
    uint256 public constant MAX_MARKETPLACE_FEE = 1000; // 10% maximum
    uint256 public constant MIN_LISTING_PRICE = 0.001 ether;
    uint256 public constant MAX_LISTING_DURATION = 365 days;
    uint256 public constant DEFAULT_LISTING_DURATION = 30 days;

    // Gas optimization: Track active listings count
    uint256 public activeListingsCount;

    // Security: Emergency pause
    bool public paused = false;

    event AgentListed(
        uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 price, uint256 expiresAt
    );
    event AgentSold(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price,
        uint256 fee
    );
    event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId);
    event ListingExpired(uint256 indexed listingId, uint256 indexed tokenId);
    event MarketplaceFeeUpdated(uint256 oldFee, uint256 newFee);
    event MarketplacePaused();
    event MarketplaceUnpaused();

    modifier notPaused() {
        require(!paused, "Marketplace: Contract is paused");
        _;
    }

    modifier validListing(uint256 listingId) {
        require(listingId < nextListingId, "Marketplace: Invalid listing ID");
        require(listings[listingId].active, "Marketplace: Listing not active");
        require(
            listings[listingId].expiresAt == 0 || block.timestamp <= listings[listingId].expiresAt,
            "Marketplace: Listing expired"
        );
        _;
    }

    constructor(address _agentNFT) Ownable(msg.sender) {
        require(_agentNFT != address(0), "Marketplace: Invalid NFT contract");
        agentNFT = IERC721(_agentNFT);
    }

    function list(uint256 tokenId, uint256 price, uint256 duration)
        external
        notPaused
        nonReentrant
        returns (uint256 listingId)
    {
        // Input validation
        require(price >= MIN_LISTING_PRICE, "Marketplace: Price too low");
        require(duration == 0 || duration <= MAX_LISTING_DURATION, "Marketplace: Duration too long");
        require(agentNFT.ownerOf(tokenId) == msg.sender, "Marketplace: Not token owner");

        // Check approval
        require(
            agentNFT.isApprovedForAll(msg.sender, address(this)) || agentNFT.getApproved(tokenId) == address(this),
            "Marketplace: Contract not approved"
        );

        // Calculate expiration
        uint256 expiresAt = duration == 0 ? 0 : block.timestamp + duration;
        if (duration == 0) {
            expiresAt = block.timestamp + DEFAULT_LISTING_DURATION;
        }

        listingId = nextListingId++;
        listings[listingId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });

        activeListingsCount++;

        emit AgentListed(listingId, tokenId, msg.sender, price, expiresAt);
    }

    function buy(uint256 listingId) external payable notPaused nonReentrant validListing(listingId) {
        Listing storage listing = listings[listingId];

        // Additional safety checks
        require(msg.sender != listing.seller, "Marketplace: Cannot buy own listing");
        require(msg.value >= listing.price, "Marketplace: Insufficient payment");
        require(agentNFT.ownerOf(listing.tokenId) == listing.seller, "Marketplace: Seller no longer owns token");

        // Mark as inactive first (reentrancy protection)
        listing.active = false;
        activeListingsCount--;

        // Calculate fees
        uint256 fee = (listing.price * marketplaceFee) / 10000;
        uint256 sellerAmount = listing.price - fee;

        // Transfer NFT first (following checks-effects-interactions pattern)
        agentNFT.safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        // Transfer payment to seller
        (bool sellerSuccess,) = payable(listing.seller).call{value: sellerAmount}("");
        require(sellerSuccess, "Marketplace: Transfer to seller failed");

        // Refund excess payment if any
        uint256 excess = msg.value - listing.price;
        if (excess > 0) {
            (bool refundSuccess,) = payable(msg.sender).call{value: excess}("");
            require(refundSuccess, "Marketplace: Refund failed");
        }

        emit AgentSold(listingId, listing.tokenId, msg.sender, listing.seller, listing.price, fee);
    }

    function cancelListing(uint256 listingId) external nonReentrant validListing(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Marketplace: Not listing owner");

        listing.active = false;
        activeListingsCount--;

        emit ListingCancelled(listingId, listing.tokenId);
    }

    // Clean up expired listings (can be called by anyone for gas efficiency)
    function cleanupExpiredListing(uint256 listingId) external {
        require(listingId < nextListingId, "Marketplace: Invalid listing ID");
        Listing storage listing = listings[listingId];

        require(listing.active, "Marketplace: Listing already inactive");
        require(listing.expiresAt > 0 && block.timestamp > listing.expiresAt, "Marketplace: Not expired");

        listing.active = false;
        activeListingsCount--;

        emit ListingExpired(listingId, listing.tokenId);
    }

    // Batch cleanup function for gas efficiency
    function batchCleanupExpiredListings(uint256[] calldata listingIds) external {
        for (uint256 i = 0; i < listingIds.length; i++) {
            uint256 listingId = listingIds[i];
            if (listingId < nextListingId) {
                Listing storage listing = listings[listingId];
                if (listing.active && listing.expiresAt > 0 && block.timestamp > listing.expiresAt) {
                    listing.active = false;
                    activeListingsCount--;
                    emit ListingExpired(listingId, listing.tokenId);
                }
            }
        }
    }

    // View functions
    function getActiveListing(uint256 listingId) external view returns (Listing memory) {
        require(listingId < nextListingId, "Marketplace: Invalid listing ID");
        Listing memory listing = listings[listingId];
        require(listing.active, "Marketplace: Listing not active");
        require(listing.expiresAt == 0 || block.timestamp <= listing.expiresAt, "Marketplace: Listing expired");
        return listing;
    }

    function getAllActiveListings() external view returns (uint256[] memory activeListingIds) {
        // Pre-allocate array with maximum possible size
        uint256[] memory tempArray = new uint256[](nextListingId);
        uint256 activeCount = 0;

        // Collect active, non-expired listings
        for (uint256 i = 0; i < nextListingId; i++) {
            Listing memory listing = listings[i];
            if (listing.active && (listing.expiresAt == 0 || block.timestamp <= listing.expiresAt)) {
                tempArray[activeCount] = i;
                activeCount++;
            }
        }

        // Create correctly sized return array
        activeListingIds = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            activeListingIds[i] = tempArray[i];
        }
    }

    function getActiveListingsCount() external view returns (uint256) {
        return activeListingsCount;
    }

    function getListingsByUser(address user) external view returns (uint256[] memory) {
        uint256[] memory tempArray = new uint256[](nextListingId);
        uint256 userListingCount = 0;

        for (uint256 i = 0; i < nextListingId; i++) {
            Listing memory listing = listings[i];
            if (
                listing.seller == user && listing.active
                    && (listing.expiresAt == 0 || block.timestamp <= listing.expiresAt)
            ) {
                tempArray[userListingCount] = i;
                userListingCount++;
            }
        }

        uint256[] memory userListings = new uint256[](userListingCount);
        for (uint256 i = 0; i < userListingCount; i++) {
            userListings[i] = tempArray[i];
        }

        return userListings;
    }

    // Admin functions with enhanced safety
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "Marketplace: No fees to withdraw");

        (bool success,) = payable(owner()).call{value: balance}("");
        require(success, "Marketplace: Withdrawal failed");
    }

    function setMarketplaceFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_MARKETPLACE_FEE, "Marketplace: Fee exceeds maximum");

        uint256 oldFee = marketplaceFee;
        marketplaceFee = _fee;

        emit MarketplaceFeeUpdated(oldFee, _fee);
    }

    // Emergency functions
    function pause() external onlyOwner {
        require(!paused, "Marketplace: Already paused");
        paused = true;
        emit MarketplacePaused();
    }

    function unpause() external onlyOwner {
        require(paused, "Marketplace: Not paused");
        paused = false;
        emit MarketplaceUnpaused();
    }

    // Emergency withdrawal function (only when paused)
    function emergencyWithdraw() external onlyOwner {
        require(paused, "Marketplace: Not paused");
        payable(owner()).transfer(address(this).balance);
    }

    // Receive function to accept payments (should not normally receive direct payments)
    receive() external payable {
        // Log unexpected payments
        require(false, "Marketplace: Direct payments not accepted");
    }
}
