// pages/api/generateAvatar.ts
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { templateId, traits, seed } = req.body

    if (!templateId || !seed) {
      return res.status(400).json({
        error: 'Missing required fields: templateId and seed are required'
      })
    }

    console.log('🎨 Generating avatar for template:', templateId, 'seed:', seed)

    // Try to use your Express server first
    try {
      const response = await fetch('http://localhost:3001/api/generateAvatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cryptixia-NextJS/1.0'
        },
        body: JSON.stringify({ templateId, traits, seed }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (response.ok) {
        const contentType = response.headers.get('content-type')

        // Check if it's JSON response
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          console.log('✅ Express server JSON response:', data)
          return res.json(data)
        } else {
          console.log('⚠️ Express server returned non-JSON, using fallback')
        }
      } else {
        console.log('❌ Express server error:', response.status, response.statusText)
      }
    } catch (expressError) {
      console.log('⚠️ Express server not available, using fallback avatar:', expressError instanceof Error ? expressError.message : 'Unknown error')
    }

    // Fallback: Generate avatar URL using DiceBear API
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${templateId}-${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9&randomizeIds=true`

    console.log('🔄 Using fallback avatar URL:', avatarUrl)

    res.json({
      avatarUrl,
      status: 'success',
      templateId,
      seed,
      source: 'fallback',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Avatar generation error:', error)
    res.status(500).json({
      error: 'Failed to generate avatar',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}