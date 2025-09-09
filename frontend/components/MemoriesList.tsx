// frontend/components/MemoriesList.tsx
import { useEffect, useState } from 'react';

interface Memory {
  id: string;
  text: string;
  score: number;
}

interface MemoriesListProps {
  agentId: string;
}

export default function MemoriesList({ agentId }: MemoriesListProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load memories when component mounts
  useEffect(() => {
    if (agentId) {
      loadMemories();
    }
  }, [agentId]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`http://localhost:3001/api/memories?agentId=${encodeURIComponent(agentId)}&topK=20`);
      
      if (!response.ok) {
        throw new Error(`Failed to load memories: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.memories) {
        // Sort by confidence score (higher is better)
        const sortedMemories = data.memories.sort((a: Memory, b: Memory) => b.score - a.score);
        setMemories(sortedMemories);
      } else {
        setMemories([]);
      }
    } catch (err) {
      console.error('Error loading memories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load memories');
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (memoryId: string, text: string) => {
    if (!confirm(`Are you sure you want to delete this memory?\n\n"${text.substring(0, 100)}..."`)) {
      return;
    }

    try {
      setDeleting(memoryId);
      
      const response = await fetch('http://localhost:3001/api/memories', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memoryId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete memory: ${response.statusText}`);
      }

      // Remove from local state immediately for better UX
      setMemories(prev => prev.filter(memory => memory.id !== memoryId));
      
      // Show success feedback
      console.log('Memory deleted successfully');
      
    } catch (err) {
      console.error('Error deleting memory:', err);
      alert(`Failed to delete memory: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeleting(null);
    }
  };

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1);
  };

  const formatDate = (memoryId: string) => {
    // Extract timestamp from UUID-based memory ID if possible
    // For now, just show "Recently" since we don't have explicit timestamps
    return "Recently";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-3 text-gray-400">Loading memories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 mb-4">Error: {error}</div>
        <button
          onClick={loadMemories}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🧠</div>
        <div className="text-gray-400 mb-2">No memories yet</div>
        <p className="text-gray-500 text-sm">
          Start chatting with your agent to build memories!
        </p>
        <button
          onClick={loadMemories}
          className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Found {memories.length} memories
        </div>
        <button
          onClick={loadMemories}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          Refresh
        </button>
      </div>

      {/* Memories List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {memories.map((memory) => (
          <div
            key={memory.id}
            className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500"
          >
            {/* Memory Content */}
            <div className="flex justify-between items-start mb-2">
              <p className="text-white text-sm leading-relaxed flex-1 mr-4">
                {memory.text}
              </p>
              
              {/* Delete Button */}
              <button
                onClick={() => deleteMemory(memory.id, memory.text)}
                disabled={deleting === memory.id}
                className={`flex-shrink-0 p-1 rounded transition-colors ${
                  deleting === memory.id
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                }`}
                title="Forget this memory"
              >
                {deleting === memory.id ? '⏳' : '🗑️'}
              </button>
            </div>

            {/* Memory Metadata */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-3">
                <span>📅 {formatDate(memory.id)}</span>
                <span>📊 Confidence: {formatScore(memory.score)}%</span>
              </div>
              <div className="text-gray-500 font-mono text-xs">
                {memory.id.substring(0, 8)}...
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-gray-700">
        <div className="flex space-x-3">
          <button
            onClick={loadMemories}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            🔄 Refresh Memories
          </button>
          <div className="flex-1"></div>
          <div className="text-xs text-gray-500">
            Memories are ranked by relevance confidence
          </div>
        </div>
      </div>
    </div>
  );
}