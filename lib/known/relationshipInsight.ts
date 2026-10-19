/**
 * lib/known/relationshipInsight.ts
 *
 * Output shape and checks for a relationship insight (generateRelationshipInsight).
 * Pure, so it can be unit-tested without the model. The insight must be a few
 * plain sentences ending in one reflective question, with no instructions.
 *
 * Soft rules (retried once with a note, never dropped): a sentence over 28
 * words, over INSIGHT_MAX_WORDS in total, too few sentences before the
 * question, an em-dash or semicolon (fixed in code if it survives the
 * retry). Hard rules (nothing shown after the retry): bad shape, not ending
 * in exactly one question, banned phrases, a sentence opening with a
 * trade-off label ("The cost is …"), a sentence over 35 words. See lib/known/copyChecks.ts.
 */

import { CONTRAST_NOTE, PUNCTUATION_NOTE, checkSentenceLengths, countWords, fixPunctuation, hasContrastPattern, hasDash, hasDashOrSemicolon, hasLabelledTradeoff, splitSentences } from './copyChecks'

// Structured output (output_config.format) schema: {"insight": string}.
export const RELATIONSHIP_INSIGHT_SCHEMA = {
  type: 'object',
  properties: { insight: { type: 'string', description: '2-3 sentences plus a closing reflective question.' } },
  required: ['insight'],
  additionalProperties: false,
}

// The prompt asks for about 65; over this is a soft violation.
export const INSIGHT_MAX_WORDS = 85
const MIN_SENTENCES = 3 // 2 statements + the question

// Instructions the text must not contain (whole words / phrases, any case).
export const INSIGHT_BANNED = ['try', 'should', 'consider', 'make sure', 'remember to']

export type InsightCheck =
  | { ok: true; insight: string; violations: string[]; words: number }
  | { ok: false; reason: string }

export function checkInsight(input: unknown): InsightCheck {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'not an object' }
  const raw = (input as Record<string, unknown>).insight
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, reason: 'insight missing' }
  const insight = raw.trim().replace(/\s+/g, ' ')
  const sentences = splitSentences(insight)
  if (!sentences[sentences.length - 1].includes('?')) return { ok: false, reason: 'does not end in a question' }
  if (sentences.slice(0, -1).some((s) => s.includes('?'))) return { ok: false, reason: 'more than one question' }
  const lower = insight.toLowerCase()
  for (const b of INSIGHT_BANNED) {
    if (new RegExp(`\\b${b.replace(' ', '\\s+')}\\b`).test(lower)) return { ok: false, reason: `banned phrase "${b}"` }
  }
  if (hasLabelledTradeoff(insight)) return { ok: false, reason: 'labelled payoff/cost' }
  const lengths = checkSentenceLengths(insight)
  if (lengths.hardFail) return { ok: false, reason: lengths.hardFail }

  const violations = [...lengths.soft]
  const words = countWords(insight)
  if (words > INSIGHT_MAX_WORDS) violations.push(`The note is ${words} words: cut to about 65.`)
  if (sentences.length < MIN_SENTENCES) violations.push('Write 2-3 sentences before the closing question.')
  if (hasDashOrSemicolon(insight) || hasDash(insight)) violations.push(PUNCTUATION_NOTE)
  if (hasContrastPattern(insight)) violations.push(CONTRAST_NOTE)
  return { ok: true, insight, violations, words }
}

// Applied to the insight that is finally kept (see finishRing1Card).
export const finishInsight = (insight: string) => fixPunctuation(insight)

export function checkInsightText(text: string): InsightCheck {
  try {
    return checkInsight(JSON.parse(text))
  } catch {
    return { ok: false, reason: 'not JSON' }
  }
}
