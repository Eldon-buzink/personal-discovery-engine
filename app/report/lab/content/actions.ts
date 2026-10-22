'use server'

// Report lab: generation for the Summary and the cluster readings. Off
// unless LAB_CONTENT_GENERATION=1 is set on the server, so production never
// calls this. Lab only; the real report doesn't import it.
//
// Before any model call: the flag, a rate limit, input checks (trait words
// must match the scoring, excluded facets dropped, minimum trait counts),
// and the length of every string. Then two attempts on the trait-card model
// with structured output, inside the trait cards' 20 s budget; an output is
// kept only when the check in lib/lab/contentGeneration.ts passes. Soft
// violations get one retry with a note, like the trait cards.
//
// Paid check first (lib/lab/labGate.ts): the flag, then users.is_paid via
// isPaidUser, as generateRelationshipInsight does. Lab only, still gated.

import Anthropic from '@anthropic-ai/sdk'
import { getSessionUser } from '@/lib/supabase/server'
import { labGenerationGate } from '@/lib/lab/labGate'
import { checkRateLimit, rateLimitKey } from '@/lib/server/rateLimit'
import { requestIp } from '@/lib/server/siteOrigin'
import { attemptTimeout } from '@/lib/known/modelOptions'
import { retryFeedback } from '@/lib/known/copyChecks'
import { CLUSTER_DESCRIPTIONS, CLUSTER_READING_MIN_TRAITS, SUMMARY_MIN_TRAITS } from '@/lib/lab/contentLab'
import { familyLabel } from '@/lib/lab/filterLab'
import {
  buildClusterPrompt, buildSummaryPrompt, checkClusterReading, checkSummary, cleanInput, CLUSTER_SCHEMA, SUMMARY_SCHEMA,
  type ContentCheck, type ContentTension, type ContentTrait,
} from '@/lib/lab/contentGeneration'

// Same model and voice as the trait cards (generatePatternCopy.ts).
const MODEL = 'claude-sonnet-5-5'
const SYSTEM =
  'You write short descriptions for Bearing, a personality product based on IPIP-NEO-120. ' +
  "You describe patterns in a person's answers. You do not advise, diagnose, praise or predict. " +
  'Use plain, warm, precise language, like a smart friend. Speak to the reader as "you". ' +
  'Use "tends to" and "often" for anything that depends on the situation. Never tell the reader what to do. ' +
  'No clinical or diagnostic words. Never invent details the description does not give.'

const RATE_WINDOW_SECONDS = 600
const RATE_MAX = 20

export type LabContentResult =
  | { status: 'ok'; headline?: string; text: string; pointer: { facet: string; phrase: string } | null; drawsOn: string[] }
  | { status: 'failed'; reason: string }
  | { status: 'disabled' }

async function allowed(scope: string): Promise<boolean> {
  const user = await getSessionUser().catch(() => null)
  return checkRateLimit(rateLimitKey(scope, user?.id ?? null, requestIp()), RATE_WINDOW_SECONDS, RATE_MAX)
}

function cleanTensions(tensions: ContentTension[], traits: ContentTrait[]): ContentTension[] {
  if (!Array.isArray(tensions)) return []
  return tensions.filter((x) => Array.isArray(x?.facets) && x.facets.length === 2 &&
    x.facets.every((f) => traits.some((t) => t.facet === f)) &&
    traits.find((t) => t.facet === x.facets[0])?.cluster === traits.find((t) => t.facet === x.facets[1])?.cluster)
    .map((x) => ({ facets: x.facets, words: x.facets.map((f) => traits.find((t) => t.facet === f)!.word) as [string, string] }))
    .slice(0, 5)
}

async function generate(prompt: string, schema: Record<string, unknown>, check: (text: string) => ContentCheck, tag: string): Promise<LabContentResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const first: Anthropic.MessageParam = { role: 'user', content: prompt }
  let messages: Anthropic.MessageParam[] = [first]
  let best: Extract<ContentCheck, { ok: true }> | null = null
  let lastReason = 'no attempt'
  const startedAt = Date.now()
  for (let attempt = 0; attempt < 2; attempt++) {
    const timeout = attemptTimeout(startedAt, Date.now())
    if (timeout === null) break
    try {
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM,
        output_config: { format: { type: 'json_schema', schema } },
        messages,
      }, { timeout, maxRetries: 0 })
      if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') { lastReason = String(message.stop_reason); messages = [first]; continue }
      const block = message.content.find((b) => b.type === 'text')
      const text = block && block.type === 'text' ? block.text : ''
      const c = check(text)
      if (!c.ok) { lastReason = c.reason; console.error(`[${tag}] rejected:`, c.reason); messages = [first]; continue }
      if (!best || c.violations.length < best.violations.length) best = c
      if (c.violations.length === 0) break
      messages = [first, { role: 'assistant', content: text }, { role: 'user', content: retryFeedback(c.violations) }]
    } catch (err) {
      lastReason = err instanceof Error ? err.name : 'error'
      console.error(`[${tag}] generation failed:`, lastReason)
      if (err instanceof Anthropic.APIConnectionTimeoutError) break
      messages = [first]
    }
  }
  return best ? { status: 'ok', headline: best.headline, text: best.text, pointer: best.pointer, drawsOn: best.drawsOn } : { status: 'failed', reason: lastReason }
}

export async function generateLabSummary(traits: ContentTrait[], tensions: ContentTension[]): Promise<LabContentResult> {
  const gate = await labGenerationGate()
  if (!gate.ok) return gate.reason === 'disabled' ? { status: 'disabled' } : { status: 'failed', reason: gate.reason }
  if (!Array.isArray(traits) || traits.length > 30) return { status: 'failed', reason: 'bad input' }
  const input = cleanInput(traits)
  if (input.length < SUMMARY_MIN_TRAITS - 1) return { status: 'failed', reason: 'too few traits' }
  if (!(await allowed('lab-summary'))) return { status: 'failed', reason: 'rate limited' }
  const ts = cleanTensions(tensions, input)
  return generate(buildSummaryPrompt(input, ts, (c) => familyLabel(c).replace('[LAB COPY] ', '')), SUMMARY_SCHEMA, (text) => checkSummary(text, input, ts), 'generateLabSummary')
}

export async function generateLabClusterReading(cluster: string, traits: ContentTrait[], tensions: ContentTension[]): Promise<LabContentResult> {
  const gate = await labGenerationGate()
  if (!gate.ok) return gate.reason === 'disabled' ? { status: 'disabled' } : { status: 'failed', reason: gate.reason }
  const drafts = CLUSTER_DESCRIPTIONS[cluster]
  if (!drafts || !Array.isArray(traits) || traits.length > 6) return { status: 'failed', reason: 'bad input' }
  const input = cleanInput(traits).filter((t) => t.cluster === cluster)
  // Depression is never sent, so Emotional range can reach the model with 2 of its 3.
  if (input.length < CLUSTER_READING_MIN_TRAITS - (traits.some((t) => t.facet === 'Depression') ? 1 : 0)) return { status: 'failed', reason: 'too few traits' }
  if (!(await allowed('lab-cluster'))) return { status: 'failed', reason: 'rate limited' }
  const [tension] = cleanTensions(tensions, input)
  return generate(
    buildClusterPrompt(familyLabel(cluster).replace('[LAB COPY] ', ''), drafts[1].text, input, tension ?? null),
    CLUSTER_SCHEMA, (text) => checkClusterReading(text, input), 'generateLabClusterReading',
  )
}
