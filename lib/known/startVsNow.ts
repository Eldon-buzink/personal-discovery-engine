/**
 * lib/known/startVsNow.ts
 *
 * Rework Part 3b — compares a facet's starting result (a mini-assessment
 * band, or a base-assessment trait-word band — both low/mid/high in the
 * same shared vocabulary checkInOptions.ts uses) against what the check-ins
 * since then actually show. Pure, deterministic: reuses weekSummary.ts's
 * computeLean for the "now" side rather than a second plurality/tie
 * definition, and never invents a read the data doesn't support — below
 * COMPARISON_MIN_CHECKINS or on a genuine tie, it says so plainly instead
 * of picking a side.
 *
 * Framing is deliberately "your days vs. your starting result", never a
 * re-score or a verdict, and never says the starting result was wrong —
 * the starting result and the check-ins are both honest reads of different
 * things (a 6-question guess or a full report, vs. daily self-observation),
 * not competing claims where one has to lose.
 */

import { COMPARISON_MIN_CHECKINS } from './practiceConfig'
import { computeLean, type WeekLean } from './weekSummary'
import { checkInOptionWord } from './checkInOptions'

export type BandId = 'low' | 'mid' | 'high'

const BAND_ORDER: BandId[] = ['low', 'mid', 'high']

export type StartVsNowComparison =
  | { type: 'not_enough_data'; checkInsNeeded: number }
  | { type: 'no_clear_lean' }
  | { type: 'matches' }
  | { type: 'adjacent'; towardOption: BandId }
  | { type: 'opposite' }

export function compareStartToNow(startBand: BandId, nowLean: WeekLean, totalCheckIns: number): StartVsNowComparison {
  if (totalCheckIns < COMPARISON_MIN_CHECKINS) {
    return { type: 'not_enough_data', checkInsNeeded: COMPARISON_MIN_CHECKINS - totalCheckIns }
  }
  if (nowLean.type !== 'option') return { type: 'no_clear_lean' }

  const nowBand = nowLean.value as BandId
  if (nowBand === startBand) return { type: 'matches' }

  const distance = Math.abs(BAND_ORDER.indexOf(nowBand) - BAND_ORDER.indexOf(startBand))
  if (distance === 1) return { type: 'adjacent', towardOption: nowBand }
  return { type: 'opposite' }
}

// Convenience for callers that have a raw list of response options for the
// window rather than an already-computed WeekLean (the report page has the
// distribution's check-ins directly, not a pre-bucketed lean).
export function compareStartToNowFromOptions(startBand: BandId, options: string[]): StartVsNowComparison {
  const { lean } = computeLean(options)
  return compareStartToNow(startBand, lean, options.length)
}

export function formatStartVsNow(result: StartVsNowComparison, facetId: string): string {
  switch (result.type) {
    case 'not_enough_data':
      return `Not enough check-ins to compare yet. ${result.checkInsNeeded} more to go.`
    case 'no_clear_lean':
      return 'No clear lean yet.'
    case 'matches':
      return 'Mostly matches your starting result.'
    case 'adjacent':
      return `Your days lean a bit more toward ${checkInOptionWord(facetId, result.towardOption)} than your starting result.`
    case 'opposite':
      return 'Your days lean differently from your starting result.'
  }
}
