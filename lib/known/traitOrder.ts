import { DOMAIN_FACETS } from './ring1-questions'

// Friendly names for the five Big Five domains, as shown on the report
// ("Also in Social energy"). Working wording — change it here only.
export const DOMAIN_LABELS: Record<string, string> = {
  Neuroticism: 'Emotional range',
  Extraversion: 'Social energy',
  Openness: 'Openness',
  Agreeableness: 'Getting along',
  Conscientiousness: 'Drive and discipline',
}

const DOMAIN_BY_FACET = new Map<string, string>(
  Object.entries(DOMAIN_FACETS).flatMap(([domain, facets]) => facets.map((f) => [f, domain] as [string, string])),
)

/** The Big Five domain a Ring 1 facet belongs to, or null for anything else. */
export function domainOf(facet: string): string | null {
  return DOMAIN_BY_FACET.get(facet) ?? null
}

/**
 * How clear-cut a facet score is: distance from the middle of the 1–5 answer
 * scale (0 … 2). Low and high ends count the same — a low score is a result,
 * not a missing one. Null scores (unknown) rank as 0.
 */
export function traitStrength(score: number | null | undefined): number {
  if (score === null || score === undefined || Number.isNaN(score)) return 0
  return Math.min(2, Math.abs(score - 3))
}

/**
 * Indices of `items` ordered strongest first. Ties keep the original order
 * (the order traits were revealed in), so the result is stable.
 */
export function orderByStrength<T>(items: T[], strengthOf: (item: T) => number): number[] {
  return items
    .map((item, i) => ({ i, s: strengthOf(item) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.i)
}
