/**
 * lib/known/periodWindow.ts
 *
 * Rework Part 4 — replaces calendar-month/calendar-quarter anchoring with a
 * window anchored to the facet's current activation period. Before
 * `windowDays` have passed since the period started, the window IS the
 * period so far ("your first N days") — after, it becomes a rolling window
 * of the most recent N days ("last N days"). This is the fix for a user who
 * activates on the 28th getting a one-week "October": the window now
 * follows when THEY started, not the calendar page.
 *
 * Day-granularity throughout, matching scopeToCurrentPeriod's own
 * day-granularity reasoning in weekSummary.ts (check_in_date has no time
 * component, so comparing at day resolution is the only thing that's ever
 * correct here).
 */

import { startOfDay, differenceInCalendarDays, subDays } from 'date-fns'

export interface PeriodWindow {
  start: Date
  end: Date // inclusive, day-granularity — "today" when the window is still open
  isFirstWindow: boolean
}

export function computePeriodWindow(periodStartedAt: string, windowDays: number, now: Date = new Date()): PeriodWindow {
  const periodStart = startOfDay(new Date(periodStartedAt))
  const today = startOfDay(now)
  const daysSinceStart = differenceInCalendarDays(today, periodStart)

  if (daysSinceStart < windowDays) {
    return { start: periodStart, end: today, isFirstWindow: true }
  }
  return { start: subDays(today, windowDays - 1), end: today, isFirstWindow: false }
}
