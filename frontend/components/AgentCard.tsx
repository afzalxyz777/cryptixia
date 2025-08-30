"use client";

import React from "react";

interface Agent {
  id: string;
  name: string;
  personality: string;
  traits: Record<string, any>;
  avatar: string; // IPFS or data URI
}

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className="p-6 rounded-xl bg-gray-800 shadow-md max-w-lg mx-auto">
      {/* Avatar */}
      <div className="flex justify-center mb-4">
        <img
          src={agent.avatar}
          alt={`${agent.name} avatar`}
          className="w-32 h-32 rounded-full border-2 border-purple-600 object-cover"
        />
      </div>

      {/* Name & Personality */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-gray-100">{agent.name}</h1>
        <p className="text-gray-400 italic">{agent.personality}</p>
      </div>

      {/* Traits */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200 mb-2">Traits</h2>
        <ul className="grid grid-cols-2 gap-2">
          {Object.entries(agent.traits).map(([key, value]) => (
            <li
              key={key}
              className="px-3 py-1 bg-gray-700 rounded text-sm text-gray-100"
            >
              {key}: {String(value)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
