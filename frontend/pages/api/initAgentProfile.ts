// pages/api/initAgentProfile.ts
import { NextApiRequest, NextApiResponse } from 'next';

interface AgentProfile {
  agentId: string;
  personality: string;
  memories: any[];
  created_at: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { personality } = req.body;

    if (!personality) {
      return res.status(400).json({ error: 'Personality is required' });
    }

    // Create initial agent profile
    const agentProfile: AgentProfile = {
      agentId: `agent_${Date.now()}`,
      personality,
      memories: [], // Empty memories array to start
      created_at: new Date().toISOString()
    };

    // For now, we'll create a simple hash
    // Dev3 should replace this with actual vector database setup
    const profileHash = Buffer.from(JSON.stringify(agentProfile)).toString('base64');
    
    // Return both the profile and a memory_uri
    const memory_uri = `memory://${profileHash}`;

    res.status(200).json({
      success: true,
      agentProfile,
      memory_uri
    });

  } catch (error) {
    console.error('Error creating agent profile:', error);
    res.status(500).json({ error: 'Failed to create agent profile' });
  }
}