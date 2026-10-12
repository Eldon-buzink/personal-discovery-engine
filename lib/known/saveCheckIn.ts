/**
 * lib/known/saveCheckIn.ts
 *
 * Saving one trait's check-in for today — shared by the single-trait
 * check-in page and the daily check-in that steps through every trait.
 * Upsert on unique(facet_activation_id, check_in_date), so answering again
 * today edits the existing row.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { todayLocalDateString } from './checkInDate'
import { detectUnlockMoment, type UnlockMoment } from './checkInUnlock'

export interface CheckInRow {
  check_in_date: string
  response_option: string
}

export async function saveCheckIn(
  supabase: SupabaseClient,
  args: {
    userId: string
    activationId: string
    option: string
    note: string
    existingCheckIns: CheckInRow[]
    periodStartedAt: string | null
  }
): Promise<{ ok: true; moment: UnlockMoment } | { ok: false; message: string }> {
  const today = todayLocalDateString()
  const { error } = await supabase.from('check_ins').upsert(
    {
      user_id: args.userId,
      facet_activation_id: args.activationId,
      check_in_date: today,
      response_option: args.option,
      note: args.note.trim() || null,
    },
    { onConflict: 'facet_activation_id,check_in_date' }
  )
  if (error) return { ok: false, message: error.message }

  // Only a genuinely NEW day's check-in can "unlock" something — editing a
  // check-in that already existed for today isn't a new data point, so it
  // never re-triggers this.
  const alreadyCheckedInToday = args.existingCheckIns.some((c) => c.check_in_date === today)
  let moment: UnlockMoment = null
  if (!alreadyCheckedInToday && args.periodStartedAt) {
    const after = [...args.existingCheckIns, { check_in_date: today, response_option: args.option }]
    moment = detectUnlockMoment(args.existingCheckIns, after, args.periodStartedAt)
  }
  return { ok: true, moment }
}

// Where an unlock sends people: the weekly review for a newly complete week,
// otherwise this trait's section of the monthly review.
export function unlockHref(moment: UnlockMoment, activationId: string): string {
  return moment === 'weekly_floor' ? '/practice/reviews/weekly' : `/practice/reviews/monthly#${activationId}`
}
