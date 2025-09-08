// server/api/generateAvatar.ts - Using dynamic imports
import { Request, Response } from "express";
import sharp from "sharp";
import { loadChildren } from "./storage";

export default async function generateAvatarHandler(req: Request, res: Response) {
  try {
    const tokenId = String(req.query.tokenId ?? req.query.id ?? "anon");
    const size = Number(req.query.size ?? 128);
    const format = String(req.query.format ?? "svg"); // svg or png

    let seed = String(req.query.seed ?? "default");

    // If it's a child token, use child data for unique avatar
    if (tokenId.startsWith("child_")) {
      try {
        const children = await loadChildren();
        const child = children[tokenId];
        if (child && typeof child === "object") {
          const traitValues = Object.values(child).map((v) => String(v));
          seed = `${tokenId}-${traitValues.join("-")}`;
        }
      } catch (err) {
        console.warn("Could not load children data:", err);
        seed = tokenId;
      }
    }

    // Dynamic import for ES modules
    const { createAvatar } = await import("@dicebear/core");
    const { bottts } = await import("@dicebear/collection");

    // Create the avatar SVG
    const svg = createAvatar(bottts, { seed, size }).toString();

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Return PNG if requested
    if (format === "png") {
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(png);
    }

    // Default: return SVG
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.status(200).send(svg);
    
  } catch (err) {
    console.error("generateAvatar error:", err);
    res.status(500).json({ error: "Avatar generation failed" });
  }
}