import 'server-only'

// Report lab: one generation on the trait-card model, the same loop as the
// trait cards (two attempts inside the 20 s budget, a soft violation retries
// once with a note, the better attempt is kept), plus a log of every attempt
// (raw text and verdict) so the lab can show what a check rejected.

import Anthropic from '@anthropic-ai/sdk'
import { attemptTimeout } from '@/lib/known/modelOptions'
import { retryFeedback } from '@/lib/known/copyChecks'

export const LAB_MODEL = 'claude-sonnet-5-5'

export type LabChecked<T> = { ok: true; value: T; violations: string[] } | { ok: false; reason: string }
export interface LabAttempt { text: string; verdict: string }
export interface LabRun<T> { value: T | null; violations: string[]; attempts: LabAttempt[] }

export async function runModel<T>(
  req: { system: string; prompt: string; schema: Record<string, unknown> },
  check: (text: string) => LabChecked<T>,
): Promise<LabRun<T>> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const first: Anthropic.MessageParam = { role: 'user', content: req.prompt }
  let messages: Anthropic.MessageParam[] = [first]
  let best: { value: T; violations: string[] } | null = null
  const attempts: LabAttempt[] = []
  const startedAt = Date.now()
  for (let attempt = 0; attempt < 2; attempt++) {
    const timeout = attemptTimeout(startedAt, Date.now())
    if (timeout === null) break
    try {
      const message = await anthropic.messages.create({
        model: LAB_MODEL,
        max_tokens: 4096,
        system: req.system,
        output_config: { format: { type: 'json_schema', schema: req.schema } },
        messages,
      }, { timeout, maxRetries: 0 })
      const block = message.content.find((b) => b.type === 'text')
      const text = block && block.type === 'text' ? block.text : ''
      if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') { attempts.push({ text, verdict: `stop: ${message.stop_reason}` }); messages = [first]; continue }
      const c = check(text)
      if (!c.ok) { attempts.push({ text, verdict: `rejected: ${c.reason}` }); messages = [first]; continue }
      attempts.push({ text, verdict: c.violations.length ? `kept with notes: ${c.violations.join(' | ')}` : 'passed' })
      if (!best || c.violations.length < best.violations.length) best = { value: c.value, violations: c.violations }
      if (c.violations.length === 0) break
      messages = [first, { role: 'assistant', content: text }, { role: 'user', content: retryFeedback(c.violations) }]
    } catch (err) {
      attempts.push({ text: '', verdict: `error: ${err instanceof Error ? err.name : 'unknown'}` })
      if (err instanceof Anthropic.APIConnectionTimeoutError) break
      messages = [first]
    }
  }
  return { value: best?.value ?? null, violations: best?.violations ?? [], attempts }
}
