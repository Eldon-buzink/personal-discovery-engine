import test from 'node:test'
import assert from 'node:assert/strict'
import { computeStage, formatStageProgress, formatStageCompact } from './practiceStage'
import { COMPARISON_MIN_CHECKINS } from './practiceConfig'

test('zero qualifying weeks and zero report-window check-ins is stage 1: collecting', () => {
  const result = computeStage(0, 0)
  assert.equal(result.stage, 'collecting')
  assert.equal(result.stepNumber, 1)
})

test('1 or 2 qualifying weeks, below COMPARISON_MIN_CHECKINS, is stage 2: first picture', () => {
  assert.equal(computeStage(1, 3).stage, 'first_picture')
  assert.equal(computeStage(2, 6).stage, 'first_picture')
})

test('reaching COMPARISON_MIN_CHECKINS in the report window is stage 3, regardless of qualifying weeks', () => {
  const result = computeStage(0, COMPARISON_MIN_CHECKINS)
  assert.equal(result.stage, 'does_it_fit')
  assert.equal(result.stepNumber, 3)
})

// This is the exact disagreement the follow-up fix closes: a qualifying
// week (3+ check-ins) that falls OUTSIDE the 28-day report window used to
// still count toward isTrendQualified (computeTrend's own 5-week rolling
// lookback is a different, wider window), which could push the ladder to
// "Does it fit?" while the report — gated on the narrower 28-day window —
// still said "not enough yet". Stage now ignores qualifying-week count
// entirely for the step-3 decision; only the report-window count matters.
test('a qualifying week outside the 28-day report window does not advance to stage 3 on its own', () => {
  // qualifyingWeekCount=3 would have satisfied the OLD isTrendQualified
  // rule, but the report window only has 5 check-ins — below the floor.
  const result = computeStage(3, 5)
  assert.equal(result.stage, 'first_picture')
  assert.equal(result.stepNumber, 2)
})

test('reaching the report-window floor with very few qualifying weeks still reaches stage 3', () => {
  // The inverse case: check-ins spread thin across weeks (never hitting
  // the per-week floor) but totaling enough in the 28-day window. The
  // report can compare; the ladder must agree.
  const result = computeStage(0, COMPARISON_MIN_CHECKINS)
  assert.equal(result.stage, 'does_it_fit')
})

test('a missed week never moves the stage backward — both counts are monotonic within a period', () => {
  const result = computeStage(2, 6)
  assert.equal(result.stage, 'first_picture')
  assert.equal(result.qualifyingWeekCount, 2)
  assert.equal(result.reportWindowCheckInCount, 6)
})

test('progress lines are null once stage 3 is reached', () => {
  const result = computeStage(4, COMPARISON_MIN_CHECKINS)
  assert.equal(formatStageProgress(result), null)
})

test('stage 1 (collecting) shows only the week-counts-as sentence, never "0 of 3 weeks done"', () => {
  const result = computeStage(0, 0)
  const lines = formatStageProgress(result)
  assert.deepEqual(lines, ['A week counts when you check in 3 times.'])
  assert.ok(!lines!.some((l) => l.includes('0 of')))
})

test('stage 2 (first picture) keeps "N of 3 weeks done" for N >= 1, and adds what the comparison still needs', () => {
  const result = computeStage(2, 6)
  const lines = formatStageProgress(result)
  assert.deepEqual(lines, [
    '2 of 3 weeks done. A week counts when you check in 3 times.',
    `Your comparison is ready after ${COMPARISON_MIN_CHECKINS} check-ins. You have 6.`,
  ])
})

test('stage 2 copy never claims the comparison is ready, and names no banned words', () => {
  const result = computeStage(1, 1)
  const lines = formatStageProgress(result)!
  for (const line of lines) {
    assert.ok(!/\bready\b.*compar/i.test(line) || line.includes('ready after'))
    assert.ok(!/qualifying|trend|directional|baseline|signal|cadence|synthesis|cohort|metric|hypothesis|plurality/i.test(line))
  }
})

test('compact card line gives step number and label in one line', () => {
  const result = computeStage(0, 0)
  assert.equal(formatStageCompact(result), 'Step 1 of 3 — Collecting')
})
