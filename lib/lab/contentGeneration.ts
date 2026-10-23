// Report lab: prompts and output checks for the Summary and the cluster
// readings. Pure (no model, no server), so the checks can be unit-tested.
// The server action (app/report/lab/content/actions.ts) builds the prompt,
// calls the model and keeps an output only if the check here passes.
//
// Per-sentence tracing: the model returns every sentence with the trait
// words it draws on, and a sentence with no source is rejected. Inputs are
// trait words, whether each leans or sits near the middle, and the cards'
// own headline sentences; no answers are sent, and CONTENT_EXCLUDED_FACETS
// are removed before anything is built. FACET_BEHAVIORAL_CONTEXT and the
// score-direction prompt text stay private and are not used here.

import { DOMAIN_FACETS } from '@/lib/known/ring1-questions'
import { facetTraitWords } from '@/lib/known/scoring'
import { countWords, hasContrastPattern, hasDash, splitSentences } from '@/lib/known/copyChecks'
import { CONTENT_EXCLUDED_FACETS, validateDrawsOn } from './contentLab'

export type Direction = 'low' | 'mid' | 'high'

export interface ContentTrait { facet: string; word: string; direction: Direction; cluster: string; headline: string }
export interface ContentTension { facets: [string, string]; words: [string, string] }
export interface TracedSentence { text: string; facets: string[] }

export const SUMMARY_MAX_WORDS = 70
export const SUMMARY_HEADLINE_MAX_WORDS = 14
export const READING_MAX_WORDS = 55
export const DRAWS_ON_MAX = 8

const leans = (t: ContentTrait) => t.direction !== 'mid'

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

// ── Prompts ────────────────────────────────────────────────────────────────

const RULES = `Rules:
- Second person ("you"), present tense. Describe only. No advice, no predictions, no praise, no reassurance.
- Every sentence must come straight from the listed descriptions. List the trait words each sentence uses in its "draws_on". A sentence with nothing to list must not be written.
- Do not add traits, events, people, jobs, outcomes or reasons that are not in the list. Never say how other people see, read or react to the person.
- Do not join traits into a combined effect or contrast them: no "together", "combined", "makes you", "yet", "but", "so" or "which pulls against". The one exception is a pair listed below as pulling against each other: one sentence may name that pair.
- Use the trait words as given. Never use the names of personality theories, domains or facets.
- Never say or imply a score, a level, a percentage, "high in", "low in", or a comparison with other people.
- Plain everyday words a 12-year-old would follow. Sentences under about 18 words.
- No dashes of any kind between words, no semicolons. Never write "it's not X, it's Y" or "not just X".
- Never tell the reader what to do: no "try", "should", "consider", "make sure", "remember to".`

const line = (t: ContentTrait) => `- ${t.word} (${leans(t) ? 'leans clearly' : 'near the middle'}): "${t.headline}"`

export function buildSummaryPrompt(traits: ContentTrait[], tensions: ContentTension[], groupLabel: (cluster: string) => string): string {
  const byCluster = Object.keys(DOMAIN_FACETS)
    .map((c) => ({ c, ts: traits.filter((t) => t.cluster === c) }))
    .filter((g) => g.ts.length)
  const mostlyMiddle = traits.filter(leans).length * 2 < traits.length
  return `Write a short summary of what stands out in this person's results.

Their traits, grouped, each marked as leaning clearly one way or sitting near the middle, with the one-line description they already have:
${byCluster.map((g) => `${groupLabel(g.c)}:\n${g.ts.map(line).join('\n')}`).join('\n\n')}
${tensions.length ? `\nPairs that pull against each other (inside one group only):\n${tensions.map((x) => `- ${x.words[0]} and ${x.words[1]}`).join('\n')}` : ''}

What to write:
- "headline": {"text": one sentence, at most ${SUMMARY_HEADLINE_MAX_WORDS} words, on what stands out most, "draws_on": [trait words]}. Build it only from traits that lean clearly.
- "sentences": ${mostlyMiddle ? 'two' : 'three or four'} sentences, at most ${SUMMARY_MAX_WORDS} words in all, each {"text": "...", "draws_on": [trait words]}. Lead with the traits that lean clearly. You may say what stands out in each group side by side. Never say that one group explains, causes or drives another.
- Traits near the middle are not what stands out: never build the summary around them, and leave them out unless a sentence needs one.${mostlyMiddle ? ' Most of these traits are near the middle, so write less.' : ''}
- "pointer": only if one listed pair matters for the summary: {"word": the trait word the reader should open, "phrase": the exact words of one of your sentences to turn into a link}. Otherwise null.
At most ${DRAWS_ON_MAX} different trait words in all.

${RULES}

Return JSON only.`
}

