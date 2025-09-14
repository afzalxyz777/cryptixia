// components/AgentCard.tsx - ENHANCED VERSION
import Link from 'next/link';
import { useRouter } from 'next/router';
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
  onClick?: () => void;
}

// Enhanced Avatar component with better fallback
const AgentAvatar = ({ tokenId, personality, size = 64 }: { tokenId: string, personality?: string, size?: number }) => {
  const [imageError, setImageError] = useState<boolean>(false);

  // Improved fallback with gradients and better styling
  if (imageError) {
    const getAvatarGradient = (personality?: string): string => {
      if (!personality) return 'from-gray-500 to-gray-600';
      const gradients: { [key: string]: string } = {
        friendly: 'from-green-400 to-emerald-500',
        pragmatic: 'from-blue-400 to-cyan-500',
        adventurous: 'from-orange-400 to-red-500',
        cautious: 'from-purple-400 to-violet-500',
        creative: 'from-pink-400 to-rose-500',
        analytical: 'from-indigo-400 to-blue-500'
      };
      return gradients[personality] || 'from-gray-500 to-gray-600';
    };

    const getPersonalityIcon = (personality?: string): string => {
      if (!personality) return '🤖';
      const icons: { [key: string]: string } = {
        friendly: '😊',
        pragmatic: '🧠',
        adventurous: '🚀',
        cautious: '🛡️',
        creative: '🎨',
        analytical: '📊'
      };
      return icons[personality] || '🤖';
    };

    return (
      <div className={`w-16 h-16 bg-gradient-to-br ${getAvatarGradient(personality)} rounded-2xl flex items-center justify-center text-2xl shadow-lg border border-white/10`}>
        <span className="drop-shadow-sm">{getPersonalityIcon(personality)}</span>
      </div>
    );
  }

  const avatarUrl = `/api/generateAvatar?tokenId=${tokenId}&size=${size}&seed=${personality || 'default'}`;

  return (
    <img
      src={avatarUrl}
      alt={`Agent #${tokenId} Avatar`}
      className="w-16 h-16 rounded-2xl border-2 border-white/10 shadow-lg object-cover"
      onError={() => setImageError(true)}
    />
  );
};

