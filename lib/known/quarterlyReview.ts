/**
 * lib/known/quarterlyReview.ts
 *
 * Per-facet milestone read for the practice-wide milestone page
 * (app/(app)/practice/quarterly) — rework Part 4. Used to be anchored to
 * the calendar quarter; now anchored to MILESTONE_WINDOW_DAYS (90) since
 * each facet's own current activation period started, same
 * lib/known/periodWindow.ts mechanism the facet report's 4-week window
 * uses. Each active facet can be at a different point in its own 90-day
 * window — there's no single shared "quarter" once activation dates can
 * differ, so this reads one facet at a time; the page aggregates.
 *
 * Deliberately simpler than the old per-facet shift/steady narrative
 * attempt: a plain, honest lean (or "too early to say" below
 * COMPARISON_MIN_CHECKINS) over the window, using the exact same
 * plurality/tie logic every other screen already shares
 * (weekSummary.ts's computeLean) rather than a second definition of "what
 * counts as a lean" at this coarser grain.
 */

import { scopeToCurrentPeriod, parseCheckInDate, computeLean, type CheckInForTrend, type WeekLean } from './weekSummary'
import { computePeriodWindow, type PeriodWindow } from './periodWindow'
import { MILESTONE_WINDOW_DAYS } from './practiceConfig'

export interface FacetMilestoneResult {
  window: PeriodWindow
  checkInCount: number
  lean: WeekLean
}

export function computeFacetMilestone(
  checkIns: CheckInForTrend[],
  periodStartedAt: string,
  now: Date = new Date()
): FacetMilestoneResult {
  const window = computePeriodWindow(periodStartedAt, MILESTONE_WINDOW_DAYS, now)
  const scoped = scopeToCurrentPeriod(checkIns, periodStartedAt)
  const inWindow = scoped.filter((c) => {
    const d = parseCheckInDate(c.check_in_date)
    return d >= window.start && d <= window.end
  })
  const { lean } = computeLean(inWindow.map((c) => c.response_option))
  return { window, checkInCount: inWindow.length, lean }
}
