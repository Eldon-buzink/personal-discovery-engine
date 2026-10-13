import test from 'node:test'
import assert from 'node:assert/strict'
import { checkInsight, checkInsightText } from './relationshipInsight'

const good = "You tend to decide based on what you need, and you're fine being the one who disagrees. People usually know where you stand. It can also mean your answer isn't the popular one. Which of your choices is worth that friction?"

test('a good insight passes, whitespace normalised', () => {
  const r = checkInsight({ insight: `  ${good}\n` })
  assert.equal(r.ok, true)
  if (r.ok) assert.equal(r.insight, good)
})

test('must end in exactly one question', () => {
  assert.equal(checkInsight({ insight: 'You tend to plan ahead. That keeps things steady.' }).ok, false)
  assert.equal(checkInsight({ insight: 'Do you plan ahead? That keeps things steady. What does it cost you?' }).ok, false)
})

test('no instructions from the banned list', () => {
  for (const bad of ['Try to notice it.', 'You should rest.', 'Consider the trade.', 'Make sure you pause.', 'Remember to breathe.']) {
    assert.equal(checkInsight({ insight: `You tend to plan ahead. ${bad} What gets in the way?` }).ok, false, bad)
  }
  // Substrings inside other words are fine.
  assert.equal(checkInsight({ insight: 'You tend to stay trying-free and entry-level calm. That keeps things steady. What gets in the way?' }).ok, true)
})

test('no sentence over 24 words, no labelled payoff/cost, sane length', () => {
  const long = Array.from({ length: 25 }, () => 'word').join(' ') + '.'
  assert.equal(checkInsight({ insight: `${long} What gets in the way?` }).ok, false)
  assert.equal(checkInsight({ insight: 'The cost is real. You tend to plan. What gets in the way?' }).ok, false)
  assert.equal(checkInsight({ insight: 'What gets in the way?' }).ok, false)
})

test('JSON text in, anything else fails', () => {
  assert.equal(checkInsightText(JSON.stringify({ insight: good })).ok, true)
  assert.equal(checkInsightText('Here you go').ok, false)
})
