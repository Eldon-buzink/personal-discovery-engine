/**
 * lib/known/monthlyRecap.ts
 *
 * Per-facet, per-calendar-month recap (handover §2.3, Recap.dc.html
 * reference). Deliberately skips the mockup's synthesized "shift" narrative
 * headline (§3.1 — templated/LLM synthesis is a separate future content
 * decision) in favor of a plain, honest count. Reuses the same week
 * mechanics as trend.ts (lib/known/weekSummary.ts) rather than rebuilding
 * per-week floor/plurality logic.
 */

import { startOfISOWeek, endOfMonth, addWeeks } from 'date-fns'
import { bucketCheckInsByWeek, summarizeWeek, scopeToCurrentPeriod, parseCheckInDate, type CheckInForTrend, type WeekSummary } from './weekSummary'

export interface MonthlyRecapResult {
  monthStart: Date
  // Scoped to the current activation period (reset-on-reactivation rule,
  // same as trend.ts) and to this calendar month.
  checkInCount: number
  // Every ISO week that touches this month at all — including a leading
  // partial week whose Monday falls in the PRIOR month (e.g. September 2026
  // starts on a Tuesday, so "Week 1" here is Aug 31–Sep 6, but only its
  // Sep 1–3 portion is counted, since `byWeek` is built from
  // month-filtered check-ins). This is deliberate: a user's first few days
  // of the month should never just be missing from the tile row. Usually 4
  // or 5 tiles depending on how the month lines up with week boundaries.
  weeks: WeekSummary[]
}

export function computeMonthlyRecap(checkIns: CheckInForTrend[], periodStartedAt: string, monthStart: Date): MonthlyRecapResult {
  const scoped = scopeToCurrentPeriod(checkIns, periodStartedAt)
  const monthEnd = endOfMonth(monthStart)
  const inMonth = scoped.filter((c) => {
    const d = parseCheckInDate(c.check_in_date)
    return d >= monthStart && d <= monthEnd
  })

  const byWeek = bucketCheckInsByWeek(inMonth)

  const weeks: WeekSummary[] = []
  let cursor = startOfISOWeek(monthStart)
  while (cursor <= monthEnd) {
    weeks.push(summarizeWeek(byWeek, cursor))
    cursor = addWeeks(cursor, 1)
  }

  return { monthStart, checkInCount: inMonth.length, weeks }
}
