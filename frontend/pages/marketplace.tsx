// frontend/pages/marketplace.tsx
import { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../lib/contract';
import AgentCard from '../components/AgentCard';

interface Listing {
  listingId: number;
  tokenId: number;
  seller: string;
  price: ethers.BigNumber;
  active: boolean;
  createdAt: number;
  expiresAt: number;
}

interface AgentMetadata {
  name: string;
  description: string;
  personality: string;
  traits: {
    personality: string;
    curious: boolean;
    friendly: boolean;
    cautious: boolean;
    pragmatic: boolean;
  };
  memory_uri: string;
  created_at: string;
}

export default function Marketplace() {
  const { address, isConnected } = useAccount();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);

  // Get active listings from contract
  const { data: activeListingIds, refetch: refetchListings } = useContractRead({
    address: MARKETPLACE_ADDRESS as `0x${string}`,
    abi: MARKETPLACE_ABI,
    functionName: 'getAllActiveListings',
    enabled: isConnected,
  });

  // Prepare buy transaction with ethers.js BigNumber
  const listingIdBN = selectedListing ? ethers.BigNumber.from(selectedListing.listingId) : undefined;
  
  const { config: buyConfig } = usePrepareContractWrite({
    address: MARKETPLACE_ADDRESS as `0x${string}`,
    abi: MARKETPLACE_ABI,
    functionName: 'buy',
    args: listingIdBN ? [listingIdBN] : undefined,
    overrides: selectedListing ? { value: selectedListing.price } : undefined,
    enabled: !!selectedListing,
  });

  const { write: buyAgent, isLoading: isBuying } = useContractWrite({
    ...buyConfig,
    onSuccess: () => {
      setShowBuyModal(false);
      setSelectedListing(null);
      refetchListings();
      alert('Agent purchased successfully!');
    },
    onError: (error) => {
      console.error('Buy failed:', error);
      alert('Purchase failed. Please try again.');
    },
  });

  // Fetch listing details
  useEffect(() => {
    if (activeListingIds && Array.isArray(activeListingIds)) {
      // Convert BigNumber array to number array for processing
      const listingIds = (activeListingIds as ethers.BigNumber[]).map(id => id.toNumber());
      fetchListingDetails(listingIds);
    }
  }, [activeListingIds]);

  const fetchListingDetails = async (listingIds: number[]) => {
    setLoading(true);
    const listingDetails: Listing[] = [];

    for (const listingId of listingIds) {
      try {
        // In a real app, you'd call contract methods to get listing details
        // For now, we'll create mock data
        const mockListing: Listing = {
          listingId: Number(listingId),
          tokenId: Number(listingId) + 1,
          seller: `0x${Math.random().toString(16).substr(2, 40)}`,
          price: ethers.utils.parseEther((Math.random() * 0.5 + 0.1).toFixed(3)),
          active: true,
          createdAt: Date.now() - Math.random() * 86400000,
          expiresAt: Date.now() + 86400000 * 30,
        };
        listingDetails.push(mockListing);
      } catch (error) {
        console.error(`Failed to fetch listing ${listingId}:`, error);
      }
    }

    setListings(listingDetails);
    setLoading(false);
  };

  const handleBuyClick = (listing: Listing) => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (listing.seller.toLowerCase() === address?.toLowerCase()) {
      alert('You cannot buy your own listing');
      return;
    }

    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  const handleBuyConfirm = () => {
    if (buyAgent) {
      buyAgent();
    }
  };

  const generateMockAgent = (tokenId: number): AgentMetadata => {
    const personalities = ['friendly', 'curious', 'cautious', 'pragmatic'];
    const personality = personalities[tokenId % personalities.length];
    
    return {
      name: `Cryptixia Agent #${tokenId}`,
      description: `A ${personality} AI agent ready for new adventures`,
      personality,
      traits: {
        personality,
        curious: personality === 'curious',
        friendly: personality === 'friendly',
        cautious: personality === 'cautious',
        pragmatic: personality === 'pragmatic',
      },
      memory_uri: `memory://agent_${tokenId}_hash`,
      created_at: new Date().toISOString(),
    };
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Agent Marketplace</h1>
          <p className="text-gray-400 mb-6">Connect your wallet to browse and buy agents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Agent Marketplace</h1>
          <p className="text-gray-400">Discover and collect unique AI agents</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Active Listings</h3>
            <p className="text-3xl font-bold text-blue-400">{listings.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Floor Price</h3>
            <p className="text-3xl font-bold text-green-400">
              {listings.length > 0 
                ? ethers.utils.formatEther(listings.reduce((min, listing) => 
                    listing.price.lt(min) ? listing.price : min, listings[0]?.price || ethers.BigNumber.from(0)
                  )) + ' AVAX'
                : '-- AVAX'
              }
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Total Volume</h3>
            <p className="text-3xl font-bold text-purple-400">-- AVAX</p>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="text-center text-white">
            <p>Loading marketplace...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <h2 className="text-2xl mb-4">No agents for sale</h2>
            <p>Be the first to list your agent!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.listingId} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                <AgentCard
                  agent={generateMockAgent(listing.tokenId)}
                  tokenId={listing.tokenId.toString()}
                  showDetails={false}
                />
                
                {/* Listing Info */}
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-400 text-sm">Current Price</span>
                    <span className="text-2xl font-bold text-white">
                      {ethers.utils.formatEther(listing.price)} AVAX
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-400 text-sm">Seller</span>
                    <span className="text-blue-400 text-sm font-mono">
                      {`${listing.seller.slice(0, 6)}...${listing.seller.slice(-4)}`}
                    </span>
                  </div>

                  <button
                    onClick={() => handleBuyClick(listing)}
                    disabled={listing.seller.toLowerCase() === address?.toLowerCase()}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      listing.seller.toLowerCase() === address?.toLowerCase()
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {listing.seller.toLowerCase() === address?.toLowerCase() 
                      ? 'Your Listing' 
                      : 'Buy Now'
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Buy Modal */}
        {showBuyModal && selectedListing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">Confirm Purchase</h2>
              
              <div className="mb-6">
                <p className="text-gray-400 mb-2">You are about to buy:</p>
                <p className="text-white font-semibold">Agent #{selectedListing.tokenId}</p>
                <p className="text-2xl font-bold text-blue-400 mt-2">
                  {ethers.utils.formatEther(selectedListing.price)} AVAX
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowBuyModal(false)}
                  className="flex-1 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  disabled={isBuying}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBuyConfirm}
                  disabled={isBuying}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {isBuying ? 'Processing...' : 'Confirm Purchase'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}