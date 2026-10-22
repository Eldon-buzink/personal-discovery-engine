// Report lab: prompts and output checks for the Summary and the cluster
// readings. Pure (no model, no server), so the checks can be unit-tested.
// The server action (app/report/lab/content/actions.ts) builds the prompt,
// calls the model and keeps an output only if the check here passes.
//
// Inputs are trait words, directions and the cards' own headline sentences;
// no answers are sent, and CONTENT_EXCLUDED_FACETS are removed before
// anything is built. FACET_BEHAVIORAL_CONTEXT and the score-direction
// prompt text stay private in generatePatternCopy.ts and are not used here.

import { DOMAIN_FACETS } from '@/lib/known/ring1-questions'
import { facetTraitWords } from '@/lib/known/scoring'
import { countWords, hasContrastPattern, hasDash, splitSentences } from '@/lib/known/copyChecks'
import { CONTENT_EXCLUDED_FACETS, validateDrawsOn } from './contentLab'

export type Direction = 'low' | 'mid' | 'high'

export interface ContentTrait { facet: string; word: string; direction: Direction; cluster: string; headline: string }
export interface ContentTension { facets: [string, string]; words: [string, string] }

export const SUMMARY_MAX_WORDS = 70
export const SUMMARY_HEADLINE_MAX_WORDS = 14
export const READING_MAX_WORDS = 55
export const DRAWS_ON_MAX = 8

// ── Input validation (before any model call) ───────────────────────────────

/** Keeps only traits whose facet, direction and word agree with the scoring; drops excluded facets and repeats. */
export function cleanInput(traits: ContentTrait[]): ContentTrait[] {
  const seen = new Set<string>()
  return traits.filter((t) => {
    const words = facetTraitWords(t.facet)
    if (!words || words[t.direction] !== t.word || CONTENT_EXCLUDED_FACETS.includes(t.facet) || seen.has(t.facet)) return false
    if (!(DOMAIN_FACETS[t.cluster] ?? []).includes(t.facet)) return false
    seen.add(t.facet)
    return typeof t.headline === 'string' && t.headline.length > 0 && t.headline.length < 400
  })
}

// ── Shared rules ───────────────────────────────────────────────────────────

const RULES = `Rules:
- Second person ("you"), present tense. Describe only. No advice, no predictions, no praise, no reassurance.
- Use only what is listed above. Do not add traits, events, people, jobs or outcomes that are not in the list.
- Use the trait words as given. Never use the names of personality theories, domains or facets.
- Never say or imply a score, a level, a percentage, "high in", "low in", or a comparison with other people.
- Plain everyday words a 12-year-old would follow. Sentences under about 18 words.
- No dashes of any kind between words, no semicolons. Never write "it's not X, it's Y" or "not just X".
- Never tell the reader what to do: no "try", "should", "consider", "make sure", "remember to".`

const line = (t: ContentTrait) => `- ${t.word}: "${t.headline}"`

export function buildSummaryPrompt(traits: ContentTrait[], tensions: ContentTension[], groupLabel: (cluster: string) => string): string {
  const byCluster = Object.keys(DOMAIN_FACETS)
    .map((c) => ({ c, ts: traits.filter((t) => t.cluster === c) }))
    .filter((g) => g.ts.length)
  return `Write a short summary of what stands out in this person's results.

Their traits, grouped, each with the one-line description they already have:
${byCluster.map((g) => `${groupLabel(g.c)}:\n${g.ts.map(line).join('\n')}`).join('\n\n')}
${tensions.length ? `\nPairs that pull against each other (inside one group only):\n${tensions.map((x) => `- ${x.words[0]} and ${x.words[1]}`).join('\n')}` : ''}

What to write:
- "headline": one sentence, at most ${SUMMARY_HEADLINE_MAX_WORDS} words, on what stands out most.
- "text": three or four sentences, at most ${SUMMARY_MAX_WORDS} words. You may say what stands out in each group side by side. Never say that one group explains, causes or drives another.
- "pointer": only if one listed pair matters for the summary: {"word": the trait word the reader should open, "phrase": the exact words in your text to turn into a link}. Otherwise null.
- "draws_on": the trait words you used, at most ${DRAWS_ON_MAX}.
Traits that are near the middle are not distinctive: do not write about them.

${RULES}

Return JSON only: {"headline": "...", "text": "...", "pointer": null, "draws_on": ["..."]}`
}

