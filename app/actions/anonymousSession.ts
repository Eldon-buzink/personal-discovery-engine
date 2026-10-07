'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitKey } from '@/lib/server/rateLimit'
import { requestIp } from '@/lib/server/siteOrigin'
import { clearPendingSessionId, readPendingSessionId, setPendingSessionId } from '@/lib/server/anonymousVisitor'
import { recordFacetReveals } from './recordFacetReveals'

// Saving and claiming the in-progress full assessment (public.anonymous_sessions).
// The browser never reads or writes that table directly: the service role
// does it here, and the row this browser saved is remembered in a signed
// httpOnly cookie, so claiming needs that cookie, not just a row id.

const MAX_SESSION_BYTES = 200_000

// Saves the whole local session (answers, question order, revealed facets,
// generated pattern text) before the user signs in. Returns the row id,
// which the client still uses as report_content's assessment_id.
export async function saveAnonymousSession(session: unknown): Promise<{ id: string }> {
  const allowed = await checkRateLimit(rateLimitKey('anon-session', null, requestIp()), 600, 10)
  if (!allowed) throw new Error('Too many requests')

  if (!session || typeof session !== 'object' || Array.isArray(session)) throw new Error('Invalid session')
  if (JSON.stringify(session).length > MAX_SESSION_BYTES) throw new Error('Session too large')

  const { data, error } = await createAdminClient()
    .from('anonymous_sessions')
    .insert({ responses: session })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[saveAnonymousSession] insert failed:', error?.message ?? 'no row returned')
    throw new Error('Could not save progress')
  }

  setPendingSessionId(data.id as string)
  return { id: data.id as string }
}

// Links the session saved by this browser to the signed-in user. Only an
// unclaimed row (or one this user already claimed) is updated. On success
// the pending cookie is cleared and the revealed facets are recorded.
export async function claimAnonymousSession(): Promise<{ claimed: boolean }> {
  const user = await getSessionUser()
  if (!user) return { claimed: false }

  const sessionId = readPendingSessionId()
  if (!sessionId) return { claimed: false }

  const { data, error } = await createAdminClient()
    .from('anonymous_sessions')
    .update({ claimed_by: user.id })
    .eq('id', sessionId)
    .or(`claimed_by.is.null,claimed_by.eq.${user.id}`)
    .select('responses')
    .maybeSingle()

  if (error) {
    console.error('[claimAnonymousSession] update failed:', error.message)
    return { claimed: false }
  }
  // Either way this browser's pending session is settled: claimed now, or
  // already claimed by someone else (then it can never be claimed here).
  clearPendingSessionId()
  if (!data) return { claimed: false }

  const revealed = (data.responses as { revealedFacets?: unknown } | null)?.revealedFacets
  if (Array.isArray(revealed) && revealed.length > 0) {
    await recordFacetReveals(revealed.filter((f): f is string => typeof f === 'string'))
  }
  return { claimed: true }
}
