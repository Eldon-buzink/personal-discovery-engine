// Report lab: neutral URL slugs (no theory or facet names in the address
// bar). Clusters by their user-facing label, traits by their trait word.

import { facetTraitWords } from '@/lib/known/scoring'
import { DOMAIN_FACETS } from '@/lib/known/ring1-questions'

export const CLUSTER_SLUGS: Record<string, string> = {
  Neuroticism: 'emotional-range',
  Extraversion: 'social-energy',
  Openness: 'curiosity', // follows the [LAB COPY] working label
  Agreeableness: 'getting-along',
  Conscientiousness: 'drive-and-discipline',
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function viewToSlug(view: string): string {
  return CLUSTER_SLUGS[view] ?? view
}

export function slugToView(slug: string | null): string | null {
  if (!slug) return null
  if (slug === 'overview') return 'overview'
  return Object.keys(CLUSTER_SLUGS).find((k) => CLUSTER_SLUGS[k] === slug) ?? null
}

/** A trait's slug is its word; resolved against the facets the user has (words are unique per person). */
export function traitToSlug(word: string): string {
  return slugify(word)
}

export function slugToFacet(slug: string | null, words: { facet: string; word: string }[]): string | null {
  if (!slug) return null
  return words.find((w) => slugify(w.word) === slug)?.facet ?? null
}

/** Every trait word across all facets and directions is distinct, so a word slug never collides. */
export function allWordsDistinct(): boolean {
  const all = Object.values(DOMAIN_FACETS).flat().flatMap((f) => Object.values(facetTraitWords(f) ?? {}))
  return new Set(all.map(slugify)).size === all.length
}