export function buildClusterPrompt(groupName: string, description: string, traits: ContentTrait[], tension: ContentTension | null): string {
  return `Write a short reading of how this person's traits in one group show up together.

The group: ${groupName}. It covers: ${description}

Their traits in this group, each with the one-line description they already have:
${traits.map(line).join('\n')}
${tension ? `\nThese two pull against each other: ${tension.words[0]} and ${tension.words[1]}. You may mention it in one sentence.` : ''}

What to write:
- "text": two or three sentences, at most ${READING_MAX_WORDS} words, on how these traits sit together day to day. Never describe the group as something they have more or less of.
- "draws_on": the trait words you used, at most ${DRAWS_ON_MAX}.
If a trait is near the middle, mention it only if it matters to the others.

${RULES}

Return JSON only: {"text": "...", "draws_on": ["..."]}`
}

export const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    text: { type: 'string' },
    pointer: { anyOf: [{ type: 'null' }, { type: 'object', properties: { word: { type: 'string' }, phrase: { type: 'string' } }, required: ['word', 'phrase'], additionalProperties: false }] },
    draws_on: { type: 'array', items: { type: 'string' } },
  },
  required: ['headline', 'text', 'pointer', 'draws_on'],
  additionalProperties: false,
}

export const CLUSTER_SCHEMA = {
  type: 'object',
  properties: { text: { type: 'string' }, draws_on: { type: 'array', items: { type: 'string' } } },
  required: ['text', 'draws_on'],
  additionalProperties: false,
}

// ── Output checks ──────────────────────────────────────────────────────────

