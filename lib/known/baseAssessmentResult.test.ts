import test from 'node:test'
import assert from 'node:assert/strict'
import { bandForScore } from './baseAssessmentResult'

test('bandForScore matches scoring.ts getTraitWord thresholds exactly', () => {
  assert.equal(bandForScore(1), 'low')
  assert.equal(bandForScore(2.49), 'low')
  assert.equal(bandForScore(2.5), 'mid')
  assert.equal(bandForScore(3.49), 'mid')
  assert.equal(bandForScore(3.5), 'high')
  assert.equal(bandForScore(5), 'high')
})
