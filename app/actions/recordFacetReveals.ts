'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/supabase/server'
import { facetTraitWords } from '@/lib/known/scoring'

// Writes to public.user_facet_reveals — an integrity-sensitive "did this
// user actually see real Ring-1 data for this facet" record, not ordinary
// user-owned data, so this goes through the service-role client rather than
// open client RLS (same posture as createCheckoutSession.ts). Two call
// sites:
//   - app/assessment/page.tsx's triggerReveal, when the user is already
//     authenticated at reveal time (a paid user continuing past the free
//     cap, or a returning signed-in user).
//   - app/auth/claim/page.tsx, backfilling every facet in the claimed
//     anonymous session's revealedFacets in one call — covers the common
//     case where reveals happened before the user had an account at all.
//
// The user is always the signed-in caller (from the session cookie), never
// an argument — a server action is a public endpoint, so a userId parameter
// would let anyone write reveals for any account. Facet names are checked
// against the 30 real facets.
//
// Upsert, not insert: a facet can be "revealed" more than once across these
// two call sites for the same user (e.g. revealed anonymously, then the
// assessment page's own effect fires again on next load) — ignoring
// conflicts on the (user_id, facet_id) primary key keeps this idempotent
// rather than erroring on a harmless re-write.
export async function recordFacetReveals(facets: string[]): Promise<void> {
  if (!Array.isArray(facets) || facets.length === 0 || facets.length > 30) return
  const valid = Array.from(new Set(facets.filter((f) => typeof f === 'string' && facetTraitWords(f) !== null)))
  if (valid.length === 0) return

  const user = await getSessionUser()
  if (!user) return

  const admin = createAdminClient()
  const rows = valid.map((facet_id) => ({ user_id: user.id, facet_id }))
  const { error } = await admin
    .from('user_facet_reveals')
    .upsert(rows, { onConflict: 'user_id,facet_id', ignoreDuplicates: true })

  if (error) {
    console.error('[recordFacetReveals] upsert error:', error.message)
  }
}
