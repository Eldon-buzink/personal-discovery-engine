/**
 * lib/known/baseAssessmentResult.ts
 *
 * Part 0 investigation finding: a base-assessment (full 120-item) facet has
 * a clean low/mid/high mapping too — scoring.ts's TRAIT_WORDS use the exact
 * same words checkInOptions.ts does per facet (confirmed, e.g. Anxiety:
 * Grounded/Attuned/Anxious in both), with getTraitWord's score thresholds
 * (>=3.5 high, >=2.5 mid, else low). The raw 120-item responses needed to
 * compute it are recoverable server-side: AuthModal.tsx persists the whole
 * assessment session (not just the mini-assessment's 6 answers) into
 * anonymous_sessions.responses at signup, under the same claimed_by
 * convention mini_assessment_results uses — this was never read back
 * before. Same "recompute from the DB, not browser storage" shape as
 * lib/known/miniAssessmentResult.ts, so start-vs-now (Part 3b) can apply
 * to base-assessment facets too, not just mini-assessment ones.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeFacetScore } from './scoring'
import type { BandId } from './startVsNow'

interface StoredResponse {
  questionId: number
  value: number
}

export function bandForScore(score: number): BandId {
  if (score >= 3.5) return 'high'
  if (score >= 2.5) return 'mid'
  return 'low'
}

export async function fetchBaseAssessmentBand(
  supabase: SupabaseClient,
  userId: string,
  facetId: string
): Promise<BandId | null> {
  const { data, error } = await supabase
    .from('anonymous_sessions')
    .select('responses, created_at')
    .eq('claimed_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const session = data.responses as { responses?: StoredResponse[] } | null
  const responses = session?.responses
  if (!Array.isArray(responses) || responses.length === 0) return null

  const answeredMap = new Map<number, number>(responses.map((r) => [r.questionId, r.value]))
  const score = computeFacetScore(facetId, answeredMap)
  return score === null ? null : bandForScore(score)
}