export function buildClusterPrompt(groupName: string, description: string, traits: ContentTrait[], tension: ContentTension | null): string {
  const mostlyMiddle = traits.filter(leans).length * 2 < traits.length
  return `Write a short reading of how this person's traits in one group show up.

The group: ${groupName}. It covers: ${description}

Their traits in this group, each marked as leaning clearly one way or sitting near the middle, with the one-line description they already have:
${traits.map(line).join('\n')}
${tension ? `\nThese two pull against each other: ${tension.words[0]} and ${tension.words[1]}. One sentence may name it.` : ''}

What to write:
- "sentences": ${mostlyMiddle ? 'two' : 'two or three'} sentences, at most ${READING_MAX_WORDS} words in all, each {"text": "...", "draws_on": [trait words]}. Lead with the traits that lean clearly. Never describe the group as something they have more or less of.${mostlyMiddle ? ' Most of these traits are near the middle, so write less and keep to what is clear.' : ''}

${RULES}

Return JSON only.`
}

const SENTENCE = { type: 'object', properties: { text: { type: 'string' }, draws_on: { type: 'array', items: { type: 'string' } } }, required: ['text', 'draws_on'], additionalProperties: false }

export const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    headline: SENTENCE,
    sentences: { type: 'array', items: SENTENCE },
    pointer: { anyOf: [{ type: 'null' }, { type: 'object', properties: { word: { type: 'string' }, phrase: { type: 'string' } }, required: ['word', 'phrase'], additionalProperties: false }] },
  },
  required: ['headline', 'sentences', 'pointer'],
  additionalProperties: false,
}

export const CLUSTER_SCHEMA = {
  type: 'object',
  properties: { sentences: { type: 'array', items: SENTENCE } },
  required: ['sentences'],
  additionalProperties: false,
}

// ── Output checks ──────────────────────────────────────────────────────────

