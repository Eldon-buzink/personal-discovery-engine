import test from 'node:test'
import assert from 'node:assert/strict'
import { addDays } from 'date-fns'
import { computeReviewProgress, formatReviewProgress, remainingFor, type TraitReviewInput } from './reviewProgress'
import { COMPARISON_MIN_CHECKINS, MILESTONE_WINDOW_DAYS, WEEKLY_CHECKIN_FLOOR } from './practiceConfig'

const now = new Date(2026, 9, 12, 12)
const trait = (over: Partial<TraitReviewInput> = {}): TraitReviewInput => ({
  checkInsThisWeek: 0,
  checkInsInReportWindow: 0,
  periodStartedAt: addDays(now, -10).toISOString(),
  ...over,
})

test('weekly and monthly count the check-ins still missing, never below zero', () => {
  assert.equal(remainingFor('weekly', trait({ checkInsThisWeek: 1 }), now), WEEKLY_CHECKIN_FLOOR - 1)
  assert.equal(remainingFor('weekly', trait({ checkInsThisWeek: 5 }), now), 0)
  assert.equal(remainingFor('monthly', trait({ checkInsInReportWindow: 4 }), now), COMPARISON_MIN_CHECKINS - 4)
})

test('quarterly counts days since the period started', () => {
  assert.equal(remainingFor('quarterly', trait(), now), MILESTONE_WINDOW_DAYS - 10)
  assert.equal(remainingFor('quarterly', trait({ periodStartedAt: addDays(now, -120).toISOString() }), now), 0)
})

test('card line: ready, partly ready, or the closest trait', () => {
  const ready = trait({ checkInsThisWeek: WEEKLY_CHECKIN_FLOOR })
  assert.equal(formatReviewProgress('weekly', computeReviewProgress('weekly', [ready], now)), 'Ready')
  assert.equal(formatReviewProgress('weekly', computeReviewProgress('weekly', [ready, trait()], now)), 'Ready for 1 of 2 traits')
  assert.equal(
    formatReviewProgress('weekly', computeReviewProgress('weekly', [trait(), trait({ checkInsThisWeek: WEEKLY_CHECKIN_FLOOR - 1 })], now)),
    '1 more check-in this week'
  )
  assert.equal(formatReviewProgress('quarterly', computeReviewProgress('quarterly', [trait()], now)), `In ${MILESTONE_WINDOW_DAYS - 10} days`)
  assert.equal(formatReviewProgress('monthly', computeReviewProgress('monthly', [], now)), null)
})
