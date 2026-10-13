/**
 * lib/known/ring1Evidence.ts
 *
 * The user's own most strongly held answers for one Ring 1 facet, so the
 * trait card can build on what they actually said instead of inventing
 * specifics. Same convention as miniAssessmentInsight.ts: strength is the
 * distance from the neutral midpoint (|answer − 3|), and agree/disagree is
 * read from the raw answer against the item's own wording (not reverse-
 * keyed), since that's what the item text says. Neutral answers are never
 * used. Ties go to the earlier item.
 */

import { FACET_QUESTIONS, QUESTION_BY_ID } from './ring1-questions'

export interface FacetAnswer {
  questionId: number
  value: number
}

export interface EvidenceItem {
  text: string
  direction: 'agree' | 'disagree'
}

const MAX_EVIDENCE = 2

// This facet's answers from a full answer map — what the pages send along
// with a generation request (ids and values only, never text).
export function facetAnswers(facet: string, answers: Map<number, number>): FacetAnswer[] {
  return (FACET_QUESTIONS.get(facet) ?? [])
    .filter((q) => answers.has(q.id))
    .map((q) => ({ questionId: q.id, value: answers.get(q.id)! }))
}

// The (up to) two most strongly held, non-neutral answers, with the real
// item text looked up from the question list.
export function strongestAnswers(answers: FacetAnswer[]): EvidenceItem[] {
  return answers
    .map((a, index) => ({ a, index, strength: Math.abs(a.value - 3) }))
    .filter((x) => x.strength >= 1 && QUESTION_BY_ID.has(x.a.questionId))
    .sort((x, y) => y.strength - x.strength || x.index - y.index)
    .slice(0, MAX_EVIDENCE)
    .map(({ a }) => ({
      text: QUESTION_BY_ID.get(a.questionId)!.text,
      direction: a.value > 3 ? 'agree' : 'disagree',
    }))
}
