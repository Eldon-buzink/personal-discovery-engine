'use server'

import { createAdminClient } from '@/lib/supabase/admin'

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
// Upsert, not insert: a facet can be "revealed" more than once across these
// two call sites for the same user (e.g. revealed anonymously, then the
// assessment page's own effect fires again on next load) — ignoring
// conflicts on the (user_id, facet_id) primary key keeps this idempotent
// rather than erroring on a harmless re-write.
export async function recordFacetReveals(userId: string, facets: string[]): Promise<void> {
  if (facets.length === 0) return

  const admin = createAdminClient()
  const rows = facets.map((facet_id) => ({ user_id: userId, facet_id }))
  const { error } = await admin
    .from('user_facet_reveals')
    .upsert(rows, { onConflict: 'user_id,facet_id', ignoreDuplicates: true })

  if (error) {
    console.error('[recordFacetReveals] upsert error:', error.message)
  }
}
