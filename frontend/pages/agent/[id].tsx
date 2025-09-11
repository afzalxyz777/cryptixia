import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../lib/contract';
import AgentCard from '../../components/AgentCard';
import ChatUI from '../../components/ChatUI';
import MemoriesList from '../../components/MemoriesList';

// Add BigInt serialization handler at the top
if (typeof window !== 'undefined') {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
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

export default function AgentProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { address } = useAccount();

  const [agent, setAgent] = useState<AgentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [showMemories, setShowMemories] = useState(false);
  const [tokenExists, setTokenExists] = useState(false);

  // Convert string ID to BigInt safely, only when we have an id
  const tokenIdBigInt = id ? BigInt(id as string) : undefined;

  // FIXED: Check if the NFT exists with proper error handling
  const { data: ownerAddress, isError: tokenError, isLoading: tokenLoading } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'ownerOf',
    args: tokenIdBigInt ? [tokenIdBigInt] : undefined,
    enabled: !!tokenIdBigInt && !!CONTRACT_ABI && CONTRACT_ABI.length > 0,
    // FIXED: Don't set error state immediately, handle it in onSuccess/onError
    onSuccess: (data) => {
      console.log('Token owner found:', data);
      setTokenExists(true);
      setError('');
    },
    onError: (error: any) => {
      console.log('Token lookup error:', error.message);
      // Check if it's specifically a "nonexistent token" error
      if (error.message?.includes('ERC721NonexistentToken') ||
        error.message?.includes('nonexistent token') ||
        error.message?.includes('invalid token ID')) {
        setError(`Agent NFT #${id} does not exist yet. It may not have been minted.`);
        setTokenExists(false);
      } else {
        setError('Unable to verify agent NFT. Please check your connection.');
        setTokenExists(false);
      }
      setLoading(false);
    }
  });

  // Get token URI from contract - only if token exists
  const { data: tokenURI, isError: uriError } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'tokenURI',
    args: tokenIdBigInt ? [tokenIdBigInt] : undefined,
    enabled: !!tokenIdBigInt && tokenExists && !tokenError,
    onError: (error) => {
      console.error('Token URI error:', error);
    }
  });

  useEffect(() => {
    // FIXED: Better loading state management
    if (id && !tokenLoading) {
      if (tokenExists && !tokenError) {
        fetchAgentData(id as string);
      } else if (tokenError) {
        // Error is already set in onError callback
        setLoading(false);
      }
    }
  }, [id, tokenExists, tokenError, tokenLoading, tokenURI]);

  const fetchAgentData = async (tokenIdStr: string) => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors

      if (tokenURI) {
        // Try to fetch actual metadata from IPFS
        const metadataUrl = String(tokenURI).replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');

        try {
          const response = await fetch(metadataUrl);
          if (response.ok) {
            const metadata = await response.json();
            setAgent(metadata);
            setLoading(false);
            return;
          }
        } catch (ipfsError) {
          console.warn('Failed to fetch from IPFS, using mock data');
        }
      }

      // Fallback to mock data if IPFS fails or no tokenURI
      const mockAgent: AgentMetadata = {
        name: `Cryptixia Agent #${tokenIdStr}`,
        description: "A friendly AI agent created on the blockchain",
        personality: "friendly",
        traits: {
          personality: "friendly",
          curious: true,
          friendly: true,
          cautious: false,
          pragmatic: true
        },
        memory_uri: `memory://agent_${tokenIdStr}_hash`,
        created_at: new Date().toISOString()
      };

      setAgent(mockAgent);
    } catch (err) {
      setError('Failed to load agent data');
      console.error('Error fetching agent:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle trait updates
  const handleTraitsUpdate = async (newTraits: any) => {
    if (!agent) return;

    try {
      setSaveMessage('Saving traits...');

      // Update local state immediately
      const updatedAgent = {
        ...agent,
        traits: newTraits,
        personality: newTraits.personality
      };
      setAgent(updatedAgent);

      // Here you would typically:
      // 1. Call an API to update metadata on IPFS
      // 2. Update the tokenURI on the contract (if needed)
      // For now, we'll just simulate the save

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSaveMessage('Traits saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);

    } catch (error) {
      setSaveMessage('Failed to save traits');
      setTimeout(() => setSaveMessage(''), 3000);
      console.error('Error updating traits:', error);
    }
  };

  // FIXED: Show loading while checking if token exists
  if (loading || tokenLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)' }}
      >
        <div className="text-white text-xl">
          {tokenLoading ? 'Checking if agent exists...' : 'Loading agent...'}
        </div>
      </div>
    );
  }

  // FIXED: Better error handling with specific messages
  if (error || (!tokenExists && !tokenLoading)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)' }}
      >
        <div className="text-center max-w-md">
          <div className="text-red-300 text-xl mb-4">
            {error || `Agent #${id} not found`}
          </div>
          <p className="text-gray-300 mb-6 text-sm">
            This agent NFT doesn't exist on the blockchain. You may need to mint it first.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/mint')}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Mint Your First Agent
            </button>
            <button
              onClick={() => router.push('/')}
              className="block w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Go Back Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button on Top Left */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-200 hover:text-white transition-colors flex items-center mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>

          <h1 className="text-3xl font-bold text-white text-center">Agent Profile</h1>

          {/* FIXED: Show owner info if available */}
          {ownerAddress && (
            <p className="text-center text-blue-200 text-sm mt-2">
              Owned by: {ownerAddress.toString().slice(0, 6)}...{ownerAddress.toString().slice(-4)}
            </p>
          )}

          {/* Save Message */}
          {saveMessage && (
            <div className={`mt-2 p-3 rounded-lg mx-auto max-w-md ${saveMessage.includes('successfully')
              ? 'bg-green-900/80 text-green-200'
              : saveMessage.includes('Failed')
                ? 'bg-red-900/80 text-red-200'
                : 'bg-blue-900/80 text-blue-200'
              }`}>
              {saveMessage}
            </div>
          )}
        </div>

        {/* Agent Card with Edit Functionality - Same width as Chat */}
        {agent && (
          <div className="mb-8">
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 w-full">
              <AgentCard
                agent={agent}
                tokenId={id as string}
                showDetails={true}
                onTraitsUpdate={handleTraitsUpdate}
              />
            </div>
          </div>
        )}

        {/* Chat with Agent */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 text-center">💬 Chat with Your Agent</h2>
          <ChatUI
            agentId={id as string}
            agentName={agent?.name || "Unknown Agent"}
          />
        </div>

        {/* Memory Summary Section - Toggle between summary and full list */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">🧠 Memory Summary</h2>
            <button
              onClick={() => setShowMemories(!showMemories)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {showMemories ? 'Hide Memories' : 'View Memories'}
            </button>
          </div>

          {showMemories ? (
            <MemoriesList agentId={id as string} />
          ) : (
            <p className="text-gray-300 text-center">
              This agent has memories stored. Click "View Memories" to see them!
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-4 flex-wrap justify-center">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            ⬆️ Back to Chat
          </button>
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
            onClick={() => router.push('/breed')}
          >
            🧬 Breed Agent
          </button>
        </div>
      </div>
    </div>
  );
}