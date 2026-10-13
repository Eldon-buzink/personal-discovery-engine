/**
 * lib/known/ring1Card.ts
 *
 * Shape and checks for a Ring 1 trait card (trait_quote, body, tags) — what
 * generateRing1Copy asks the model for (structured output constrained by
 * RING1_CARD_SCHEMA) and validates before anything is shown or saved.
 * Pure, so it can be unit-tested without the model.
 */

import type { PatternContent, PatternContentEntry } from './types'

// trait_quote + body: ~70 words is the target; over RING1_RETRY_WORDS the
// card is regenerated once.
export const RING1_TARGET_WORDS = 70
export const RING1_RETRY_WORDS = 95
const TAG_COUNT = 3
const TAG_MAX_WORDS = 3

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
    tags: { type: 'array', items: { type: 'string', description: 'Short behavioural tag, max 3 words.' } },
  },
  required: ['trait_quote', 'body', 'tags'],
  additionalProperties: false,
}

export type Ring1Card = Required<Pick<PatternContent, 'trait_quote' | 'body' | 'tags'>>

const words = (s: string) => s.split(/\s+/).filter(Boolean).length

export function ring1CardWords(card: Pick<Ring1Card, 'trait_quote' | 'body'>): number {
  return words(card.trait_quote) + words(card.body)
}

export type Ring1CardCheck =
  | { ok: true; card: Ring1Card; overBudget: boolean }
  | { ok: false; reason: string }

// Validates the tool input. Structure problems fail outright; length only
// flags overBudget (the caller retries once on that).
export function checkRing1Card(input: unknown): Ring1CardCheck {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'not an object' }
  const { trait_quote, body, tags } = input as Record<string, unknown>
  if (typeof trait_quote !== 'string' || !trait_quote.trim()) return { ok: false, reason: 'trait_quote missing' }
  if (typeof body !== 'string' || !body.trim()) return { ok: false, reason: 'body missing' }
  if (!Array.isArray(tags) || tags.length !== TAG_COUNT) return { ok: false, reason: `tags must be exactly ${TAG_COUNT}` }
  for (const t of tags) {
    if (typeof t !== 'string' || !t.trim()) return { ok: false, reason: 'empty tag' }
    if (words(t) > TAG_MAX_WORDS) return { ok: false, reason: `tag over ${TAG_MAX_WORDS} words` }
  }
  const card: Ring1Card = { trait_quote: trait_quote.trim(), body: body.trim(), tags: tags.map((t: string) => t.trim()) }
  return { ok: true, card, overBudget: ring1CardWords(card) > RING1_RETRY_WORDS }
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
