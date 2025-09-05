// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/Marketplace.sol";
import "../contracts/AgentNFT.sol";

contract MarketplaceTest is Test {
    Marketplace marketplace;
    AgentNFT agentNFT;

    address owner = address(0x1);
    address seller = address(0x2);
    address buyer = address(0x3);

    function setUp() public {
        vm.startPrank(owner);

        // Deploy AgentNFT contract (no constructor parameters)
        agentNFT = new AgentNFT();

        // Deploy Marketplace
        marketplace = new Marketplace(address(agentNFT));

        vm.stopPrank();
    }

    function testListAndBuy() public {
        // Setup: mint NFT to seller using the mint function
        vm.startPrank(owner);
        agentNFT.mint(seller, "ipfs://test-metadata");
        vm.stopPrank();

        uint256 tokenId = 0;
        uint256 price = 1 ether;
        uint256 duration = 0; // 0 means use default duration

        // Seller approves marketplace
        vm.startPrank(seller);
        agentNFT.setApprovalForAll(address(marketplace), true);

        // List NFT with duration parameter
        uint256 listingId = marketplace.list(tokenId, price, duration);

        // Verify listing
        Marketplace.Listing memory listing = marketplace.getActiveListing(
            listingId
        );
        assertEq(listing.tokenId, tokenId);
        assertEq(listing.seller, seller);
        assertEq(listing.price, price);
        assertTrue(listing.active);
        vm.stopPrank();

        // Buyer purchases
        vm.deal(buyer, 2 ether);
        vm.startPrank(buyer);

        uint256 buyerBalanceBefore = buyer.balance;
        uint256 sellerBalanceBefore = seller.balance;

        marketplace.buy{value: price}(listingId);

        // Verify ownership transfer
        assertEq(agentNFT.ownerOf(tokenId), buyer);

        // Verify payment (minus 2.5% fee)
        uint256 expectedFee = (price * 250) / 10000;
        uint256 expectedSellerAmount = price - expectedFee;
        assertEq(seller.balance, sellerBalanceBefore + expectedSellerAmount);
        assertEq(buyer.balance, buyerBalanceBefore - price);

        // Verify listing is inactive
        vm.expectRevert("Marketplace: Listing not active");
        marketplace.getActiveListing(listingId);

        vm.stopPrank();
    }

    function testListRequiresOwnership() public {
        vm.startPrank(owner);
        agentNFT.mint(seller, "ipfs://test-metadata");
        vm.stopPrank();

        uint256 tokenId = 0;
        uint256 price = 1 ether;
        uint256 duration = 0;

        // Non-owner tries to list
        vm.startPrank(buyer);
        vm.expectRevert("Marketplace: Not token owner");
        marketplace.list(tokenId, price, duration);
        vm.stopPrank();
    }

    function testListRequiresApproval() public {
        vm.startPrank(owner);
        agentNFT.mint(seller, "ipfs://test-metadata");
        vm.stopPrank();

        uint256 tokenId = 0;
        uint256 price = 1 ether;
        uint256 duration = 0;

        // Seller tries to list without approval
        vm.startPrank(seller);
        vm.expectRevert("Marketplace: Contract not approved");
        marketplace.list(tokenId, price, duration);
        vm.stopPrank();
    }

    function testBuyRequiresActiveListingAndSufficientPayment() public {
        vm.startPrank(owner);
        agentNFT.mint(seller, "ipfs://test-metadata");
        vm.stopPrank();

        vm.startPrank(seller);
        agentNFT.setApprovalForAll(address(marketplace), true);
        uint256 listingId = marketplace.list(0, 1 ether, 0);
        vm.stopPrank();

        vm.deal(buyer, 0.5 ether);
        vm.startPrank(buyer);

        // Try to buy with insufficient funds
        vm.expectRevert("Marketplace: Insufficient payment");
        marketplace.buy{value: 0.5 ether}(listingId);

        vm.stopPrank();
    }

    function testCancelListing() public {
        vm.startPrank(owner);
        agentNFT.mint(seller, "ipfs://test-metadata");
        vm.stopPrank();

        vm.startPrank(seller);
        agentNFT.setApprovalForAll(address(marketplace), true);
        uint256 listingId = marketplace.list(0, 1 ether, 0);

        // Cancel listing
        marketplace.cancelListing(listingId);

        // Verify listing is inactive
        vm.expectRevert("Marketplace: Listing not active");
        marketplace.getActiveListing(listingId);

        vm.stopPrank();
    }

    function testGetAllActiveListings() public {
        vm.startPrank(owner);
        agentNFT.mint(seller, "ipfs://test-metadata-1");
        agentNFT.mint(seller, "ipfs://test-metadata-2");
        agentNFT.mint(seller, "ipfs://test-metadata-3");
        vm.stopPrank();

        vm.startPrank(seller);
        agentNFT.setApprovalForAll(address(marketplace), true);

        // List multiple NFTs with duration parameter
        marketplace.list(0, 1 ether, 0);
        marketplace.list(1, 2 ether, 0);
        marketplace.list(2, 3 ether, 0);

        uint256[] memory activeListings = marketplace.getAllActiveListings();
        assertEq(activeListings.length, 3);
        assertEq(activeListings[0], 0);
        assertEq(activeListings[1], 1);
        assertEq(activeListings[2], 2);

        vm.stopPrank();
    }

    function testRefundExcessPayment() public {
        vm.startPrank(owner);
        agentNFT.mint(seller, "ipfs://test-metadata");
        vm.stopPrank();

        vm.startPrank(seller);
        agentNFT.setApprovalForAll(address(marketplace), true);
        uint256 listingId = marketplace.list(0, 1 ether, 0);
        vm.stopPrank();

        vm.deal(buyer, 2 ether);
        vm.startPrank(buyer);

        uint256 buyerBalanceBefore = buyer.balance;
        marketplace.buy{value: 1.5 ether}(listingId); // Overpay by 0.5 ether

        // Should receive 0.5 ether refund
        assertEq(buyer.balance, buyerBalanceBefore - 1 ether);

        vm.stopPrank();
    }

    // Additional test for public mint functionality
    function testPublicMintAndList() public {
        // Use public mint with traits
        string[] memory traits = new string[](2);
        traits[0] = "Smart";
        traits[1] = "Friendly";

        vm.startPrank(seller);
        agentNFT.publicMint("ipfs://public-metadata", traits);

        uint256 tokenId = 0;
        uint256 price = 1 ether;
        uint256 duration = 0;

        // Seller approves marketplace and lists
        agentNFT.setApprovalForAll(address(marketplace), true);
        uint256 listingId = marketplace.list(tokenId, price, duration);

        // Verify listing works with publicly minted NFT
        Marketplace.Listing memory listing = marketplace.getActiveListing(
            listingId
        );
        assertEq(listing.tokenId, tokenId);
        assertEq(listing.seller, seller);
        assertEq(listing.price, price);
        assertTrue(listing.active);

        vm.stopPrank();
    }

    // Test with specific duration
    function testListWithCustomDuration() public {
        vm.startPrank(owner);
        agentNFT.mint(seller, "ipfs://test-metadata");
        vm.stopPrank();

        uint256 tokenId = 0;
        uint256 price = 1 ether;
        uint256 duration = 7 days; // Custom 7-day duration

        vm.startPrank(seller);
        agentNFT.setApprovalForAll(address(marketplace), true);
        uint256 listingId = marketplace.list(tokenId, price, duration);

        // Verify listing has correct expiration time
        Marketplace.Listing memory listing = marketplace.getActiveListing(
            listingId
        );
        assertEq(listing.expiresAt, block.timestamp + duration);

        vm.stopPrank();
    }

    // Test duration validation
    function testListWithInvalidDuration() public {
        vm.startPrank(owner);
        agentNFT.mint(seller, "ipfs://test-metadata");
        vm.stopPrank();

        uint256 tokenId = 0;
        uint256 price = 1 ether;
        uint256 duration = 400 days; // Exceeds MAX_LISTING_DURATION (365 days)

        vm.startPrank(seller);
        agentNFT.setApprovalForAll(address(marketplace), true);

        vm.expectRevert("Marketplace: Duration too long");
        marketplace.list(tokenId, price, duration);

        vm.stopPrank();
    }
}
