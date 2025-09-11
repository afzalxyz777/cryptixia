// frontend/pages/breed.tsx
import { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../lib/contract';
import { BREEDING_CONTRACT_ADDRESS, BREEDING_CONTRACT_ABI } from '../lib/breedingContract';
import AgentCard from '../components/AgentCard';
import Link from 'next/link';
import { ethers, BigNumber } from 'ethers';

interface AgentData {
  tokenId: BigNumber;
  name: string;
  description: string;
  personality: string;
  traits: string[];
  canBreed: boolean;
  cooldownRemaining: number;
  breedingCount: number;
}

export default function BreedPage() {
  const { address, isConnected } = useAccount();
  const [ownedAgents, setOwnedAgents] = useState<AgentData[]>([]);
  const [selectedParentA, setSelectedParentA] = useState<AgentData | null>(null);
  const [selectedParentB, setSelectedParentB] = useState<AgentData | null>(null);
  const [previewTraits, setPreviewTraits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const { data: breedingFee } = useContractRead({
    address: BREEDING_CONTRACT_ADDRESS as `0x${string}`,
    abi: BREEDING_CONTRACT_ABI,
    functionName: 'getBreedingCost',
    enabled: isConnected,
  });

  const { data: canBreedPairData } = useContractRead({
    address: BREEDING_CONTRACT_ADDRESS as `0x${string}`,
    abi: BREEDING_CONTRACT_ABI,
    functionName: 'canBreedPair',
    args: selectedParentA && selectedParentB
      ? [selectedParentA.tokenId, selectedParentB.tokenId]
      : undefined,
    enabled: !!(selectedParentA && selectedParentB),
  });

  const { config: breedConfig } = usePrepareContractWrite({
    address: BREEDING_CONTRACT_ADDRESS as `0x${string}`,
    abi: BREEDING_CONTRACT_ABI,
    functionName: 'breed',
    args: selectedParentA && selectedParentB
      ? [selectedParentA.tokenId, selectedParentB.tokenId]
      : undefined,
    overrides: {
      value: breedingFee || ethers.utils.parseEther('0.01'),
    },
    enabled: !!(selectedParentA && selectedParentB && canBreedPairData?.[0]),
  });

  const { write: breedWrite, isLoading: isBreeding } = useContractWrite({
    ...breedConfig,
    onSuccess(data) {
      setTxHash(data.hash);
      setError('');
      setTimeout(() => {
        setSelectedParentA(null);
        setSelectedParentB(null);
        setPreviewTraits([]);
        fetchOwnedAgents();
      }, 2000);
    },
    onError(error) {
      setError(`Breeding failed: ${error.message}`);
    }
  });

  useEffect(() => {
    if (address) fetchOwnedAgents();
  }, [address]);

  const fetchOwnedAgents = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const agents: AgentData[] = [];
      for (let i = 0; i < 10; i++) {
        const mockAgent: AgentData = {
          tokenId: ethers.BigNumber.from(i),
          name: `Cryptixia Agent #${i}`,
          description: `A ${['friendly','pragmatic','adventurous','cautious'][i % 4]} AI agent`,
          personality: ['friendly','pragmatic','adventurous','cautious'][i % 4],
          traits: [
            ['friendly','pragmatic','adventurous','cautious'][i % 4],
            'curious',
            i % 2 === 0 ? 'analytical' : 'creative',
            ...(i % 3 === 0 ? ['rare_trait'] : [])
          ],
          canBreed: i % 4 !== 0,
          cooldownRemaining: i % 4 === 0 ? 3600 : 0,
          breedingCount: Math.floor(Math.random() * 5)
        };
        if (i < 4) agents.push(mockAgent);
      }
      setOwnedAgents(agents);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError('Failed to load your agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedParentA && selectedParentB) {
      const combinedTraits = [
        ...selectedParentA.traits,
        ...selectedParentB.traits,
        'bred'
      ];
      setPreviewTraits([...new Set(combinedTraits)]);
    } else {
      setPreviewTraits([]);
    }
  }, [selectedParentA, selectedParentB]);

  const handleBreed = () => {
    if (!selectedParentA || !selectedParentB) {
      setError('Please select two agents to breed');
      return;
    }
    if (!canBreedPairData?.[0]) {
      setError((canBreedPairData?.[1] as string) || 'Cannot breed this pair');
      return;
    }
    setError('');
    breedWrite?.();
  };

  const formatCooldown = (seconds: number): string => {
    if (seconds <= 0) return 'Ready';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatEther = (wei: BigNumber | string | number | undefined): string => {
    if (!wei) return '0';
    try {
      return ethers.utils.formatEther(wei);
    } catch {
      return '0';
    }
  };

  if (!isConnected) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)' }}
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-200 mb-6">Connect your wallet to start breeding agents</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-300 hover:text-blue-200 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-4">🧬 Breed Your Agents</h1>
          <p className="text-gray-200 mb-6">
            Combine two of your agents to create a new one with mixed traits. 
            Breeding costs {formatEther(breedingFee as BigNumber)} AVAX.
          </p>
        </div>

        {error && <div className="bg-red-900 text-red-300 p-4 rounded-lg mb-6">{error}</div>}
        {txHash && (
          <div className="bg-green-900 text-green-300 p-4 rounded-lg mb-6">
            Breeding successful! Transaction: 
            <a
              href={`https://testnet.snowtrace.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-1"
            >
              View on Explorer
            </a>
          </div>
        )}

        {loading && (
          <div className="bg-gray-800 rounded-lg p-8 text-center mb-6">
            <div className="text-white text-xl">Loading your agents...</div>
          </div>
        )}

        {!loading && ownedAgents.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-8 text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">No Agents Found</h2>
            <p className="text-gray-400 mb-6">You need at least 2 agents to breed. Mint some agents first!</p>
            <Link
              href="/mint"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Mint Your First Agent
            </Link>
          </div>
        )}

        {!loading && ownedAgents.length >= 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Parent A */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Parent A</h2>
              <div className="space-y-4">
                {ownedAgents.map(agent => (
                  <div
                    key={agent.tokenId.toString()}
                    className={`cursor-pointer transition-all ${
                      selectedParentA?.tokenId.eq(agent.tokenId)
                        ? 'ring-2 ring-blue-500'
                        : 'hover:ring-1 hover:ring-gray-500'
                    } ${!agent.canBreed ? 'opacity-50' : ''}`}
                    onClick={() => agent.canBreed && setSelectedParentA(agent)}
                  >
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          #{agent.tokenId.toString()}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{agent.name}</h3>
                          <p className="text-sm text-gray-400">
                            Breeds: {agent.breedingCount}/100 •
                            {agent.canBreed ? ' Ready' : ` Cooldown: ${formatCooldown(agent.cooldownRemaining)}`}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {agent.traits.slice(0,3).map((trait,i) => (
                              <span key={i} className="px-2 py-1 bg-gray-700 text-xs rounded">{trait}</span>
                            ))}
                            {agent.traits.length > 3 && (
                              <span className="px-2 py-1 bg-gray-700 text-xs rounded">
                                +{agent.traits.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedParentA?.tokenId.eq(agent.tokenId) && <div className="text-blue-400">✓</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Child Preview */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Child Preview</h2>
              {selectedParentA && selectedParentB ? (
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                      👶
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">New Agent</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Child of Agent #{selectedParentA.tokenId.toString()} × Agent #{selectedParentB.tokenId.toString()}
                    </p>
                  </div>
                  <div className="mb-6">
                    <h4 className="text-white font-medium mb-3">Predicted Traits:</h4>
                    <div className="flex flex-wrap gap-2">
                      {previewTraits.map((trait,i) => (
                        <span key={i} className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Breeding Fee:</span>
                      <span className="text-white font-medium">
                        {formatEther(breedingFee as BigNumber)} AVAX
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleBreed}
                    disabled={!canBreedPairData?.[0] || isBreeding}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      canBreedPairData?.[0] && !isBreeding
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isBreeding ? 'Breeding...' : 'Breed Agents'}
                  </button>
                  <div className="mt-4 text-xs text-gray-400">
                    {!canBreedPairData?.[0] && canBreedPairData?.[1] && (
                      <p className="text-red-400">⚠️ {canBreedPairData[1]}</p>
                    )}
                    {canBreedPairData?.[0] && <p className="text-green-400">✅ Ready to breed!</p>}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                  <div className="text-6xl mb-4">🧬</div>
                  <p className="text-gray-400">Select two agents to see breeding preview</p>
                </div>
              )}
            </div>

            {/* Parent B */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Parent B</h2>
              <div className="space-y-4">
                {ownedAgents
                  .filter(agent => !selectedParentA?.tokenId.eq(agent.tokenId))
                  .map(agent => (
                  <div
                    key={agent.tokenId.toString()}
                    className={`cursor-pointer transition-all ${
                      selectedParentB?.tokenId.eq(agent.tokenId)
                        ? 'ring-2 ring-green-500'
                        : 'hover:ring-1 hover:ring-gray-500'
                    } ${!agent.canBreed ? 'opacity-50' : ''}`}
                    onClick={() => agent.canBreed && setSelectedParentB(agent)}
                  >
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                          #{agent.tokenId.toString()}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{agent.name}</h3>
                          <p className="text-sm text-gray-400">
                            Breeds: {agent.breedingCount}/100 •
                            {agent.canBreed ? ' Ready' : ` Cooldown: ${formatCooldown(agent.cooldownRemaining)}`}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {agent.traits.slice(0,3).map((trait,i) => (
                              <span key={i} className="px-2 py-1 bg-gray-700 text-xs rounded">{trait}</span>
                            ))}
                            {agent.traits.length > 3 && (
                              <span className="px-2 py-1 bg-gray-700 text-xs rounded">
                                +{agent.traits.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedParentB?.tokenId.eq(agent.tokenId) && <div className="text-green-400">✓</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {ownedAgents.length >= 2 && (
          <div className="mt-12 bg-blue-900 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">How Breeding Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-100">
              <div>
                <div className="font-medium mb-2">1. Select Parents</div>
                <p>Choose two of your agents that are ready to breed (not on cooldown)</p>
              </div>
              <div>
                <div className="font-medium mb-2">2. Pay Fee</div>
                <p>Pay {formatEther(breedingFee as BigNumber)} AVAX breeding fee</p>
              </div>
              <div>
                <div className="font-medium mb-2">3. Get Child</div>
                <p>Receive a new agent NFT with combined traits from both parents</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
