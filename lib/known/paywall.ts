/**
 * lib/known/paywall.ts
 *
 * Shared constants + helpers for the free/paid gate: cap at 5 revealed Ring 1
 * traits, then require payment to continue Ring 1 or start any branch. Used
 * by both app/assessment/page.tsx (where the reveal cap is enforced and the
 * lock screen lives) and app/report/page.tsx (where branch-start CTAs and
 * the qualifying-branches list need to know lock state).
 *
 * is_paid lives in Supabase (public.users), written only by the Stripe
 * webhook (app/api/webhooks/stripe/route.ts) on checkout.session.completed —
 * see supabase/migrations/20260717000000_create_users_table.sql for the RLS
 * policy that makes that the only write path. No row for a user means never
 * paid, not an error — fetchIsPaid treats a missing row as false.
 */

import { createClient } from '@/lib/supabase/client'

export const REVEAL_CAP = 5

export async function fetchIsPaid(userId: string | null): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('is_paid')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('[fetchIsPaid] query error:', error.message)
    return false
  }
  return !!data?.is_paid
}

export function isRevealCapped(revealedCount: number, isPaid: boolean): boolean {
  return !isPaid && revealedCount >= REVEAL_CAP
}