const THEORY_WORDS = /\b(neuroticism|extraversion|extroversion|introvert\w*|extravert\w*|extrovert\w*|openness|agreeableness|conscientiousness|big five|ocean|facet|domain|trait theory)\b/i
const SCORE_WORDS = /\b(score\w*|(your|a|high|low|the) levels?|percent\w*|percentile|\d+ ?%|(high|low)(er)? (in|on)|above average|below average|more than most|less than most|compared (to|with) (others|most))\b/i
const ADVICE_WORDS = /\b(try|should|consider|make sure|remember to|you need to|you must|will (help|make|lead))\b/i
const CAUSAL_ACROSS = /\b(because of your|explains? (your|why)|causes?|leads? to|drives? your|is why|that's why|thanks to your)\b/i
const PRAISE = /\b(amazing|impressive|great strength|wonderful|you should be proud|admirable|rare gift)\b/i

export type ContentCheck =
  | { ok: true; headline?: string; text: string; pointer: { facet: string; phrase: string } | null; drawsOn: string[]; violations: string[] }
  | { ok: false; reason: string }

function common(text: string, maxWords: number, minSentences: number, maxSentences: number): string | null {
  if (THEORY_WORDS.test(text)) return 'names a theory, domain or facet'
  if (SCORE_WORDS.test(text)) return 'implies a score or level'
  if (ADVICE_WORDS.test(text)) return 'gives advice or a prediction'
  if (CAUSAL_ACROSS.test(text)) return 'makes a causal claim'
  if (PRAISE.test(text)) return 'praises'
  if (hasDash(text) || /;/.test(text)) return 'dash or semicolon'
  if (hasContrastPattern(text)) return '"it\'s not X, it\'s Y"'
  const n = splitSentences(text).length
  if (n < minSentences || n > maxSentences) return `${n} sentences`
  if (countWords(text) > maxWords + 15) return `${countWords(text)} words`
  return null
}

/** draws_on arrives as trait words; map to facets via the input, then validate. */
function drawsOnFacets(words: unknown, input: ContentTrait[]) {
  if (!Array.isArray(words)) return validateDrawsOn(words, input.map((t) => t.facet), DRAWS_ON_MAX)
  const facets = words.map((w) => input.find((t) => t.word.toLowerCase() === String(w).toLowerCase())?.facet ?? `?${String(w)}`)
  return validateDrawsOn(facets, input.map((t) => t.facet), DRAWS_ON_MAX)
}

/** Every trait word that appears in the text must be in draws_on (no silent claims). */
function unlistedWord(text: string, input: ContentTrait[], drawsOn: string[]): string | null {
  for (const t of input) {
    if (!drawsOn.includes(t.facet) && new RegExp(`\\b${t.word.replace(/[-]/g, '\\-')}\\b`, 'i').test(text)) return t.word
  }
  return null
}

export function checkSummary(raw: string, input: ContentTrait[], tensions: ContentTension[]): ContentCheck {
  let o: Record<string, unknown>
  try { o = JSON.parse(raw) } catch { return { ok: false, reason: 'not JSON' } }
  const headline = typeof o.headline === 'string' ? o.headline.trim() : ''
  const text = typeof o.text === 'string' ? o.text.trim().replace(/\s+/g, ' ') : ''
  if (!headline || !text) return { ok: false, reason: 'headline or text missing' }
  const bad = common(`${headline} ${text}`, SUMMARY_MAX_WORDS + SUMMARY_HEADLINE_MAX_WORDS, 4, 6)
  if (bad) return { ok: false, reason: bad }
  const draws = drawsOnFacets(o.draws_on, input)
  if (!draws.ok) return { ok: false, reason: draws.reason }
  const unlisted = unlistedWord(`${headline} ${text}`, input, draws.facets)
  if (unlisted) return { ok: false, reason: `uses ${unlisted} without listing it` }
  let pointer: { facet: string; phrase: string } | null = null
  if (o.pointer && typeof o.pointer === 'object') {
    const p = o.pointer as { word?: unknown; phrase?: unknown }
    const t = input.find((x) => x.word.toLowerCase() === String(p.word).toLowerCase())
    const phrase = typeof p.phrase === 'string' ? p.phrase : ''
    if (!t || !phrase || !text.includes(phrase)) return { ok: false, reason: 'pointer does not match the text' }
    if (!tensions.some((x) => x.facets.includes(t.facet))) return { ok: false, reason: 'pointer is not part of a listed pair' }
    if (!draws.facets.includes(t.facet)) return { ok: false, reason: 'pointer is not in draws_on' }
    pointer = { facet: t.facet, phrase }
  }
  const violations = countWords(text) > SUMMARY_MAX_WORDS ? [`${countWords(text)} words`] : []
  return { ok: true, headline, text, pointer, drawsOn: draws.facets, violations }
}

export function checkClusterReading(raw: string, input: ContentTrait[]): ContentCheck {
  let o: Record<string, unknown>
  try { o = JSON.parse(raw) } catch { return { ok: false, reason: 'not JSON' } }
  const text = typeof o.text === 'string' ? o.text.trim().replace(/\s+/g, ' ') : ''
  if (!text) return { ok: false, reason: 'text missing' }
  const bad = common(text, READING_MAX_WORDS, 2, 3)
  if (bad) return { ok: false, reason: bad }
  const draws = drawsOnFacets(o.draws_on, input)
  if (!draws.ok) return { ok: false, reason: draws.reason }
  const unlisted = unlistedWord(text, input, draws.facets)
  if (unlisted) return { ok: false, reason: `uses ${unlisted} without listing it` }
  const violations = countWords(text) > READING_MAX_WORDS ? [`${countWords(text)} words`] : []
  return { ok: true, text, pointer: null, drawsOn: draws.facets, violations }
}
