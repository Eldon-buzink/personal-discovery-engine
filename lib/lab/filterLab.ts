// Report lab (app/report/lab/filter): data for the filter concept. Lab only:
// nothing here is used by the real report.
//
// The 30-trait example (lib/known/exampleReport.ts), scored by the real
// scoring. The assessment shuffles the questions per person
// (app/assessment/page.tsx), so the reveal order here comes from one fixed
// shuffle of the 120 question ids: a facet reveals once its fourth statement
// is answered, the same rule as the real assessment. A fixed seed keeps the
// board stable between renders.

import { userCuratedHue } from '@/components/known/ReportVisuals'
import { EXAMPLE_BANDS, EXAMPLE_CARDS, exampleResponses } from '@/lib/known/exampleReport'
import { computeFacetScore, getTraitWord } from '@/lib/known/scoring'
import { DOMAIN_FACETS, RING1_QUESTIONS } from '@/lib/known/ring1-questions'
import { winningRelationships, type FiredRelationship } from '@/lib/known/relationships'
import { domainOf, traitStrength } from '@/lib/known/traitOrder'
import { FAMILY_HUES, familyLabel } from './reportLab'

export { familyLabel, FAMILY_HUES }
export { LAB_PRACTICE_COUNT } from './reportLab'

export const CLUSTERS = Object.keys(DOMAIN_FACETS)
export const FREE_COUNT = 5
export const TOP_COUNT = 5

export interface FilterTrait {
  facet: string
  word: string
  cluster: string
  score: number
  strength: number
  revealIndex: number
  /** Hue = cluster (the lab's mapping). */
  clusterHue: number
  /** The live report's per-trait hue, for comparison. */
  traitHue: number
}

// Same LCG as a plain seeded shuffle; the seed is arbitrary.
function seededShuffle<T>(items: T[], seed: number): T[] {
  const a = [...items]
  let s = seed >>> 0
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const LAB_SHUFFLE_SEED = 20261022

function revealOrder(): string[] {
  const order = seededShuffle(RING1_QUESTIONS.map((q) => q.id), LAB_SHUFFLE_SEED)
  const facetOf = new Map(RING1_QUESTIONS.map((q) => [q.id, q.facet] as [number, string]))
  const seen = new Map<string, number>()
  const revealed: string[] = []
  for (const id of order) {
    const f = facetOf.get(id)!
    const n = (seen.get(f) ?? 0) + 1
    seen.set(f, n)
    if (n === 4) revealed.push(f)
  }
  return revealed
}

export function filterTraits(): FilterTrait[] {
  const responses = exampleResponses()
  return revealOrder().map((facet, revealIndex) => {
    const score = computeFacetScore(facet, responses) ?? 3
    const word = getTraitWord(facet, score)
    const cluster = domainOf(facet)!
    return {
      facet, word, cluster, score, strength: traitStrength(score), revealIndex,
      clusterHue: FAMILY_HUES[cluster],
      traitHue: userCuratedHue(`ring1-pattern-${word.toLowerCase()}`, revealIndex),
    }
  })
}

// "Most pronounced": strength, then the higher score, then reveal order.
export function mostPronounced(traits: FilterTrait[]): FilterTrait[] {
  return [...traits].sort((a, b) => b.strength - a.strength || b.score - a.score || a.revealIndex - b.revealIndex)
}

export function topTraits(all: FilterTrait[]): FilterTrait[] {
  return mostPronounced(all).slice(0, TOP_COUNT)
}

/** How many traits share the top strength (the size the top five are drawn at). */
export function topTieCount(all: FilterTrait[]): number {
  const top = mostPronounced(all)[0]
  return all.filter((t) => t.strength === top.strength).length
}

export function clusterTraits(all: FilterTrait[], cluster: string): FilterTrait[] {
  return mostPronounced(all.filter((t) => t.cluster === cluster))
}

/** The five a free user would have: the first five revealed, strongest first. */
export function freeTraits(all: FilterTrait[]): FilterTrait[] {
  return mostPronounced(all.filter((t) => t.revealIndex < FREE_COUNT))
}

export function cardFor(facet: string) {
  return EXAMPLE_CARDS[facet]
}

export function bandOf(facet: string) {
  return EXAMPLE_BANDS[facet]
}

/** The relationship insights the real engine would fire for the example. */
export function relationshipsFor(all: FilterTrait[]): FiredRelationship[] {
  const winners = winningRelationships(all.map((t) => ({ facet: t.facet, traitWord: t.word, direction: EXAMPLE_BANDS[t.facet], score: t.score })), 5)
  return Array.from(new Map(Array.from(winners.values()).map((r) => [r.id, r])).values()).sort((a, b) => a.rank - b.rank)
}