const THEORY_WORDS = /\b(neuroticism|extraversion|extroversion|introvert\w*|extravert\w*|extrovert\w*|openness|agreeableness|conscientiousness|big five|ocean|facet|domain|trait theory)\b/i
const SCORE_WORDS = /\b(score\w*|(your|a|high|low|the) levels?|percent\w*|percentile|\d+ ?%|(high|low)(er)? (in|on)|above average|below average|more than most|less than most|compared (to|with) (others|most))\b/i
const ADVICE_WORDS = /\b(try|should|consider|make sure|remember to|you need to|you must|will (help|make|lead))\b/i
const CAUSAL = /\b(because of your|explains? (your|why)|causes?|leads? to|drives? your|is why|that's why|thanks to your)\b/i
const PRAISE = /\b(amazing|impressive|great strength|wonderful|you should be proud|admirable|rare gift)\b/i
// Combining or contrasting two traits; allowed only for a fired same-cluster pair.
// "so" only as a link between two things (", so", "so that", "so you …"),
// not the pronoun in "saying so".
export const CONNECTORS = /\b(together|combined?|combination|makes you|yet|but|which pulls against)\b|,\s*so\b|\bso (that|you|your|it|they|people|others)\b/i

export type ContentCheck =
  | { ok: true; headline?: string; text: string; sentences: TracedSentence[]; pointer: { facet: string; phrase: string } | null; drawsOn: string[]; violations: string[] }
  | { ok: false; reason: string }

function sentenceProblem(text: string): string | null {
  if (THEORY_WORDS.test(text)) return 'names a theory, domain or facet'
  if (SCORE_WORDS.test(text)) return 'implies a score or level'
  if (ADVICE_WORDS.test(text)) return 'gives advice or a prediction'
  if (CAUSAL.test(text)) return 'makes a causal claim'
  if (PRAISE.test(text)) return 'praises'
  if (hasDash(text) || /;/.test(text)) return 'dash or semicolon'
  if (hasContrastPattern(text)) return '"it\'s not X, it\'s Y"'
  return null
}

const wordRe = (w: string) => new RegExp(`\\b${w.replace(/[-]/g, '\\-')}\\b`, 'i')

/** One traced sentence: non-empty, sourced, only known traits, every named trait listed, connectors only for a fired pair. */
function checkSentence(raw: unknown, input: ContentTrait[], tensions: ContentTension[]): { ok: true; s: TracedSentence } | { ok: false; reason: string } {
  const o = raw as { text?: unknown; draws_on?: unknown }
  const text = typeof o?.text === 'string' ? o.text.trim().replace(/\s+/g, ' ') : ''
  if (!text) return { ok: false, reason: 'empty sentence' }
  if (!Array.isArray(o.draws_on) || o.draws_on.length === 0) return { ok: false, reason: `sentence with no source: "${text}"` }
  const facets = o.draws_on.map((w) => input.find((t) => t.word.toLowerCase() === String(w).toLowerCase())?.facet ?? `?${String(w)}`)
  const v = validateDrawsOn(facets, input.map((t) => t.facet), DRAWS_ON_MAX)
  if (!v.ok) return { ok: false, reason: `${v.reason} in "${text}"` }
  const bad = sentenceProblem(text)
  if (bad) return { ok: false, reason: `${bad}: "${text}"` }
  for (const t of input) if (!v.facets.includes(t.facet) && wordRe(t.word).test(text)) return { ok: false, reason: `uses ${t.word} without listing it: "${text}"` }
  if (CONNECTORS.test(text)) {
    const pair = tensions.some((x) => x.facets.every((f) => v.facets.includes(f)) && v.facets.every((f) => x.facets.includes(f)))
    if (!pair) return { ok: false, reason: `combining or contrast word (${text.match(CONNECTORS)![0]}) outside a fired pair: "${text}"` }
  }
  return { ok: true, s: { text, facets: v.facets } }
}

function parse(raw: string): Record<string, unknown> | null {
  try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : null } catch { return null }
}

export function checkSummary(raw: string, input: ContentTrait[], tensions: ContentTension[]): ContentCheck {
  const o = parse(raw)
  if (!o) return { ok: false, reason: 'not JSON' }
  const h = checkSentence(o.headline, input, tensions)
  if (!h.ok) return { ok: false, reason: `headline: ${h.reason}` }
  if (!Array.isArray(o.sentences) || o.sentences.length === 0) return { ok: false, reason: 'no sentences' }
  const sentences: TracedSentence[] = []
  for (const raw of o.sentences) {
    const c = checkSentence(raw, input, tensions)
    if (!c.ok) return { ok: false, reason: c.reason }
    sentences.push(c.s)
  }
  const leaning = new Set(input.filter(leans).map((t) => t.facet))
  // Never built around middle traits: the headline and at least half the sentences rest on a leaning trait.
  if (!h.s.facets.some((f) => leaning.has(f))) return { ok: false, reason: 'headline rests only on middle traits' }
  if (sentences.filter((s) => s.facets.some((f) => leaning.has(f))).length * 2 < sentences.length) return { ok: false, reason: 'summary built around middle traits' }
  const text = sentences.map((s) => s.text).join(' ')
  const violations: string[] = []
  const mostlyMiddle = leaning.size * 2 < input.length
  const want = mostlyMiddle ? [2, 2] : [3, 4]
  if (sentences.length < want[0] || sentences.length > want[1]) violations.push(`Write ${want[0] === want[1] ? want[0] : `${want[0]} or ${want[1]}`} sentences, not ${sentences.length}.`)
  if (countWords(h.s.text) > SUMMARY_HEADLINE_MAX_WORDS) violations.push(`The headline is ${countWords(h.s.text)} words: keep it to ${SUMMARY_HEADLINE_MAX_WORDS}.`)
  if (countWords(text) > SUMMARY_MAX_WORDS) violations.push(`The sentences are ${countWords(text)} words: keep them to ${SUMMARY_MAX_WORDS}.`)
  if (!sentences[0].facets.some((f) => leaning.has(f))) violations.push('Lead with a trait that leans clearly.')
  let pointer: { facet: string; phrase: string } | null = null
  if (o.pointer && typeof o.pointer === 'object') {
    const p = o.pointer as { word?: unknown; phrase?: unknown }
    const t = input.find((x) => x.word.toLowerCase() === String(p.word).toLowerCase())
    const phrase = typeof p.phrase === 'string' ? p.phrase.trim().replace(/[.]$/, '') : ''
    const host = phrase ? sentences.find((s) => s.text.includes(phrase)) : undefined
    if (!t || !host) return { ok: false, reason: 'pointer does not match a sentence' }
    if (!tensions.some((x) => x.facets.includes(t.facet) && x.facets.every((f) => host.facets.includes(f)))) return { ok: false, reason: 'pointer is not on a sentence about a listed pair' }
    pointer = { facet: t.facet, phrase }
  }
  const drawsOn = Array.from(new Set([h.s, ...sentences].flatMap((s) => s.facets)))
  if (drawsOn.length > DRAWS_ON_MAX) return { ok: false, reason: `draws on ${drawsOn.length} traits` }
  return { ok: true, headline: h.s.text, text, sentences: [h.s, ...sentences], pointer, drawsOn, violations }
}

