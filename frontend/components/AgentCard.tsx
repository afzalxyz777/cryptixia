// frontend/components/AgentCard.tsx - UPDATED WITH BREEDING MODE
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface AgentCardProps {
  agent: {
    name: string;
    description: string;
    personality?: string;
    traits?: {
      personality?: string;
      curious?: boolean;
      friendly?: boolean;
      cautious?: boolean;
      pragmatic?: boolean;
      [key: string]: any; // Allow additional traits
    };
    memory_uri?: string;
    created_at: string;
    avatar_data_url?: string; // New field for avatar
  };
  tokenId: string;
  showDetails?: boolean;
  onTraitsUpdate?: (newTraits: any) => void; // Callback for trait updates

  // ✅ NEW PROPS FOR BREEDING MODE:
  selectionMode?: 'none' | 'parent1' | 'parent2';
  isSelected?: boolean;
  onSelect?: (tokenId: string, mode: 'parent1' | 'parent2') => void;
  disabled?: boolean;
  disabledReason?: string;
}

// Enhanced avatar generation using API
const useAgentAvatar = (tokenId: string, traits?: any) => {
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generateAvatar = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

        const response = await fetch(`${apiUrl}/api/generateAvatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenId, traits })
        });

        if (response.ok) {
          const data = await response.json();
          setAvatarUrl(data.avatar_data_url || data.avatarUrl);
        } else {
          setAvatarUrl(getSimpleAvatar(traits?.personality));
        }
      } catch (error) {
        console.warn('Avatar generation failed, using fallback:', error);
        setAvatarUrl(getSimpleAvatar(traits?.personality));
      } finally {
        setLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      generateAvatar();
    }
  }, [tokenId, traits]);

  return { avatarUrl, loading };
};

// Fallback simple avatar generator
const getSimpleAvatar = (personality?: string): string => {
  if (typeof window === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const colors = {
    friendly: '#10B981',
    pragmatic: '#3B82F6',
    adventurous: '#F59E0B',
    cautious: '#8B5CF6'
  };

  const bgColor = colors[personality as keyof typeof colors] || '#6B7280';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 64, 64);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(18, 20, 8, 8);
  ctx.fillRect(38, 20, 8, 8);
  ctx.fillRect(24, 40, 16, 4);

  return canvas.toDataURL();
};

export default function AgentCard({
  agent,
  tokenId,
  showDetails = false,
  onTraitsUpdate,
  selectionMode = 'none',
  isSelected = false,
  onSelect,
  disabled = false,
  disabledReason
}: AgentCardProps) {
  const [isEditingTraits, setIsEditingTraits] = useState(false);
  const [editableTraits, setEditableTraits] = useState(agent.traits || {});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { avatarUrl, loading: avatarLoading } = useAgentAvatar(tokenId, agent.traits);
  const actualPersonality = agent.personality || agent.traits?.personality || '';

  const formatPersonality = (personality?: string): string => {
    if (!personality || typeof personality !== 'string') return 'Unknown';
    return personality.charAt(0).toUpperCase() + personality.slice(1);
  };

  const handleTraitChange = (traitName: string, value: any) => {
    setEditableTraits(prev => ({
      ...prev,
      [traitName]: value
    }));
  };

  const saveTraits = async () => {
    try {
      if (onTraitsUpdate) {
        onTraitsUpdate(editableTraits);
      }
      setIsEditingTraits(false);
    } catch (error) {
      console.error('Error saving traits:', error);
      alert('Failed to save traits');
    }
  };

  const cancelEdit = () => {
    setEditableTraits(agent.traits || {});
    setIsEditingTraits(false);
  };

  const getEditableTraits = () => {
    const traits = { ...editableTraits };
    delete traits.personality;
    return Object.entries(traits);
  };

  if (!mounted) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
        <div className="animate-pulse">
          <div className="h-20 w-20 bg-gray-700 rounded-full mb-4"></div>
          <div className="h-6 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
      {/* ... existing UI (avatar, traits, etc.) ... */}

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

      {/* ✅ NEW: Selection buttons for breeding mode */}
      {selectionMode && selectionMode !== 'none' && (
        <div className="mt-4">
          <button
            onClick={() => onSelect?.(tokenId, selectionMode)}
            disabled={disabled}
            className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
              isSelected
                ? selectionMode === 'parent1'
                  ? 'bg-blue-600 text-white'
                  : 'bg-green-600 text-white'
                : disabled
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : selectionMode === 'parent1'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {disabled
              ? disabledReason
              : isSelected
              ? `Selected as ${selectionMode === 'parent1' ? 'Parent 1' : 'Parent 2'} ✓`
              : `Select as ${selectionMode === 'parent1' ? 'Parent 1' : 'Parent 2'}`}
          </button>
        </div>
      )}
    </div>
  );
}
