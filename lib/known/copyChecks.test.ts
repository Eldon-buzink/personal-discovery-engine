import test from 'node:test'
import assert from 'node:assert/strict'
import { betterAttempt, checkSentenceLengths, fixPunctuation, hasDashOrSemicolon, hasLabelledTradeoff, retryFeedback, splitSentences } from './copyChecks'

test('sentences split on . ! ?', () => {
  assert.deepEqual(splitSentences('One here. Two here! Three? Four.'), ['One here.', 'Two here!', 'Three?', 'Four.'])
})

test('sentence lengths: soft notes over 28, hard fail over 35', () => {
  const s = (n: number) => Array.from({ length: n }, () => 'w').join(' ') + '.'
  assert.deepEqual(checkSentenceLengths(`${s(10)} ${s(29)}`), { soft: ['Sentence 2 is 29 words: split it.'], hardFail: null })
  assert.equal(checkSentenceLengths(s(36)).hardFail, 'sentence over 35 words')
  assert.deepEqual(checkSentenceLengths(s(28)), { soft: [], hardFail: null })
})

test('betterAttempt: fewest violations, then fewest words, ties keep the first', () => {
  const a = { id: 'a', violations: ['x'], words: 50 }
  const b = { id: 'b', violations: [], words: 90 }
  const c = { id: 'c', violations: [], words: 70 }
  assert.equal(betterAttempt(a, b), b)
  assert.equal(betterAttempt(b, c), c)
  assert.equal(betterAttempt(c, { ...c, id: 'd' }), c)
})

test('retry feedback names exactly the violations', () => {
  const msg = retryFeedback(['Sentence 2 is 31 words: split it.', "Tag 'X Y Z W' has 4 words: shorten to 3."])
  assert.ok(msg.includes('- Sentence 2 is 31 words: split it.'))
  assert.ok(msg.includes("- Tag 'X Y Z W' has 4 words: shorten to 3."))
})

test('trade-off labels: only a sentence opening with the label fails', () => {
  for (const bad of ['The trade is that you rush.', 'The trade-off is real.', 'The cost is time.', 'The price is high.', 'The payoff is calm.', 'The upside is speed.', 'The downside is noise.', 'You plan well. The cost is time.'])
    assert.equal(hasLabelledTradeoff(bad), true, bad)
  for (const ok of ['You move fast, at the cost of some detail.', 'It comes at the price of rest.', 'You notice the cost of waiting.', 'The plan is solid.'])
    assert.equal(hasLabelledTradeoff(ok), false, ok)
})

test('em-dashes and semicolons are detected and fixed in code', () => {
  assert.equal(hasDashOrSemicolon('You plan ahead—it helps.'), true)
  assert.equal(hasDashOrSemicolon('You plan ahead; it helps.'), true)
  assert.equal(hasDashOrSemicolon('A well-known, self-made plan.'), false)
  assert.equal(fixPunctuation('You plan ahead—it helps.'), 'You plan ahead, it helps.')
  assert.equal(fixPunctuation('You plan ahead — it helps.'), 'You plan ahead, it helps.')
  assert.equal(fixPunctuation('You plan ahead; it helps.'), 'You plan ahead. It helps.')
  assert.equal(fixPunctuation('Twelve-week plan.'), 'Twelve-week plan.')
})
