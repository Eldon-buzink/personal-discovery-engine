import test from 'node:test'
import assert from 'node:assert/strict'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { checkRing1Card, checkRing1CardText, finishRing1Card, ring1ContentsAfter, RING1_RETRY_WORDS } from './ring1Card'
import { HARD_SENTENCE_WORDS, SOFT_SENTENCE_WORDS } from './copyChecks'
import { UnlockedContent } from '../../components/known/ReportVisuals'
import type { PatternContent, PatternContentEntry } from './types'

const card = {
  trait_quote: 'Plans feel like a starting point to you, not a contract.',
  body: 'That tends to make you quick to adapt, and it can leave small loose ends.',
  tags: ['Adapts fast', 'Loose ends', 'Burst worker'],
}

// ── Hard rules: the attempt can't be used ───────────────────────────────────

const sentenceOf = (n: number) => Array.from({ length: n }, (_, i) => (i === 0 ? 'You' : 'word')).join(' ') + '.'

test('a well-formed card passes with no violations, trimmed', () => {
  const r = checkRing1Card({ ...card, trait_quote: `  ${card.trait_quote}  ` })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.card.trait_quote, card.trait_quote)
    assert.deepEqual(r.violations, [])
  }
})

test('hard: missing or empty fields, bad JSON', () => {
  assert.equal(checkRing1Card(null).ok, false)
  assert.equal(checkRing1Card({ ...card, trait_quote: '' }).ok, false)
  assert.equal(checkRing1Card({ trait_quote: card.trait_quote, tags: card.tags }).ok, false)
  assert.equal(checkRing1Card({ ...card, body: 42 }).ok, false)
  assert.equal(checkRing1CardText('Sure! Here is the card:').ok, false)
  assert.equal(checkRing1CardText(JSON.stringify(card)).ok, true)
})

test('hard: tags not exactly three, a tag over four words, an empty tag', () => {
  assert.equal(checkRing1Card({ ...card, tags: ['One', 'Two'] }).ok, false)
  assert.equal(checkRing1Card({ ...card, tags: ['One', 'Two', 'Three', 'Four'] }).ok, false)
  assert.equal(checkRing1Card({ ...card, tags: ['One', 'Two', 'one two three four five'] }).ok, false)
  assert.equal(checkRing1Card({ ...card, tags: ['One', 'Two', ' '] }).ok, false)
})

test(`hard: a sentence over ${HARD_SENTENCE_WORDS} words, or a labelled payoff/cost`, () => {
  assert.equal(checkRing1Card({ ...card, body: sentenceOf(HARD_SENTENCE_WORDS + 1) }).ok, false)
  assert.equal(checkRing1Card({ ...card, body: 'The cost is real. It shows at work.' }).ok, false)
  assert.equal(checkRing1Card({ ...card, body: 'You move fast, at the cost of some detail. It shows at work.' }).ok, true)
  assert.equal(checkRing1Card({ ...card, body: sentenceOf(HARD_SENTENCE_WORDS) }).ok, true)
})

// ── Soft rules: usable, retried with a note naming what failed ─────────────

test(`soft: a sentence over ${SOFT_SENTENCE_WORDS} words names the sentence and its length`, () => {
  const r = checkRing1Card({ ...card, body: `Short one. ${sentenceOf(31)}` })
  assert.equal(r.ok, true)
  if (r.ok) assert.deepEqual(r.violations, ['Sentence 3 is 31 words: split it.'])
  const atLimit = checkRing1Card({ ...card, body: sentenceOf(SOFT_SENTENCE_WORDS) })
  assert.equal(atLimit.ok && atLimit.violations.length, 0)
})

test('soft: a four-word tag names the tag', () => {
  const r = checkRing1Card({ ...card, tags: ['Adapts fast', 'Loose ends', 'X Y Z W'] })
  assert.equal(r.ok, true)
  if (r.ok) assert.deepEqual(r.violations, ["Tag 'X Y Z W' has 4 words: shorten to 3."])
})

