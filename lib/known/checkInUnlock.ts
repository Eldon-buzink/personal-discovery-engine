/**
 * lib/known/checkInUnlock.ts
 *
 * Rework Part 5 — "say so, once, when it actually unlocks something,"
 * never a progress count on the way there, never a missed-days count.
 * Detects whether a single check-in, just saved, is the one that crosses a
 * real threshold — by diffing computed state with and without it, reusing
 * the exact same stage/weekly logic (practiceStage.ts, weeklyInsight.ts)
 * everywhere else already shares rather than a third definition of
 * "qualifies".
 *
 * Priority when more than one would fire from the same save (rare, but
 * possible for a long-dormant activation catching up on several check-ins
 * worth of state at once): the bigger milestone wins, since showing more
 * than one at a time would just be noise, not information.
 */

import { computeTrend } from './trend'
import { computeWeeklyInsight } from './weeklyInsight'
import { computeRecentWeeksReport } from './recentWeeksReport'
import { computeStage } from './practiceStage'
import { WEEKLY_CHECKIN_FLOOR } from './practiceConfig'
import type { CheckInForTrend } from './weekSummary'

export type UnlockMoment = 'does_it_fit' | 'first_picture' | 'weekly_floor' | null

export function detectUnlockMoment(
  beforeCheckIns: CheckInForTrend[],
  afterCheckIns: CheckInForTrend[],
  periodStartedAt: string,
  now: Date = new Date()
): UnlockMoment {
  // Same unified "does it fit?" gate practiceStage.ts and the report page
  // both read now — reportWindowCheckInCount (computeRecentWeeksReport's
  // 28-day window), not computeTrend's own isTrendQualified. Using
  // anything else here would risk telling the user something unlocked that
  // the report then disagrees with.
  const beforeStage = computeStage(
    computeTrend(beforeCheckIns, periodStartedAt, now).qualifyingWeekCount,
    computeRecentWeeksReport(beforeCheckIns, periodStartedAt, now).checkInCount
  )
  const afterStage = computeStage(
    computeTrend(afterCheckIns, periodStartedAt, now).qualifyingWeekCount,
    computeRecentWeeksReport(afterCheckIns, periodStartedAt, now).checkInCount
  )
  if (beforeStage.stage !== 'does_it_fit' && afterStage.stage === 'does_it_fit') return 'does_it_fit'
  if (beforeStage.stage === 'collecting' && afterStage.stage !== 'collecting') return 'first_picture'

  const beforeWeekly = computeWeeklyInsight(beforeCheckIns, periodStartedAt, now)
  const afterWeekly = computeWeeklyInsight(afterCheckIns, periodStartedAt, now)
  if (!beforeWeekly.summary.qualifies && afterWeekly.summary.qualifies) return 'weekly_floor'

  return null
}

export function formatUnlockMoment(moment: UnlockMoment): string | null {
  switch (moment) {
    case 'does_it_fit':
      return "You've got enough check-ins now to see how this compares to your starting result."
    case 'first_picture':
      return "That's enough for your first picture. Take a look."
    case 'weekly_floor':
      return `That's ${WEEKLY_CHECKIN_FLOOR} this week. Your weekly read is ready.`
    case null:
      return null
  }
}
