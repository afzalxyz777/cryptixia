// frontend/pages/api/generateAvatar.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const tokenId = String(req.query.tokenId ?? req.query.id ?? "anon");
    const size = Number(req.query.size ?? 128);
    const format = String(req.query.format ?? "svg"); // svg or png

    let seed = String(req.query.seed ?? "default");

    // Create a more deterministic seed based on tokenId and personality
    if (tokenId && tokenId !== "anon") {
      seed = `${tokenId}-${req.query.seed || 'default'}`;
    }

    // Dynamic import for ES modules - these need to be installed
    try {
      const { createAvatar } = await import('@dicebear/core');
      const { bottts } = await import('@dicebear/collection');

      // Create the avatar SVG
      const svg = createAvatar(bottts, { 
        seed, 
        size,
        // Add some customization based on personality
        backgroundColor: req.query.seed === 'friendly' ? ['#22c55e'] :
                        req.query.seed === 'pragmatic' ? ['#3b82f6'] :
                        req.query.seed === 'adventurous' ? ['#f97316'] :
                        req.query.seed === 'cautious' ? ['#8b5cf6'] :
                        ['#6b7280']
      }).toString();

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      // For now, always return SVG (you can add PNG support later with sharp)
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.status(200).send(svg);
      
    } catch (importError) {
      console.error('DiceBear import error:', importError);
      
      // Fallback: generate a simple SVG avatar
      const colors = {
        friendly: '#22c55e',
        pragmatic: '#3b82f6', 
        adventurous: '#f97316',
        cautious: '#8b5cf6',
        default: '#6b7280'
      };
      
      const color = colors[req.query.seed as keyof typeof colors] || colors.default;
      const emoji = req.query.seed === 'friendly' ? '😊' :
                   req.query.seed === 'pragmatic' ? '🧠' :
                   req.query.seed === 'adventurous' ? '🚀' :
                   req.query.seed === 'cautious' ? '🛡️' : '🤖';
      
      const fallbackSvg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${color}"/>
          <text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-size="${size/3}" fill="white">
            ${emoji}
          </text>
        </svg>
      `;
      
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.status(200).send(fallbackSvg);
    }
    
  } catch (err) {
    console.error('generateAvatar error:', err);
    res.status(500).json({ error: 'Avatar generation failed' });
  }
}