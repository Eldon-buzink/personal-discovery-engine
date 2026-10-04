/**
 * lib/known/weeklyInsight.ts
 *
 * Per-facet, current-ISO-week read — the first rung of the weekly/monthly/
 * quarterly cadence (reference/01-master-handover.md §2.3). The handover
 * explicitly chose not to build a separate weekly screen ("no separate
 * weekly screen in the mockup"), but the product's own copy already
 * promises one (mini-assessment result page's "What happens next": "...
 * building toward a weekly read, then a monthly recap, then a full
 * quarterly review") and nothing delivered on it — this closes that gap.
 * Reuses the exact same week mechanics monthly recap and quarterly review
 * already share (lib/known/weekSummary.ts) rather than inventing new
 * floor/plurality logic.
 */

import { startOfISOWeek } from 'date-fns'
import { scopeToCurrentPeriod, summarizeSingleWeek, type CheckInForTrend, type WeekSummary } from './weekSummary'
import { WEEKLY_CHECKIN_FLOOR } from './practiceConfig'

export interface WeeklyInsightResult {
  weekStart: Date
  summary: WeekSummary
}

export function computeWeeklyInsight(checkIns: CheckInForTrend[], periodStartedAt: string, now: Date = new Date()): WeeklyInsightResult {
  const scoped = scopeToCurrentPeriod(checkIns, periodStartedAt)
  const weekStart = startOfISOWeek(now)
  return { weekStart, summary: summarizeSingleWeek(scoped, weekStart) }
}

// Shared by facet detail and Practice home's cards — same non-gamified
// progress line in both places. Only renders something when there's a
// reason to: a check-in already logged this week but not yet enough for a
// weekly read. Zero check-ins this week stays silent rather than opening
// with "0 of 3" — that reads as a deficit the moment the page loads, not
// information.
export function formatWeeklyProgress(weekly: WeeklyInsightResult): string | null {
  const { summary } = weekly
  if (summary.checkInCount === 0 || summary.qualifies) return null
  const remaining = WEEKLY_CHECKIN_FLOOR - summary.checkInCount
  return `${summary.checkInCount} of ${WEEKLY_CHECKIN_FLOOR} check-ins this week — ${remaining} more for a weekly read.`
}
