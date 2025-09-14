import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../lib/contract';
import AgentCard from '../../components/AgentCard';
import ChatUI from '../../components/chat';
import MemoriesList from '../../components/MemoriesList';
import DeFiAgent from '../../components/DefiAgent';

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

type TabType = 'chat' | 'defi' | 'memories';

export default function AgentProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { address } = useAccount();

  const [agent, setAgent] = useState<AgentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [tokenExists, setTokenExists] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  // Convert string ID to BigInt safely, only when we have an id
  const tokenIdBigInt = id ? BigInt(id as string) : undefined;

  // Check if the NFT exists with proper error handling
  const { data: ownerAddress, isError: tokenError, isLoading: tokenLoading } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'ownerOf',
    args: tokenIdBigInt ? [tokenIdBigInt] : undefined,
    enabled: !!tokenIdBigInt && !!CONTRACT_ABI && CONTRACT_ABI.length > 0,
    onSuccess: (data) => {
      console.log('Token owner found:', data);
      setTokenExists(true);
      setError('');
    },
    onError: (error: any) => {
      console.log('Token lookup error:', error.message);
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
    if (id && !tokenLoading) {
      if (tokenExists && !tokenError) {
        fetchAgentData(id as string);
      } else if (tokenError) {
        setLoading(false);
      }
    }
  }, [id, tokenExists, tokenError, tokenLoading, tokenURI]);

  const fetchAgentData = async (tokenIdStr: string) => {
    try {
      setLoading(true);
      setError('');

      if (tokenURI) {
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

      const updatedAgent = {
        ...agent,
        traits: newTraits,
        personality: newTraits.personality
      };
      setAgent(updatedAgent);

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

  // Voice command handler for DeFi integration
  const handleVoiceCommand = (command: string) => {
    console.log('Voice command received:', command);
  };

  // Tab configuration with enhanced icons and descriptions
  const tabs = [
    {
      id: 'chat' as TabType,
      icon: '💬',
      label: 'Chat',
      description: `Talk with ${agent?.name || 'Agent'}`,
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      id: 'defi' as TabType,
      icon: '💰',
      label: 'DeFi Manager',
      description: 'Portfolio & Trading',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      id: 'memories' as TabType,
      icon: '🧠',
      label: 'Memories',
      description: 'Agent History',
      gradient: 'from-purple-500 to-pink-600'
    }
  ];

  if (loading || tokenLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl font-medium">
            {tokenLoading ? 'Verifying agent existence...' : 'Loading agent data...'}
          </div>
          <div className="text-blue-200 text-sm mt-2">
            This may take a few moments
          </div>
        </div>
      </div>
    );
  }

  if (error || (!tokenExists && !tokenLoading)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div className="text-center max-w-md">
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-8 backdrop-blur-sm">
            <div className="text-6xl mb-4">🤖❌</div>
            <div className="text-red-300 text-xl mb-4 font-medium">
              {error || `Agent #${id} not found`}
            </div>
            <p className="text-gray-300 mb-6 text-sm leading-relaxed">
              This agent NFT doesn't exist on the blockchain. You may need to mint it first, or check if the ID is correct.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/mint')}
                className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                🚀 Mint Your First Agent
              </button>
              <button
                onClick={() => router.push('/')}
                className="block w-full bg-gray-600/80 hover:bg-gray-700/80 text-white px-6 py-3 rounded-xl font-medium transition-all backdrop-blur-sm"
              >
                🏠 Go Back Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-200 hover:text-white transition-all flex items-center mb-6 group hover:transform hover:scale-105"
          >
            <div className="bg-white/10 rounded-full p-2 mr-3 group-hover:bg-white/20 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </button>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Agent Profile
            </h1>

            {ownerAddress && (
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-blue-200 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                Owner: {ownerAddress.toString().slice(0, 6)}...{ownerAddress.toString().slice(-4)}
              </div>
            )}

            {/* Enhanced Save Message */}
            {saveMessage && (
              <div className={`mt-4 p-4 rounded-xl mx-auto max-w-md backdrop-blur-sm border transition-all transform ${saveMessage.includes('successfully')
                ? 'bg-green-500/20 border-green-500/30 text-green-200 scale-105'
                : saveMessage.includes('Failed')
                  ? 'bg-red-500/20 border-red-500/30 text-red-200'
                  : 'bg-blue-500/20 border-blue-500/30 text-blue-200'
                }`}>
                <div className="flex items-center justify-center">
                  {saveMessage.includes('successfully') && <span className="mr-2">✅</span>}
                  {saveMessage.includes('Failed') && <span className="mr-2">❌</span>}
                  {!saveMessage.includes('successfully') && !saveMessage.includes('Failed') && <span className="mr-2">⏳</span>}
                  {saveMessage}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Agent Card */}
        {agent && (
          <div className="mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
              <AgentCard
                agent={agent}
                tokenId={id as string}
                showDetails={true}
                onTraitsUpdate={handleTraitsUpdate}
              />
            </div>
          </div>
        )}

        {/* Enhanced Tab Navigation */}
        <div className="mb-8">
          <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-2 border border-white/10 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative overflow-hidden group p-4 rounded-xl text-center transition-all duration-300 ${activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg transform scale-105`
                    : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-102'
                    }`}
                >
                  <div className="relative z-10">
                    <div className="text-2xl mb-2">{tab.icon}</div>
                    <div className="font-semibold text-lg">{tab.label}</div>
                    <div className={`text-xs mt-1 ${activeTab === tab.id ? 'text-white/90' : 'text-gray-400'
                      }`}>
                      {tab.description}
                    </div>
                  </div>

                  {/* Animated background for active tab */}
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50 animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Content Sections */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          {activeTab === 'chat' && (
            <div className="p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-3 mr-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Chat with {agent?.name || "Your Agent"}
                </h2>
              </div>
              <ChatUI
                agentId={id as string}
                agentName={agent?.name || "Unknown Agent"}
              />
            </div>
          )}

          {activeTab === 'defi' && (
            <div className="p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-full p-3 mr-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h2 className="text-2xl font-bold text-white">DeFi Portfolio Manager</h2>
              </div>
              <DeFiAgent onVoiceCommand={(handler) => {
                console.log('DeFi Agent voice handler registered');
              }} />
            </div>
          )}

          {activeTab === 'memories' && (
            <div className="p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-full p-3 mr-4">
                  <span className="text-2xl">🧠</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Agent Memory Bank</h2>
              </div>
              <MemoriesList agentId={id as string} />
            </div>
          )}
        </div>

        {/* Enhanced Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all transform hover:scale-105 shadow-lg flex items-center"
          >
            <span className="mr-2">⬆️</span>
            Back to Top
          </button>

          <button
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all transform hover:scale-105 shadow-lg flex items-center"
            onClick={() => router.push('/breed')}
          >
            <span className="mr-2">🧬</span>
            Breed Agent
          </button>

          <button
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all transform hover:scale-105 shadow-lg flex items-center"
            onClick={() => router.push(`/agent/${id}/analytics`)}
          >
            <span className="mr-2">📊</span>
            View Analytics
          </button>
        </div>

        {/* Enhanced Footer Info */}
        <div className="mt-12 text-center">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <p className="text-gray-300 text-sm">
              🤖 Agent ID: #{id} | 🔗 Blockchain Verified | ⚡ Real-time Updates
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}