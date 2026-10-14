/**
 * lib/known/facetReference.ts
 *
 * One read-only record per facet for the public site, built entirely from
 * the files the report itself runs on, so a blog page and a report can't
 * disagree about a facet's items, words or thresholds:
 *
 * - domain and items: ring1-questions.ts (RING1_QUESTIONS / DOMAIN_FACETS)
 * - trait words and thresholds: scoring.ts (TRAIT_WORDS / TRAIT_WORD_THRESHOLDS)
 * - daily check-in question and options: checkInOptions.ts (CHECK_IN_PROMPTS)
 * - user-facing name: miniAssessmentScoring.ts (facetDisplayLabel, which
 *   shows Liberalism as "Values")
 *
 * Nothing here is copied text; change a source file and this follows.
 */

import { DOMAIN_FACETS, FACET_QUESTIONS, type Domain } from './ring1-questions'
import { TRAIT_WORDS, TRAIT_WORD_THRESHOLDS } from './scoring'
import { CHECK_IN_PROMPTS, type CheckInOption } from './checkInOptions'
import { facetDisplayLabel } from './miniAssessmentScoring'

export interface FacetReferenceItem {
  id: number
  text: string
  reverseScored: boolean
}

export interface FacetReference {
  facetId: string
  label: string
  domain: Domain
  items: FacetReferenceItem[]
  traitWords: { low: string; mid: string; high: string }
  // Facet score = mean of the 4 items (1-5) after reverse-scoring.
  thresholds: { high: number; mid: number }
  checkIn: { question: string; options: CheckInOption[] }
}

const DOMAIN_OF = new Map<string, Domain>()
Object.keys(DOMAIN_FACETS).forEach((domain) => {
  DOMAIN_FACETS[domain].forEach((facet) => DOMAIN_OF.set(facet, domain as Domain))
})

export function getFacetReference(facetId: string): FacetReference | null {
  const domain = DOMAIN_OF.get(facetId)
  const questions = FACET_QUESTIONS.get(facetId)
  const traitWords = TRAIT_WORDS[facetId]
  const checkIn = CHECK_IN_PROMPTS[facetId]
  if (!domain || !questions || !traitWords || !checkIn) return null
  return {
    facetId,
    label: facetDisplayLabel(facetId),
    domain,
    items: questions.map((q) => ({ id: q.id, text: q.text, reverseScored: q.reverseScored })),
    traitWords,
    thresholds: { high: TRAIT_WORD_THRESHOLDS.high, mid: TRAIT_WORD_THRESHOLDS.mid },
    checkIn: { question: checkIn.question, options: checkIn.options },
  }
}

export function allFacetReferences(): FacetReference[] {
  const out: FacetReference[] = []
  Object.keys(DOMAIN_FACETS).forEach((domain) => {
    DOMAIN_FACETS[domain].forEach((facet) => {
      const ref = getFacetReference(facet)
      if (ref) out.push(ref)
    })
  })
  return out
}
