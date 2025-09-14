// frontend/pages/marketplace.tsx
import { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../lib/contract';
import AgentCard from '../components/AgentCard';
import { FiSearch, FiFilter, FiTrendingUp, FiClock, FiAward, FiZap, FiGrid, FiList } from 'react-icons/fi';

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
  image?: string;
  intelligence: number;
  responsiveness: number;
  training_hours: number;
}

export default function Marketplace() {
  const { address, isConnected } = useAccount();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [personalityFilter, setPersonalityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      // Show success notification instead of alert
    },
    onError: (error) => {
      console.error('Buy failed:', error);
      // Show error notification instead of alert
    },
  });

  // Apply filters and sorting
  useEffect(() => {
    let result = [...listings];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(listing => {
        const agent = generateMockAgent(listing.tokenId);
        return agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          agent.description.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Apply personality filter
    if (personalityFilter !== 'all') {
      result = result.filter(listing => {
        const agent = generateMockAgent(listing.tokenId);
        return agent.personality === personalityFilter;
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price.sub(b.price).toNumber());
        break;
      case 'price-high':
        result.sort((a, b) => b.price.sub(a.price).toNumber());
        break;
      case 'newest':
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        result.sort((a, b) => a.createdAt - b.createdAt);
        break;
    }

    setFilteredListings(result);
  }, [listings, searchQuery, sortBy, personalityFilter]);

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
    setFilteredListings(listingDetails);
    setLoading(false);
  };

  const handleBuyClick = (listing: Listing) => {
    if (!isConnected) {
      // Show connect wallet notification
      return;
    }

    if (listing.seller.toLowerCase() === address?.toLowerCase()) {
      // Show "can't buy your own" notification
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
      description: `A ${personality} AI agent specialized in conversational tasks and problem solving. Trained on diverse datasets for optimal performance.`,
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
      image: `https://picsum.photos/400/300?random=${tokenId}`,
      intelligence: Math.floor(Math.random() * 100),
      responsiveness: Math.floor(Math.random() * 100),
      training_hours: Math.floor(Math.random() * 500) + 100,
    };
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
              <FiZap className="text-white text-3xl" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">AI Agent Marketplace</h1>
          <p className="text-gray-400 mb-8">Connect your wallet to browse and purchase unique AI agents</p>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <p className="text-gray-300 mb-4">Please connect your wallet to access the marketplace</p>
            <div className="animate-pulse flex items-center justify-center">
              <div className="h-10 w-32 bg-blue-600/30 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-3">
            AI Agent Marketplace
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Discover, collect, and trade unique AI agents with specialized personalities and capabilities
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-blue-500/30 transition-all">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg mr-3">
                <FiTrendingUp className="text-blue-400 text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-white">Active Listings</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">{listings.length}</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-green-500/30 transition-all">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-green-500/10 rounded-lg mr-3">
                <FiAward className="text-green-400 text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-white">Floor Price</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">
              {listings.length > 0
                ? ethers.utils.formatEther(listings.reduce((min, listing) =>
                  listing.price.lt(min) ? listing.price : min, listings[0]?.price || ethers.BigNumber.from(0)
                )) + ' AVAX'
                : '-- AVAX'
              }
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-purple-500/30 transition-all">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg mr-3">
                <FiClock className="text-purple-400 text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-white">Total Volume</h3>
            </div>
            <p className="text-3xl font-bold text-purple-400">-- AVAX</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-8 bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Search agents by name or description..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <select
                className="bg-gray-800/50 border border-gray-700/50 rounded-lg text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>

              <select
                className="bg-gray-800/50 border border-gray-700/50 rounded-lg text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                value={personalityFilter}
                onChange={(e) => setPersonalityFilter(e.target.value)}
              >
                <option value="all">All Personalities</option>
                <option value="friendly">Friendly</option>
                <option value="curious">Curious</option>
                <option value="cautious">Cautious</option>
                <option value="pragmatic">Pragmatic</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-800/50 rounded-lg p-1 border border-gray-700/50">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
                >
                  <FiGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
                >
                  <FiList size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-6"}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 animate-pulse">
                <div className="h-48 bg-gray-700/50 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-700/50 rounded mb-3"></div>
                <div className="h-3 bg-gray-700/50 rounded w-2/3 mb-4"></div>
                <div className="h-10 bg-gray-700/50 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50">
            <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiSearch className="text-gray-500 text-2xl" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">No agents found</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              {searchQuery || personalityFilter !== 'all'
                ? 'Try adjusting your search or filters to find more agents.'
                : 'Be the first to list your AI agent on the marketplace!'
              }
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              const agent = generateMockAgent(listing.tokenId);
              const isOwnListing = listing.seller.toLowerCase() === address?.toLowerCase();

              return (
                <div
                  key={listing.listingId}
                  className="group bg-gray-800/30 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5"
                >
                  <div className="relative overflow-hidden rounded-lg mb-4">
                    <img
                      src={agent.image}
                      alt={agent.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${agent.personality === 'friendly' ? 'bg-green-500/20 text-green-300' :
                          agent.personality === 'curious' ? 'bg-yellow-500/20 text-yellow-300' :
                            agent.personality === 'cautious' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-purple-500/20 text-purple-300'
                        }`}>
                        {agent.personality.charAt(0).toUpperCase() + agent.personality.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* AgentCard Integration */}
                  <AgentCard
                    agent={agent}
                    tokenId={listing.tokenId.toString()}
                    showDetails={false}
                  />

                  {/* Price and Buy Button */}
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Price</p>
                      <p className="text-xl font-bold text-white">
                        {ethers.utils.formatEther(listing.price)} AVAX
                      </p>
                    </div>
                    <button
                      onClick={() => handleBuyClick(listing)}
                      disabled={isOwnListing || isBuying}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${isOwnListing
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : isBuying
                            ? 'bg-blue-600/50 text-white animate-pulse'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                      {isOwnListing ? 'Your Listing' : isBuying ? 'Processing...' : 'Buy Now'}
                    </button>
                  </div>

                  {/* Listing Info */}
                  <div className="mt-3 text-sm text-gray-400">
                    <p>Expires: {new Date(listing.expiresAt).toLocaleDateString()}</p>
                    <p>Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredListings.map((listing) => {
              const agent = generateMockAgent(listing.tokenId);
              const isOwnListing = listing.seller.toLowerCase() === address?.toLowerCase();

              return (
                <div
                  key={listing.listingId}
                  className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0 w-full md:w-48">
                      <img
                        src={agent.image}
                        alt={agent.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <AgentCard
                        agent={agent}
                        tokenId={listing.tokenId.toString()}
                        showDetails={false}
                      />
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Price</p>
                          <p className="text-xl font-bold text-white">
                            {ethers.utils.formatEther(listing.price)} AVAX
                          </p>
                        </div>
                        <button
                          onClick={() => handleBuyClick(listing)}
                          disabled={isOwnListing || isBuying}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${isOwnListing
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : isBuying
                                ? 'bg-blue-600/50 text-white animate-pulse'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                          {isOwnListing ? 'Your Listing' : isBuying ? 'Processing...' : 'Buy Now'}
                        </button>
                      </div>
                      <div className="mt-3 text-sm text-gray-400">
                        <p>Expires: {new Date(listing.expiresAt).toLocaleDateString()}</p>
                        <p>Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Buy Modal */}
        {showBuyModal && selectedListing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700/50">
              <h2 className="text-2xl font-bold text-white mb-4">Confirm Purchase</h2>
              <div className="mb-4">
                <p className="text-gray-300 mb-2">Agent: {generateMockAgent(selectedListing.tokenId).name}</p>
                <p className="text-gray-300 mb-2">Price: {ethers.utils.formatEther(selectedListing.price)} AVAX</p>
                <p className="text-gray-300">Seller: {selectedListing.seller.slice(0, 6)}...{selectedListing.seller.slice(-4)}</p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowBuyModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBuyConfirm}
                  disabled={isBuying}
                  className={`px-4 py-2 rounded-lg ${isBuying
                      ? 'bg-blue-600/50 text-white animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
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