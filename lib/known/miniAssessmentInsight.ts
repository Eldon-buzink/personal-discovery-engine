/**
 * lib/known/miniAssessmentInsight.ts
 *
 * Pure, template-based (not LLM) summary of a single mini-assessment
 * attempt's own six answers — same philosophy as narrativeSynthesis.ts:
 * never infer a trait, motive or story the data doesn't directly show.
 * Only echoes the user's own answers, using the real item text
 * (MINI_ASSESSMENT_ITEMS) verbatim, grouped by how strongly each was held.
 * Falls back to 'none' whenever the six answers don't cleanly support a
 * confident statement (every answer neutral) — callers fall back to the
 * plain band copy in that case, exactly like detectLeanNarrative's 'flat'.
 */

import { MINI_ASSESSMENT_ITEMS, type MiniAssessmentFacet } from './miniAssessmentScoring'

export type InsightDirection = 'agree' | 'disagree'

export type MiniAssessmentInsight =
  | { type: 'tension'; high: { itemText: string; direction: InsightDirection }; low: { itemText: string; direction: InsightDirection } }
  | { type: 'agreement'; itemText: string; direction: InsightDirection }
  | { type: 'none' }

// Distance from the neutral midpoint of a 1-5 Likert response — 0 for
// exactly neutral (3), up to 2 for a strongly-held end (1 or 5).
function strength(response: number): number {
  return Math.abs(response - 3)
}

export function computeMiniAssessmentInsight(facet: MiniAssessmentFacet, responses: number[]): MiniAssessmentInsight {
  const items = MINI_ASSESSMENT_ITEMS[facet]
  if (responses.length !== items.length) return { type: 'none' }

  const scored = items.map((item, index) => {
    const response = responses[index]
    // Adjusted score (reverse-key corrected) decides which end of the trait
    // an answer pulls toward — the same convention scoreMiniAssessment
    // uses. The raw response (not adjusted) decides whether the person
    // actually agreed or disagreed with the item's own wording, since
    // that's what gets quoted back to them.
    const adjusted = item.reverseScored ? 6 - response : response
    return { index, text: item.text, response, strength: strength(response), adjusted }
  })

  const byStrengthThenIndex = (a: (typeof scored)[number], b: (typeof scored)[number]) =>
    b.strength - a.strength || a.index - b.index

  // Tension: the strongest answer pulling toward the "high" end of the
  // trait and the strongest pulling toward the "low" end, when both are
  // genuinely held (not neutral) — the six-item version of a mixed
  // picture, not a non-answer. This is intentionally symmetric: a reverse-
  // keyed item the person disagreed with can pull "high" just as a
  // straight item they agreed with can, since both reports use the item's
  // own text plus whether they agreed or disagreed with it, never a
  // trait-level claim.
  const bestHigh = scored.filter((s) => s.adjusted > 3).sort(byStrengthThenIndex)[0]
  const bestLow = scored.filter((s) => s.adjusted < 3).sort(byStrengthThenIndex)[0]

  if (bestHigh && bestLow && bestHigh.strength >= 1 && bestLow.strength >= 1) {
    return {
      type: 'tension',
      high: { itemText: bestHigh.text, direction: bestHigh.response > 3 ? 'agree' : 'disagree' },
      low: { itemText: bestLow.text, direction: bestLow.response > 3 ? 'agree' : 'disagree' },
    }
  }

  // Single strongest answer, in either direction. A tie is broken by item
  // order, but the wording this feeds (see formatMiniAssessmentInsight)
  // never claims the pick is uniquely the strongest — a tie is still an
  // honest, representative answer to surface, not a fabricated "the most".
  const strongest = [...scored].sort(byStrengthThenIndex)[0]
  if (strongest && strongest.strength >= 1) {
    return { type: 'agreement', itemText: strongest.text, direction: strongest.response > 3 ? 'agree' : 'disagree' }
  }

  return { type: 'none' }
}

// Renders the structured insight into the one or two sentences shown on
// the result page. Kept alongside the pure computation (not in the React
// component) so both are unit-testable the same way.
export function formatMiniAssessmentInsight(insight: MiniAssessmentInsight): string | null {
  // Every item already ends in its own period — strip it before quoting so
  // the surrounding sentence's own terminal punctuation doesn't double up
  // into `."." `.
  const quote = (text: string) => `“${text.replace(/\.$/, '')}”`
  const clause = (direction: InsightDirection, itemText: string) =>
    `${direction === 'agree' ? 'you agreed with' : 'you disagreed with'} ${quote(itemText)}`

  switch (insight.type) {
    case 'tension':
      return `In your answers, ${clause(insight.high.direction, insight.high.itemText)} — but also ${clause(insight.low.direction, insight.low.itemText)}.`
    case 'agreement':
      return `What stood out in your answers: ${clause(insight.direction, insight.itemText)}.`
    case 'none':
      return null
  }
}