export function checkClusterReading(raw: string, input: ContentTrait[], tensions: ContentTension[] = []): ContentCheck {
  const o = parse(raw)
  if (!o) return { ok: false, reason: 'not JSON' }
  if (!Array.isArray(o.sentences) || o.sentences.length === 0) return { ok: false, reason: 'no sentences' }
  const sentences: TracedSentence[] = []
  for (const raw of o.sentences) {
    const c = checkSentence(raw, input, tensions)
    if (!c.ok) return { ok: false, reason: c.reason }
    sentences.push(c.s)
  }
  const text = sentences.map((s) => s.text).join(' ')
  const leaning = new Set(input.filter(leans).map((t) => t.facet))
  const mostlyMiddle = leaning.size * 2 < input.length
  const violations: string[] = []
  const max = mostlyMiddle ? 2 : 3
  if (sentences.length < 2 || sentences.length > max) violations.push(`Write ${max === 2 ? '2' : '2 or 3'} sentences, not ${sentences.length}.`)
  if (countWords(text) > READING_MAX_WORDS) violations.push(`The reading is ${countWords(text)} words: keep it to ${READING_MAX_WORDS}.`)
  if (leaning.size > 0 && !sentences[0].facets.some((f) => leaning.has(f))) violations.push('Lead with a trait that leans clearly.')
  if (splitSentences(text).length !== sentences.length) violations.push('Write each sentence as its own item.')
  return { ok: true, text, sentences, pointer: null, drawsOn: Array.from(new Set(sentences.flatMap((s) => s.facets))), violations }
}

// ── Takeaways (picked): one sentence per cluster, one plus at most two for the Summary ──
// Each sentence cites at most 3 traits. A generalising word must match what
// is cited ("both" = exactly 2; "all", "each", "every" = 2 or more); words
// that reach past the cited traits ("always", "never", "overall",
// "generally", "in general", "everything") are rejected. The Summary says
// what stands out most, not what it all means.

export const SENTENCE_MAX_TRAITS = 3
export const SUMMARY_SUPPORT_MAX = 2
const SUMMARY_TAKEAWAY_MAX_WORDS = 18
const CLUSTER_TAKEAWAY_MAX_WORDS = 22

const REACHING = /\b(always|never|overall|generally|in general|everything|all in all|in short)\b/i
const MEANING = /\b(at heart|at your core|deep down|who you are|what (this|it all) means|this means|that means|says about you|the kind of person|you are someone who|sums you up)\b/i

// A reaching word is fine when it comes from a cited trait's own
// description (e.g. "the way things have always been done").
function generalisingProblem(text: string, cited: number, citedHeadlines: string[] = []): string | null {
  const reach = text.match(REACHING)?.[0]
  if (reach && !citedHeadlines.some((h) => new RegExp(`\\b${reach}\\b`, 'i').test(h))) return `generalising word (${reach}) reaches past the traits cited`
  if (/\bboth\b/i.test(text) && cited !== 2) return `"both" with ${cited} traits cited`
  if (/\ball three\b/i.test(text) && cited !== 3) return `"all three" with ${cited} traits cited`
  if (/\b(all|each|every)\b/i.test(text) && cited < 2) return `"${text.match(/\b(all|each|every)\b/i)![0]}" with ${cited} trait cited`
  return null
}

