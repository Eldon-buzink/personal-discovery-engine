/**
 * lib/known/practiceStage.ts
 *
 * The non-gamified progress ladder (rework Part 2) — three stages, computed
 * entirely from the existing trend logic (TrendResult.qualifyingWeekCount /
 * isTrendQualified, lib/known/trend.ts), reusing TREND_MIN_QUALIFYING_WEEKS
 * and TREND_LOOKBACK_WEEKS exactly as the spec asks rather than inventing a
 * second "when is this qualified" definition.
 *
 * Only ever moves forward within a single activation period — qualifying
 * weeks accumulate within computeTrend's rolling lookback window and never
 * reduce because of a missed day, since a missed day just doesn't add a
 * qualifying week, it doesn't subtract one. Resets only when the facet is
 * deactivated and reactivated (a new period, scopeToCurrentPeriod), which
 * is the same reset-on-reactivation rule every other practice metric
 * already follows — not something this file adds.
 *
 * Visual form: plain text, not a fill bar or a dot row. This codebase has
 * no progress-bar-style component anywhere else — every existing screen is
 * typographic — and a bar reads as "fill me up" even when it never resets,
 * which is exactly the association the no-gamification rule exists to
 * avoid. A row of dots was the other option on the table; text was chosen
 * instead because it's the lower-risk reading in a product this wary of
 * anything game-shaped, and it's one line, not a new component.
 */

import type { TrendResult } from './trend'
import { TREND_MIN_QUALIFYING_WEEKS, WEEKLY_CHECKIN_FLOOR } from './practiceConfig'

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
}

export function computeStage(trend: Pick<TrendResult, 'qualifyingWeekCount' | 'isTrendQualified'>): StageResult {
  const { qualifyingWeekCount, isTrendQualified } = trend
  if (isTrendQualified) {
    return { stage: 'does_it_fit', stepNumber: 3, qualifyingWeekCount, weeksNeeded: TREND_MIN_QUALIFYING_WEEKS }
  }
  if (qualifyingWeekCount > 0) {
    return { stage: 'first_picture', stepNumber: 2, qualifyingWeekCount, weeksNeeded: TREND_MIN_QUALIFYING_WEEKS }
  }
  return { stage: 'collecting', stepNumber: 1, qualifyingWeekCount, weeksNeeded: TREND_MIN_QUALIFYING_WEEKS }
}

// Null once stage 3 is reached — the ladder's job at that point is done;
// what the data actually shows belongs to the start-vs-now comparison
// (Part 3), not a repeated "N of 3" line that would just be stale.
export function formatStageProgress(result: StageResult): string | null {
  if (result.stage === 'does_it_fit') return null
  return `${result.qualifyingWeekCount} of ${result.weeksNeeded} weeks done. A week counts when you check in ${WEEKLY_CHECKIN_FLOOR} times.`
}

// Compact single-line form for Practice home's card — same data, no
// progress sentence, just "Step N of 3 — Label".
export function formatStageCompact(result: StageResult): string {
  return `Step ${result.stepNumber} of 3 — ${STAGE_LABEL[result.stage]}`
}
