import test from 'node:test'
import assert from 'node:assert/strict'
import { detectUnlockMoment, formatUnlockMoment } from './checkInUnlock'

// Fixed "now": Wed Oct 7, 2026 — its ISO week runs Mon Oct 5 - Sun Oct 11.
// The 28-day report window ending here runs Sep 10 - Oct 7. computeTrend's
// 5-week lookback runs Sep 7 - Oct 11 — 7 days WIDER than the report
// window on the near end (Sep 7-9 falls inside the trend lookback but
// outside the report window). That narrow gap is exactly where the two
// definitions used to disagree, and what the regression test below checks.
const now = new Date(2026, 9, 7)
const periodStartedAt = '2026-08-25T00:00:00Z'

test('crossing the weekly floor alone (stage unchanged on both sides) reports weekly_floor', () => {
  const before = [
    { check_in_date: '2026-09-21', response_option: 'mid' },
    { check_in_date: '2026-09-22', response_option: 'mid' },
    { check_in_date: '2026-09-23', response_option: 'mid' },
    { check_in_date: '2026-10-05', response_option: 'high' },
    { check_in_date: '2026-10-06', response_option: 'high' },
  ]
  const after = [...before, { check_in_date: '2026-10-07', response_option: 'high' }]
  assert.equal(detectUnlockMoment(before, after, periodStartedAt, now), 'weekly_floor')
})

test('the very first qualifying week ever reports first_picture, not weekly_floor, even though both cross at once', () => {
  const before = [
    { check_in_date: '2026-10-05', response_option: 'high' },
    { check_in_date: '2026-10-06', response_option: 'high' },
  ]
  const after = [...before, { check_in_date: '2026-10-07', response_option: 'high' }]
  assert.equal(detectUnlockMoment(before, after, periodStartedAt, now), 'first_picture')
})

test('reaching COMPARISON_MIN_CHECKINS (9) in the 28-day report window reports does_it_fit', () => {
  // 8 check-ins scattered through the report window (Sep 10 - Oct 7),
  // deliberately not forming tidy 3-per-week qualifying weeks — stage 3 no
  // longer cares about weekly qualification, only the window's raw count.
  const before = [
    '2026-09-10', '2026-09-12', '2026-09-15', '2026-09-19',
    '2026-09-23', '2026-09-27', '2026-10-01', '2026-10-04',
  ].map((d) => ({ check_in_date: d, response_option: 'high' }))
  const after = [...before, { check_in_date: '2026-10-06', response_option: 'high' }]
  assert.equal(before.length, 8)
  assert.equal(after.length, 9)
  assert.equal(detectUnlockMoment(before, after, periodStartedAt, now), 'does_it_fit')
})

// Regression test for the actual bug report: a 3rd qualifying week within
// computeTrend's 5-week lookback used to be enough to report does_it_fit
// (the OLD isTrendQualified-based rule), even when the report window
// itself was nowhere near COMPARISON_MIN_CHECKINS. Here, one qualifying
// week (Sep 7-9) sits in the lookback-but-not-window gap, a second
// (Sep 21-23) sits inside the window, and crossing the weekly floor THIS
// week would have made a 3rd under the old rule — but the window only has
// 6 check-ins after this save, nowhere near 9, so the correct report is
// weekly_floor, not does_it_fit.
test('a qualifying week outside the 28-day report window does not trigger does_it_fit on its own', () => {
  const before = [
    { check_in_date: '2026-09-07', response_option: 'mid' },
    { check_in_date: '2026-09-08', response_option: 'mid' },
    { check_in_date: '2026-09-09', response_option: 'mid' },
    { check_in_date: '2026-09-21', response_option: 'mid' },
    { check_in_date: '2026-09-22', response_option: 'mid' },
    { check_in_date: '2026-09-23', response_option: 'mid' },
    { check_in_date: '2026-10-05', response_option: 'high' },
    { check_in_date: '2026-10-06', response_option: 'high' },
  ]
  const after = [...before, { check_in_date: '2026-10-07', response_option: 'high' }]
  assert.equal(detectUnlockMoment(before, after, periodStartedAt, now), 'weekly_floor')
})

test('adding a 4th check-in to a week that already qualified reports nothing — already crossed, not a new moment', () => {
  const before = [
    { check_in_date: '2026-10-05', response_option: 'high' },
    { check_in_date: '2026-10-06', response_option: 'high' },
    { check_in_date: '2026-10-07', response_option: 'high' },
  ]
  const after = [...before, { check_in_date: '2026-10-08', response_option: 'low' }]
  assert.equal(detectUnlockMoment(before, after, periodStartedAt, now), null)
})

test('a check-in that does not reach the weekly floor reports nothing', () => {
  const before = [{ check_in_date: '2026-10-05', response_option: 'high' }]
  const after = [...before, { check_in_date: '2026-10-06', response_option: 'high' }]
  assert.equal(detectUnlockMoment(before, after, periodStartedAt, now), null)
})

test('formatted copy names no missed-days count and is plain, one line each', () => {
  for (const moment of ['does_it_fit', 'first_picture', 'weekly_floor'] as const) {
    const line = formatUnlockMoment(moment)
    assert.ok(line)
    assert.ok(!line!.toLowerCase().includes('missed'))
    assert.ok(!line!.toLowerCase().includes('streak'))
  }
  assert.equal(formatUnlockMoment(null), null)
})
