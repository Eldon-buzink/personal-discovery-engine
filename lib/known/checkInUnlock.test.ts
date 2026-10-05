import test from 'node:test'
import assert from 'node:assert/strict'
import { detectUnlockMoment, formatUnlockMoment } from './checkInUnlock'

// Fixed "now": Wed Oct 7, 2026 — its ISO week runs Mon Oct 5 - Sun Oct 11.
const now = new Date(2026, 9, 7)
const periodStartedAt = '2026-09-01T00:00:00Z'

test('crossing the weekly floor alone (stage already past collecting, and not reaching 3 qualifying weeks) reports weekly_floor', () => {
  // One prior complete qualifying week (Sep 21-23) puts the stage at
  // first_picture already — this week crossing the floor is its SECOND
  // qualifying week, still short of does_it_fit's 3, so only the weekly
  // floor itself should fire.
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

test('the very first qualifying week ever reports first_picture, not weekly_floor, even though both technically cross at once', () => {
  const before = [
    { check_in_date: '2026-10-05', response_option: 'high' },
    { check_in_date: '2026-10-06', response_option: 'high' },
  ]
  const after = [...before, { check_in_date: '2026-10-07', response_option: 'high' }]
  assert.equal(detectUnlockMoment(before, after, periodStartedAt, now), 'first_picture')
})

test('the 3rd qualifying week reports does_it_fit, taking priority over the weekly floor also crossing', () => {
  const before = [
    { check_in_date: '2026-09-21', response_option: 'mid' },
    { check_in_date: '2026-09-22', response_option: 'mid' },
    { check_in_date: '2026-09-23', response_option: 'mid' },
    { check_in_date: '2026-09-28', response_option: 'mid' },
    { check_in_date: '2026-09-29', response_option: 'mid' },
    { check_in_date: '2026-09-30', response_option: 'mid' },
    { check_in_date: '2026-10-05', response_option: 'high' },
    { check_in_date: '2026-10-06', response_option: 'high' },
  ]
  const after = [...before, { check_in_date: '2026-10-07', response_option: 'high' }]
  assert.equal(detectUnlockMoment(before, after, periodStartedAt, now), 'does_it_fit')
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
