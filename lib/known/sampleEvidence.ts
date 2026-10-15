/**
 * lib/known/sampleEvidence.ts
 *
 * Example answers for the sample report's three traits (illustrative, under
 * the page's "not your data" banner). Raw 1-5 answers in each facet's
 * FACET_QUESTIONS order, chosen so the facet scores into the band the sample
 * names, reverse-keyed statements included (tested in sampleEvidence.test.ts).
 * The panel then shows real statements from the item bank.
 */

import { FACET_QUESTIONS } from './ring1-questions'
import { evidencePanelData, type EvidencePanelData, type ScoreDirection } from './evidencePanel'

export const SAMPLE_EVIDENCE: Record<string, { direction: ScoreDirection; raw: number[] }> = {
  // Deliberate: think before I speak 5, plan ahead 2, avoid hasty 3,
  // jump in without thinking 4 (reverse-keyed → 2). Mean 3.0, mid.
  Cautiousness: { direction: 'mid', raw: [5, 2, 3, 4] },
  // Self-assured: complete 5, smoothly 4, get things done 5, difficulty
  // starting 1 (reverse-keyed → 5). Mean 4.75, high.
  'Self-Efficacy': { direction: 'high', raw: [5, 4, 5, 1] },
  // Aware: embarrassed 4, hard to approach 2, afraid of attention 3,
  // comfortable in unfamiliar 3 (reverse-keyed → 3). Mean 3.0, mid.
  'Self-Consciousness': { direction: 'mid', raw: [4, 2, 3, 3] },
}

export function sampleResponses(facet: string): Map<number, number> {
  const s = SAMPLE_EVIDENCE[facet]
  return new Map((FACET_QUESTIONS.get(facet) ?? []).map((q, i) => [q.id, s.raw[i]] as [number, number]))
}

export function sampleEvidencePanel(facet: string): EvidencePanelData | null {
  const s = SAMPLE_EVIDENCE[facet]
  if (!s) return null
  return evidencePanelData(facet, s.direction, sampleResponses(facet), true)
}
