import { test } from 'node:test'
import assert from 'node:assert/strict'
import { manageHref, togglePick } from './practicePicks'

test('toggle adds, removes and refuses a fifth', () => {
  let r = togglePick([], 'Trust')
  assert.deepEqual(r, { picks: ['Trust'], atCap: false })
  r = togglePick(r.picks, 'Trust')
  assert.deepEqual(r, { picks: [], atCap: false })
  const four = ['A', 'B', 'C', 'D']
  assert.deepEqual(togglePick(four, 'E'), { picks: four, atCap: true })
})

test('manage link uses the picks, else the strongest four', () => {
  assert.equal(manageHref(['Trust'], ['A', 'B', 'C', 'D', 'E']), '/practice/manage?pick=Trust')
  assert.equal(manageHref([], ['A', 'B', 'C', 'D', 'E']), `/practice/manage?pick=${encodeURIComponent('A,B,C,D')}`)
})
