/**
 * lib/known/miniAssessmentResult.ts
 *
 * Reads back a user's own claimed mini_assessment_results row — band plus
 * the raw 6-item responses — so the practice side (Practice home's card
 * copy, facet detail's result block) can show the actual per-user read
 * instead of generic facet copy. Both `band` and `responses` are already
 * persisted at quiz-submission time (see app/mini-assessment/[facet]/
 * page.tsx's insert) and claimed_by is set once the result is attached to
 * an account (lib/known/miniAssessmentClaim.ts) — this never needs the
 * result page's own sessionStorage copy, which is browser-local and
 * doesn't survive a new device or a cleared cache.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MiniAssessmentBand } from './miniAssessmentScoring'

export interface ClaimedMiniAssessmentResult {
  band: MiniAssessmentBand
  responses: number[]
}

// A facet can in principle have more than one mini_assessment_results row
// claimed by the same user over time (e.g. retaken before activating) —
// facet_activations itself only keeps a directional flag, not a pointer
// back to which attempt produced it. Most recent by created_at is the only
// reasonable choice without adding that link.
export async function fetchClaimedMiniAssessmentResult(
  supabase: SupabaseClient,
  userId: string,
  facetId: string
): Promise<ClaimedMiniAssessmentResult | null> {
  const { data, error } = await supabase
    .from('mini_assessment_results')
    .select('band, responses')
    .eq('claimed_by', userId)
    .eq('facet_id', facetId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return { band: data.band as MiniAssessmentBand, responses: data.responses as number[] }
}
