"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AgentCard from "../../components/AgentCard";
import VoiceButton from "../../components/VoiceButton";

interface Memory {
  id: string;
  text: string;
  score: number;
}

interface Agent {
  id: string;
  name: string;
  personality: string;
  traits: Record<string, any>;
  avatar: string;
}

export default function AgentPage() {
  const router = useRouter();
  const { id } = router.query;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  // Fetch agent metadata
  useEffect(() => {
    if (!id) return;

    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/getAgent?id=${id}`);
        const data = await res.json();
        setAgent(data.agent);
      } catch (err) {
        console.error("Failed to fetch agent:", err);
      }
    };

    fetchAgent();
  }, [id]);

  // Fetch top 5 memories
  const fetchMemories = async () => {
    if (!id) return;
    setLoadingMemories(true);
    try {
      const res = await fetch(`/api/embeddings/listMemories?userId=${id}&topK=5`);
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (err) {
      console.error("Failed to fetch memories:", err);
    } finally {
      setLoadingMemories(false);
    }
  };

  // Live update every 10s
  useEffect(() => {
    fetchMemories();
    const interval = setInterval(fetchMemories, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      await fetch(`/api/embeddings/deleteMemory?id=${memoryId}`, { method: "DELETE" });
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {agent && <AgentCard agent={agent} />}

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-gray-200 mb-3">Memories (Top 5)</h2>
        {loadingMemories && <p className="text-gray-400">Loading memories...</p>}
        {memories.length === 0 && !loadingMemories && (
          <p className="text-gray-400">No memories yet.</p>
        )}
        <ul className="space-y-3">
          {memories.map((m) => (
            <li
              key={m.id}
              className="p-3 rounded-lg bg-gray-800 text-gray-100 flex justify-between items-center"
            >
              <span>{m.text}</span>
              <button
                className="ml-4 px-2 py-1 text-sm bg-red-600 hover:bg-red-500 rounded"
                onClick={() => handleDeleteMemory(m.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-200 mb-3">Talk to Agent</h2>
        <VoiceButton
          onResponse={() => {
            fetchMemories(); // refresh memories after each interaction
          }}
        />
      </div>
    </div>
  );
}
