// server/api/generateAvatar.ts
import { Request, Response } from "express";
import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection"; // avatar style

export default function generateAvatarHandler(req: Request, res: Response) {
  try {
    const tokenId = String(req.query.tokenId ?? req.query.id ?? "anon");
    const seed = String(req.query.seed ?? "default");
    const size = Number(req.query.size ?? 128);

    // deterministic seed
    const avatarSeed = `${tokenId}-${seed}`;

    const svg = createAvatar(bottts, {
      seed: avatarSeed,
      size,
    }).toString();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.status(200).send(svg);
  } catch (err) {
    console.error("generateAvatar error:", err);
    res.status(500).json({ error: "Avatar generation failed" });
  }
}
