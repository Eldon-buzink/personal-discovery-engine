import test from 'node:test'
import assert from 'node:assert/strict'
import { computeDistribution } from './weekSummary'

test('computeDistribution tallies each option, insertion order for first-seen', () => {
  const checkIns = [
    { check_in_date: '2026-10-01', response_option: 'mid' },
    { check_in_date: '2026-10-02', response_option: 'high' },
    { check_in_date: '2026-10-03', response_option: 'mid' },
    { check_in_date: '2026-10-04', response_option: 'low' },
    { check_in_date: '2026-10-05', response_option: 'mid' },
  ]
  const result = computeDistribution(checkIns)
  assert.deepEqual(Array.from(result.entries()), [
    ['mid', 3],
    ['high', 1],
    ['low', 1],
  ])
})

test('computeDistribution on an empty list returns an empty map', () => {
  assert.equal(computeDistribution([]).size, 0)
})
