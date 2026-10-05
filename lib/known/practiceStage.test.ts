import test from 'node:test'
import assert from 'node:assert/strict'
import { computeStage, formatStageProgress, formatStageCompact } from './practiceStage'

test('zero qualifying weeks is stage 1: collecting', () => {
  const result = computeStage({ qualifyingWeekCount: 0, isTrendQualified: false })
  assert.equal(result.stage, 'collecting')
  assert.equal(result.stepNumber, 1)
})

test('1 or 2 qualifying weeks (below the threshold) is stage 2: first picture', () => {
  assert.equal(computeStage({ qualifyingWeekCount: 1, isTrendQualified: false }).stage, 'first_picture')
  assert.equal(computeStage({ qualifyingWeekCount: 2, isTrendQualified: false }).stage, 'first_picture')
})

test('isTrendQualified true is stage 3: does it fit, regardless of the exact count', () => {
  const result = computeStage({ qualifyingWeekCount: 3, isTrendQualified: true })
  assert.equal(result.stage, 'does_it_fit')
  assert.equal(result.stepNumber, 3)
})

test('a missed week never moves the stage backward — only isTrendQualified/qualifyingWeekCount drive it, both of which are monotonic within a period', () => {
  // Simulates "2 qualifying weeks earned, this week fell short" — still
  // stage 2, not demoted, since qualifyingWeekCount itself never decreases.
  const result = computeStage({ qualifyingWeekCount: 2, isTrendQualified: false })
  assert.equal(result.stage, 'first_picture')
  assert.equal(result.qualifyingWeekCount, 2)
})

test('progress line is null once stage 3 is reached', () => {
  const result = computeStage({ qualifyingWeekCount: 4, isTrendQualified: true })
  assert.equal(formatStageProgress(result), null)
})

test('progress line names the weekly floor in plain terms, no banned words', () => {
  const result = computeStage({ qualifyingWeekCount: 2, isTrendQualified: false })
  const line = formatStageProgress(result)
  assert.equal(line, '2 of 3 weeks done. A week counts when you check in 3 times.')
})

test('compact card line gives step number and label in one line', () => {
  const result = computeStage({ qualifyingWeekCount: 0, isTrendQualified: false })
  assert.equal(formatStageCompact(result), 'Step 1 of 3 — Collecting')
})
