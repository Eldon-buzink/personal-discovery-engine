import { test } from 'node:test'
import assert from 'node:assert/strict'
import { branchInProgressFrom, reportCta, type CtaInput } from './reportCta'

const base: CtaInput = { isSample: false, isPaid: false, revealed: 3, ring1Complete: false, branchInProgress: null, suggestion: null, exploreLabel: (b) => `Explore ${b}` }
const labels = (i: Partial<CtaInput>) => { const c = reportCta({ ...base, ...i }); return [c.state, c.primary.label, c.secondary?.label ?? null] }

test('each state has one primary and the agreed secondary', () => {
  assert.deepEqual(labels({ isSample: true }), ['not-started', 'Start free', null])
  assert.deepEqual(labels({ revealed: 0 }), ['not-started', 'Start free', null])
  assert.deepEqual(labels({ revealed: 4 }), ['free-in-progress', 'Continue', 'Go to your practice'])
  assert.deepEqual(labels({ revealed: 5 }), ['free-locked', 'Unlock all 30 traits', 'Go to your practice'])
  assert.deepEqual(labels({ isPaid: true, revealed: 12 }), ['paid-in-progress', 'Continue', 'Go to your practice'])
  assert.deepEqual(labels({ isPaid: true, revealed: 30, ring1Complete: true, branchInProgress: 'energy', suggestion: 'direction' }), ['paid-in-progress', 'Continue', 'Go to your practice'])
  assert.deepEqual(labels({ isPaid: true, revealed: 30, ring1Complete: true, suggestion: 'direction' }), ['paid-suggestion', 'Explore direction', 'Go to your practice'])
  assert.deepEqual(labels({ isPaid: true, revealed: 30, ring1Complete: true }), ['paid-done', 'Go to your practice', null])
})

test('a branch counts as in progress only when started and not completed', () => {
  assert.equal(branchInProgressFrom({ environment: { answers: [1], completed: true }, direction: { answers: [1] } }, ['environment', 'direction']), 'direction')
  assert.equal(branchInProgressFrom({ direction: { answers: [] } }, ['direction']), null)
  assert.equal(branchInProgressFrom(undefined, ['direction']), null)
})
