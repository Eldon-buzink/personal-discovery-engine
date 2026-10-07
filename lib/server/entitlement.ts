import 'server-only'

import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { REVEAL_CAP } from '@/lib/known/paywall'
import { facetTraitWords } from '@/lib/known/scoring'

// Server-side paywall. The client still decides what to *show* (lock
// screens, CTAs), but generating report text is only allowed here when the
// caller is entitled to it:
//   - branch content: signed-in user with is_paid = true
//   - ring-1 text: paid users without limit; everyone else for at most
//     REVEAL_CAP distinct facets, tracked in a signed cookie (the free
//     reveals happen before an account exists, so there's no user row to
//     count against).

export async function isPaidUser(userId: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from('users')
    .select('is_paid')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('[entitlement] is_paid lookup failed:', error.message)
    return false
  }
  return !!data?.is_paid
}

const COOKIE = 'bearing_free_reveals'
const ONE_YEAR = 60 * 60 * 24 * 365

// HMAC key derived from a server-only secret that's already configured, so
// no new env var is needed and the cookie can't be forged in the browser.
function signingKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Server misconfigured: missing signing secret')
  return createHash('sha256').update(`bearing-free-reveals:${secret}`).digest()
}

function sign(payload: string): string {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url')
}

function readFreeReveals(): string[] {
  const raw = cookies().get(COOKIE)?.value
  if (!raw) return []
  const [payload, mac] = raw.split('.')
  if (!payload || !mac) return []
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return []
  try {
    const list = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!Array.isArray(list)) return []
    return Array.from(new Set(list.filter((f): f is string => typeof f === 'string' && facetTraitWords(f) !== null))).slice(0, REVEAL_CAP)
  } catch {
    return []
  }
}

function writeFreeReveals(facets: string[]): void {
  const payload = Buffer.from(JSON.stringify(facets)).toString('base64url')
  cookies().set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  })
}

// True when an unpaid caller may get ring-1 text for this facet: it's one
// of the facets already counted, or there's room under REVEAL_CAP (in which
// case it's counted now). Regenerating an already-counted facet is free.
export function claimFreeReveal(facet: string): boolean {
  const current = readFreeReveals()
  if (current.includes(facet)) return true
  if (current.length >= REVEAL_CAP) return false
  writeFreeReveals([...current, facet])
  return true
}
