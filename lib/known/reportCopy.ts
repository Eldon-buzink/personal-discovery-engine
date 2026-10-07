/**
 * lib/known/reportCopy.ts
 *
 * The report page's headline/distribution copy, moved out of
 * app/(app)/practice/[activationId]/report/page.tsx (page files can't
 * export helpers) so the landing preview's phone-frame recap renders the
 * exact same strings from its fixture instead of a lookalike.
 */

import { checkInOptionWord } from './checkInOptions'
import { WEEKLY_CHECKIN_FLOOR } from './practiceConfig'
import type { WeeklyInsightResult } from './weeklyInsight'

export function formatWeekHeadline(facetId: string, weekly: WeeklyInsightResult): string {
  const { summary } = weekly
  if (summary.checkInCount === 0) return 'No check-ins logged this week yet.'
  if (!summary.qualifies) return `${summary.checkInCount} of ${WEEKLY_CHECKIN_FLOOR} check-ins this week.`
  if (summary.lean.type === 'option') return `${summary.checkInCount} check-ins this week, leaning toward "${checkInOptionWord(facetId, summary.lean.value)}."`
  if (summary.lean.type === 'tie') return `${summary.checkInCount} check-ins this week, evenly split — no clear lean.`
  return `${summary.checkInCount} check-ins this week.`
}

// Every option's count, highest first — "Attuned 5 · Anxious 3 · Grounded
// 1" — not just the single winning option. Null when there's nothing in
// the window yet, so the caller can show an honest empty state instead of
// an empty string.
export function formatDistribution(facetId: string, distribution: Map<string, number>): string | null {
  if (distribution.size === 0) return null
  return Array.from(distribution.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([optionId, count]) => `${checkInOptionWord(facetId, optionId)} ${count}`)
    .join(' · ')
}
