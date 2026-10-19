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

function validSession(session: unknown): session is Record<string, unknown> {
  if (!session || typeof session !== 'object' || Array.isArray(session)) return false
  return JSON.stringify(session).length <= MAX_SESSION_BYTES
}

function normalEmail(email: string | null | undefined): string | null {
  const e = (email ?? '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null
}

// Saves the whole local session (answers, question order, revealed facets,
// generated pattern text) before the user signs in, with the email the
// sign-in link goes to: that email is how the link finds this row again on
// another device (claimAnonymousSession). Returns the row id (the client
// keeps it as known_pending_session_id).
export async function saveAnonymousSession(session: unknown, email?: string): Promise<{ id: string }> {
  const allowed = await checkRateLimit(rateLimitKey('anon-session', null, requestIp()), 600, 10)
  if (!allowed) throw new Error('Too many requests')

  if (!validSession(session)) throw new Error('Invalid session')

  const { data, error } = await createAdminClient()
    .from('anonymous_sessions')
    .insert({ responses: session, email: normalEmail(email) })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[saveAnonymousSession] insert failed:', error?.message ?? 'no row returned')
    throw new Error('Could not save progress')
  }

  setPendingSessionId(data.id as string)
  return { id: data.id as string }
}

// "Finish later" for someone already signed in: their progress belongs to
// the account, so it is saved to their own row (the newest one they hold,
// or a new one), with nothing to email. Returns the row id.
export async function saveSignedInProgress(session: unknown): Promise<{ id: string } | null> {
  const user = await getSessionUser()
  if (!user) return null
  if (!validSession(session)) throw new Error('Invalid session')

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('anonymous_sessions')
    .select('id')
    .eq('claimed_by', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await admin.from('anonymous_sessions').update({ responses: session }).eq('id', existing.id).eq('claimed_by', user.id)
    if (error) throw new Error('Could not save progress')
    return { id: existing.id as string }
  }
  const { data, error } = await admin
    .from('anonymous_sessions')
    .insert({ responses: session, claimed_by: user.id, email: normalEmail(user.email) })
    .select('id')
    .single()
  if (error || !data) throw new Error('Could not save progress')
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
