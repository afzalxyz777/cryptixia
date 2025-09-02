// frontend/pages/agent/[id].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../lib/contract';
import AgentCard from '../../components/AgentCard';
import ChatUI from '../../components/ChatUI';

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

interface Memory {
  id: string;
  text: string;
  timestamp: string;
  metadata: any;
  score: number;
}

export default function AgentProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { address } = useAccount();

  const [agent, setAgent] = useState<AgentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'memories'>('chat');
  
  // Memories state
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memoriesError, setMemoriesError] = useState('');

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

  // Fetch memories when memories tab is active
  useEffect(() => {
    if (activeTab === 'memories' && id) {
      fetchMemories(id as string);
    }
  }, [activeTab, id]);

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

  const fetchMemories = async (tokenIdStr: string) => {
    try {
      setMemoriesLoading(true);
      setMemoriesError('');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log('Fetching memories from:', `${apiUrl}/listMemories?tokenId=${tokenIdStr}&topK=20`);
      
      const response = await fetch(`${apiUrl}/listMemories?tokenId=${tokenIdStr}&topK=20`);
      
      if (!response.ok) {
        console.error('Server response:', response.status, response.statusText);
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMemories(data.memories || []);
    } catch (err) {
      console.error('Error fetching memories:', err);
      setMemoriesError('Failed to fetch memories from server');
    } finally {
      setMemoriesLoading(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log('Deleting memory:', memoryId, 'via', `${apiUrl}/deleteMemory`);
      
      const response = await fetch(`${apiUrl}/deleteMemory`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memoryId }),
      });

      if (!response.ok) {
        console.error('Delete failed:', response.status, response.statusText);
        throw new Error('Failed to delete memory');
      }

      // Remove the deleted memory from state
      setMemories(prev => prev.filter(memory => memory.id !== memoryId));
      console.log('Memory deleted successfully');
    } catch (err) {
      console.error('Error deleting memory:', err);
      alert('Failed to delete memory');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(parseInt(timestamp));
      return date.toLocaleString();
    } catch {
      return new Date().toLocaleString();
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
        </div>

        {/* Agent Card */}
        {agent && (
          <div className="mb-8">
            <AgentCard
              agent={agent}
              tokenId={id as string}
              showDetails={true}
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-gray-800 rounded-lg mb-6">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'chat'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab('memories')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'memories'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🧠 Memories
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'chat' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Chat with Your Agent</h2>
                <ChatUI
                  agentId={id as string}
                  agentName={agent?.name || "Unknown Agent"}
                />
              </div>
            )}

            {activeTab === 'memories' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Agent Memories</h2>
                  <button
                    onClick={() => fetchMemories(id as string)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                    disabled={memoriesLoading}
                  >
                    {memoriesLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {memoriesLoading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400">Loading memories...</div>
                  </div>
                ) : memoriesError ? (
                  <div className="text-center py-8">
                    <div className="text-red-400">{memoriesError}</div>
                  </div>
                ) : memories.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">No memories yet</div>
                    <div className="text-sm text-gray-500">
                      Start chatting to create memories!
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {memories.map((memory) => (
                      <div key={memory.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm text-gray-400">
                            {formatTimestamp(memory.timestamp)}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-blue-400 bg-blue-900 px-2 py-1 rounded">
                              Score: {(memory.score * 100).toFixed(1)}%
                            </span>
                            <button
                              onClick={() => deleteMemory(memory.id)}
                              className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-900"
                              title="Forget this memory"
                            >
                              🗑️ Forget
                            </button>
                          </div>
                        </div>
                        <div className="text-white">
                          {memory.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-4">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            ⬆️ Back to Top
          </button>
        </div>
      </div>
    </div>
  );
}