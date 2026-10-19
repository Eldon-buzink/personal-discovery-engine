import test from 'node:test'
import assert from 'node:assert/strict'
import { SAMPLE_EVIDENCE, sampleEvidencePanel, sampleResponses } from './sampleEvidence'
import { computeFacetScore, getTraitWord } from './scoring'
import { QUESTION_BY_ID } from './ring1-questions'

// The sample report's own trait words (app/report/sample/SampleReportClient.tsx).
const SAMPLE_WORDS: Record<string, string> = { Cautiousness: 'Deliberate', 'Self-Efficacy': 'Self-assured', 'Self-Consciousness': 'Aware' }

test('sample answers score into the trait word the sample shows', () => {
  for (const facet of Object.keys(SAMPLE_EVIDENCE)) {
    const score = computeFacetScore(facet, sampleResponses(facet))!
    assert.equal(getTraitWord(facet, score), SAMPLE_WORDS[facet], facet)
    const band = score >= 3.5 ? 'high' : score >= 2.5 ? 'mid' : 'low'
    assert.equal(band, SAMPLE_EVIDENCE[facet].direction, facet)
  }
})

test('the sample panel shows real statements from the item bank', () => {
  for (const facet of Object.keys(SAMPLE_EVIDENCE)) {
    const panel = sampleEvidencePanel(facet)!
    assert.equal(panel.answers!.length, 2, facet)
    for (const a of panel.answers!) assert.ok(Array.from(QUESTION_BY_ID.values()).some((q) => q.text === a.text && q.facet === facet), a.text)
  }
})
