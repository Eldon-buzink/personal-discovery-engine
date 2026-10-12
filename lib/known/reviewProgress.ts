/**
 * lib/known/reviewProgress.ts
 *
 * How far each active trait is from its weekly, monthly and quarterly
 * review — one place for the practice home's three review cards and the
 * three review pages, so "ready" means the same thing everywhere. No new
 * thresholds: each cadence reuses the gate its read already had.
 *   - Weekly: WEEKLY_CHECKIN_FLOOR check-ins this ISO week (weeklyInsight).
 *   - Monthly: COMPARISON_MIN_CHECKINS check-ins in the 4-week report
 *     window (the ladder's and the start-vs-now comparison's "enough").
 *   - Quarterly: MILESTONE_WINDOW_DAYS since the trait's period started.
 *
 * Plain text, never a bar — same no-gamification rule as practiceStage.ts.
 */

import { differenceInCalendarDays, startOfDay } from 'date-fns'
import { COMPARISON_MIN_CHECKINS, MILESTONE_WINDOW_DAYS, WEEKLY_CHECKIN_FLOOR } from './practiceConfig'
import { computeWeeklyInsight } from './weeklyInsight'
import { computeRecentWeeksReport } from './recentWeeksReport'
import type { CheckInForTrend } from './weekSummary'

export type ReviewCadence = 'weekly' | 'monthly' | 'quarterly'

export const REVIEW_CADENCES: ReviewCadence[] = ['weekly', 'monthly', 'quarterly']

export const REVIEW_COPY: Record<ReviewCadence, { title: string; description: string; href: string }> = {
  weekly: { title: 'Weekly', description: 'How each trait leaned this week.', href: '/practice/reviews/weekly' },
  monthly: { title: 'Monthly', description: 'Four weeks, next to your report.', href: '/practice/reviews/monthly' },
  quarterly: { title: 'Quarterly', description: '90 days in: still the right traits?', href: '/practice/reviews/quarterly' },
}

export interface TraitReviewInput {
  checkInsThisWeek: number
  checkInsInReportWindow: number
  periodStartedAt: string
}

export function traitReviewInput(checkIns: CheckInForTrend[], periodStartedAt: string, now: Date = new Date()): TraitReviewInput {
  return {
    checkInsThisWeek: computeWeeklyInsight(checkIns, periodStartedAt, now).summary.checkInCount,
    checkInsInReportWindow: computeRecentWeeksReport(checkIns, periodStartedAt, now).checkInCount,
    periodStartedAt,
  }
}

// What's still missing for one trait, or 0 when it's ready. Check-ins for
// weekly/monthly, days for quarterly.
export function remainingFor(cadence: ReviewCadence, t: TraitReviewInput, now: Date = new Date()): number {
  if (cadence === 'weekly') return Math.max(0, WEEKLY_CHECKIN_FLOOR - t.checkInsThisWeek)
  if (cadence === 'monthly') return Math.max(0, COMPARISON_MIN_CHECKINS - t.checkInsInReportWindow)
  const days = differenceInCalendarDays(startOfDay(now), startOfDay(new Date(t.periodStartedAt)))
  return Math.max(0, MILESTONE_WINDOW_DAYS - days)
}

export interface ReviewProgress {
  readyCount: number
  total: number
  // Smallest remaining amount across traits that aren't ready yet — what the
  // card says when nothing is ready.
  closestRemaining: number | null
}

export function computeReviewProgress(cadence: ReviewCadence, traits: TraitReviewInput[], now: Date = new Date()): ReviewProgress {
  const remaining = traits.map((t) => remainingFor(cadence, t, now))
  const waiting = remaining.filter((r) => r > 0)
  return {
    readyCount: remaining.length - waiting.length,
    total: traits.length,
    closestRemaining: waiting.length > 0 ? Math.min(...waiting) : null,
  }
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// One line per trait, for the review pages: "Ready" or what's left.
export function formatTraitRemaining(cadence: ReviewCadence, remaining: number): string {
  if (remaining === 0) return 'Ready'
  if (cadence === 'weekly') return `${remaining} more this week for a weekly read`
  if (cadence === 'monthly') return `${remaining} more to compare with your report`
  return `Full 90 days in ${plural(remaining, 'day')}`
}

// The card's progress line. Null with no active traits — the card then just
// describes the review.
export function formatReviewProgress(cadence: ReviewCadence, p: ReviewProgress): string | null {
  if (p.total === 0) return null
  if (p.readyCount === p.total) return 'Ready'
  if (p.readyCount > 0) return `Ready for ${p.readyCount} of ${p.total} traits`
  const r = p.closestRemaining ?? 0
  if (cadence === 'weekly') return `${plural(r, 'more check-in')} this week`
  if (cadence === 'monthly') return `${plural(r, 'more check-in')} to go`
  return `In ${plural(r, 'day')}`
}
