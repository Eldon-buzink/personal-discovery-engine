/**
 * lib/known/miniAssessmentClaim.ts
 *
 * Converts a claimed mini_assessment_results row into a facet_activations
 * row (source='mini_assessment', directional=true) + its first
 * facet_activation_periods row. Shared by two call sites that need the
 * exact same outcome: app/auth/claim/page.tsx (the post-magic-link path for
 * a logged-out user who just signed up) and the mini-assessment result
 * screen's "Add to your daily check-ins" button when the user is ALREADY
 * authenticated (no signup step needed at all — see that page for why this
 * second path exists).
 *
 * unique(user_id, facet_id) is the "already active" check: rather than a
 * separate pre-check, this just attempts the insert and treats a unique
 * violation as that case — no changes made, per the product rule. Checks
 * ACTIVE_FACET_CAP before inserting, since the handover is explicit the cap
 * is shared across every source, not just base/manual activation
 * (lib/known/facetActivationClient.ts enforces the same cap for those).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ACTIVE_FACET_CAP } from './practiceConfig'
import { isActive } from './practiceData'

export type ClaimMiniAssessmentResult =
  | { ok: true }
  | { ok: false; reason: 'already-active' }
  | { ok: false; reason: 'at-cap' }
  | { ok: false; reason: 'error'; message: string }

export async function claimMiniAssessmentResult(
  supabase: SupabaseClient,
  userId: string,
  miniAssessmentResultId: string
): Promise<ClaimMiniAssessmentResult> {
  const { data: claimedResult, error: claimError } = await supabase
    .from('mini_assessment_results')
    .update({ claimed_by: userId })
    .eq('id', miniAssessmentResultId)
    .select('facet_id')
    .single()

  if (claimError) return { ok: false, reason: 'error', message: claimError.message }

  const { data: existingActivations, error: countError } = await supabase
    .from('facet_activations')
    .select('facet_activation_periods(started_at, ended_at)')
    .eq('user_id', userId)

  if (countError) return { ok: false, reason: 'error', message: countError.message }
  if ((existingActivations ?? []).filter(isActive).length >= ACTIVE_FACET_CAP) {
    return { ok: false, reason: 'at-cap' }
  }

  const { data: activation, error: activationError } = await supabase
    .from('facet_activations')
    .insert({ user_id: userId, facet_id: claimedResult.facet_id, source: 'mini_assessment', directional: true })
    .select('id')
    .single()

  if (activationError) {
    if (activationError.code === '23505') return { ok: false, reason: 'already-active' }
    return { ok: false, reason: 'error', message: activationError.message }
  }

  const { error: periodError } = await supabase
    .from('facet_activation_periods')
    .insert({ facet_activation_id: activation.id, user_id: userId })

  if (periodError) return { ok: false, reason: 'error', message: periodError.message }

  return { ok: true }
}
