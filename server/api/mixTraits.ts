// server/api/mixTraits.ts
import { Router, Request, Response } from "express";
import { addChild } from "./storage";

const router = Router();

/**
 * Simple trait-mixing function
 * - Numeric traits: average and round
 * - Categorical traits: pick randomly between parents
 */
function mixTraits(parentA: Record<string, any>, parentB: Record<string, any>) {
  const child: Record<string, any> = {};

  for (const key of new Set([...Object.keys(parentA), ...Object.keys(parentB)])) {
    const valA = parentA[key];
    const valB = parentB[key];

    if (typeof valA === "number" && typeof valB === "number") {
      child[key] = Math.round((valA + valB) / 2);
    } else if (typeof valA === "string" && typeof valB === "string") {
      child[key] = Math.random() < 0.5 ? valA : valB;
    } else {
      child[key] = valA ?? valB ?? null;
    }
  }

  // Increment generation if parents have it
  const genA = parentA.Generation ?? 1;
  const genB = parentB.Generation ?? 1;
  child.Generation = Math.max(genA, genB) + 1;

  return child;
}

// POST /api/mixTraits
router.post("/", async (req: Request, res: Response) => {
  try {
    const { parentA, parentB, parentAId, parentBId } = req.body;

    if (!parentA || !parentB) {
      return res.status(400).json({ error: "Both parentA and parentB traits are required" });
    }

    const child = mixTraits(parentA, parentB);

    // Save child to storage
    const childId = await addChild(child);

    res.json({
      success: true,
      childId,
      child,
      parents: { parentAId: parentAId ?? null, parentBId: parentBId ?? null },
    });
  } catch (err) {
    console.error("mixTraits error:", err);
    res.status(500).json({ error: "Failed to mix traits" });
  }
});

export default router;
