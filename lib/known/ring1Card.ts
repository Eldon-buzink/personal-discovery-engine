/**
 * lib/known/ring1Card.ts
 *
 * Shape and checks for a Ring 1 trait card (trait_quote, body, tags) — what
 * generateRing1Copy asks the model for (structured output constrained by
 * RING1_CARD_SCHEMA) and validates before anything is shown or saved.
 * Soft rules (sentence over 28 words, card over RING1_RETRY_WORDS, a tag
 * over 3 words, an em-dash or semicolon) are returned as retry notes; hard rules (shape, tags not
 * exactly 3, a tag over 4 words, a sentence over 35, labelled payoff/cost)
 * fail the attempt. See lib/known/copyChecks.ts. Pure, so it can be
 * unit-tested without the model.
 */

import type { PatternContent, PatternContentEntry } from './types'
import { CONTRAST_NOTE, PUNCTUATION_NOTE, checkSentenceLengths, countTagWords, countWords, fixPunctuation, hasContrastPattern, hasDash, hasDashOrSemicolon, hasLabelledTradeoff, splitSentences } from './copyChecks'

// trait_quote + body: ~70 words is the target; over RING1_RETRY_WORDS is a
// soft violation (retried once with a note, never dropped).
export const RING1_TARGET_WORDS = 70
export const RING1_RETRY_WORDS = 90
const TAG_COUNT = 3
// Tags: 2-3 words. One word or over 3 is soft (retry note), over 4 is hard.
const TAG_SOFT_MIN_WORDS = 2
const TAG_SOFT_MAX_WORDS = 3
const TAG_HARD_MAX_WORDS = 4

// JSON schema for structured output (output_config.format) — the response
// is guaranteed to be JSON of this shape, so there's nothing to strip. Works
// on models that reject forced tool calls (e.g. Sonnet 5.5) as well as Haiku
// 4.5. Array-length constraints aren't supported by structured outputs, so
// the exactly-three-tags rule lives in checkRing1Card instead.
export const RING1_CARD_SCHEMA = {
  type: 'object',
  properties: {
    trait_quote: { type: 'string', description: '1-2 sentences, second person, present tense.' },
    body: { type: 'string', description: '2-3 sentences of prose: where it shows up, what it gives, what it costs.' },
    tags: { type: 'array', items: { type: 'string', description: 'Natural 2-3 word phrase.' } },
  },
  required: ['trait_quote', 'body', 'tags'],
  additionalProperties: false,
}

export type Ring1Card = Required<Pick<PatternContent, 'trait_quote' | 'body' | 'tags'>>

// Harder traits: the prompt tells the model not to invent a strength for
// these (cards and relationship insights alike).
const HARDER_TRAITS: readonly string[] = [
  'Anxiety:high', 'Anger:high', 'Vulnerability:high', 'Depression:high',
  'Self-Consciousness:high', 'Immoderation:high', 'Self-Efficacy:low',
]

export function isHarderTrait(facet: string, direction: 'high' | 'mid' | 'low'): boolean {
  return HARDER_TRAITS.includes(`${facet}:${direction}`)
}

export function ring1CardWords(card: Pick<Ring1Card, 'trait_quote' | 'body'>): number {
  return countWords(card.trait_quote) + countWords(card.body)
}

// ok: usable, with any soft violations listed (as retry notes).
// not ok: a hard failure — this attempt can't be shown.
export type Ring1CardCheck =
  | { ok: true; card: Ring1Card; violations: string[]; words: number }
  | { ok: false; reason: string }

export function checkRing1Card(input: unknown): Ring1CardCheck {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'not an object' }
  const { trait_quote, body, tags } = input as Record<string, unknown>
  if (typeof trait_quote !== 'string' || !trait_quote.trim()) return { ok: false, reason: 'trait_quote missing' }
  if (typeof body !== 'string' || !body.trim()) return { ok: false, reason: 'body missing' }
  if (!Array.isArray(tags) || tags.length !== TAG_COUNT) return { ok: false, reason: `tags must be exactly ${TAG_COUNT}` }
  const violations: string[] = []
  for (const t of tags) {
    if (typeof t !== 'string' || !t.trim()) return { ok: false, reason: 'empty tag' }
    const n = countTagWords(t)
    if (n > TAG_HARD_MAX_WORDS) return { ok: false, reason: `tag over ${TAG_HARD_MAX_WORDS} words` }
    if (n > TAG_SOFT_MAX_WORDS) violations.push(`Tag '${t.trim()}' has ${n} words: shorten to ${TAG_SOFT_MAX_WORDS}.`)
    if (n < TAG_SOFT_MIN_WORDS) violations.push(`Tag '${t.trim()}' has 1 word: use 2-3 words.`)
  }
  const card: Ring1Card = { trait_quote: trait_quote.trim(), body: body.trim(), tags: tags.map((t: string) => t.trim()) }
  const text = `${card.trait_quote} ${card.body}`
  if (hasLabelledTradeoff(text)) return { ok: false, reason: 'labelled payoff/cost' }
  const lengths = checkSentenceLengths(text)
  if (lengths.hardFail) return { ok: false, reason: lengths.hardFail }
  violations.unshift(...lengths.soft)
  const words = ring1CardWords(card)
  if (words > RING1_RETRY_WORDS) violations.push(`The quote and body are ${words} words together: cut to about ${RING1_TARGET_WORDS}.`)
  if (hasDashOrSemicolon(text) || hasDash(text)) violations.push(PUNCTUATION_NOTE)
  if (hasContrastPattern(text)) violations.push(CONTRAST_NOTE)
  return { ok: true, card, violations, words }
}

