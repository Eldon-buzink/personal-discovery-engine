/**
 * lib/known/narrativeSynthesis.ts
 *
 * Template-based (not LLM) narrative synthesis for the monthly recap and
 * quarterly review headlines — handover §3.1. Operates on an ordered list
 * of per-period dominant leans that the caller has already computed
 * (weekly leans for monthly recap, monthly-aggregated leans for quarterly
 * review) — this module never re-derives lean logic itself, and never
 * fabricates a shift the data doesn't cleanly show: only a genuinely
 * monotonic run of one option followed by a run of a different option
 * counts as a "shift". Anything noisier (oscillation, a third value
 * appearing, fewer than 2 real data points) reports 'flat', so the caller
 * falls back to plain factual phrasing instead of forcing a story.
 */

export type LeanNarrative =
  | { type: 'shift'; from: string; to: string }
  | { type: 'steady'; option: string; periods: number }
  | { type: 'flat' }

export function detectLeanNarrative(leans: string[]): LeanNarrative {
  if (leans.length < 2) return { type: 'flat' }

  if (leans.every((l) => l === leans[0])) {
    return { type: 'steady', option: leans[0], periods: leans.length }
  }

  // Clean monotonic shift: a run of one value, then a run of exactly one
  // OTHER value, with no reversion back and no third value anywhere.
  const first = leans[0]
  const changeIndex = leans.findIndex((l) => l !== first)
  const second = leans[changeIndex]
  const isCleanShift =
    leans.slice(0, changeIndex).every((l) => l === first) && leans.slice(changeIndex).every((l) => l === second)

  return isCleanShift ? { type: 'shift', from: first, to: second } : { type: 'flat' }
}
