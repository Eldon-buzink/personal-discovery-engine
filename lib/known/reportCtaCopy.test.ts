import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reportCta, type CtaInput } from './reportCta'
import { ctaCopy } from './reportCtaCopy'

const base: CtaInput = { isSample: false, isPaid: false, revealed: 3, ring1Complete: false, branchInProgress: null, suggestion: null, exploreLabel: (b) => `Explore ${b}` }
const copy = (i: Partial<CtaInput>, words: string[] = [], answered = 16) => ctaCopy(reportCta({ ...base, ...i }), { answered, revealed: i.revealed ?? 3, suggestionWords: words })

test('copy fills in the real counts, words and branch', () => {
  assert.match(copy({}).line, /You've answered 16 of 120\./)
  assert.equal(copy({ revealed: 1 }).barLine, '1 trait so far. The next one is a few answers away.')
  const s = copy({ isPaid: true, revealed: 30, ring1Complete: true, suggestion: 'working_style' }, ['Take-charge', 'Analytical'])
  assert.equal(s.line, "Take-charge and Analytical stand out in your answers. It's worth seeing how that shows up in how you work.")
  assert.equal(s.barLine, 'Your answers point to your working style next.')
  assert.match(copy({ isPaid: true, revealed: 30, ring1Complete: true, suggestion: 'energy' }, ['Calm']).line, /^Calm stands out/)
  assert.match(copy({ isPaid: true, revealed: 30, ring1Complete: true, branchInProgress: 'relationships' }).line, /left off in how you connect,/)
})

test('no em dashes, lab markers or pricing words in any state', () => {
  const all = [
    copy({ isSample: true }), copy({}), copy({ revealed: 5 }),
    copy({ isPaid: true, revealed: 12 }), copy({ isPaid: true, revealed: 30, ring1Complete: true, branchInProgress: 'energy' }),
    copy({ isPaid: true, revealed: 30, ring1Complete: true, suggestion: 'direction' }), copy({ isPaid: true, revealed: 30, ring1Complete: true, suggestion: 'direction' }, ['Bold']),
    copy({ isPaid: true, revealed: 30, ring1Complete: true }),
  ]
  for (const c of all) for (const t of [c.title, c.line, c.barLine]) {
    assert.ok(!/—|\[LAB COPY\]|subscription|payment|price|€|\$/i.test(t), t)
  }
})
