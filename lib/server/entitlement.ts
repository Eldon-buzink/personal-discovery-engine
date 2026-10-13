import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { REVEAL_CAP } from '@/lib/known/paywall'
import { facetTraitWords } from '@/lib/known/scoring'
import { readSignedCookie, writeSignedCookie } from './signedCookie'

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

function readFreeReveals(): string[] {
  const raw = readSignedCookie(COOKIE, 'free-reveals')
  if (!raw) return []
  try {
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return Array.from(new Set(list.filter((f): f is string => typeof f === 'string' && facetTraitWords(f) !== null))).slice(0, REVEAL_CAP)
  } catch {
    return []
  }
}

function writeFreeReveals(facets: string[]): void {
  writeSignedCookie(COOKIE, 'free-reveals', JSON.stringify(facets))
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
