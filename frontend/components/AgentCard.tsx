// frontend/components/AgentCard.tsx
import Link from 'next/link';
import { useState } from 'react';

// Define proper types for the component
interface AgentTraits {
  personality?: string;
  curious?: boolean;
  friendly?: boolean;
  cautious?: boolean;
  pragmatic?: boolean;
  [key: string]: any; // Allow additional traits
}

interface AgentCardProps {
  agent: {
    name: string;
    description: string;
    personality?: string;
    traits?: AgentTraits;
    memory_uri?: string;
    created_at: string;
  };
  tokenId: string;
  showDetails?: boolean;
  onTraitsUpdate?: (newTraits: AgentTraits) => void;
}

// Avatar component using your generateAvatar API
const AgentAvatar = ({ tokenId, personality, size = 64 }: { tokenId: string, personality?: string, size?: number }) => {
  const [imageError, setImageError] = useState<boolean>(false);
  
  // Fallback to simple avatar if API fails
  if (imageError) {
    const getAvatarColor = (personality?: string): string => {
      if (!personality) return 'bg-gray-500';
      const colors: { [key: string]: string } = {
        friendly: 'bg-green-500',
        pragmatic: 'bg-blue-500',
        adventurous: 'bg-orange-500',
        cautious: 'bg-purple-500'
      };
      return colors[personality] || 'bg-gray-500';
    };

    const getPersonalityEmoji = (personality?: string): string => {
      if (!personality) return '🤖';
      const emojis: { [key: string]: string } = {
        friendly: '😊',
        pragmatic: '🧠',
        adventurous: '🚀',
        cautious: '🛡️'
      };
      return emojis[personality] || '🤖';
    };

    return (
      <div className={`w-16 h-16 ${getAvatarColor(personality)} rounded-full flex items-center justify-center text-2xl`}>
        {getPersonalityEmoji(personality)}
      </div>
    );
  }

  // Use your generateAvatar API
  const avatarUrl = `/api/generateAvatar?tokenId=${tokenId}&size=${size}&seed=${personality || 'default'}`;
  
  return (
    <img
      src={avatarUrl}
      alt={`Agent #${tokenId} Avatar`}
      className="w-16 h-16 rounded-full border-2 border-gray-600"
      onError={() => setImageError(true)}
    />
  );
};

// Trait editing component
const TraitEditor = ({ traits, onSave, onCancel }: {
  traits: AgentTraits;
  onSave: (newTraits: AgentTraits) => void;
  onCancel: () => void;
}) => {
  const [editedTraits, setEditedTraits] = useState<AgentTraits>({ ...traits });

  const handleTraitChange = (traitName: string, value: boolean | string) => {
    setEditedTraits((prev: AgentTraits) => ({
      ...prev,
      [traitName]: value
    }));
  };

  const handleSave = () => {
    onSave(editedTraits);
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4 mt-4">
      <h4 className="text-white font-medium mb-3">Edit Traits</h4>
      
      <div className="space-y-3">
        {/* Personality Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Personality
          </label>
          <select
            value={editedTraits.personality || ''}
            onChange={(e) => handleTraitChange('personality', e.target.value)}
            className="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500"
          >
            <option value="friendly">Friendly</option>
            <option value="pragmatic">Pragmatic</option>
            <option value="adventurous">Adventurous</option>
            <option value="cautious">Cautious</option>
          </select>
        </div>

        {/* Boolean Traits */}
        {Object.entries(editedTraits).map(([trait, value]) => {
          if (trait === 'personality') return null;
          
          return (
            <div key={trait} className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300 capitalize">
                {trait}
              </label>
              <button
                onClick={() => handleTraitChange(trait, !value)}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  value 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {value ? 'Yes' : 'No'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 mt-4">
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          Save Changes
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default function AgentCard({ agent, tokenId, showDetails = false, onTraitsUpdate }: AgentCardProps) {
  const [isEditingTraits, setIsEditingTraits] = useState<boolean>(false);

  // Safe personality formatting
  const formatPersonality = (personality?: string): string => {
    if (!personality || typeof personality !== 'string') return 'Unknown';
    return personality.charAt(0).toUpperCase() + personality.slice(1);
  };

  const handleTraitSave = (newTraits: AgentTraits) => {
    if (onTraitsUpdate) {
      onTraitsUpdate(newTraits);
    }
    setIsEditingTraits(false);
    // Here you would typically also call an API to update the traits on-chain or in storage
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-start space-x-4">
        {/* Avatar using your API */}
        <AgentAvatar 
          tokenId={tokenId} 
          personality={agent.personality}
          size={64}
        />

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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-300">Personality:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              agent.personality === 'friendly' ? 'bg-green-100 text-green-800' :
              agent.personality === 'pragmatic' ? 'bg-blue-100 text-blue-800' :
              agent.personality === 'adventurous' ? 'bg-orange-100 text-orange-800' :
              agent.personality === 'cautious' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {formatPersonality(agent.personality)}
            </span>
          </div>
          
          {/* Edit Button - only show on agent detail page */}
          {showDetails && onTraitsUpdate && (
            <button
              onClick={() => setIsEditingTraits(!isEditingTraits)}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded"
            >
              {isEditingTraits ? 'Cancel Edit' : 'Edit Traits'}
            </button>
          )}
        </div>

        {/* Traits Display */}
        {showDetails && agent.traits && !isEditingTraits && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-300">Traits:</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(agent.traits).map(([trait, value]) => {
                if (trait === 'personality') return null;
                return (
                  <span
                    key={trait}
                    className={`px-2 py-1 rounded text-xs capitalize ${
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

        {/* Trait Editor */}
        {isEditingTraits && agent.traits && (
          <TraitEditor
            traits={agent.traits}
            onSave={handleTraitSave}
            onCancel={() => setIsEditingTraits(false)}
          />
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