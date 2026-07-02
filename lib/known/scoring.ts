import { FACET_QUESTIONS, DOMAIN_FACETS } from './ring1-questions'

// ── Core scoring ──────────────────────────────────────────────────────────────

export function reverseScore(value: number): number {
  return 6 - value
}

/** Returns average of the 4 facet items after reverse-scoring, or null if any are missing. */
export function computeFacetScore(
  facet: string,
  responses: Map<number, number>
): number | null {
  const items = FACET_QUESTIONS.get(facet)
  if (!items || items.length !== 4) return null

  let sum = 0
  for (const item of items) {
    const raw = responses.get(item.id)
    if (raw === undefined) return null
    sum += item.reverseScored ? reverseScore(raw) : raw
  }
  return sum / 4
}

/** Returns average of all resolved facet scores for the domain (skips null facets). */
export function computeDomainScore(
  domain: string,
  facetScores: Map<string, number | null>
): number | null {
  const facets = DOMAIN_FACETS[domain] ?? []
  const resolved: number[] = []
  for (const f of facets) {
    const s = facetScores.get(f)
    if (s !== null && s !== undefined) resolved.push(s)
  }
  if (resolved.length === 0) return null
  return resolved.reduce((a, b) => a + b, 0) / resolved.length
}

// ── Trait word table ──────────────────────────────────────────────────────────
// Thresholds: score >= 3.5 → high | score >= 2.5 → mid | score < 2.5 → low

const TRAIT_WORDS: Record<string, { low: string; mid: string; high: string }> = {
  // Neuroticism
  Anxiety:             { low: 'Grounded',       mid: 'Attuned',       high: 'Anxious'       },
  Anger:               { low: 'Patient',         mid: 'Firm',          high: 'Volatile'      },
  Depression:          { low: 'Buoyant',         mid: 'Steady',        high: 'Brooding'      },
  'Self-Consciousness':{ low: 'Assured',         mid: 'Reflective',    high: 'Guarded'       },
  Immoderation:        { low: 'Tempered',        mid: 'Flexible',      high: 'Impulsive'     },
  Vulnerability:       { low: 'Resilient',       mid: 'Adaptive',      high: 'Fragile'       },

  // Extraversion
  Friendliness:        { low: 'Reserved',        mid: 'Warm',          high: 'Radiant'       },
  Gregariousness:      { low: 'Private',         mid: 'Social',        high: 'Gregarious'    },
  Assertiveness:       { low: 'Deferential',     mid: 'Poised',        high: 'Commanding'    },
  'Activity Level':    { low: 'Measured',        mid: 'Active',        high: 'Energized'     },
  'Excitement-Seeking':{ low: 'Cautious',        mid: 'Daring',        high: 'Bold'          },
  Cheerfulness:        { low: 'Serious',         mid: 'Upbeat',        high: 'Vibrant'       },

  // Openness
  Imagination:         { low: 'Literal',         mid: 'Creative',      high: 'Imaginative'   },
  'Artistic Interests':{ low: 'Practical',       mid: 'Perceptive',    high: 'Aesthetic'     },
  Emotionality:        { low: 'Detached',        mid: 'Expressive',    high: 'Sensitive'     },
  Adventurousness:     { low: 'Familiar',        mid: 'Curious',       high: 'Expansive'     },
  Intellect:           { low: 'Concrete',        mid: 'Inquisitive',   high: 'Analytical'    },
  Liberalism:          { low: 'Traditional',     mid: 'Open',          high: 'Progressive'   },

  // Agreeableness
  Trust:               { low: 'Vigilant',        mid: 'Discerning',    high: 'Trusting'      },
  Morality:            { low: 'Pragmatic',       mid: 'Principled',    high: 'Sincere'       },
  Altruism:            { low: 'Self-sufficient', mid: 'Considerate',   high: 'Generous'      },
  Cooperation:         { low: 'Direct',          mid: 'Flexible',      high: 'Harmonious'    },
  Modesty:             { low: 'Confident',       mid: 'Humble',        high: 'Modest'        },
  Sympathy:            { low: 'Objective',       mid: 'Caring',        high: 'Compassionate' },

  // Conscientiousness
  'Self-Efficacy':     { low: 'Tentative',       mid: 'Capable',       high: 'Masterful'     },
  Orderliness:         { low: 'Spontaneous',     mid: 'Organized',     high: 'Methodical'    },
  Dutifulness:         { low: 'Flexible',        mid: 'Reliable',      high: 'Dutiful'       },
  'Achievement-Striving': { low: 'Laid-back',    mid: 'Driven',        high: 'Ambitious'     },
  'Self-Discipline':   { low: 'Fluid',           mid: 'Steady',        high: 'Disciplined'   },
  Cautiousness:        { low: 'Spontaneous',     mid: 'Deliberate',    high: 'Careful'       },
}

