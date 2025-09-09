import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../lib/contract';
import AgentCard from '../../components/AgentCard';
import ChatUI from '../../components/ChatUI';
import MemoriesList from '../../components/MemoriesList'; // ADD THIS IMPORT

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
  const [showMemories, setShowMemories] = useState(false); // ADD THIS STATE

  // Convert string ID to BigInt safely, only when we have an id
  const tokenIdBigInt = id ? BigInt(id as string) : undefined;

  // Check if the NFT actually exists on-chain
  const { data: tokenExists, isError: tokenError, error: contractError } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'ownerOf',
    args: tokenIdBigInt ? [tokenIdBigInt] : undefined,
    enabled: !!tokenIdBigInt,
    onError: (error) => {
      console.error('Contract read error:', error);
      setError('This agent NFT does not exist or could not be loaded');
    }
  });

  // Get token URI from contract
  const { data: tokenURI, isError: uriError } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'tokenURI',
    args: tokenIdBigInt ? [tokenIdBigInt] : undefined,
    enabled: !!tokenIdBigInt && !tokenError && !!tokenExists,
    onError: (error) => {
      console.error('Token URI error:', error);
    }
  });

  useEffect(() => {
    if (id && !tokenError && tokenExists) {
      fetchAgentData(id as string);
    } else if (tokenError || contractError) {
      setError('This agent NFT does not exist');
      setLoading(false);
    }
  }, [id, tokenError, tokenExists, tokenURI, contractError]);

  const fetchAgentData = async (tokenIdStr: string) => {
    try {
      setLoading(true);

      if (tokenURI) {
        // Try to fetch actual metadata from IPFS
        const metadataUrl = (tokenURI as string).replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');

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

      // Fallback to mock data if IPFS fails
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading agent...</div>
      </div>
    );
  }

  if (error || tokenError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Agent not found'}</div>
          <button
            onClick={() => router.push('/mint')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Mint Your First Agent
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-400 hover:text-blue-300 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-white">Agent Profile</h1>
          
          {/* Save Message */}
          {saveMessage && (
            <div className={`mt-2 p-3 rounded ${
              saveMessage.includes('successfully') 
                ? 'bg-green-900 text-green-300' 
                : saveMessage.includes('Failed')
                  ? 'bg-red-900 text-red-300'
                  : 'bg-blue-900 text-blue-300'
            }`}>
              {saveMessage}
            </div>
          )}
        </div>

        {/* Agent Card with Edit Functionality */}
        {agent && (
          <div className="mb-8">
            <AgentCard
              agent={agent}
              tokenId={id as string}
              showDetails={true}
              onTraitsUpdate={handleTraitsUpdate}
            />
          </div>
        )}

        {/* Chat with Agent */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">💬 Chat with Your Agent</h2>
          <ChatUI
            agentId={id as string}
            agentName={agent?.name || "Unknown Agent"}
          />
        </div>

        {/* Memory Summary Section - Toggle between summary and full list */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
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
            <p className="text-gray-400">
              This agent has memories stored. Click "View Memories" to see them!
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-4 flex-wrap">
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