test('soft: over the word limit says how long it is', () => {
  const body = Array.from({ length: 6 }, () => sentenceOf(16)).join(' ')
  const r = checkRing1Card({ ...card, body })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.ok(r.words > RING1_RETRY_WORDS)
    assert.deepEqual(r.violations, [`The quote and body are ${r.words} words together: cut to about 70.`])
  }
})

test('soft: an em-dash or semicolon asks for two sentences, and is fixed in code if it stays', () => {
  const r = checkRing1Card({ ...card, body: 'You adapt fast—that helps. It can leave loose ends; others notice.' })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.deepEqual(r.violations, ['Remove the em-dash/semicolon, use two sentences.'])
    assert.equal(finishRing1Card(r.card).body, 'You adapt fast, that helps. It can leave loose ends. Others notice.')
  }
})

// ── A failed card is never saved ─────────────────────────────────────────────

const branchEntry: PatternContentEntry = {
  facet: 'Energy', traitWord: 'Having a say', scoreDirection: 'high', branch: 'energy', content: { ...card },
}
const oldAnxiety: PatternContentEntry = {
  facet: 'Anxiety', traitWord: 'Alert', scoreDirection: 'mid', content: { ...card },
}

test('failure returns null: nothing to write, existing entries untouched', () => {
  const existing = [branchEntry]
  assert.equal(ring1ContentsAfter(existing, { facet: 'Anxiety', traitWord: 'Alert', scoreDirection: 'mid' }, null), null)
  assert.deepEqual(existing, [branchEntry])
})

test('success replaces only that facet\'s Ring 1 entry and keeps branch entries', () => {
  const next: PatternContent = { ...card, trait_quote: 'New quote.' }
  const out = ring1ContentsAfter([branchEntry, oldAnxiety], { facet: 'Anxiety', traitWord: 'Alert', scoreDirection: 'mid' }, next)!
  assert.equal(out.length, 2)
  assert.deepEqual(out[0], branchEntry)
  assert.equal(out[1].content.trait_quote, 'New quote.')
})

// ── Ring 1 card rendering: new and old cached content ───────────────────────

// tsx compiles the component's JSX with the classic runtime, which expects a
// global React (Next provides its own JSX transform at build time).
;(globalThis as unknown as { React: typeof React }).React = React

const render = (content: PatternContent, insight?: string) =>
  renderToStaticMarkup(createElement(UnlockedContent, { traitWord: 'Alert', content, hue: 20, source: null, variant: 'ring1', insight }))

test('new content renders quote, body and tags', () => {
  const html = render(card)
  assert.ok(html.includes('Plans feel like a starting point to you, not a contract.'))
  assert.ok(html.includes('quick to adapt'))
  for (const t of card.tags) assert.ok(html.includes(t))
  assert.ok(!html.includes('Go deeper') && !html.includes('Worth trying'))
  assert.ok(html.includes('How it tends to show up') && !html.includes('characteristics'))
})

test('old cached content (5 fields, no body) renders without Go deeper / Worth trying', () => {
  const old: PatternContent = {
    trait_quote: 'You sit with a decision longer than most.',
    where_it_shows_up: 'In meetings you wait for the room to settle.',
    tags: ['Considered', 'Patient', 'Thorough'],
    go_deeper: 'GO-DEEPER-TEXT',
    worth_trying: 'WORTH-TRYING-TEXT',
  }
  const html = render(old)
  assert.ok(html.includes('You sit with a decision longer than most.'))
  assert.ok(html.includes('In meetings you wait for the room to settle.'))
  assert.ok(!html.includes('GO-DEEPER-TEXT') && !html.includes('WORTH-TRYING-TEXT'))
  assert.ok(!html.includes('Go deeper') && !html.includes('Worth trying'))
})

test('the optional insight renders only when given', () => {
  assert.ok(render(card, 'An insight line.').includes('An insight line.'))
  const without = render(card)
  assert.equal(render(card, undefined), without)
  assert.equal(render(card, ''), without)
})
