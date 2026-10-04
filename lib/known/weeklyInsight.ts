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

export interface WeeklyInsightResult {
  weekStart: Date
  summary: WeekSummary
}

export function computeWeeklyInsight(checkIns: CheckInForTrend[], periodStartedAt: string, now: Date = new Date()): WeeklyInsightResult {
  const scoped = scopeToCurrentPeriod(checkIns, periodStartedAt)
  const weekStart = startOfISOWeek(now)
  return { weekStart, summary: summarizeSingleWeek(scoped, weekStart) }
}