// Applied to the card that is finally kept: any em-dash or semicolon left
// after the retry is replaced rather than failing the card.
export function finishRing1Card(card: Ring1Card): Ring1Card {
  return { ...card, trait_quote: fixPunctuation(card.trait_quote), body: fixPunctuation(card.body) }
}

// The structured-output text → a checked card. Unparseable JSON fails the
// same way as a structurally invalid card.
export function checkRing1CardText(text: string): Ring1CardCheck {
  try {
    return checkRing1Card(JSON.parse(text))
  } catch {
    return { ok: false, reason: 'not JSON' }
  }
}

// ── Split format (lab): shows_up + tradeoff instead of body and tags ────────
// The body as two fields, shown as two short paragraphs; no tags. tradeoff
// may be '' when the description and answers support no cost (harder traits
// especially), so the card never has to invent one. Only lab code uses this
// for now; generateRing1Copy still writes RING1_CARD_SCHEMA cards.

export const RING1_CARD_SCHEMA_SPLIT = {
  type: 'object',
  properties: {
    trait_quote: { type: 'string', description: '1-2 sentences, second person, present tense.' },
    shows_up: { type: 'string', description: '2-3 sentences: where it tends to show up and what it gives.' },
    tradeoff: { type: 'string', description: "1 sentence on what the same behaviour can cost, or '' if the answers don't support one." },
  },
  required: ['trait_quote', 'shows_up', 'tradeoff'],
  additionalProperties: false,
}

export type Ring1SplitCard = { trait_quote: string; shows_up: string; tradeoff: string }

export type Ring1SplitCardCheck =
  | { ok: true; card: Ring1SplitCard; violations: string[]; words: number }
  | { ok: false; reason: string }

// Openers that make the trade-off sentence read like a template.
const STOCK_TRADEOFF_OPENER = /^(on the flip side|the flip side|on the other hand|the other side|however|the downside|the catch|but)\b/i
export const STOCK_OPENER_NOTE = 'Start the trade-off sentence plainly, without "On the flip side", "However", "But" or a similar opener.'

export function checkRing1SplitCard(input: unknown): Ring1SplitCardCheck {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'not an object' }
  const { trait_quote, shows_up, tradeoff } = input as Record<string, unknown>
  if (typeof trait_quote !== 'string' || !trait_quote.trim()) return { ok: false, reason: 'trait_quote missing' }
  if (typeof shows_up !== 'string' || !shows_up.trim()) return { ok: false, reason: 'shows_up missing' }
  if (typeof tradeoff !== 'string') return { ok: false, reason: 'tradeoff missing' }
  const card: Ring1SplitCard = { trait_quote: trait_quote.trim(), shows_up: shows_up.trim(), tradeoff: tradeoff.trim() }
  const violations: string[] = []
  const showsN = splitSentences(card.shows_up).length
  if (showsN > 4) return { ok: false, reason: `shows_up has ${showsN} sentences` }
  if (showsN === 1 || showsN === 4) violations.push(`shows_up has ${showsN} sentences: write 2-3.`)
  const tradeN = card.tradeoff ? splitSentences(card.tradeoff).length : 0
  if (tradeN > 2) return { ok: false, reason: `tradeoff has ${tradeN} sentences` }
  if (tradeN === 2) violations.push('tradeoff has 2 sentences: write one.')
  if (card.tradeoff && STOCK_TRADEOFF_OPENER.test(card.tradeoff)) violations.push(STOCK_OPENER_NOTE)
  const text = [card.trait_quote, card.shows_up, card.tradeoff].filter(Boolean).join(' ')
  if (hasLabelledTradeoff(text)) return { ok: false, reason: 'labelled payoff/cost' }
  const lengths = checkSentenceLengths(text)
  if (lengths.hardFail) return { ok: false, reason: lengths.hardFail }
  violations.unshift(...lengths.soft)
  const words = countWords(text)
  if (words > RING1_RETRY_WORDS) violations.push(`The quote, shows_up and tradeoff are ${words} words together: cut to about ${RING1_TARGET_WORDS}.`)
  if (hasDashOrSemicolon(text) || hasDash(text)) violations.push(PUNCTUATION_NOTE)
  if (hasContrastPattern(text)) violations.push(CONTRAST_NOTE)
  return { ok: true, card, violations, words }
}

export function checkRing1SplitCardText(text: string): Ring1SplitCardCheck {
  try {
    return checkRing1SplitCard(JSON.parse(text))
  } catch {
    return { ok: false, reason: 'not JSON' }
  }
}

export function finishRing1SplitCard(card: Ring1SplitCard): Ring1SplitCard {
  return { trait_quote: fixPunctuation(card.trait_quote), shows_up: fixPunctuation(card.shows_up), tradeoff: fixPunctuation(card.tradeoff) }
}

// What to write to known_session.patternContents after a Ring 1 generation:
// the list with this facet's card replaced, or null when the card failed —
// a failure must never be saved, so the trait's content stays null and the
// report generates it again. Branch entries are left alone.
export function ring1ContentsAfter(
  existing: PatternContentEntry[],
  entry: Pick<PatternContentEntry, 'facet' | 'traitWord' | 'scoreDirection'>,
  content: PatternContent | null
): PatternContentEntry[] | null {
  if (!content) return null
  return [...existing.filter((e) => !(e.facet === entry.facet && !e.branch)), { ...entry, content }]
}
