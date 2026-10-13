/**
 * lib/known/relationshipInsight.ts
 *
 * Output shape and checks for a relationship insight (generateRelationshipInsight).
 * Pure, so it can be unit-tested without the model. The insight must be a few
 * plain sentences ending in one reflective question, with no instructions.
 */

// Structured output (output_config.format) schema: {"insight": string}.
export const RELATIONSHIP_INSIGHT_SCHEMA = {
  type: 'object',
  properties: { insight: { type: 'string', description: '2-3 sentences plus a closing reflective question.' } },
  required: ['insight'],
  additionalProperties: false,
}

export const INSIGHT_MAX_SENTENCE_WORDS = 24
// The prompt asks for about 65; this is the hard limit in code.
export const INSIGHT_MAX_WORDS = 85
const MIN_SENTENCES = 2
const MAX_SENTENCES = 5

// Instructions the text must not contain (whole words / phrases, any case).
export const INSIGHT_BANNED = ['try', 'should', 'consider', 'make sure', 'remember to']

const words = (s: string) => s.split(/\s+/).filter(Boolean).length
const sentencesOf = (t: string) => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)

export type InsightCheck = { ok: true; insight: string } | { ok: false; reason: string }

export function checkInsight(input: unknown): InsightCheck {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'not an object' }
  const raw = (input as Record<string, unknown>).insight
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, reason: 'insight missing' }
  const insight = raw.trim().replace(/\s+/g, ' ')
  const sentences = sentencesOf(insight)
  if (sentences.length < MIN_SENTENCES || sentences.length > MAX_SENTENCES) return { ok: false, reason: 'sentence count' }
  if (!sentences[sentences.length - 1].includes('?')) return { ok: false, reason: 'does not end in a question' }
  if (sentences.slice(0, -1).some((s) => s.includes('?'))) return { ok: false, reason: 'more than one question' }
  if (sentences.some((s) => words(s) > INSIGHT_MAX_SENTENCE_WORDS)) return { ok: false, reason: 'sentence too long' }
  if (words(insight) > INSIGHT_MAX_WORDS) return { ok: false, reason: 'too long' }
  const lower = insight.toLowerCase()
  for (const b of INSIGHT_BANNED) {
    if (new RegExp(`\\b${b.replace(' ', '\\s+')}\\b`).test(lower)) return { ok: false, reason: `banned phrase "${b}"` }
  }
  if (/\bthe (payoff|cost|price)\b/.test(lower)) return { ok: false, reason: 'labelled payoff/cost' }
  return { ok: true, insight }
}

export function checkInsightText(text: string): InsightCheck {
  try {
    return checkInsight(JSON.parse(text))
  } catch {
    return { ok: false, reason: 'not JSON' }
  }
}
