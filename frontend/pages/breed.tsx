// frontend/pages/breed.tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../lib/contract';
import AgentCard from '../components/AgentCard';

// Add BigInt serialization handler
if (typeof window !== 'undefined') {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

interface AgentData {
  tokenId: string;
  metadata: {
    name: string;
    description: string;
    personality: string;
    traits: {
      personality: string;
      curious: boolean;
      friendly: boolean;
      cautious: boolean;
      pragmatic: boolean;
      [key: string]: any;
    };
    memory_uri: string;
    created_at: string;
  };
}

// Mock trait mixing algorithm (Dev3 will implement server-side version)
const previewChildTraits = (parent1Traits: any, parent2Traits: any) => {
  if (!parent1Traits || !parent2Traits) return {};

  const mixedTraits = { ...parent1Traits };

  Object.keys(parent2Traits).forEach(trait => {
    if (typeof parent1Traits[trait] === 'boolean' && typeof parent2Traits[trait] === 'boolean') {
      mixedTraits[trait] = parent1Traits[trait] || parent2Traits[trait];
    }
  });

  const personalities = [parent1Traits.personality, parent2Traits.personality].filter(Boolean);
  if (personalities.length > 0) {
    const hybridOptions = [
      personalities[Math.floor(Math.random() * personalities.length)],
      'hybrid-' + personalities.join('-')
    ];
    mixedTraits.personality = hybridOptions[Math.floor(Math.random() * hybridOptions.length)];
  }

  return mixedTraits;
};

export default function BreedPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  const [userAgents, setUserAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParent1, setSelectedParent1] = useState<AgentData | null>(null);
  const [selectedParent2, setSelectedParent2] = useState<AgentData | null>(null);
  const [previewTraits, setPreviewTraits] = useState<any>(null);
  const [isBreeding, setIsBreeding] = useState(false);

  const { data: balance } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address && isConnected,
  });

  // ✅ Updated prepare config
  const { config: breedConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'breed',
    args: selectedParent1 && selectedParent2
      ? [BigInt(selectedParent1.tokenId), BigInt(selectedParent2.tokenId)]
      : undefined,
    enabled: !!selectedParent1 && !!selectedParent2,
  });

  const { write: breedWrite, isLoading: breedLoading } = useContractWrite({
    ...breedConfig,
    onSuccess: (data) => {
      console.log('Breeding successful:', data);
      setIsBreeding(false);
      setSelectedParent1(null);
      setSelectedParent2(null);
      setPreviewTraits(null);
      alert('Breeding successful! Your new agent will appear shortly.');
      router.push('/');
    },
    onError: (error) => {
      console.error('Breeding failed:', error);
      setIsBreeding(false);
      alert('Breeding failed: ' + error.message);
    }
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isConnected && address && balance) {
      fetchUserAgents();
    }
  }, [isConnected, address, balance]);

  useEffect(() => {
    if (selectedParent1 && selectedParent2) {
      setPreviewTraits(previewChildTraits(selectedParent1.metadata.traits, selectedParent2.metadata.traits));
    } else {
      setPreviewTraits(null);
    }
  }, [selectedParent1, selectedParent2]);

  const fetchUserAgents = async () => {
    if (!address || !balance) return;
    try {
      setLoading(true);
      const agents: AgentData[] = [];

      for (let tokenId = 1; tokenId <= 20; tokenId++) {
        try {
          const response = await fetch(`/api/agent-check?tokenId=${tokenId}&owner=${address}`);
          if (response.ok) {
            const data = await response.json();
            if (data.exists && data.ownedByUser) {
              const mockAgent: AgentData = {
                tokenId: tokenId.toString(),
                metadata: {
                  name: `Cryptixia Agent #${tokenId}`,
                  description: `Agent #${tokenId} ready for breeding`,
                  personality: ['friendly', 'pragmatic', 'adventurous', 'cautious'][tokenId % 4],
                  traits: {
                    personality: ['friendly', 'pragmatic', 'adventurous', 'cautious'][tokenId % 4],
                    curious: tokenId % 2 === 0,
                    friendly: tokenId % 3 === 0,
                    cautious: tokenId % 4 === 0,
                    pragmatic: tokenId % 5 === 0,
                  },
                  memory_uri: `memory://agent_${tokenId}`,
                  created_at: new Date().toISOString(),
                }
              };
              agents.push(mockAgent);
            }
          }
        } catch { continue; }
      }
      setUserAgents(agents);
    } catch (error) {
      console.error('Error fetching user agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleParentSelection = (agent: AgentData, parentSlot: 1 | 2) => {
    if (parentSlot === 1) {
      if (selectedParent2?.tokenId === agent.tokenId) {
        alert('Cannot select the same agent as both parents!');
        return;
      }
      setSelectedParent1(agent);
    } else {
      if (selectedParent1?.tokenId === agent.tokenId) {
        alert('Cannot select the same agent as both parents!');
        return;
      }
      setSelectedParent2(agent);
    }
  };

  // ✅ Replaced handleBreed
  const handleBreed = async () => {
    if (!selectedParent1 || !selectedParent2) {
      alert('Please select two different agents to breed');
      return;
    }
    if (selectedParent1.tokenId === selectedParent2.tokenId) {
      alert('Cannot breed an agent with itself!');
      return;
    }
    if (!breedWrite) {
      alert('Breeding contract function not available yet. Please wait for Dev1 to implement the breed function.');
      return;
    }

    try {
      setIsBreeding(true);

      const apiUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/mixTraits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent1: selectedParent1.metadata.traits,
          parent2: selectedParent2.metadata.traits,
          parent1Id: selectedParent1.tokenId,
          parent2Id: selectedParent2.tokenId,
        })
      });

      if (response.ok) {
        const mixedData = await response.json();
        console.log('Server mixed traits:', mixedData);
      }

      // ✅ Call contract function without arguments (wagmi v0.12.7)
      breedWrite?.();
    } catch (error) {
      console.error('Breeding error:', error);
      setIsBreeding(false);
      alert('Breeding failed: ' + (error as Error).message);
    }
  };

  // … (UI code unchanged, same as your original return JSX)
}
