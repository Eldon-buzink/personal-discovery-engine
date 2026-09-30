/**
 * lib/known/engagement.ts
 *
 * Low-engagement detection for the nudge (handover §2.3) — event-triggered,
 * not calendar-triggered: computed lazily whenever this is called (Practice
 * home, on load), not on a schedule. No cron/background-job infra exists in
 * this codebase (confirmed during the original review pass), so this is
 * necessarily a "check when the user shows up" read, never a push.
 */

import { differenceInCalendarDays, startOfDay } from 'date-fns'
import { LOW_ENGAGEMENT_NUDGE_THRESHOLD_DAYS } from './practiceConfig'
import { scopeToCurrentPeriod, parseCheckInDate, type CheckInForTrend } from './weekSummary'

// Days since the most recent check-in in the current period, or since the
// period started if there's no check-in at all yet — a freshly activated
// facet with zero check-ins is "disengaged" the same way a lapsed one is,
// once enough days have passed either way.
export function daysSinceLastCheckIn(checkIns: CheckInForTrend[], periodStartedAt: string, now: Date = new Date()): number {
  const scoped = scopeToCurrentPeriod(checkIns, periodStartedAt)
  if (scoped.length === 0) {
    return differenceInCalendarDays(startOfDay(now), startOfDay(new Date(periodStartedAt)))
  }
  const latestDate = scoped.reduce((max, c) => (c.check_in_date > max ? c.check_in_date : max), scoped[0].check_in_date)
  return differenceInCalendarDays(startOfDay(now), parseCheckInDate(latestDate))
}

export function isLowEngagement(checkIns: CheckInForTrend[], periodStartedAt: string, now: Date = new Date()): boolean {
  return daysSinceLastCheckIn(checkIns, periodStartedAt, now) >= LOW_ENGAGEMENT_NUDGE_THRESHOLD_DAYS
}
