// frontend/lib/traitDescriptions.ts
export interface TraitDescription {
  name: string;
  description: string;
  category: 'personality' | 'skill' | 'behavior' | 'preference';
  type: 'boolean' | 'number' | 'string';
  defaultValue?: any;
  min?: number;
  max?: number;
}

export const TRAIT_DESCRIPTIONS: Record<string, TraitDescription> = {
  // Personality Traits
  curious: {
    name: 'Curious',
    description: 'How interested the agent is in exploring new topics and asking questions',
    category: 'personality',
    type: 'boolean',
    defaultValue: true
  },
  friendly: {
    name: 'Friendly',
    description: 'How warm and welcoming the agent is in conversations',
    category: 'personality',
    type: 'boolean',
    defaultValue: true
  },
  cautious: {
    name: 'Cautious',
    description: 'How carefully the agent considers risks before suggesting actions',
    category: 'behavior',
    type: 'boolean',
    defaultValue: false
  },
  pragmatic: {
    name: 'Pragmatic',
    description: 'How focused the agent is on practical, real-world solutions',
    category: 'behavior',
    type: 'boolean',
    defaultValue: true
  },
  
  // Skill Traits (0-100)
  intelligence: {
    name: 'Intelligence',
    description: 'Problem-solving and reasoning capability',
    category: 'skill',
    type: 'number',
    defaultValue: 75,
    min: 0,
    max: 100
  },
  creativity: {
    name: 'Creativity',
    description: 'Ability to generate novel ideas and solutions',
    category: 'skill',
    type: 'number',
    defaultValue: 60,
    min: 0,
    max: 100
  },
  empathy: {
    name: 'Empathy',
    description: 'Understanding and responding to emotional context',
    category: 'skill',
    type: 'number',
    defaultValue: 80,
    min: 0,
    max: 100
  },
  memory: {
    name: 'Memory Retention',
    description: 'How well the agent remembers past conversations',
    category: 'skill',
    type: 'number',
    defaultValue: 85,
    min: 0,
    max: 100
  },
  
  // Preference Traits
  humor: {
    name: 'Humor',
    description: 'Tendency to use jokes and lighthearted responses',
    category: 'preference',
    type: 'boolean',
    defaultValue: false
  },
  formal: {
    name: 'Formal Communication',
    description: 'Prefers structured, professional language',
    category: 'preference',
    type: 'boolean',
    defaultValue: false
  },
  analytical: {
    name: 'Analytical',
    description: 'Focuses on data and logical reasoning in responses',
    category: 'behavior',
    type: 'boolean',
    defaultValue: false
  },
  supportive: {
    name: 'Supportive',
    description: 'Emphasizes encouragement and positive reinforcement',
    category: 'behavior',
    type: 'boolean',
    defaultValue: true
  }
};

// Personality type mapping
export const PERSONALITY_TRAITS: Record<string, Partial<Record<string, any>>> = {
  friendly: {
    friendly: true,
    empathy: 85,
    supportive: true,
    humor: true
  },
  pragmatic: {
    pragmatic: true,
    analytical: true,
    intelligence: 90,
    formal: true
  },
  adventurous: {
    curious: true,
    creativity: 95,
    cautious: false,
    humor: true
  },
  cautious: {
    cautious: true,
    formal: true,
    analytical: true,
    memory: 90
  }
};

export const getTraitDescription = (traitName: string): TraitDescription | null => {
  return TRAIT_DESCRIPTIONS[traitName] || null;
};

export const getTraitsByCategory = (category: string): Record<string, TraitDescription> => {
  return Object.fromEntries(
    Object.entries(TRAIT_DESCRIPTIONS).filter(([_, trait]) => trait.category === category)
  );
};

export const generateDefaultTraits = (personality: string): Record<string, any> => {
  const baseTraits = PERSONALITY_TRAITS[personality] || {};
  const allDefaults = Object.fromEntries(
    Object.entries(TRAIT_DESCRIPTIONS).map(([key, trait]) => [key, trait.defaultValue])
  );
  
  return { ...allDefaults, ...baseTraits, personality };
};

// UX Copy for the app
export const UX_COPY = {
  agent: {
    noTraitsYet: "No custom traits have been set for this agent yet. Start by editing some basic personality traits!",
    traitUpdated: "Trait updated successfully!",
    traitUpdateFailed: "Failed to update trait. Please try again.",
    avatarGenerating: "Generating your unique avatar...",
    avatarFailed: "Avatar generation failed. Using default avatar."
  },
  traits: {
    editMode: "You're now editing traits. Changes will be saved automatically.",
    categories: {
      personality: "Core Personality",
      skill: "Abilities & Skills",
      behavior: "Behavioral Patterns",
      preference: "Communication Style"
    }
  },
  breeding: {
    selectParents: "Select two agents to breed and create a new offspring with combined traits",
    inheritanceInfo: "The child agent will inherit a mix of traits from both parents"
  }
};

export const formatTraitName = (traitName: string): string => {
  return traitName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getTraitColor = (traitName: string, value: any): string => {
  const trait = getTraitDescription(traitName);
  if (!trait) return 'bg-gray-600';

  switch (trait.category) {
    case 'personality':
      return typeof value === 'boolean' && value ? 'bg-green-600' : 'bg-gray-600';
    case 'skill':
      if (typeof value === 'number') {
        if (value >= 80) return 'bg-purple-600';
        if (value >= 60) return 'bg-blue-600';
        if (value >= 40) return 'bg-yellow-600';
        return 'bg-orange-600';
      }
      return 'bg-blue-600';
    case 'behavior':
      return typeof value === 'boolean' && value ? 'bg-indigo-600' : 'bg-gray-600';
    case 'preference':
      return typeof value === 'boolean' && value ? 'bg-pink-600' : 'bg-gray-600';
    default:
      return 'bg-gray-600';
  }
};