export function getTraitWord(facet: string, score: number): string {
  const words = TRAIT_WORDS[facet]
  if (!words) return 'Balanced'
  if (score >= 3.5) return words.high
  if (score >= 2.5) return words.mid
  return words.low
}

// ── Facet descriptions for Pattern Detected screen ───────────────────────────

export const FACET_DESCRIPTIONS: Record<string, string> = {
  // Neuroticism
  Anxiety:              "Your responses showed a clear signal around how you hold uncertainty and anticipation.",
  Anger:                "Your responses revealed a pattern in how quickly you respond to friction and frustration.",
  Depression:           "Your responses showed a signal in how you move through low emotional states.",
  'Self-Consciousness': "Your responses revealed a pattern in how you navigate social attention.",
  Immoderation:         "Your responses showed a signal in how you relate to impulse and desire.",
  Vulnerability:        "Your responses revealed a pattern in how you respond under pressure.",
  // Extraversion
  Friendliness:         "Your responses showed a clear signal in how you warm up to new people.",
  Gregariousness:       "Your responses revealed a pattern in how you relate to groups and crowds.",
  Assertiveness:        "Your responses showed a signal in how you take up space and lead.",
  'Activity Level':     "Your responses revealed a pattern in your relationship with pace and busyness.",
  'Excitement-Seeking': "Your responses showed a signal in how drawn you are toward novelty and risk.",
  Cheerfulness:         "Your responses revealed a pattern in your baseline emotional brightness.",
  // Openness
  Imagination:          "Your responses showed a signal in how freely your mind wanders and creates.",
  'Artistic Interests':  "Your responses revealed a pattern in how deeply you engage with beauty.",
  Emotionality:         "Your responses showed a signal in how you access your inner emotional life.",
  Adventurousness:      "Your responses revealed a pattern around variety and the unfamiliar.",
  Intellect:            "Your responses showed a signal in how you engage with ideas and complexity.",
  Liberalism:           "Your responses revealed a pattern in how you relate to tradition and change.",
  // Agreeableness
  Trust:                "Your responses showed a signal in how you approach the motives of others.",
  Morality:             "Your responses revealed a pattern in how you relate to honesty and integrity.",
  Altruism:             "Your responses showed a signal in how naturally you orient toward others.",
  Cooperation:          "Your responses revealed a pattern in how you handle friction and disagreement.",
  Modesty:              "Your responses showed a signal in how you hold yourself relative to others.",
  Sympathy:             "Your responses revealed a pattern in how readily you feel and express care.",
  // Conscientiousness
  'Self-Efficacy':      "Your responses showed a signal in how much you trust your own abilities.",
  Orderliness:          "Your responses revealed a pattern in how you relate to structure and neatness.",
  Dutifulness:          "Your responses showed a signal in how you hold promises and obligations.",
  'Achievement-Striving': "Your responses revealed a pattern in how driven you are toward goals.",
  'Self-Discipline':    "Your responses showed a signal in how you initiate and sustain effort.",
  Cautiousness:         "Your responses showed a pattern of holding space before committing.",
}
