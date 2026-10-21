import test from 'node:test'
import assert from 'node:assert/strict'
import { EXAMPLE_BANDS, EXAMPLE_CARDS, exampleResponses } from './exampleReport'
import { computeFacetScore, getTraitWord, TRAIT_WORDS } from './scoring'
import { DOMAIN_FACETS } from './ring1-questions'

const bandOf = (score: number) => (score >= 3.5 ? 'high' : score >= 2.5 ? 'mid' : 'low')

test('covers the whole first ring: 30 facets, 120 answers, a card for each', () => {
  const facets = Object.values(DOMAIN_FACETS).flat()
  assert.deepEqual(Object.keys(EXAMPLE_BANDS).sort(), [...facets].sort())
  assert.deepEqual(Object.keys(EXAMPLE_CARDS).sort(), [...facets].sort())
  assert.equal(exampleResponses().size, 120)
})

test('the real scoring gives every facet its example band and trait word', () => {
  const responses = exampleResponses()
  for (const [facet, band] of Object.entries(EXAMPLE_BANDS)) {
    const score = computeFacetScore(facet, responses)
    assert.ok(score !== null, facet)
    assert.equal(bandOf(score!), band, facet)
    assert.equal(getTraitWord(facet, score!), TRAIT_WORDS[facet][band], facet)
  }
})

test('cards follow the copy rules: three tags, no dashes', () => {
  for (const [facet, card] of Object.entries(EXAMPLE_CARDS)) {
    assert.equal(card.tags.length, 3, facet)
    assert.doesNotMatch(`${card.trait_quote} ${card.body}`, /[–—]/, facet)
  }
})
