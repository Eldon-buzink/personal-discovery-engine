/**
 * lib/known/evidencePanel.ts
 *
 * What the report's "See what this is based on" panel shows for one Ring 1
 * trait. Pure; the answers come from the browser's own known_session, the
 * same place the card's request took them from.
 *
 * The two answers are picked by evidenceFor + facetAnswers, the exact
 * functions that chose what the model received (lib/known/ring1Evidence.ts):
 * the strongest |answer - 3|, neutral answers never, ties to the earlier
 * item, excluded facets and items never. Agree / disagree is read from the
 * raw answer against the statement's own wording (not reverse-keyed), which
 * is what the prompt said ("They agreed with …").
 *
 * Answers are shown only when the model really received them:
 * - not for a facet whose answers are never sent (Depression);
 * - not for a card saved in the older format (no `body`), which was written
 *   before any answers were sent.
 */

import { FACET_QUESTIONS } from './ring1-questions'
import { facetTraitWords } from './scoring'
import { evidenceAllowed, evidenceFor, facetAnswers } from './ring1Evidence'

export type ScoreDirection = 'low' | 'mid' | 'high'

export interface EvidencePanelData {
  words: { low: string; mid: string; high: string }
  direction: ScoreDirection
  // "You lean toward {word}" / "You land near the middle"
  sentence: string
  // null: no answers part at all (never sent, or an older card). Otherwise
  // the answers the model received, in order (0 to 2 of them).
  answers: { text: string; answer: 'You agreed' | 'You disagreed' }[] | null
  itemCount: number
  // A facet whose answers are never sent (Depression): the dialog shows only
  // its title and the statement-count line.
  sensitive: boolean
}

export function evidencePanelData(
  facet: string,
  direction: ScoreDirection,
  responses: Map<number, number>,
  cardHasEvidence: boolean,
): EvidencePanelData | null {
  const words = facetTraitWords(facet)
  const items = FACET_QUESTIONS.get(facet)
  if (!words || !items) return null
  const sentence = direction === 'mid' ? 'You land near the middle' : `You lean toward ${words[direction]}`
  const answers = evidenceAllowed(facet) && cardHasEvidence
    ? evidenceFor(facet, facetAnswers(facet, responses)).map((e) => ({
        text: e.text,
        answer: e.direction === 'agree' ? ('You agreed' as const) : ('You disagreed' as const),
      }))
    : null
  return { words, direction, sentence, answers, itemCount: items.length, sensitive: !evidenceAllowed(facet) }
}

// Whether the card shows the "See what this is based on" button at all: for
// a sensitive facet (title and count only), otherwise only when there are
// answers to show (never for an older card, nor when every answer was
// neutral).
export function evidenceTriggerShown(data: EvidencePanelData | null): boolean {
  if (!data) return false
  return data.sensitive || (data.answers?.length ?? 0) > 0
}

// Heading for the answers part; matches how many there really are.
export function answersHeading(count: number): string {
  return count === 1 ? 'One of your answers on this pattern' : 'Two of your answers on this pattern'
}

export function itemCountLine(n: number): string {
  return `This comes from ${n} statements in the assessment. It describes a tendency, not a diagnosis.`
}
