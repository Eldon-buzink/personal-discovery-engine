import test from 'node:test'
import assert from 'node:assert/strict'
import { FACETS_NOT_DESCRIBED_PUBLICLY, allFacetReferences, getFacetReference, isDescribedPublicly } from './facetReference'
import { DOMAIN_FACETS, RING1_QUESTIONS } from './ring1-questions'
import { getTraitWord } from './scoring'

const allFacets = Object.keys(DOMAIN_FACETS).flatMap((d) => DOMAIN_FACETS[d].map((f) => ({ domain: d, facet: f })))

test('every facet in DOMAIN_FACETS has complete reference data and exactly 4 items', () => {
  assert.equal(allFacets.length, 30)
  for (const { domain, facet } of allFacets) {
    const ref = getFacetReference(facet)
    assert.ok(ref, facet)
    assert.equal(ref.domain, domain, facet)
    assert.ok(ref.label.length > 0, facet)
    assert.equal(ref.items.length, 4, facet)
    for (const item of ref.items) {
      assert.ok(item.text.length > 0 && typeof item.reverseScored === 'boolean', `${facet} item ${item.id}`)
    }
    for (const k of ['low', 'mid', 'high'] as const) assert.ok(ref.traitWords[k], `${facet} ${k}`)
    assert.ok(ref.checkIn.question.length > 0, facet)
    assert.deepEqual(ref.checkIn.options.map((o) => o.id), ['low', 'mid', 'high'], facet)
  }
  assert.equal(allFacetReferences().length, 30)
  // 30 facets x 4 items = all 120 questions, each used once.
  const ids = allFacetReferences().flatMap((r) => r.items.map((i) => i.id))
  assert.equal(new Set(ids).size, 120)
  assert.equal(RING1_QUESTIONS.length, 120)
})

test('the reference matches what the report uses', () => {
  const ref = getFacetReference('Modesty')!
  // Same words, at the same cut-offs, as getTraitWord.
  assert.equal(getTraitWord('Modesty', ref.thresholds.high), ref.traitWords.high)
  assert.equal(getTraitWord('Modesty', ref.thresholds.high - 0.01), ref.traitWords.mid)
  assert.equal(getTraitWord('Modesty', ref.thresholds.mid), ref.traitWords.mid)
  assert.equal(getTraitWord('Modesty', ref.thresholds.mid - 0.01), ref.traitWords.low)
  assert.deepEqual(ref.thresholds, { high: 3.5, mid: 2.5 })
  // Liberalism is shown as "Values".
  assert.equal(getFacetReference('Liberalism')!.label, 'Values')
  assert.equal(getFacetReference('Not a facet'), null)
})

test('Liberalism is not described publicly; every other facet is', () => {
  assert.deepEqual([...FACETS_NOT_DESCRIBED_PUBLICLY], ['Liberalism'])
  assert.equal(isDescribedPublicly('Liberalism'), false)
  assert.equal(allFacetReferences().filter((r) => !isDescribedPublicly(r.facetId)).length, 1)
})
