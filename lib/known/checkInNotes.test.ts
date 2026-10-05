import test from 'node:test'
import assert from 'node:assert/strict'
import { selectRecentNotes } from './checkInNotes'

test('returns the most recent notes first, newest date wins', () => {
  const checkIns = [
    { check_in_date: '2026-10-01', note: 'first' },
    { check_in_date: '2026-10-05', note: 'most recent' },
    { check_in_date: '2026-10-03', note: 'middle' },
  ]
  const result = selectRecentNotes(checkIns, 2)
  assert.deepEqual(result, [
    { date: '2026-10-05', note: 'most recent' },
    { date: '2026-10-03', note: 'middle' },
  ])
})

test('null, empty, and whitespace-only notes are excluded', () => {
  const checkIns = [
    { check_in_date: '2026-10-01', note: null },
    { check_in_date: '2026-10-02', note: '' },
    { check_in_date: '2026-10-03', note: '   ' },
    { check_in_date: '2026-10-04', note: 'real note' },
  ]
  const result = selectRecentNotes(checkIns, 5)
  assert.deepEqual(result, [{ date: '2026-10-04', note: 'real note' }])
})

test('no check-ins with notes returns an empty array', () => {
  assert.deepEqual(selectRecentNotes([{ check_in_date: '2026-10-01', note: null }], 2), [])
})

test('note text is returned verbatim, not edited or truncated', () => {
  const longNote = "Didn't expect to feel this way — long day, lots going on."
  const result = selectRecentNotes([{ check_in_date: '2026-10-01', note: longNote }], 2)
  assert.equal(result[0].note, longNote)
})

test('default limit matches RECENT_NOTES_LIMIT when not specified', () => {
  const checkIns = [
    { check_in_date: '2026-10-01', note: 'a' },
    { check_in_date: '2026-10-02', note: 'b' },
    { check_in_date: '2026-10-03', note: 'c' },
  ]
  const result = selectRecentNotes(checkIns)
  assert.equal(result.length, 2)
})
