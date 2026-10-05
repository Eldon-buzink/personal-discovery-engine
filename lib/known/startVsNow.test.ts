import test from 'node:test'
import assert from 'node:assert/strict'
import { compareStartToNow, compareStartToNowFromOptions, formatStartVsNow } from './startVsNow'

test('fewer than COMPARISON_MIN_CHECKINS check-ins is not enough data, regardless of lean', () => {
  const result = compareStartToNow('mid', { type: 'option', value: 'high' }, 5)
  assert.deepEqual(result, { type: 'not_enough_data', checkInsNeeded: 4 })
})

test('zero check-ins needs the full amount', () => {
  const result = compareStartToNow('low', { type: 'none' }, 0)
  assert.deepEqual(result, { type: 'not_enough_data', checkInsNeeded: 9 })
})

test('a genuine tie at or above the floor is "no clear lean", never a fabricated pick', () => {
  const result = compareStartToNow('mid', { type: 'tie' }, 10)
  assert.deepEqual(result, { type: 'no_clear_lean' })
})

test('the same band on both sides matches, for every band', () => {
  for (const band of ['low', 'mid', 'high'] as const) {
    const result = compareStartToNow(band, { type: 'option', value: band }, 9)
    assert.deepEqual(result, { type: 'matches' })
  }
})

test('low start vs. mid now is adjacent, toward mid', () => {
  const result = compareStartToNow('low', { type: 'option', value: 'mid' }, 9)
  assert.deepEqual(result, { type: 'adjacent', towardOption: 'mid' })
})

test('mid start vs. low now is adjacent, toward low (the other direction)', () => {
  const result = compareStartToNow('mid', { type: 'option', value: 'low' }, 9)
  assert.deepEqual(result, { type: 'adjacent', towardOption: 'low' })
})

test('mid start vs. high now is adjacent, toward high', () => {
  const result = compareStartToNow('mid', { type: 'option', value: 'high' }, 9)
  assert.deepEqual(result, { type: 'adjacent', towardOption: 'high' })
})

test('high start vs. mid now is adjacent, toward mid (the other direction)', () => {
  const result = compareStartToNow('high', { type: 'option', value: 'mid' }, 9)
  assert.deepEqual(result, { type: 'adjacent', towardOption: 'mid' })
})

test('low start vs. high now is opposite', () => {
  const result = compareStartToNow('low', { type: 'option', value: 'high' }, 9)
  assert.deepEqual(result, { type: 'opposite' })
})

test('high start vs. low now is opposite (the other direction)', () => {
  const result = compareStartToNow('high', { type: 'option', value: 'low' }, 9)
  assert.deepEqual(result, { type: 'opposite' })
})

test('compareStartToNowFromOptions derives the lean and count from a raw option list', () => {
  const options = ['high', 'high', 'high', 'high', 'high', 'high', 'high', 'high', 'high']
  const result = compareStartToNowFromOptions('low', options)
  assert.deepEqual(result, { type: 'opposite' })
})

test('formatted copy never says the starting result was wrong, and names no facet-specific words beyond checkInOptionWord output', () => {
  assert.equal(formatStartVsNow({ type: 'not_enough_data', checkInsNeeded: 3 }, 'Anxiety'), 'Not enough check-ins to compare yet. 3 more to go.')
  assert.equal(formatStartVsNow({ type: 'no_clear_lean' }, 'Anxiety'), 'No clear lean yet.')
  assert.equal(formatStartVsNow({ type: 'matches' }, 'Anxiety'), 'Mostly matches your starting result.')
  assert.equal(
    formatStartVsNow({ type: 'adjacent', towardOption: 'high' }, 'Anxiety'),
    'Your days lean a bit more toward Anxious than your starting result.'
  )
  assert.equal(formatStartVsNow({ type: 'opposite' }, 'Anxiety'), 'Your days lean differently from your starting result.')
  for (const line of [
    formatStartVsNow({ type: 'not_enough_data', checkInsNeeded: 3 }, 'Anxiety'),
    formatStartVsNow({ type: 'opposite' }, 'Anxiety'),
  ]) {
    assert.ok(!line.toLowerCase().includes('wrong'))
  }
})
