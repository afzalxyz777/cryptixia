// frontend/lib/traitMixing.ts

export interface TraitMixingResult {
  traits: string[];
  dominantPersonality: string;
  rarityScore: number;
}

/**
 * Preview trait mixing algorithm (client-side)
 * This mirrors the server-side algorithm for UI preview
 */
export function previewTraitMixing(
  parentATraits: string[],
  parentBTraits: string[]
): TraitMixingResult {
  // Combine all traits
  const allTraits = [...parentATraits, ...parentBTraits];
  
  // Remove duplicates but keep personality traits separate
  const personalityTraits = allTraits.filter(trait => 
    ['friendly', 'pragmatic', 'adventurous', 'cautious'].includes(trait.toLowerCase())
  );
  const otherTraits = allTraits.filter(trait => 
    !['friendly', 'pragmatic', 'adventurous', 'cautious'].includes(trait.toLowerCase())
  );

  // Determine dominant personality (most common, or random if tied)
  const personalityCounts: { [key: string]: number } = {};
  personalityTraits.forEach(trait => {
    personalityCounts[trait.toLowerCase()] = (personalityCounts[trait.toLowerCase()] || 0) + 1;
  });

  let dominantPersonality = 'friendly'; // default
  let maxCount = 0;
  Object.entries(personalityCounts).forEach(([personality, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantPersonality = personality;
    }
  });

  // Remove duplicates from other traits
  const uniqueOtherTraits = [...new Set(otherTraits)];
  
  // Create final trait list
  const finalTraits = [
    dominantPersonality,
    ...uniqueOtherTraits,
    'bred' // Special trait for bred agents
  ];

  // Calculate rarity score (more traits = rarer)
  const rarityScore = Math.min(100, finalTraits.length * 10 + Math.random() * 20);

  return {
    traits: finalTraits,
    dominantPersonality,
    rarityScore: Math.round(rarityScore)
  };
}

/**
 * Generate child metadata for IPFS
 */
export function generateChildMetadata(
  parentAId: string,
  parentBId: string,
  traits: string[],
  dominantPersonality: string
): any {
  return {
    name: `Cryptixia Agent (Gen 2)`,
    description: `A second-generation AI agent bred from Agent #${parentAId} and Agent #${parentBId}`,
    personality: dominantPersonality,
    traits: {
      personality: dominantPersonality,
      curious: traits.includes('curious'),
      friendly: traits.includes('friendly'),
      cautious: traits.includes('cautious'),
      pragmatic: traits.includes('pragmatic'),
      bred: true,
      generation: 2
    },
    parents: [parentAId, parentBId],
    memory_uri: "",
    created_at: new Date().toISOString(),
    generation: 2,
    rarity: calculateRarity(traits)
  };
}

/**
 * Calculate rarity based on trait combination
 */
export function calculateRarity(traits: string[]): string {
  const traitCount = traits.length;
  if (traitCount <= 3) return 'Common';
  if (traitCount <= 5) return 'Uncommon';
  if (traitCount <= 7) return 'Rare';
  if (traitCount <= 9) return 'Epic';
  return 'Legendary';
}

/**
 * Estimate breeding success probability
 */
export function estimateBreedingSuccess(
  parentATraits: string[],
  parentBTraits: string[],
  parentABreeds: number,
  parentBBreeds: number
): number {
  // Base success rate
  let successRate = 95;
  
  // Reduce success rate based on breeding count
  successRate -= parentABreeds * 2;
  successRate -= parentBBreeds * 2;
  
  // Trait compatibility bonus
  const commonTraits = parentATraits.filter(trait => parentBTraits.includes(trait));
  successRate += commonTraits.length * 5;
  
  return Math.max(50, Math.min(100, successRate));
}