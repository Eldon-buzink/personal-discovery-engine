/**
 * lib/known/trend.ts
 *
 * Pure trend computation over a single facet_activation's check-ins — see
 * reference/01-master-handover.md §3. Deterministic bucket-and-count logic,
 * no LLM call, no natural-language synthesis (that's a separate content
 * pass per §3.1, explicitly skipped here — computeTrend returns shapes for
 * the caller to format, not sentences).
 *
 * The week-level mechanics (bucketing, floor check, plurality lean) live in
 * lib/known/weekSummary.ts, shared with monthly recap and quarterly review —
 * this file only adds the lookback-window/qualification logic on top.
 *
 * Takes `now` as a parameter (default `new Date()`) specifically so this is
 * testable without mocking the system clock.
 */

import { startOfISOWeek, subWeeks, isEqual } from 'date-fns'
import { TREND_LOOKBACK_WEEKS, TREND_MIN_QUALIFYING_WEEKS } from './practiceConfig'
import {
  bucketCheckInsByWeek,
  summarizeWeek,
  scopeToCurrentPeriod,
  type CheckInForTrend,
  type WeekLean,
  type WeekSummary,
} from './weekSummary'

export type { CheckInForTrend, WeekLean }

export interface TrendResult {
  // Oldest to newest, always exactly TREND_LOOKBACK_WEEKS entries, always
  // ending on the current ISO week — weeks before the activation's current
  // period even started just come out as zero-count, unqualified buckets,
  // same as any other week with nothing logged.
  weeks: WeekSummary[]
  qualifyingWeekCount: number
  isTrendQualified: boolean
  mostRecentObservation: { weekStart: Date; checkInCount: number; lean: WeekLean; topCount: number } | null
  // The single latest check-in (by check_in_date) within the current period
  // — distinct from mostRecentObservation, which needs a whole qualifying
  // week. This needs only 1 check-in ever, matching the mockup's locked
  // behavior: the "Most recently, you noticed X" line is always there once
  // any data exists; the weekly-trend line is what upgrades once there's
  // enough of it.
  mostRecentCheckIn: { checkInDate: string; responseOption: string } | null
}

export function computeTrend(checkIns: CheckInForTrend[], periodStartedAt: string, now: Date = new Date()): TrendResult {
  const scoped = scopeToCurrentPeriod(checkIns, periodStartedAt)
  const byWeek = bucketCheckInsByWeek(scoped)

  const currentWeekStart = startOfISOWeek(now)
  const weeks: WeekSummary[] = []
  for (let i = TREND_LOOKBACK_WEEKS - 1; i >= 0; i--) {
    weeks.push(summarizeWeek(byWeek, subWeeks(currentWeekStart, i)))
  }

  const qualifyingWeekCount = weeks.filter((w) => w.qualifies).length
  const isTrendQualified = qualifyingWeekCount >= TREND_MIN_QUALIFYING_WEEKS

  let mostRecentObservation: TrendResult['mostRecentObservation'] = null
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].qualifies) {
      const w = weeks[i]
      mostRecentObservation = { weekStart: w.weekStart, checkInCount: w.checkInCount, lean: w.lean, topCount: w.topCount }
      break
    }
  }

  let mostRecentCheckIn: TrendResult['mostRecentCheckIn'] = null
  for (const c of scoped) {
    if (!mostRecentCheckIn || c.check_in_date > mostRecentCheckIn.checkInDate) {
      mostRecentCheckIn = { checkInDate: c.check_in_date, responseOption: c.response_option }
    }
  }

  return { weeks, qualifyingWeekCount, isTrendQualified, mostRecentObservation, mostRecentCheckIn }
}

export function isCurrentIsoWeek(weekStart: Date, now: Date = new Date()): boolean {
  return isEqual(weekStart, startOfISOWeek(now))
}
