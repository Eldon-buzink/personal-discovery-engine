import test from 'node:test'
import assert from 'node:assert/strict'
import { buildJourneyExample } from './journeyExample'
import { landingPracticeFixture, materializeFixture, practiceFixtureFor } from '../../app/(site)/landing/landingPracticeFixture'
import { computeWeeklyInsight, formatWeeklyProgress } from './weeklyInsight'
import { computeRecentWeeksReport } from './recentWeeksReport'
import { computeTrend } from './trend'
import { computeStage, formatStageCompact } from './practiceStage'
import { selectRecentNotes } from './checkInNotes'
import { getCheckInPrompt, checkInOptionWord } from './checkInOptions'
import { WEEKLY_CHECKIN_FLOOR } from './practiceConfig'

// A fixed reference date (a Thursday), so the materialized weeks are stable.
const REF = new Date(2026, 9, 15, 12, 0, 0)

test('the landing example is exactly what the real trend functions return', () => {
  const ex = buildJourneyExample(landingPracticeFixture, REF)
  const m = materializeFixture(landingPracticeFixture, REF)

  // Step 1: before today's check-in.
  const weeklyBefore = computeWeeklyInsight(m.before, m.periodStartedAt, m.now)
  const stage = computeStage(
    computeTrend(m.before, m.periodStartedAt, m.now).qualifyingWeekCount,
    computeRecentWeeksReport(m.before, m.periodStartedAt, m.now).checkInCount,
  )
  assert.equal(ex.home.stageLine, formatStageCompact(stage))
  assert.equal(ex.home.weeklyProgress, formatWeeklyProgress(weeklyBefore))
  assert.equal(ex.home.weeklyQualifies, weeklyBefore.summary.qualifies)
  assert.equal(ex.home.checkedInToday, false)

  // Step 2: the real prompt, today's answer selected.
  assert.deepEqual(ex.checkIn.options, getCheckInPrompt(landingPracticeFixture.facetId).options)
  assert.equal(ex.checkIn.selected, landingPracticeFixture.today.option)

  // Step 3: right after it.
  assert.deepEqual(ex.recap.weekly, computeWeeklyInsight(m.after, m.periodStartedAt, m.now))
  assert.deepEqual(ex.recap.weeks, computeRecentWeeksReport(m.after, m.periodStartedAt, m.now).weeks)
  assert.deepEqual(ex.recap.notes, selectRecentNotes(m.after).slice(0, 1))
})

test('week chips: ISO Monday weeks, 3+ check-ins to qualify, plurality lean', () => {
  const ex = buildJourneyExample(landingPracticeFixture, REF)
  assert.equal(ex.recap.weeks.length, 4)
  for (const w of ex.recap.weeks) {
    assert.equal(w.weekStart.getDay(), 1, 'weeks start on Monday')
    assert.equal(w.qualifies, w.checkInCount >= WEEKLY_CHECKIN_FLOOR)
  }
  // From the fixture rows: weeks 1-2 lean mid (2 of 3), week 3 high (2 of 3),
  // week 4 high (4 of 4, today's included).
  assert.deepEqual(ex.recap.weeks.map((w) => w.checkInCount), [3, 3, 3, 4])
  const words = ex.recap.weeks.map((w) => (w.lean.type === 'option' ? checkInOptionWord(ex.facetId, w.lean.value) : w.lean.type))
  assert.deepEqual(words, [
    checkInOptionWord(ex.facetId, 'mid'),
    checkInOptionWord(ex.facetId, 'mid'),
    checkInOptionWord(ex.facetId, 'high'),
    checkInOptionWord(ex.facetId, 'high'),
  ])
  assert.equal(ex.recap.notes.length, 1)
})

test('other facets use the neutral fixture and still go through the same functions', () => {
  for (const facet of ['Anxiety', 'Liberalism']) {
    const fx = practiceFixtureFor(facet)
    const ex = buildJourneyExample(fx, REF)
    const m = materializeFixture(fx, REF)
    assert.deepEqual(ex.recap.weeks, computeRecentWeeksReport(m.after, m.periodStartedAt, m.now).weeks)
    assert.equal(ex.recap.notes.length, 0)
  }
})
