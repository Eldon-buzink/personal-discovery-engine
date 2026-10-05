/**
 * lib/known/recentWeeksReport.ts
 *
 * Replaces monthlyRecap.ts (rework Part 4) — same week-tile shape, but
 * windowed by REPORT_WINDOW_WEEKS anchored to the facet's current
 * activation period (lib/known/periodWindow.ts) instead of the calendar
 * month. A user who activates on the 28th used to get a near-empty
 * "October" recap three days later; now they get a real first window
 * starting from when they actually began.
 *
 * Still reuses the exact same week mechanics (lib/known/weekSummary.ts)
 * every other trend/recap/quarterly computation shares — only the window
 * boundary changed, not the per-week floor/plurality logic underneath it.
 */

import { startOfISOWeek, addWeeks } from 'date-fns'
import { bucketCheckInsByWeek, summarizeWeek, scopeToCurrentPeriod, parseCheckInDate, type CheckInForTrend, type WeekSummary } from './weekSummary'
import { computePeriodWindow, type PeriodWindow } from './periodWindow'
import { REPORT_WINDOW_WEEKS } from './practiceConfig'

export interface RecentWeeksReportResult {
  window: PeriodWindow
  // Scoped to the current activation period (reset-on-reactivation rule)
  // AND to the window above.
  checkInCount: number
  // Every ISO week the window touches, oldest to newest — same "always show
  // the real tile count, including a leading partial week" behavior
  // monthlyRecap.ts had, just bounded by the period window now instead of
  // the calendar month.
  weeks: WeekSummary[]
  // The raw in-window check-ins — exposed so the report page can derive its
  // own distribution (Part 3a) and start-vs-now comparison (Part 3b)
  // without re-deriving the same window filter a second time.
  checkIns: CheckInForTrend[]
}

export function computeRecentWeeksReport(
  checkIns: CheckInForTrend[],
  periodStartedAt: string,
  now: Date = new Date()
): RecentWeeksReportResult {
  const window = computePeriodWindow(periodStartedAt, REPORT_WINDOW_WEEKS * 7, now)
  const scoped = scopeToCurrentPeriod(checkIns, periodStartedAt)
  const inWindow = scoped.filter((c) => {
    const d = parseCheckInDate(c.check_in_date)
    return d >= window.start && d <= window.end
  })

  const byWeek = bucketCheckInsByWeek(inWindow)
  const weeks: WeekSummary[] = []
  let cursor = startOfISOWeek(window.start)
  while (cursor <= window.end) {
    weeks.push(summarizeWeek(byWeek, cursor))
    cursor = addWeeks(cursor, 1)
  }

  return { window, checkInCount: inWindow.length, weeks, checkIns: inWindow }
}
