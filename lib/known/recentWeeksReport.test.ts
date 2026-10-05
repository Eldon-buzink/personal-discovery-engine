import test from 'node:test'
import assert from 'node:assert/strict'
import { computeRecentWeeksReport } from './recentWeeksReport'

test('a brand new activation (today) is the first window with zero check-ins', () => {
  const now = new Date(2026, 9, 29)
  const result = computeRecentWeeksReport([], '2026-10-29T00:00:00Z', now)
  assert.equal(result.window.isFirstWindow, true)
  assert.equal(result.checkInCount, 0)
  assert.deepEqual(result.checkIns, [])
})

test('check-ins outside the 4-week window are excluded even when inside the period', () => {
  const now = new Date(2026, 10, 25) // well past the first 4 weeks since Oct 1
  const checkIns = [
    { check_in_date: '2026-10-02', response_option: 'high' }, // outside the rolling window
    { check_in_date: '2026-11-20', response_option: 'low' }, // inside
  ]
  const result = computeRecentWeeksReport(checkIns, '2026-10-01T00:00:00Z', now)
  assert.equal(result.checkInCount, 1)
  assert.deepEqual(result.checkIns, [{ check_in_date: '2026-11-20', response_option: 'low' }])
})

test('check-ins from before the current activation period are excluded (reset-on-reactivation)', () => {
  const now = new Date(2026, 9, 5)
  const checkIns = [
    { check_in_date: '2026-09-01', response_option: 'high' }, // before reactivation
    { check_in_date: '2026-10-02', response_option: 'low' },
  ]
  const result = computeRecentWeeksReport(checkIns, '2026-10-01T00:00:00Z', now)
  assert.equal(result.checkInCount, 1)
})

test('week tiles cover every ISO week the window touches, in order', () => {
  const now = new Date(2026, 9, 29) // Oct 29, one month-ish after activation
  const checkIns = [{ check_in_date: '2026-10-05', response_option: 'mid' }]
  const result = computeRecentWeeksReport(checkIns, '2026-10-01T00:00:00Z', now)
  assert.ok(result.weeks.length >= 1)
  // weeks are oldest-to-newest
  for (let i = 1; i < result.weeks.length; i++) {
    assert.ok(result.weeks[i].weekStart > result.weeks[i - 1].weekStart)
  }
})
