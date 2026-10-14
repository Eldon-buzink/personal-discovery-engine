/**
 * lib/known/copyChecks.ts
 *
 * Shared readability checks for generated copy (Ring 1 cards and
 * relationship insights). Rules come in two strengths:
 * - soft: the text is usable but should be better — the server retries once
 *   with a message naming exactly what failed, and keeps the better attempt.
 *   A soft rule never leaves the user with nothing.
 * - hard: the text can't be shown — after the retry the result is null.
 */

// Soft: a sentence longer than this gets a "split it" note.
export const SOFT_SENTENCE_WORDS = 28
// Hard: a sentence longer than this can't be shown.
export const HARD_SENTENCE_WORDS = 35

export const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length
// Tags only: hyphenated parts count separately, so "in-the-moment" is three
// words and can't slip a long phrase under the tag limit.
export const countTagWords = (s: string) => s.split(/[\s\-\u2010-\u2015]+/).filter(Boolean).length

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
}

// A sentence that opens with a trade-off label ("The cost is …", "The trade-off
// is …"). Only the label-style opening counts: "at the cost of" is fine.
const TRADEOFF_LABEL = /^["'“‘(]*the (trade|trade-off|tradeoff|cost|price|payoff|upside|downside) is\b/i
export const hasLabelledTradeoff = (text: string) => splitSentences(text).some((s) => TRADEOFF_LABEL.test(s))

// Em-dashes (and spaced en-dashes used as dashes) and semicolons: soft. The
// retry note asks for two sentences; anything left is fixed in code.
const DASH = /\s*(—|\s–\s)\s*/g
export const PUNCTUATION_NOTE = 'Remove the em-dash/semicolon, use two sentences.'
export const hasDashOrSemicolon = (text: string) => /—|\s–\s|;/.test(text)

// Last resort after the retry: an em-dash or semicolon becomes a full stop
// and the next word starts with a capital. Never a comma (that made comma
// splices).
export function fixPunctuation(text: string): string {
  return text
    .replace(new RegExp(`${DASH.source}(\\w)`, 'g'), (_m, _d: string, c: string) => `. ${c.toUpperCase()}`)
    .replace(/\s*;\s*(\w)/g, (_, c: string) => `. ${c.toUpperCase()}`)
    .replace(new RegExp(`(${DASH.source}|\\s*;\\s*)$`), '.')
}

export interface SentenceLengths {
  soft: string[] // follow-up notes, e.g. "Sentence 2 is 31 words: split it."
  hardFail: string | null
}

export function checkSentenceLengths(text: string): SentenceLengths {
  const soft: string[] = []
  let hardFail: string | null = null
  splitSentences(text).forEach((s, i) => {
    const n = countWords(s)
    if (n > HARD_SENTENCE_WORDS && !hardFail) hardFail = `sentence over ${HARD_SENTENCE_WORDS} words`
    if (n > SOFT_SENTENCE_WORDS) soft.push(`Sentence ${i + 1} is ${n} words: split it.`)
  })
  return { soft, hardFail }
}

// The better of two usable attempts: fewer soft violations, then fewer
// words. Ties keep the first.
export function betterAttempt<T extends { violations: string[]; words: number }>(a: T, b: T): T {
  if (b.violations.length !== a.violations.length) return b.violations.length < a.violations.length ? b : a
  return b.words < a.words ? b : a
}

// The follow-up message for the retry: exactly what failed, nothing else.
export function retryFeedback(violations: string[]): string {
  return `Please revise your answer. Fix exactly these, keep everything else the same and keep following all the rules:\n${violations.map((v) => `- ${v}`).join('\n')}\nReturn JSON only, in the same shape.`
}
