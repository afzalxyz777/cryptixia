// pages/api/ipfs.ts
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { cid } = req.query

    if (!cid || typeof cid !== 'string') {
      return res.status(400).json({ error: 'CID is required' })
    }

    console.log('IPFS request for CID:', cid)

    // Try to fetch from IPFS gateways
    const gateways = [
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://dweb.link/ipfs/${cid}`
    ]

    for (const gateway of gateways) {
      try {
        console.log(`Trying gateway: ${gateway}`)

        const response = await fetch(gateway, {
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        if (response.ok) {
          const contentType = response.headers.get('content-type')

          if (contentType && contentType.includes('application/json')) {
            const data = await response.json()
            console.log(`✅ Success from ${gateway}`)
            return res.json(data)
          } else {
            const text = await response.text()
            console.log(`✅ Success from ${gateway} (text)`)
            return res.status(200).send(text)
          }
        }
      } catch (gatewayError) {
        console.log(`❌ Failed gateway ${gateway}:`, gatewayError)
        continue
      }
    }

    // If all gateways fail, return a mock response for development
    console.log('⚠️ All IPFS gateways failed, returning mock data')

    return res.json({
      name: `Mock Agent #${cid.slice(-6)}`,
      description: "Mock agent data for development (IPFS not available)",
      image: `https://api.dicebear.com/7.x/bottts/svg?seed=${cid}`,
      attributes: [
        { trait_type: "Status", value: "Mock Data" },
        { trait_type: "CID", value: cid }
      ],
      mock: true
    })

  } catch (error) {
    console.error('IPFS API error:', error)
    res.status(500).json({
      error: 'Failed to fetch from IPFS',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}