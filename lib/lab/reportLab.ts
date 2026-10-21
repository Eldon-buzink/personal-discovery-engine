// Report lab (app/report/lab): shared data for the first-section options
// board. Lab only: nothing here is used by the real report.
//
// Data: the 30-trait example (lib/known/exampleReport.ts), scored by the
// real scoring. Encoding: hue = family (one of the existing 8 brand hues per
// family), size = how pronounced (radius from the square root of the
// strength, with a minimum so small traits stay legible and tappable).

import { CURATED_HUES } from '@/lib/blobs'
import { EXAMPLE_BANDS, EXAMPLE_CARDS, exampleResponses } from '@/lib/known/exampleReport'
import { computeFacetScore, getTraitWord } from '@/lib/known/scoring'
import { DOMAIN_FACETS, FACET_QUESTIONS } from '@/lib/known/ring1-questions'
import { DOMAIN_LABELS, domainOf, traitStrength } from '@/lib/known/traitOrder'

// How many traits a practice starts with. The real cap is ACTIVE_FACET_CAP
// (4) in lib/known/practiceConfig.ts; kept separate here so the lab can
// show either number without touching the product.
export const LAB_PRACTICE_COUNT = 4

// Five family hues from CURATED_HUES = [8, 35, 145, 175, 205, 235, 290, 335].
// Picked to sit far apart on the wheel and skip the near pairs (145/175,
// 205/235, 335/8): coral 8, amber 35, teal 175, periwinkle 235, violet 290.
export const FAMILY_HUES: Record<string, number> = {
  Conscientiousness: CURATED_HUES[0], // 8 coral
  Extraversion: CURATED_HUES[1], // 35 amber
  Agreeableness: CURATED_HUES[3], // 175 teal
  Neuroticism: CURATED_HUES[5], // 235 periwinkle
  Openness: CURATED_HUES[6], // 290 violet
}

// User-facing family names. DOMAIN_LABELS on main, except "Openness", which
// is a Big Five domain name: replaced here by a working label.
export const LAB_OPENNESS_LABEL = '[LAB COPY] Curiosity'
export const LAB_OPENNESS_ALTERNATIVES = ['[LAB COPY] Ideas and experiences', '[LAB COPY] Exploring']
export function familyLabel(family: string): string {
  return family === 'Openness' ? LAB_OPENNESS_LABEL : DOMAIN_LABELS[family] ?? family
}

export const FAMILY_ORDER = Object.keys(DOMAIN_FACETS)

export interface LabTrait {
  facet: string
  word: string
  family: string
  hue: number
  score: number
  strength: number
  /** 0 … 1, from strength, for sizing (square root so area tracks strength). */
  size: number
  revealIndex: number
}

const facetOrder = new Map(FAMILY_ORDER.flatMap((d) => DOMAIN_FACETS[d]).map((f, i) => [f, i] as [string, number]))

// "Most pronounced" order: strength, then the higher score (a high result
// before a low one at the same distance from the middle), then the fixed
// facet order. Deterministic: the same answers always give the same order.
export function mostPronounced(traits: LabTrait[]): LabTrait[] {
  return [...traits].sort((a, b) => b.strength - a.strength || b.score - a.score || facetOrder.get(a.facet)! - facetOrder.get(b.facet)!)
}

export function labTraits(): LabTrait[] {
  const responses = exampleResponses()
  const lastQuestion = (f: string) => Math.max(...(FACET_QUESTIONS.get(f) ?? []).map((q) => q.id))
  const revealed = Object.keys(EXAMPLE_BANDS).sort((a, b) => lastQuestion(a) - lastQuestion(b))
  return revealed.map((facet, revealIndex) => {
    const score = computeFacetScore(facet, responses) ?? 3
    const strength = traitStrength(score)
    const family = domainOf(facet)!
    return { facet, word: getTraitWord(facet, score), family, hue: FAMILY_HUES[family], score, strength, size: Math.sqrt(strength / 2), revealIndex }
  })
}

/** The first five traits a free user would have revealed (not the strongest). */
export function freeTraits(all: LabTrait[]): LabTrait[] {
  return all.filter((t) => t.revealIndex < 5)
}

export function byFamily(traits: LabTrait[]): { family: string; traits: LabTrait[] }[] {
  return FAMILY_ORDER.map((family) => ({ family, traits: mostPronounced(traits.filter((t) => t.family === family)) })).filter((g) => g.traits.length > 0)
}

export function radius(t: LabTrait, rMin: number, rMax: number): number {
  return rMin + (rMax - rMin) * t.size
}

export function cardFor(facet: string) {
  return EXAMPLE_CARDS[facet]
}

// ── Packing (Direction D) ─────────────────────────────────────────────────
// A small greedy routine, run once: circles largest first, each placed at
// the first spot along an outward spiral where it doesn't overlap, inside
// each family, then the five families packed the same way as whole groups.
// 30 circles is small enough that a greedy spiral packs tightly; no
// dependency, deterministic, static positions.

export interface Circle { x: number; y: number; r: number }

function packCircles(radii: number[], gap: number): Circle[] {
  const placed: Circle[] = []
  const order = radii.map((r, i) => ({ r, i })).sort((a, b) => b.r - a.r)
  const out: Circle[] = new Array(radii.length)
  for (const { r, i } of order) {
    if (placed.length === 0) { const c = { x: 0, y: 0, r }; placed.push(c); out[i] = c; continue }
    let found: Circle | null = null
    for (let step = 0; step < 4000 && !found; step++) {
      const a = step * 0.35
      const d = 1.2 * step * 0.35
      const c = { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.9, r }
      if (placed.every((p) => Math.hypot(p.x - c.x, p.y - c.y) >= p.r + c.r + gap)) found = c
    }
    placed.push(found!)
    out[i] = found!
  }
  return out
}

function enclose(cs: Circle[]): Circle {
  const cx = cs.reduce((s, c) => s + c.x, 0) / cs.length
  const cy = cs.reduce((s, c) => s + c.y, 0) / cs.length
  const r = Math.max(...cs.map((c) => Math.hypot(c.x - cx, c.y - cy) + c.r))
  return { x: cx, y: cy, r }
}

/** Positions for every trait, families as neighbourhoods; bounding box returned for scaling. */
export function packTraits(traits: LabTrait[], rMin: number, rMax: number, gap = 3) {
  const groups = byFamily(traits).map((g) => {
    const cs = packCircles(g.traits.map((t) => radius(t, rMin, rMax)), gap)
    const e = enclose(cs)
    return { traits: g.traits, cs: cs.map((c) => ({ ...c, x: c.x - e.x, y: c.y - e.y })), r: e.r }
  })
  const centers = packCircles(groups.map((g) => g.r), -gap * 2)
  const out: { trait: LabTrait; c: Circle }[] = []
  groups.forEach((g, gi) => g.traits.forEach((t, ti) => out.push({ trait: t, c: { x: g.cs[ti].x + centers[gi].x, y: g.cs[ti].y + centers[gi].y, r: g.cs[ti].r } })))
  const minX = Math.min(...out.map((o) => o.c.x - o.c.r))
  const maxX = Math.max(...out.map((o) => o.c.x + o.c.r))
  const minY = Math.min(...out.map((o) => o.c.y - o.c.r))
  const maxY = Math.max(...out.map((o) => o.c.y + o.c.r))
  return { items: out, box: { minX, minY, w: maxX - minX, h: maxY - minY } }
}
