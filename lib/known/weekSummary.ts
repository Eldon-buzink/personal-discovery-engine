/**
 * lib/known/weekSummary.ts
 *
 * The week-level bucketing/plurality logic originally built inside
 * lib/known/trend.ts, pulled out so monthly recap and quarterly review can
 * reuse the exact same week math (per-week floor check, plurality lean,
 * genuine-tie handling) rather than rebuilding it — trend.ts, monthlyRecap.ts
 * and quarterlyReview.ts all import from here.
 */

import { startOfISOWeek, startOfDay, format } from 'date-fns'
import { WEEKLY_CHECKIN_FLOOR } from './practiceConfig'

export interface CheckInForTrend {
  check_in_date: string // 'YYYY-MM-DD', as stored in the check_ins.check_in_date column
  response_option: string
}

// Distinguishes "nobody checked in that week" from "check-ins happened but
// split evenly" — both would otherwise collapse to "no lean," but only the
// second is the genuine-tie case the handover says must never be papered
// over with a fabricated pick.
export type WeekLean = { type: 'option'; value: string } | { type: 'tie' } | { type: 'none' }

export interface WeekSummary {
  weekStart: Date
  checkInCount: number
  qualifies: boolean
  lean: WeekLean
  // Count of check-ins matching the winning option(s) — meaningful for both
  // an 'option' lean and a 'tie' (the shared max count across the tied
  // options); 0 for 'none'.
  topCount: number
}

// check_in_date ('YYYY-MM-DD') is parsed as a LOCAL calendar date, not UTC —
// `new Date('YYYY-MM-DD')` parses as UTC midnight in JS, which can shift the
// date into the wrong ISO week for negative-UTC-offset timezones. This
// matches todayLocalDateString() in the check-in screen, which wrote the
// date using the browser's local calendar day in the first place.
export function parseCheckInDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function weekKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function computeLean(options: string[]): { lean: WeekLean; topCount: number } {
  if (options.length === 0) return { lean: { type: 'none' }, topCount: 0 }
  const counts = new Map<string, number>()
  for (const o of options) counts.set(o, (counts.get(o) ?? 0) + 1)
  const max = Math.max(...Array.from(counts.values()))
  const top = Array.from(counts.entries()).filter(([, c]) => c === max)
  if (top.length !== 1) return { lean: { type: 'tie' }, topCount: max }
  return { lean: { type: 'option', value: top[0][0] }, topCount: max }
}

export function bucketCheckInsByWeek(checkIns: CheckInForTrend[]): Map<string, string[]> {
  const byWeek = new Map<string, string[]>()
  for (const c of checkIns) {
    const key = weekKey(startOfISOWeek(parseCheckInDate(c.check_in_date)))
    const arr = byWeek.get(key) ?? []
    arr.push(c.response_option)
    byWeek.set(key, arr)
  }
  return byWeek
}

export function summarizeWeek(byWeek: Map<string, string[]>, weekStart: Date): WeekSummary {
  const options = byWeek.get(weekKey(weekStart)) ?? []
  const { lean, topCount } = computeLean(options)
  return { weekStart, checkInCount: options.length, qualifies: options.length >= WEEKLY_CHECKIN_FLOOR, lean, topCount }
}

// Convenience for callers that only need one week's answer and don't already
// have a bucket map handy (e.g. the low-engagement nudge check).
export function summarizeSingleWeek(checkIns: CheckInForTrend[], weekStart: Date): WeekSummary {
  return summarizeWeek(bucketCheckInsByWeek(checkIns), weekStart)
}

// Shared by trend/monthly-recap/quarterly-review/nudge — every one of them
// needs to exclude check-ins from before the activation's current period
// started (the reset-on-reactivation rule). Day-granularity, not
// exact-timestamp: check_in_date has no time component, so comparing it
// against a precise activation timestamp would wrongly exclude a same-day
// check-in logged after activation but before that clock time (e.g.
// activated 14:00, checked in 15:00). Both sides read the browser's current
// local timezone — the same reference frame check_in_date itself was
// written in, not a stored one, since neither column carries a timezone;
// this can shift by a day if the user travels between activating and
// checking in, an accepted edge case given nothing in the schema tracks
// timezone at all.
export function scopeToCurrentPeriod<T extends CheckInForTrend>(checkIns: T[], periodStartedAt: string): T[] {
  const periodStartDay = startOfDay(new Date(periodStartedAt))
  return checkIns.filter((c) => parseCheckInDate(c.check_in_date) >= periodStartDay)
}
