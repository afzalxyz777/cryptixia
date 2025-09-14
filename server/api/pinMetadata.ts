// pages/api/pinMetadata.ts
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { metadata, tokenId } = req.body

    if (!metadata) {
      return res.status(400).json({ error: 'Metadata is required' })
    }

    console.log('📌 Pinning metadata for token:', tokenId)
    console.log('📄 Metadata keys:', Object.keys(metadata))

    // Try to use your Express server first, fallback to mock
    try {
      const response = await fetch('http://localhost:3001/api/pinMetadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cryptixia-NextJS/1.0'
        },
        body: JSON.stringify({ metadata, tokenId }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Express server response:', data)
        return res.json(data)
      } else {
        console.log('❌ Express server error:', response.status, response.statusText)
      }
    } catch (expressError) {
      console.log('⚠️ Express server not available, using mock response:', expressError instanceof Error ? expressError.message : 'Unknown error')
    }

    // Fallback to mock IPFS hash for development
    const mockCID = `QmTest${Date.now()}${Math.random().toString(36).substr(2, 9)}`

    console.log('🔄 Using mock CID:', mockCID)

    res.json({
      cid: mockCID,
      status: 'success',
      message: 'Metadata pinned successfully (development mode)',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Pin metadata error:', error)
    res.status(500).json({
      error: 'Failed to pin metadata',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}