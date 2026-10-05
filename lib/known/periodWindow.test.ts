import test from 'node:test'
import assert from 'node:assert/strict'
import { computePeriodWindow } from './periodWindow'

test('activation today is the first window, starting today', () => {
  const now = new Date(2026, 9, 29) // Oct 29, 2026
  const result = computePeriodWindow('2026-10-29T10:00:00Z', 28, now)
  assert.equal(result.isFirstWindow, true)
  assert.deepEqual(result.start, new Date(2026, 9, 29))
  assert.deepEqual(result.end, new Date(2026, 9, 29))
})

test('activation on the 28th gets a real first window, not a one-day calendar-month slice', () => {
  // This is the exact bug from the handover: a user who activates on Oct 28
  // used to get a near-empty "October" recap because the old code anchored
  // to the calendar month, not to when they actually started. Here, one day
  // after activating on the 28th, the window is "the first day of my own
  // period", not "whatever's left of this calendar month".
  const now = new Date(2026, 9, 29) // Oct 29
  const result = computePeriodWindow('2026-10-28T09:00:00Z', 28, now)
  assert.equal(result.isFirstWindow, true)
  assert.deepEqual(result.start, new Date(2026, 9, 28))
  assert.deepEqual(result.end, new Date(2026, 9, 29))
})

test('exactly windowDays since start is the boundary — rolls over to a rolling window', () => {
  const now = new Date(2026, 10, 25) // Nov 25
  // periodStart = Oct 28 -> 28 calendar days before Nov 25
  const result = computePeriodWindow('2026-10-28T00:00:00Z', 28, now)
  assert.equal(result.isFirstWindow, false)
  assert.deepEqual(result.start, new Date(2026, 9, 29)) // today - 27 days
  assert.deepEqual(result.end, new Date(2026, 10, 25))
})

test('one day short of the boundary is still the first window', () => {
  const now = new Date(2026, 10, 24) // Nov 24, 27 days after Oct 28
  const result = computePeriodWindow('2026-10-28T00:00:00Z', 28, now)
  assert.equal(result.isFirstWindow, true)
  assert.deepEqual(result.start, new Date(2026, 9, 28))
  assert.deepEqual(result.end, new Date(2026, 10, 24))
})

test('long-tenured facet gets a rolling last-N-days window, not an ever-growing one', () => {
  const now = new Date(2027, 2, 1) // a year-plus after activation
  const result = computePeriodWindow('2026-01-01T00:00:00Z', 90, now)
  assert.equal(result.isFirstWindow, false)
  assert.deepEqual(result.start, new Date(2026, 11, 2)) // 89 days before Mar 1, 2027
  assert.deepEqual(result.end, new Date(2027, 2, 1))
})

test('reactivated facet: the window follows the NEW period start the caller passes, not any older history', () => {
  // The caller is always responsible for passing the current open period's
  // started_at (facet_activation_periods, not facet_activations.created_at)
  // — this test documents that contract: a period that reopened 3 days ago
  // is a fresh first window regardless of how long ago the facet was
  // originally activated.
  const now = new Date(2026, 9, 10)
  const reactivatedPeriodStart = '2026-10-07T00:00:00Z' // 3 days before "now"
  const result = computePeriodWindow(reactivatedPeriodStart, 28, now)
  assert.equal(result.isFirstWindow, true)
  assert.deepEqual(result.start, new Date(2026, 9, 7))
})

test('windowDays=90 works the same way as windowDays=28, just a bigger number', () => {
  const now = new Date(2026, 9, 29)
  const result = computePeriodWindow('2026-10-29T00:00:00Z', 90, now)
  assert.equal(result.isFirstWindow, true)
})
