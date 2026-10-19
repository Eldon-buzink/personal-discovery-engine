/**
 * lib/known/checkInOptionsSnapshot.ts
 *
 * Everything about the check-in options that must not change when only
 * their display text changes: per facet, the option ids, the short trait
 * word (checkInOptionWord) and what the trend functions return over the
 * landing fixture's rows. checkInOptions.test.ts compares this with the
 * stored copy taken before the labels lost their em dashes
 * (checkInOptions.snapshot.json).
 */

import { format } from 'date-fns'
import { landingPracticeFixture, materializeFixture } from '../../app/(site)/landing/landingPracticeFixture'
import { CHECK_IN_PROMPTS, checkInOptionWord, getCheckInPrompt } from './checkInOptions'
import { computeRecentWeeksReport } from './recentWeeksReport'
import { compareStartToNowFromOptions, formatStartVsNow } from './startVsNow'
import { computeTrend } from './trend'
import { computeWeeklyInsight, formatWeeklyProgress } from './weeklyInsight'

// A fixed reference date (a Thursday), as in journeyExample.test.ts.
const REF = new Date(2026, 9, 15, 12, 0, 0)

// Dates as local calendar days, so the stored copy doesn't depend on the
// machine's time zone.
function plain(v: unknown): unknown {
  if (v instanceof Date) return format(v, 'yyyy-MM-dd')
  if (v instanceof Map) return plain(Object.fromEntries(v))
  if (Array.isArray(v)) return v.map(plain)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
  return v
}

export function checkInOptionsSnapshot() {
  const facets = [...Object.keys(CHECK_IN_PROMPTS), 'Unknown facet (fallback prompt)']
  return Object.fromEntries(facets.map((facetId) => {
    const m = materializeFixture({ ...landingPracticeFixture, facetId }, REF)
    const options = m.after.map((c) => c.response_option)
    const weekly = computeWeeklyInsight(m.after, m.periodStartedAt, m.now)
    return [facetId, {
      ids: getCheckInPrompt(facetId).options.map((o) => o.id),
      words: getCheckInPrompt(facetId).options.map((o) => checkInOptionWord(facetId, o.id)),
      trend: plain({
        trend: computeTrend(m.after, m.periodStartedAt, m.now),
        weekly,
        weeklyProgress: formatWeeklyProgress(weekly),
        recent: computeRecentWeeksReport(m.after, m.periodStartedAt, m.now),
        startVsNow: formatStartVsNow(compareStartToNowFromOptions(landingPracticeFixture.startBand, options), facetId),
      }),
    }]
  }))
}
