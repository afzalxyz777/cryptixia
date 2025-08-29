// pages/api/pinMetadata.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const metadata = req.body;

    if (!metadata) {
      return res.status(400).json({ error: 'Metadata is required' });
    }

    console.log('Pinning metadata:', metadata);

    // For now, create a mock CID since we don't have IPFS setup yet
    // Dev3 should replace this with actual IPFS pinning
    const mockCid = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    // Simulate IPFS upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.status(200).json({
      success: true,
      cid: mockCid,
      ipfsUrl: `ipfs://${mockCid}`,
      metadata: metadata
    });

  } catch (error) {
    console.error('Error pinning metadata:', error);
    res.status(500).json({ 
      error: 'Failed to pin metadata to IPFS',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}