function checkTakeawaySentence(raw: unknown, input: ContentTrait[], tensions: ContentTension[], summary: boolean): { ok: true; s: TracedSentence } | { ok: false; reason: string } {
  const c = checkSentence(raw, input, tensions)
  if (!c.ok) return c
  if (c.s.facets.length > SENTENCE_MAX_TRAITS) return { ok: false, reason: `cites ${c.s.facets.length} traits (at most ${SENTENCE_MAX_TRAITS}): "${c.s.text}"` }
  const g = generalisingProblem(c.s.text, c.s.facets.length, input.filter((t) => c.s.facets.includes(t.facet)).map((t) => t.headline))
  if (g) return { ok: false, reason: `${g}: "${c.s.text}"` }
  if (summary && MEANING.test(c.s.text)) return { ok: false, reason: `says what it all means: "${c.s.text}"` }
  return c
}

const TAKEAWAY_RULES = `${RULES}
- Each sentence cites at most ${SENTENCE_MAX_TRAITS} trait words in its "draws_on".
- A word like "both", "all" or "each" must cover exactly the traits that sentence cites. Never use "always", "never", "overall", "generally", "in general" or "everything".`

export function buildSummaryTakeawayPrompt(traits: ContentTrait[], tensions: ContentTension[], groupLabel: (cluster: string) => string): string {
  const byCluster = Object.keys(DOMAIN_FACETS).map((c) => ({ c, ts: traits.filter((t) => t.cluster === c) })).filter((g) => g.ts.length)
  return `Write the takeaway for this person's results: what stands out most. Say what stands out, not what it all means about them.

Their traits, grouped, each marked as leaning clearly one way or sitting near the middle, with the one-line description they already have:
${byCluster.map((g) => `${groupLabel(g.c)}:\n${g.ts.map(line).join('\n')}`).join('\n\n')}
${tensions.length ? `\nPairs that pull against each other (inside one group only):\n${tensions.map((x) => `- ${x.words[0]} and ${x.words[1]}`).join('\n')}` : ''}

What to write:
- "takeaway": {"text": one sentence, at most ${SUMMARY_TAKEAWAY_MAX_WORDS} words, on what stands out most, "draws_on": [at most ${SENTENCE_MAX_TRAITS} trait words that lean clearly]}.
- "support": at most ${SUMMARY_SUPPORT_MAX} short sentences that back the takeaway up, each {"text": "...", "draws_on": [at most ${SENTENCE_MAX_TRAITS} trait words]}. Fewer is fine.
- Traits near the middle are not what stands out: never build on them.
- Groups may sit side by side; never say one group explains, causes or drives another.
- "pointer": only if one listed pair is part of what stands out: {"word": the trait word the reader should open, "phrase": the exact words of one of your sentences to turn into a link}. Otherwise null.

${TAKEAWAY_RULES}

Return JSON only.`
}

export function buildClusterTakeawayPrompt(groupName: string, description: string, traits: ContentTrait[], tension: ContentTension | null): string {
  return `Write the takeaway for one group of this person's traits: what stands out most in it, in one sentence.

The group: ${groupName}. It covers: ${description}

Their traits in this group, each marked as leaning clearly one way or sitting near the middle, with the one-line description they already have:
${traits.map(line).join('\n')}
${tension ? `\nThese two pull against each other: ${tension.words[0]} and ${tension.words[1]}. The takeaway may name it.` : ''}

What to write:
- "takeaway": {"text": one sentence, at most ${CLUSTER_TAKEAWAY_MAX_WORDS} words, "draws_on": [at most ${SENTENCE_MAX_TRAITS} trait words, at least one that leans clearly]}. Never describe the group as something they have more or less of.

${TAKEAWAY_RULES}

Return JSON only.`
}

