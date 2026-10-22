import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkRing1SplitCard, checkRing1SplitCardText, SHOWS_UP_OPENER_NOTE, STOCK_OPENER_NOTE } from './ring1Card'
import { buildRing1Prompt, buildRing1PromptSplit } from './ring1Prompt'

const good = {
  trait_quote: 'You push yourself toward high standards.',
  shows_up: 'When there is a goal to chase, you keep going. You tend to stay with it on long tasks.',
  tradeoff: 'It can also leave you tired.',
}

test('split card: a clean card passes; an empty tradeoff is allowed', () => {
  assert.equal(checkRing1SplitCard(good).ok, true)
  const c = checkRing1SplitCard({ ...good, tradeoff: '' })
  assert.ok(c.ok && c.violations.length === 0)
})

test('split card: shape and hard rules', () => {
  assert.equal(checkRing1SplitCardText('nope').ok, false)
  assert.equal(checkRing1SplitCard({ ...good, shows_up: '' }).ok, false)
  assert.equal(checkRing1SplitCard({ trait_quote: good.trait_quote, shows_up: good.shows_up }).ok, false)
  assert.equal(checkRing1SplitCard({ ...good, shows_up: 'One. Two. Three. Four. Five.' }).ok, false)
  assert.equal(checkRing1SplitCard({ ...good, tradeoff: 'One. Two. Three.' }).ok, false)
  assert.equal(checkRing1SplitCard({ ...good, tradeoff: 'The cost is that you get tired.' }).ok, false)
})

test('split card: soft rules become retry notes', () => {
  const opener = checkRing1SplitCard({ ...good, shows_up: 'It often shows up when there is a goal. You keep going.' })
  assert.ok(opener.ok && opener.violations.includes(SHOWS_UP_OPENER_NOTE))
  const one = checkRing1SplitCard({ ...good, shows_up: 'When there is a goal to chase, you keep going.' })
  assert.ok(one.ok && one.violations.some((v) => v.includes('write 2-3')))
  const stock = checkRing1SplitCard({ ...good, tradeoff: 'On the flip side, it can leave you tired.' })
  assert.ok(stock.ok && stock.violations.includes(STOCK_OPENER_NOTE))
  const two = checkRing1SplitCard({ ...good, tradeoff: 'It can tire you. It can also make you impatient.' })
  assert.ok(two.ok && two.violations.some((v) => v.includes('write one')))
})

test('split prompt: same prompt, body and tags swapped for the two fields', () => {
  const old = buildRing1Prompt('Achievement-Striving', 'Ambitious', 'high')
  const split = buildRing1PromptSplit('Achievement-Striving', 'Ambitious', 'high')
  assert.ok(old.includes('- body:') && old.includes('tags'))
  assert.ok(!split.includes('- body:') && !/\btags?\b/.test(split))
  assert.ok(split.includes('- shows_up:') && split.includes('- tradeoff:') && split.includes('"tradeoff": "..."'))
  // Everything before the "Write:" list is identical.
  assert.equal(split.split('Write:')[0], old.split('Write:')[0])
  // Works for every facet and direction (the replacements always match).
  for (const f of ['Depression', 'Liberalism', 'Vulnerability', 'Trust']) for (const d of ['low', 'mid', 'high'] as const) buildRing1PromptSplit(f, 'Word', d)
})
