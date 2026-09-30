/**
 * lib/known/quarterlyReview.ts
 *
 * Per-facet quarter totals (handover §2.3, Quarterly.dc.html reference).
 * The mockup's CROSS-PATTERN synthesized narrative ("Reading into silence
 * moved from assuming the worst to checking in first... Trust took
 * longer...", spanning multiple different facets in one sentence) stays out
 * of scope — that needs genuine interpretive synthesis across unrelated
 * data series, not a template. A SINGLE-facet shift/steady narrative is in
 * scope (narrativeSynthesis.ts), built here off each facet's per-MONTH
 * dominant lean across the quarter's 3 months — coarser than monthly
 * recap's per-week granularity, since 13 noisy weekly leans would make
 * shift-detection unreliable where 3 monthly ones don't.
 *
 * Deliberately does NOT introduce a quarter-specific qualification window
 * for the fallback read. When the 3-month lean sequence doesn't cleanly
 * support a shift/steady story, the caller falls back to the SAME
 * computeTrend() used on the facet detail screen (5-week lookback), not a
 * new quarter-scaled threshold the handover never specified — reusing it
 * keeps one definition of "trend qualified" instead of two competing ones.
 */

import { endOfQuarter, endOfMonth, addMonths } from 'date-fns'
import { scopeToCurrentPeriod, parseCheckInDate, computeLean, type CheckInForTrend, type WeekLean } from './weekSummary'

export function countCheckInsInQuarter(checkIns: CheckInForTrend[], periodStartedAt: string, quarterStart: Date): number {
  const scoped = scopeToCurrentPeriod(checkIns, periodStartedAt)
  const quarterEnd = endOfQuarter(quarterStart)
  return scoped.filter((c) => {
    const d = parseCheckInDate(c.check_in_date)
    return d >= quarterStart && d <= quarterEnd
  }).length
}

// The whole-month plurality (not week-bucketed) — one dominant lean per
// month, used as the 3-point input to detectLeanNarrative() for the
// quarterly view. Reuses computeLean directly (the same plurality/tie logic
// weekSummary.ts already applies per-week) just scoped to a full month's
// check-ins instead of one week's.
export function dominantLeanForMonth(checkIns: CheckInForTrend[], periodStartedAt: string, monthStart: Date): WeekLean {
  const scoped = scopeToCurrentPeriod(checkIns, periodStartedAt)
  const monthEnd = endOfMonth(monthStart)
  const inMonth = scoped.filter((c) => {
    const d = parseCheckInDate(c.check_in_date)
    return d >= monthStart && d <= monthEnd
  })
  return computeLean(inMonth.map((c) => c.response_option)).lean
}

// The quarter's 3 calendar-month starts, in order — shared helper so the
// caller doesn't hand-roll addMonths(quarterStart, i) three times.
export function quarterMonthStarts(quarterStart: Date): Date[] {
  return [0, 1, 2].map((i) => addMonths(quarterStart, i))
}