export const SUMMARY_TAKEAWAY_SCHEMA = {
  type: 'object',
  properties: {
    takeaway: SENTENCE,
    support: { type: 'array', items: SENTENCE },
    pointer: { anyOf: [{ type: 'null' }, { type: 'object', properties: { word: { type: 'string' }, phrase: { type: 'string' } }, required: ['word', 'phrase'], additionalProperties: false }] },
  },
  required: ['takeaway', 'support', 'pointer'],
  additionalProperties: false,
}

export const CLUSTER_TAKEAWAY_SCHEMA = {
  type: 'object',
  properties: { takeaway: SENTENCE },
  required: ['takeaway'],
  additionalProperties: false,
}

export function checkSummaryTakeaway(raw: string, input: ContentTrait[], tensions: ContentTension[]): ContentCheck {
  const o = parse(raw)
  if (!o) return { ok: false, reason: 'not JSON' }
  const t = checkTakeawaySentence(o.takeaway, input, tensions, true)
  if (!t.ok) return { ok: false, reason: `takeaway: ${t.reason}` }
  const leaning = new Set(input.filter(leans).map((x) => x.facet))
  if (!t.s.facets.some((f) => leaning.has(f))) return { ok: false, reason: 'takeaway rests only on middle traits' }
  const support: TracedSentence[] = []
  for (const raw of Array.isArray(o.support) ? o.support : []) {
    const c = checkTakeawaySentence(raw, input, tensions, true)
    if (!c.ok) return { ok: false, reason: `support: ${c.reason}` }
    support.push(c.s)
  }
  const violations: string[] = []
  if (support.length > SUMMARY_SUPPORT_MAX) violations.push(`Write at most ${SUMMARY_SUPPORT_MAX} supporting sentences, not ${support.length}.`)
  if (countWords(t.s.text) > SUMMARY_TAKEAWAY_MAX_WORDS) violations.push(`The takeaway is ${countWords(t.s.text)} words: keep it to ${SUMMARY_TAKEAWAY_MAX_WORDS}.`)
  const kept = support.slice(0, SUMMARY_SUPPORT_MAX)
  let pointer: { facet: string; phrase: string } | null = null
  if (o.pointer && typeof o.pointer === 'object') {
    const p = o.pointer as { word?: unknown; phrase?: unknown }
    const trait = input.find((x) => x.word.toLowerCase() === String(p.word).toLowerCase())
    const phrase = typeof p.phrase === 'string' ? p.phrase.trim().replace(/[.]$/, '') : ''
    const host = phrase ? [t.s, ...kept].find((s) => s.text.includes(phrase)) : undefined
    if (!trait || !host) return { ok: false, reason: 'pointer does not match a sentence' }
    if (!tensions.some((x) => x.facets.includes(trait.facet) && x.facets.every((f) => host.facets.includes(f)))) return { ok: false, reason: 'pointer is not on a sentence about a listed pair' }
    pointer = { facet: trait.facet, phrase }
  }
  const sentences = [t.s, ...kept]
  return { ok: true, headline: t.s.text, text: kept.map((s) => s.text).join(' '), sentences, pointer, drawsOn: Array.from(new Set(sentences.flatMap((s) => s.facets))), violations }
}

export function checkClusterTakeaway(raw: string, input: ContentTrait[], tensions: ContentTension[] = []): ContentCheck {
  const o = parse(raw)
  if (!o) return { ok: false, reason: 'not JSON' }
  const t = checkTakeawaySentence(o.takeaway, input, tensions, false)
  if (!t.ok) return { ok: false, reason: `takeaway: ${t.reason}` }
  const leaning = new Set(input.filter(leans).map((x) => x.facet))
  if (leaning.size > 0 && !t.s.facets.some((f) => leaning.has(f))) return { ok: false, reason: 'takeaway rests only on middle traits' }
  const violations = countWords(t.s.text) > CLUSTER_TAKEAWAY_MAX_WORDS ? [`The takeaway is ${countWords(t.s.text)} words: keep it to ${CLUSTER_TAKEAWAY_MAX_WORDS}.`] : []
  return { ok: true, headline: t.s.text, text: '', sentences: [t.s], pointer: null, drawsOn: t.s.facets, violations }
}
