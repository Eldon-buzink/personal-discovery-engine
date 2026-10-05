/**
 * lib/known/practiceStage.ts
 *
 * The non-gamified progress ladder (rework Part 2). Three stages:
 *   1. Collecting — before the first qualifying week (3+ check-ins).
 *   2. Your first picture — at least one qualifying week, but the report's
 *      comparison isn't ready yet.
 *   3. Does it fit? — the report window has enough check-ins to compare
 *      against the starting result.
 *
 * Follow-up fix: step 3 used to be gated on isTrendQualified (3 qualifying
 * weeks within computeTrend's 5-week rolling lookback), while the report's
 * own start-vs-now comparison (startVsNow.ts) is gated on
 * COMPARISON_MIN_CHECKINS within the 28-day report window
 * (recentWeeksReport.ts) — two different windows, two different counts,
 * that could disagree: a user could reach "Does it fit?" here and then see
 * "Not enough check-ins to compare yet" on the report, or the reverse.
 * There is now exactly one definition of "enough for the comparison" —
 * reportWindowCheckInCount >= COMPARISON_MIN_CHECKINS — and both this
 * stage and the report read it the same way. Step 1-to-2 is unaffected
 * (still the first qualifying week); only step 2-to-3 changed.
 *
 * Only ever moves forward within a single activation period — nothing here
 * decreases from a missed day, and the only reset is deactivate/reactivate
 * starting a new period (scopeToCurrentPeriod), the same rule every other
 * practice metric already follows.
 *
 * Visual form: plain text, not a fill bar or a dot row. This codebase has
 * no progress-bar-style component anywhere else — every existing screen is
 * typographic — and a bar reads as "fill me up" even when it never resets,
 * which is exactly the association the no-gamification rule exists to
 * avoid. A row of dots was the other option on the table; text was chosen
 * instead because it's the lower-risk reading in a product this wary of
 * anything game-shaped, and it's one line, not a new component.
 */

import { TREND_MIN_QUALIFYING_WEEKS, WEEKLY_CHECKIN_FLOOR, COMPARISON_MIN_CHECKINS } from './practiceConfig'

export type PracticeStage = 'collecting' | 'first_picture' | 'does_it_fit'

export const STAGE_ORDER: PracticeStage[] = ['collecting', 'first_picture', 'does_it_fit']

export const STAGE_LABEL: Record<PracticeStage, string> = {
  collecting: 'Collecting',
  first_picture: 'Your first picture',
  does_it_fit: 'Does it fit?',
}

export interface StageResult {
  stage: PracticeStage
  stepNumber: 1 | 2 | 3
  qualifyingWeekCount: number
  weeksNeeded: number
  // The same count startVsNow.ts gates the comparison on — check-ins within
  // the current 28-day report window (lib/known/recentWeeksReport.ts), NOT
  // all-time or period-all-time. Carried on the result so
  // formatStageProgress can say exactly what's still missing.
  reportWindowCheckInCount: number
  checkInsNeeded: number
}

export function computeStage(qualifyingWeekCount: number, reportWindowCheckInCount: number): StageResult {
  const base = { qualifyingWeekCount, weeksNeeded: TREND_MIN_QUALIFYING_WEEKS, reportWindowCheckInCount, checkInsNeeded: COMPARISON_MIN_CHECKINS }
  if (reportWindowCheckInCount >= COMPARISON_MIN_CHECKINS) {
    return { stage: 'does_it_fit', stepNumber: 3, ...base }
  }
  if (qualifyingWeekCount > 0) {
    return { stage: 'first_picture', stepNumber: 2, ...base }
  }
  return { stage: 'collecting', stepNumber: 1, ...base }
}

// Stage 1: just the one sentence explaining what a qualifying week is —
// not "0 of 3 weeks done", which reads as a deficit before the user has
// had any chance to do anything.
// Stage 2: keeps "N of 3 weeks done" (real progress, N >= 1 here), but
// also says plainly what's still missing for the actual comparison — the
// report needs check-ins, not weeks, so "Your first picture" shouldn't
// imply the report can already compare against the starting result when
// it can't yet.
// Stage 3: null — the comparison is ready; what the data shows belongs on
// the report, not a repeated progress line here.
export function formatStageProgress(result: StageResult): string[] | null {
  if (result.stage === 'does_it_fit') return null
  if (result.stage === 'collecting') {
    return [`A week counts when you check in ${WEEKLY_CHECKIN_FLOOR} times.`]
  }
  return [
    `${result.qualifyingWeekCount} of ${result.weeksNeeded} weeks done. A week counts when you check in ${WEEKLY_CHECKIN_FLOOR} times.`,
    `Your comparison is ready after ${result.checkInsNeeded} check-ins. You have ${result.reportWindowCheckInCount}.`,
  ]
}

// Compact single-line form for Practice home's card — same data, no
// progress sentence, just "Step N of 3 — Label".
export function formatStageCompact(result: StageResult): string {
  return `Step ${result.stepNumber} of 3 — ${STAGE_LABEL[result.stage]}`
}
