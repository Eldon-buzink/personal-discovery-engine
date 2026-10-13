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

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
}

// "the payoff / the cost / the price" used as labels.
export const hasLabelledTradeoff = (text: string) => /\bthe (payoff|cost|price)\b/i.test(text)

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
