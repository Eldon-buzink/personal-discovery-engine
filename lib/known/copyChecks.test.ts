import test from 'node:test'
import assert from 'node:assert/strict'
import { CONTRAST_NOTE, PUNCTUATION_NOTE, betterAttempt, checkSentenceLengths, countTagWords, countWords, fixPunctuation, hasContrastPattern, hasDash, hasDashOrSemicolon, hasLabelledTradeoff, retryFeedback, splitSentences } from './copyChecks'
import { checkRing1Card } from './ring1Card'

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
  assert.equal(fixPunctuation('You plan ahead—it helps.'), 'You plan ahead. It helps.')
  assert.equal(fixPunctuation('You plan ahead — it helps.'), 'You plan ahead. It helps.')
  assert.equal(fixPunctuation('You plan ahead – it helps.'), 'You plan ahead. It helps.')
  assert.equal(fixPunctuation('You plan ahead; it helps.'), 'You plan ahead. It helps.')
  assert.equal(fixPunctuation('One thing; another—and a third.'), 'One thing. Another. And a third.')
  assert.equal(fixPunctuation('It ends on a dash—'), 'It ends on a dash.')
  // Never a comma; ordinary hyphens are left alone.
  assert.ok(!fixPunctuation('You plan ahead—it helps.').includes(','))
  assert.equal(fixPunctuation('Twelve-week, self-made plan.'), 'Twelve-week, self-made plan.')
})

test('countTagWords splits on hyphens and dashes; countWords does not', () => {
  assert.equal(countTagWords('Pulled in-the-moment'), 4)
  assert.equal(countTagWords('Self\u2010aware'), 2)
  assert.equal(countTagWords('  Slow to   warm '), 3)
  assert.equal(countWords('Pulled in-the-moment'), 2)
})

test('contrast pattern: "it\'s not X, it\'s Y" and "not just X" are caught', () => {
  const hits = [
    "It's not hesitation, it's a preference for being right.",
    'It is not shyness. It is a need for quiet first.',
    "This isn't about introversion, it's about context switching.",
    'That’s not stubbornness; that’s care.',
    "It's not laziness — it's how you recover.",
    "It isn't a rule, but it's what you tend to do.",
    'You are not just organised. You like things in their place.',
    'Not just once, but most days.',
  ]
  for (const t of hits) assert.equal(hasContrastPattern(t), true, t)
  assert.ok(checkRing1Card({ trait_quote: hits[0], body: 'It often shows at work.', tags: ['Weighs it first', 'Hard to rush', 'Commits late'] }).ok)
})

test('contrast pattern: no false positives on normal "not" and hyphens', () => {
  const clean = [
    "You're not sure until you've thought it through.",
    'It is not easy to rush you.',
    "It's not always clear which kind of worry it is.",
    'You do not plan every step. You adapt as things change.',
    'A well-known, long-term, follow-through habit.',
    'Not now, maybe later.',
    'It is what it is.',
    "This isn't something you plan. You decide in the moment.",
    'Justice is not justly served.',
  ]
  for (const t of clean) assert.equal(hasContrastPattern(t), false, t)
})

test('dash check: em dash and word en dash, never hyphens or number ranges', () => {
  for (const t of ['Calm — mostly.', 'Calm–mostly.', 'Calm – mostly.']) assert.equal(hasDash(t), true, t)
  for (const t of ['A well-known, self-aware habit.', 'Weeks 2–3 of 4.', 'Oct 5 - Oct 11']) assert.equal(hasDash(t), false, t)
})

test('ring 1 card: a contrast pattern is a soft retry note, a dash too', () => {
  const card = (q: string) => checkRing1Card({ trait_quote: q, body: 'It often shows when a choice has to be made.', tags: ['Weighs it first', 'Hard to rush', 'Commits late'] })
  const c = card("It's not hesitation, it's care.")
  assert.ok(c.ok && c.violations.includes(CONTRAST_NOTE))
  const d = card('You like to think it through–then commit.')
  assert.ok(d.ok && d.violations.includes(PUNCTUATION_NOTE))
  const e = card('You like to think a decision all the way through before you commit.')
  assert.ok(e.ok && !e.violations.includes(CONTRAST_NOTE) && !e.violations.includes(PUNCTUATION_NOTE))
})
