import 'server-only'

import { facetTraitWords } from '@/lib/known/scoring'
import { evaluateRelationships, relationshipSignature, type FiredRelationship, type RevealedTrait } from '@/lib/known/relationships'
import { THEMES, type ThemeDefinition } from '@/lib/known/relationshipDefinitions'

// Validation for generateRelationshipInsight's arguments, which arrive from
// the browser. The request names a relationship and the signals it rests on;
// it is accepted only if the engine itself fires that relationship from
// exactly those signals (so the id exists, every signal belongs to it with the
// right direction, at least `min` are met, the anchor is present, and a
// tension is same-domain with opposite directions) and every trait word is
// the facet's real word for that direction. Nothing free-form reaches the
// prompt: facet names, words and directions are all checked against our
// own tables.

export interface RelationshipRequest {
  relationship: FiredRelationship
  theme: ThemeDefinition | null
}

const MAX_SIGNALS = 8

export function parseRelationshipRequest(relationshipId: unknown, signals: unknown): RelationshipRequest | null {
  if (typeof relationshipId !== 'string' || relationshipId.length > 80) return null
  if (!Array.isArray(signals) || signals.length < 2 || signals.length > MAX_SIGNALS) return null

  const seen = new Set<string>()
  const traits: RevealedTrait[] = []
  for (const s of signals) {
    if (!s || typeof s !== 'object') return null
    const { facet, direction, traitWord } = s as Record<string, unknown>
    if (typeof facet !== 'string' || seen.has(facet)) return null
    if (direction !== 'high' && direction !== 'low') return null
    const words = facetTraitWords(facet)
    if (!words || traitWord !== words[direction]) return null
    seen.add(facet)
    traits.push({ facet, direction, traitWord })
  }

  const fired = evaluateRelationships(traits).find((r) => r.id === relationshipId)
  if (!fired) return null
  // Exactly the signals the relationship rests on — no extras.
  const submitted = traits.map((t) => `${t.facet}:${t.direction}`).sort().join(',')
  if (relationshipSignature(fired) !== submitted) return null

  return { relationship: fired, theme: THEMES.find((t) => t.id === fired.id) ?? null }
}
