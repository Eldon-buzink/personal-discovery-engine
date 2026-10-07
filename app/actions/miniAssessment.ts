'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitKey } from '@/lib/server/rateLimit'
import { requestIp } from '@/lib/server/siteOrigin'
import { getOrCreateAnonId, readAnonId } from '@/lib/server/anonymousVisitor'
import {
  MINI_ASSESSMENT_ITEMS,
  MINI_ASSESSMENT_SLUG_TO_FACET,
  bandForScore,
  scoreMiniAssessment,
  type MiniAssessmentBand,
  type MiniAssessmentSlug,
} from '@/lib/known/miniAssessmentScoring'
import { ACTIVE_FACET_CAP } from '@/lib/known/practiceConfig'
import { isActive } from '@/lib/known/practiceData'

// Mini-assessment results (public.mini_assessment_results), written and
// claimed only through these actions with the service role. Each result is
// stamped with this browser's signed anonymous id (bearing_anon cookie), and
// claiming requires the same cookie, so a result id alone can't be used to
// claim someone else's answers.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Stores the six answers and returns the row id and the band. The band is
// computed here from the answers, not taken from the browser.
export async function submitMiniAssessment(slug: string, responses: unknown): Promise<{ id: string; band: MiniAssessmentBand }> {
  const allowed = await checkRateLimit(rateLimitKey('mini-assessment', null, requestIp()), 600, 20)
  if (!allowed) throw new Error('Too many requests')

  if (!Object.prototype.hasOwnProperty.call(MINI_ASSESSMENT_SLUG_TO_FACET, slug)) throw new Error('Unknown assessment')
  const facet = MINI_ASSESSMENT_SLUG_TO_FACET[slug as MiniAssessmentSlug]
  const expected = MINI_ASSESSMENT_ITEMS[facet].length
  if (
    !Array.isArray(responses) ||
    responses.length !== expected ||
    !responses.every((r) => Number.isInteger(r) && r >= 1 && r <= 5)
  ) {
    throw new Error('Invalid answers')
  }
  const answers = responses as number[]
  const band = bandForScore(scoreMiniAssessment(facet, answers))

  const { data, error } = await createAdminClient()
    .from('mini_assessment_results')
    .insert({ session_id: getOrCreateAnonId(), facet_id: facet, responses: answers, band })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[submitMiniAssessment] insert failed:', error?.message ?? 'no row returned')
    throw new Error('Could not save your answers')
  }
  return { id: data.id as string, band }
}

export type ClaimMiniAssessmentResult =
  | { ok: true }
  | { ok: false; reason: 'already-active' }
  | { ok: false; reason: 'at-cap' }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'error'; message: string }

// Claims a result for the signed-in user and turns it into a directional
// facet activation (source 'mini_assessment') with its first period. The
// result must have been submitted from this browser (same bearing_anon) and
// be unclaimed or already claimed by this user. ACTIVE_FACET_CAP is shared
// with every other activation source.
export async function claimMiniAssessmentResult(resultId: string): Promise<ClaimMiniAssessmentResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, reason: 'error', message: 'Not signed in' }
  if (typeof resultId !== 'string' || !UUID.test(resultId)) return { ok: false, reason: 'not-found' }
  const anonId = readAnonId()
  if (!anonId) return { ok: false, reason: 'not-found' }

  const admin = createAdminClient()
  const { data: claimed, error: claimError } = await admin
    .from('mini_assessment_results')
    .update({ claimed_by: user.id })
    .eq('id', resultId)
    .eq('session_id', anonId)
    .or(`claimed_by.is.null,claimed_by.eq.${user.id}`)
    .select('facet_id')
    .maybeSingle()
  if (claimError) return { ok: false, reason: 'error', message: claimError.message }
  if (!claimed) return { ok: false, reason: 'not-found' }

  const { data: existing, error: countError } = await admin
    .from('facet_activations')
    .select('facet_activation_periods(started_at, ended_at)')
    .eq('user_id', user.id)
  if (countError) return { ok: false, reason: 'error', message: countError.message }
  if ((existing ?? []).filter(isActive).length >= ACTIVE_FACET_CAP) return { ok: false, reason: 'at-cap' }

  const { data: activation, error: activationError } = await admin
    .from('facet_activations')
    .insert({ user_id: user.id, facet_id: claimed.facet_id, source: 'mini_assessment', directional: true })
    .select('id')
    .single()
  if (activationError) {
    if (activationError.code === '23505') return { ok: false, reason: 'already-active' }
    return { ok: false, reason: 'error', message: activationError.message }
  }

  const { error: periodError } = await admin
    .from('facet_activation_periods')
    .insert({ facet_activation_id: activation.id, user_id: user.id })
  if (periodError) return { ok: false, reason: 'error', message: periodError.message }

  return { ok: true }
}
