// frontend/pages/agent/[id].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import AgentCard from '../../components/AgentCard';
import ChatUI from '../../components/ChatUI';

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

  useEffect(() => {
    if (id) {
      fetchAgentData(id as string);
    }
  }, [id]);

  const fetchAgentData = async (tokenId: string) => {
    try {
      setLoading(true);
      
      // For now, we'll create mock data
      // Later this will fetch from your contract and IPFS
      const mockAgent: AgentMetadata = {
        name: `Cryptixia Agent #${tokenId}`,
        description: "A friendly AI agent",
        personality: "friendly",
        traits: {
          personality: "friendly",
          curious: false,
          friendly: true,
          cautious: false,
          pragmatic: false
        },
        memory_uri: "memory://mock_hash",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading agent...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error}</div>
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

        {/* Chat with Agent */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">💬 Chat with Your Agent</h2>
          <ChatUI 
            agentId={id as string}
            agentName={agent?.name || "Unknown Agent"}
          />
        </div>

        {/* Memory Summary Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">🧠 Memory Summary</h2>
          <p className="text-gray-400">
            This agent has no memories yet. Start chatting to build memories!
          </p>
          {/* TODO: Tomorrow we'll add actual memory display here */}
        </div>

        {/* Actions */}
        <div className="flex space-x-4">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            ⬆️ Back to Chat
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium">
            🧠 View Memories (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}