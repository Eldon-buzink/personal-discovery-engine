import test from 'node:test'
import assert from 'node:assert/strict'
import { computeFacetMilestone } from './quarterlyReview'

test('zero check-ins gives a none lean and zero count', () => {
  const result = computeFacetMilestone([], '2026-10-01T00:00:00Z', new Date(2026, 9, 5))
  assert.equal(result.checkInCount, 0)
  assert.deepEqual(result.lean, { type: 'none' })
  assert.equal(result.window.isFirstWindow, true)
})

test('a clear plurality within the window reports that option', () => {
  const checkIns = [
    { check_in_date: '2026-10-02', response_option: 'high' },
    { check_in_date: '2026-10-03', response_option: 'high' },
    { check_in_date: '2026-10-04', response_option: 'low' },
  ]
  const result = computeFacetMilestone(checkIns, '2026-10-01T00:00:00Z', new Date(2026, 9, 5))
  assert.equal(result.checkInCount, 3)
  assert.deepEqual(result.lean, { type: 'option', value: 'high' })
})

test('an even split reports a genuine tie, never a fabricated pick', () => {
  const checkIns = [
    { check_in_date: '2026-10-02', response_option: 'high' },
    { check_in_date: '2026-10-03', response_option: 'low' },
  ]
  const result = computeFacetMilestone(checkIns, '2026-10-01T00:00:00Z', new Date(2026, 9, 5))
  assert.deepEqual(result.lean, { type: 'tie' })
})

test('check-ins from before the current activation period are excluded (reset-on-reactivation)', () => {
  const checkIns = [
    { check_in_date: '2026-09-01', response_option: 'high' }, // before reactivation
    { check_in_date: '2026-10-02', response_option: 'low' },
  ]
  const result = computeFacetMilestone(checkIns, '2026-10-01T00:00:00Z', new Date(2026, 9, 5))
  assert.equal(result.checkInCount, 1)
  assert.deepEqual(result.lean, { type: 'option', value: 'low' })
})

test('check-ins outside the 90-day window but within the period are excluded', () => {
  const now = new Date(2027, 2, 1) // well past 90 days since Jan 1 2026 activation
  const checkIns = [
    { check_in_date: '2026-01-05', response_option: 'high' }, // long before the rolling window
    { check_in_date: '2027-02-15', response_option: 'low' }, // inside the rolling last-90-days window
  ]
  const result = computeFacetMilestone(checkIns, '2026-01-01T00:00:00Z', now)
  assert.equal(result.checkInCount, 1)
  assert.deepEqual(result.lean, { type: 'option', value: 'low' })
  assert.equal(result.window.isFirstWindow, false)
})
