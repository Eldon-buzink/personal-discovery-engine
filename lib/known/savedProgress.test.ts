import test from 'node:test'
import assert from 'node:assert/strict'
import {
  answersToNextTrait,
  isReminderEligible,
  isRetentionDue,
  shouldRestoreSaved,
  TOTAL_QUESTIONS,
  type SavedProgressRow,
} from './savedProgress'

const answered = (n: number) => ({ responses: Array.from({ length: n }, (_, i) => ({ questionId: i + 1, value: 3 })) })

// ── restore ───────────────────────────────────────────────────────────────────

test('restores the saved session into an empty browser', () => {
  assert.equal(shouldRestoreSaved(null, answered(25)), true)
  assert.equal(shouldRestoreSaved({ questionOrder: [], responses: [] }, answered(25)), true)
})

test('restores when this browser has fewer answers', () => {
  assert.equal(shouldRestoreSaved(answered(10), answered(25)), true)
})

test('never overwrites a longer local session', () => {
  assert.equal(shouldRestoreSaved(answered(40), answered(25)), false)
})

test('keeps the local session when both have the same number of answers', () => {
  assert.equal(shouldRestoreSaved(answered(25), answered(25)), false)
})

test('does nothing when the saved session is empty or malformed', () => {
  assert.equal(shouldRestoreSaved(null, null), false)
  assert.equal(shouldRestoreSaved(null, { responses: 'nope' }), false)
})

// ── answers to the next trait ─────────────────────────────────────────────────

const facets = new Map([
  ['A', [{ id: 1 }, { id: 4 }]],
  ['B', [{ id: 2 }, { id: 3 }]],
])

test('counts to the facet whose last open question comes first', () => {
  // order 1,2,3,4: B completes at step 3, A at step 4
  assert.equal(answersToNextTrait([1, 2, 3, 4], new Set(), facets), 3)
})

test('only open questions count as steps', () => {
  // 2 answered: remaining order 1,3,4 -> B needs 3 (step 2)
  assert.equal(answersToNextTrait([1, 2, 3, 4], new Set([2]), facets), 2)
})

test('skips complete facets, and is null when nothing is left', () => {
  assert.equal(answersToNextTrait([1, 2, 3, 4], new Set([2, 3]), facets), 2)
  assert.equal(answersToNextTrait([1, 2, 3, 4], new Set([1, 2, 3, 4]), facets), null)
})

test('works on the real question set: first trait after a fresh start is within the 120', () => {
  const order = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i + 1)
  const x = answersToNextTrait(order, new Set())
  assert.ok(x !== null && x >= 4 && x <= TOTAL_QUESTIONS)
})

// ── reminder eligibility ──────────────────────────────────────────────────────

const now = new Date('2026-10-20T12:00:00Z')
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString()
const row = (over: Partial<SavedProgressRow> = {}): SavedProgressRow => ({
  email: 'someone@example.test',
  claimed_by: null,
  updated_at: hoursAgo(30),
  reminder_sent_at: null,
  responses: answered(25),
  ...over,
})
const ok = { isPaid: false, finishedElsewhere: false }

test('eligible: saved with an email, untouched for over 24 hours, unfinished', () => {
  assert.equal(isReminderEligible(row(), now, ok), true)
})

test('not before 24 hours of inactivity', () => {
  assert.equal(isReminderEligible(row({ updated_at: hoursAgo(23) }), now, ok), false)
})

test('never a second reminder', () => {
  assert.equal(isReminderEligible(row({ reminder_sent_at: hoursAgo(1) }), now, ok), false)
})

test('not for someone who resumed through the link (row claimed)', () => {
  assert.equal(isReminderEligible(row({ claimed_by: 'user-1' }), now, ok), false)
})

test('not without an email', () => {
  assert.equal(isReminderEligible(row({ email: null }), now, ok), false)
})

test('not for finished, paid, or finished-in-another-session', () => {
  assert.equal(isReminderEligible(row({ responses: answered(TOTAL_QUESTIONS) }), now, ok), false)
  assert.equal(isReminderEligible(row(), now, { isPaid: true, finishedElsewhere: false }), false)
  assert.equal(isReminderEligible(row(), now, { isPaid: false, finishedElsewhere: true }), false)
})

test('not once the progress is past the 30-day deletion', () => {
  assert.equal(isReminderEligible(row({ updated_at: hoursAgo(31 * 24) }), now, ok), false)
})

// ── retention ─────────────────────────────────────────────────────────────────

test('deletes unclaimed, unfinished progress after 30 days without activity', () => {
  assert.equal(isRetentionDue(row({ updated_at: hoursAgo(31 * 24) }), now), true)
  assert.equal(isRetentionDue(row({ updated_at: hoursAgo(29 * 24) }), now), false)
})

test('keeps claimed rows (they belong to an account) and finished ones', () => {
  assert.equal(isRetentionDue(row({ updated_at: hoursAgo(40 * 24), claimed_by: 'user-1' }), now), false)
  assert.equal(isRetentionDue(row({ updated_at: hoursAgo(40 * 24), responses: answered(TOTAL_QUESTIONS) }), now), false)
})
