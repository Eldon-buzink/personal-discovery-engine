import test from 'node:test'
import assert from 'node:assert/strict'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  checkRing1Card, checkRing1CardText, hasLongSentence, pickBetterCard, ring1CardWords, ring1ContentsAfter, ring1Sentences,
  RING1_MAX_SENTENCE_WORDS, RING1_RETRY_WORDS,
} from './ring1Card'
import { UnlockedContent } from '../../components/known/ReportVisuals'
import type { PatternContent, PatternContentEntry } from './types'

const card = {
  trait_quote: 'Plans feel like a starting point to you, not a contract.',
  body: 'That tends to make you quick to adapt, and it can leave small loose ends.',
  tags: ['Adapts fast', 'Loose ends', 'Burst worker'],
}

// ── Schema validation ────────────────────────────────────────────────────────

test('a well-formed card passes, trimmed, within budget', () => {
  const r = checkRing1Card({ ...card, trait_quote: `  ${card.trait_quote}  ` })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.card.trait_quote, card.trait_quote)
    assert.equal(r.overBudget, false)
  }
})

test('missing or empty fields fail', () => {
  assert.equal(checkRing1Card(null).ok, false)
  assert.equal(checkRing1Card({ ...card, trait_quote: '' }).ok, false)
  assert.equal(checkRing1Card({ trait_quote: card.trait_quote, tags: card.tags }).ok, false)
  assert.equal(checkRing1Card({ ...card, body: 42 }).ok, false)
})

test('structured-output text: valid JSON is checked, anything else fails', () => {
  assert.equal(checkRing1CardText(JSON.stringify(card)).ok, true)
  assert.equal(checkRing1CardText('').ok, false)
  assert.equal(checkRing1CardText('Sure! Here is the card:').ok, false)
})

test('tags must be exactly three, each at most three words', () => {
  assert.equal(checkRing1Card({ ...card, tags: ['One', 'Two'] }).ok, false)
  assert.equal(checkRing1Card({ ...card, tags: ['One', 'Two', 'Three', 'Four'] }).ok, false)
  assert.equal(checkRing1Card({ ...card, tags: ['One', 'Two', 'far too many words here'] }).ok, false)
  assert.equal(checkRing1Card({ ...card, tags: ['One', 'Two', ' '] }).ok, false)
})

test('over the word budget is valid but flagged for a retry', () => {
  const long = Array.from({ length: RING1_RETRY_WORDS }, () => 'word').join(' ')
  const r = checkRing1Card({ ...card, body: long })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.overBudget, true)
    assert.ok(ring1CardWords(r.card) > RING1_RETRY_WORDS)
  }
})

// ── Readability: long sentences ─────────────────────────────────────────────

const longSentence = Array.from({ length: RING1_MAX_SENTENCE_WORDS + 1 }, (_, i) => (i === 0 ? 'You' : 'word')).join(' ') + '.'

test('sentences are split on . ! ? across quote and body', () => {
  assert.deepEqual(ring1Sentences({ trait_quote: 'One here. Two here!', body: 'Three here? Four.' }), ['One here.', 'Two here!', 'Three here?', 'Four.'])
})

test('a sentence over the limit marks the card tooLong; at the limit it does not', () => {
  const atLimit = Array.from({ length: RING1_MAX_SENTENCE_WORDS }, () => 'word').join(' ') + '.'
  assert.equal(hasLongSentence({ trait_quote: atLimit, body: 'Short.' }), false)
  assert.equal(hasLongSentence({ trait_quote: 'Short.', body: longSentence }), true)
  const r = checkRing1Card({ ...card, body: longSentence })
  assert.equal(r.ok && r.tooLong, true)
  const fine = checkRing1Card(card)
  assert.equal(fine.ok && fine.tooLong, false)
})

test('pickBetterCard prefers no long sentence, then fewer words', () => {
  const long = { ...card, body: longSentence }
  const longer = { ...card, body: card.body + ' And one more short sentence here.' }
  // A card with a long sentence loses to one without, whatever the word counts.
  assert.equal(pickBetterCard(long, longer), longer)
  assert.equal(pickBetterCard(longer, long), longer)
  // Neither has a long sentence: fewer words wins; a tie keeps the first.
  assert.equal(pickBetterCard(longer, card), card)
  assert.equal(pickBetterCard(card, { ...card }), card)
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
