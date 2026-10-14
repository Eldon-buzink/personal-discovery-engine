/**
 * lib/known/relationships.ts
 *
 * Pure engine for relationship insights on Ring 1 trait cards: which
 * relationships (lib/known/relationshipDefinitions.ts) fire for the user's
 * revealed traits, and which single one each trait shows.
 *
 * Rules:
 * - A signal is a revealed facet whose direction is high or low; mid never
 *   counts, and unrevealed facets never count (callers pass revealed Ring 1
 *   entries only).
 * - Themes: every `requires` signal met, plus at least `min` of `signals`.
 * - Themes: ACTIVE_THEMES only (all themes are currently parked).
 * - Tensions: two revealed facets in the same domain, one high and one low,
 *   curated pairs only (CURATED_TENSIONS_ONLY). When raw scores are passed
 *   (the report does; the server check doesn't), the high facet must score
 *   at least TENSION_MIN_SCORE_GAP above the low one.
 * - Facets in RELATIONSHIP_EXCLUDED_FACETS are ignored entirely.
 * - Priority: more met signals first; ties go to themes (in definition order)
 *   before tensions (curated table order, then remaining pairs in domain
 *   order). Each trait shows the highest-priority relationship it is part of.
 */

import { DOMAIN_FACETS } from './ring1-questions'
import {
  CURATED_TENSIONS_ONLY,
  RELATIONSHIP_EXCLUDED_FACETS,
  TENSION_MIN_SCORE_GAP,
  TENSION_GROUNDINGS,
  ACTIVE_THEMES,
  type RelationshipSignal,
  type SignalDirection,
  type ThemeDefinition,
} from './relationshipDefinitions'

export interface RevealedTrait {
  facet: string
  traitWord: string
  direction: 'high' | 'mid' | 'low'
  // Raw facet score (1–5), when known. Only used for the tension thresholds.
  score?: number | null
}

export interface FiredSignal extends RelationshipSignal {
  traitWord: string
}

export interface FiredRelationship {
  id: string
  kind: 'theme' | 'tension'
  // Contributing signals, in definition order (tensions: high facet first).
  signals: FiredSignal[]
  // Priority position (0 = highest); stable for the same input.
  rank: number
  // Tensions only: the curated grounding line, when the pair has one.
  grounding?: string
}

export const TENSION_PREFIX = 'tension:'

export function tensionId(highFacet: string, lowFacet: string): string {
  return `${TENSION_PREFIX}${highFacet}|${lowFacet}`
}

export function domainOfFacet(facet: string): string | null {
  for (const [domain, facets] of Object.entries(DOMAIN_FACETS)) if (facets.includes(facet)) return domain
  return null
}

function signalsOf(traits: RevealedTrait[]): Map<string, FiredSignal> {
  const out = new Map<string, FiredSignal>()
  for (const t of traits) {
    if (t.direction === 'mid' || RELATIONSHIP_EXCLUDED_FACETS.includes(t.facet)) continue
    out.set(t.facet, { facet: t.facet, direction: t.direction, traitWord: t.traitWord })
  }
  return out
}

const met = (signals: Map<string, FiredSignal>, s: RelationshipSignal) => {
  const got = signals.get(s.facet)
  return got && got.direction === s.direction ? got : null
}

// Every relationship that fires, highest priority first. `themes` defaults to
// ACTIVE_THEMES; tests pass the parked themes to keep that path covered.
export function evaluateRelationships(traits: RevealedTrait[], themes: ThemeDefinition[] = ACTIVE_THEMES): FiredRelationship[] {
  const signals = signalsOf(traits)
  const scores = new Map(traits.map((t) => [t.facet, t.score]))
  // Without both scores (the server check) only directions matter.
  const clearGap = (high: string, low: string) => {
    const h = scores.get(high), l = scores.get(low)
    return h === undefined || h === null || l === undefined || l === null || h - l >= TENSION_MIN_SCORE_GAP
  }
  const candidates: { rel: Omit<FiredRelationship, 'rank'>; metCount: number; kindOrder: number; index: number }[] = []

  themes.forEach((theme, index) => {
    const required = theme.requires.map((s) => met(signals, s))
    if (required.some((s) => !s)) return
    const optional = theme.signals.map((s) => met(signals, s)).filter((s): s is FiredSignal => !!s)
    if (optional.length < theme.min) return
    const contributing = [...(required as FiredSignal[]), ...optional]
    candidates.push({ rel: { id: theme.id, kind: 'theme', signals: contributing }, metCount: contributing.length, kindOrder: 0, index })
  })

  // Tensions: every same-domain high/low pair. Curated pairs keep table
  // order; the rest follow in domain order.
  const curatedIndex = (high: string, low: string) => TENSION_GROUNDINGS.findIndex((g) => g.high === high && g.low === low)
  let uncurated = 0
  for (const facets of Object.values(DOMAIN_FACETS)) {
    for (const high of facets) {
      for (const low of facets) {
        const h = met(signals, { facet: high, direction: 'high' })
        const l = met(signals, { facet: low, direction: 'low' })
        if (!h || !l || high === low) continue
        const ci = curatedIndex(high, low)
        if (CURATED_TENSIONS_ONLY && ci < 0) continue
        if (!clearGap(high, low)) continue
        candidates.push({
          rel: {
            id: tensionId(high, low),
            kind: 'tension',
            signals: [h, l],
            ...(ci >= 0 ? { grounding: TENSION_GROUNDINGS[ci].line } : {}),
          },
          metCount: 2,
          kindOrder: 1,
          index: ci >= 0 ? ci : TENSION_GROUNDINGS.length + uncurated++,
        })
      }
    }
  }

  candidates.sort((a, b) => b.metCount - a.metCount || a.kindOrder - b.kindOrder || a.index - b.index)
  return candidates.map((c, rank) => ({ ...c.rel, rank }))
}

// Each trait's single relationship: the highest-priority one it is part of.
// With maxRelationships, at most that many relationships are used (by rank);
// a relationship only counts if it is the winner for at least one trait.
export function winningRelationships(traits: RevealedTrait[], maxRelationships = Infinity, themes: ThemeDefinition[] = ACTIVE_THEMES): Map<string, FiredRelationship> {
  const winners = new Map<string, FiredRelationship>()
  let used = 0
  for (const rel of evaluateRelationships(traits, themes)) {
    if (used >= maxRelationships) break
    const free = rel.signals.filter((s) => !winners.has(s.facet))
    if (free.length === 0) continue
    for (const s of free) winners.set(s.facet, rel)
    used++
  }
  return winners
}

// Identifies one relationship's inputs: sorted facet:direction pairs. A
// cached insight is reused only while its signature still matches.
export function relationshipSignature(rel: Pick<FiredRelationship, 'signals'>): string {
  return rel.signals.map((s) => `${s.facet}:${s.direction}`).sort().join(',')
}

// "Based on your A, B and C results." — built in code from the user's own
// trait words, never by the model.
export function evidenceSentence(rel: Pick<FiredRelationship, 'signals'>): string {
  const words = rel.signals.map((s) => s.traitWord)
  const list = words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
  return `Based on your ${list} results.`
}

export function directionOf(value: string): SignalDirection | null {
  return value === 'high' || value === 'low' ? value : null
}