// Enhanced trait editing component
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
    <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-600/50 p-6 mt-4 animate-fade-in">
      <h4 className="text-white font-bold text-lg mb-4 flex items-center">
        <span className="mr-2">⚙️</span>
        Edit Agent Traits
      </h4>

      <div className="space-y-4">
        {/* Personality Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Personality Type
          </label>
          <select
            value={editedTraits.personality || ''}
            onChange={(e) => handleTraitChange('personality', e.target.value)}
            className="w-full bg-gray-600/50 backdrop-blur-sm text-white rounded-xl px-4 py-3 border border-gray-500/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
          >
            <option value="friendly">Friendly & Helpful</option>
            <option value="pragmatic">Pragmatic & Logical</option>
            <option value="adventurous">Adventurous & Bold</option>
            <option value="cautious">Cautious & Careful</option>
            <option value="creative">Creative & Artistic</option>
            <option value="analytical">Analytical & Precise</option>
          </select>
        </div>

        {/* Boolean Traits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(editedTraits).map(([trait, value]) => {
            if (trait === 'personality') return null;

            return (
              <div key={trait} className="flex items-center justify-between p-3 bg-gray-600/30 rounded-xl border border-gray-500/30">
                <label className="text-sm font-medium text-gray-300 capitalize">
                  {trait.replace('_', ' ')}
                </label>
                <button
                  onClick={() => handleTraitChange(trait, !value)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${value
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                      : 'bg-gray-500/50 text-gray-300 hover:bg-gray-500/70'
                    }`}
                >
                  {value ? 'Active' : 'Inactive'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 mt-6">
        <button
          onClick={handleSave}
          className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 shadow-lg"
        >
          Save Changes
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-600/50 hover:bg-gray-600/70 text-white rounded-xl font-bold transition-all duration-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default function AgentCard({ agent, tokenId, showDetails = false, onTraitsUpdate, onClick }: AgentCardProps) {
  const [isEditingTraits, setIsEditingTraits] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const router = useRouter();

  // Safe personality formatting
  const formatPersonality = (personality?: string): string => {
    if (!personality || typeof personality !== 'string') return 'Unknown';
    return personality.charAt(0).toUpperCase() + personality.slice(1);
  };

  const getPersonalityColor = (personality?: string): string => {
    const colors: { [key: string]: string } = {
      friendly: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
      pragmatic: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
      adventurous: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
      cautious: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
      creative: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
      analytical: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30'
    };
    return colors[personality || ''] || 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
  };

  const getPersonalityTextColor = (personality?: string): string => {
    const colors: { [key: string]: string } = {
      friendly: 'text-green-300',
      pragmatic: 'text-blue-300',
      adventurous: 'text-orange-300',
      cautious: 'text-purple-300',
      creative: 'text-pink-300',
      analytical: 'text-indigo-300'
    };
    return colors[personality || ''] || 'text-gray-300';
  };

  const handleTraitSave = (newTraits: AgentTraits) => {
    if (onTraitsUpdate) {
      onTraitsUpdate(newTraits);
    }
    setIsEditingTraits(false);
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (!showDetails) {
      router.push(`/agent/${tokenId}`);
    }
  };

  return (
    <div
      className={`group relative bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-700/50 transition-all duration-500 overflow-hidden ${(!showDetails || onClick) ? 'cursor-pointer hover:scale-105 hover:shadow-3xl' : ''
        }`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getPersonalityColor(agent.personality)} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

      {/* Glowing border effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-start space-x-4 mb-4">
          {/* Enhanced Avatar */}
          <div className="relative">
            <AgentAvatar
              tokenId={tokenId}
              personality={agent.personality}
              size={64}
            />
            {/* Status indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-gray-800 rounded-full animate-pulse"></div>
          </div>

          {/* Basic Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-white mb-1 truncate group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-cyan-200 group-hover:bg-clip-text transition-all duration-300">
              {agent.name}
            </h3>
            <p className="text-gray-400 text-sm mb-2 line-clamp-2">{agent.description}</p>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-500">Token ID:</span>
              <span className="text-sm text-cyan-400 font-mono">#{tokenId}</span>
            </div>
          </div>
        </div>

        {/* Personality Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-400">Personality:</span>
            <div className={`px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${getPersonalityColor(agent.personality)} border ${getPersonalityTextColor(agent.personality)} backdrop-blur-sm`}>
              {formatPersonality(agent.personality)}
            </div>
          </div>

          {/* Edit Button - only show on agent detail page */}
          {showDetails && onTraitsUpdate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTraits(!isEditingTraits);
              }}
              className="text-xs bg-gray-700/50 hover:bg-gray-600/70 text-gray-300 hover:text-white px-3 py-1 rounded-lg border border-gray-600/50 hover:border-gray-500/70 transition-all duration-300 backdrop-blur-sm"
            >
              {isEditingTraits ? 'Cancel Edit' : 'Edit Traits'}
            </button>
          )}
        </div>

        {/* Traits Display - Enhanced */}
        {showDetails && agent.traits && !isEditingTraits && (
          <div className="mb-4">
            <span className="text-sm font-medium text-gray-400 mb-2 block">Active Traits:</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(agent.traits).map(([trait, value]) => {
                if (trait === 'personality') return null;
                return (
                  <span
                    key={trait}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize border backdrop-blur-sm transition-all duration-300 ${value
                        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300'
                        : 'bg-gray-600/30 border-gray-600/50 text-gray-400'
                      }`}
                  >
                    {trait.replace('_', ' ')}: {value ? 'On' : 'Off'}
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

        {/* Stats/Info Bar */}
        <div className="bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-2xl p-4 backdrop-blur-sm border border-gray-600/30">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <span className="text-gray-400">Created:</span>
                <span className="text-gray-300 font-medium">
                  {new Date(agent.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            {agent.memory_uri && (
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                <span className="text-xs text-blue-400 font-mono">
                  Memory Active
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button for non-detail view */}
        {!showDetails && (
          <div className="mt-4">
            <Link
              href={`/agent/${tokenId}`}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white py-3 px-4 rounded-2xl text-center block font-bold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>💬</span>
                <span>Chat with Agent</span>
              </div>
            </Link>
          </div>
        )}

        {/* Hover overlay effect */}
        {isHovered && (
          <div className="absolute top-4 right-4 z-20">
            <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg border border-white/20 animate-fade-in">
              Click to interact
            </div>
          </div>
        )}
      </div>
    </div>
  );
}