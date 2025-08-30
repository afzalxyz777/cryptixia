// frontend/components/AgentCard.tsx
import Link from 'next/link';

interface AgentCardProps {
  agent: {
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
  };
  tokenId: string;
  showDetails?: boolean;
}

// Simple avatar generator based on personality
const getAvatarColor = (personality: string) => {
  const colors: { [key: string]: string } = {
    friendly: 'bg-green-500',
    pragmatic: 'bg-blue-500',
    adventurous: 'bg-orange-500',
    cautious: 'bg-purple-500'
  };
  return colors[personality] || 'bg-gray-500';
};

const getPersonalityEmoji = (personality: string) => {
  const emojis: { [key: string]: string } = {
    friendly: '😊',
    pragmatic: '🧠',
    adventurous: '🚀',
    cautious: '🛡️'
  };
  return emojis[personality] || '🤖';
};

export default function AgentCard({ agent, tokenId, showDetails = false }: AgentCardProps) {
  const avatarColor = getAvatarColor(agent.personality);
  const emoji = getPersonalityEmoji(agent.personality);

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className={`w-16 h-16 ${avatarColor} rounded-full flex items-center justify-center text-2xl`}>
          {emoji}
        </div>
        
        {/* Basic Info */}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">{agent.name}</h3>
          <p className="text-gray-400 mb-2">{agent.description}</p>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-300">Token ID:</span>
            <span className="text-sm text-blue-400">#{tokenId}</span>
          </div>
        </div>
      </div>

      {/* Personality & Traits */}
      <div className="mt-4">
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-sm font-medium text-gray-300">Personality:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            agent.personality === 'friendly' ? 'bg-green-100 text-green-800' :
            agent.personality === 'pragmatic' ? 'bg-blue-100 text-blue-800' :
            agent.personality === 'adventurous' ? 'bg-orange-100 text-orange-800' :
            'bg-purple-100 text-purple-800'
          }`}>
            {agent.personality.charAt(0).toUpperCase() + agent.personality.slice(1)}
          </span>
        </div>

        {/* Traits */}
        {showDetails && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-300">Traits:</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(agent.traits).map(([trait, value]) => {
                if (trait === 'personality') return null;
                return (
                  <span
                    key={trait}
                    className={`px-2 py-1 rounded text-xs ${
                      value 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {trait}: {value ? 'Yes' : 'No'}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Memory Status */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Created: {new Date(agent.created_at).toLocaleDateString()}
          </span>
          {agent.memory_uri && (
            <span className="text-xs text-blue-400">
              Memory: {agent.memory_uri.substring(0, 15)}...
            </span>
          )}
        </div>
      </div>

      {/* Action Button */}
      {!showDetails && (
        <div className="mt-4">
          <Link 
            href={`/agent/${tokenId}`}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-center block font-medium"
          >
            View Details
          </Link>
        </div>
      )}
    </div>
  );
}