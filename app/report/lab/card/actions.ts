'use server'

// Report lab: the same trait card generated in today's format (body + tags)
// and in the split format (shows_up + tradeoff), side by side, on the
// example data. Gated by lib/lab/labGate.ts (flag + paid check). The input
// is only a facet name; the trait word, direction and the answers sent as
// evidence are worked out here from the example, with the same exclusions
// as the real cards (evidenceFor).

import { labGenerationGate } from '@/lib/lab/labGate'
import { runModel, type LabRun } from '@/lib/lab/runModel'
import { exampleResponses, EXAMPLE_BANDS } from '@/lib/known/exampleReport'
import { evidenceFor, facetAnswers } from '@/lib/known/ring1Evidence'
import { facetTraitWords } from '@/lib/known/scoring'
import { RING1_SYSTEM_PROMPT, buildRing1Prompt, buildRing1PromptSplit } from '@/lib/known/ring1Prompt'
import {
  RING1_CARD_SCHEMA, RING1_CARD_SCHEMA_SPLIT, checkRing1CardText, checkRing1SplitCardText, finishRing1Card, finishRing1SplitCard,
  type Ring1Card, type Ring1SplitCard,
} from '@/lib/known/ring1Card'

export type CardPair =
  | { status: 'ok'; facet: string; word: string; direction: string; evidence: { text: string; direction: string }[]; old: LabRun<Ring1Card>; split: LabRun<Ring1SplitCard> }
  | { status: 'failed'; reason: string }

export async function generateLabCardPair(facet: string): Promise<CardPair> {
  const gate = await labGenerationGate()
  if (!gate.ok) return { status: 'failed', reason: gate.reason }
  const direction = typeof facet === 'string' ? EXAMPLE_BANDS[facet] : undefined
  const words = direction ? facetTraitWords(facet) : null
  if (!direction || !words) return { status: 'failed', reason: 'bad input' }
  const word = words[direction]
  const evidence = evidenceFor(facet, facetAnswers(facet, exampleResponses()))
  const [old, split] = await Promise.all([
    runModel({ system: RING1_SYSTEM_PROMPT, prompt: buildRing1Prompt(facet, word, direction, evidence), schema: RING1_CARD_SCHEMA }, (text) => {
      const c = checkRing1CardText(text)
      return c.ok ? { ok: true, value: finishRing1Card(c.card), violations: c.violations } : c
    }),
    runModel({ system: RING1_SYSTEM_PROMPT, prompt: buildRing1PromptSplit(facet, word, direction, evidence), schema: RING1_CARD_SCHEMA_SPLIT }, (text) => {
      const c = checkRing1SplitCardText(text)
      return c.ok ? { ok: true, value: finishRing1SplitCard(c.card), violations: c.violations } : c
    }),
  ])
  return { status: 'ok', facet, word, direction, evidence, old, split }
}
