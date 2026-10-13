import test from 'node:test'
import assert from 'node:assert/strict'
import { RING1_EVIDENCE_EXCLUDED_FACETS, evidenceFor, facetAnswers, strongestAnswers } from './ring1Evidence'
import { FACET_QUESTIONS } from './ring1-questions'

const anxiety = FACET_QUESTIONS.get('Anxiety')!

test('facetAnswers picks only that facet\'s answered items, as ids and values', () => {
  const map = new Map<number, number>([[anxiety[0].id, 5], [anxiety[2].id, 1], [999, 4]])
  assert.deepEqual(facetAnswers('Anxiety', map), [
    { questionId: anxiety[0].id, value: 5 },
    { questionId: anxiety[2].id, value: 1 },
  ])
  assert.deepEqual(facetAnswers('Not a facet', map), [])
})

test('strongestAnswers: the two most strongly held, real item text, agree/disagree from the raw answer', () => {
  const out = strongestAnswers([
    { questionId: anxiety[0].id, value: 4 },
    { questionId: anxiety[1].id, value: 1 },
    { questionId: anxiety[2].id, value: 5 },
    { questionId: anxiety[3].id, value: 3 },
  ])
  assert.deepEqual(out, [
    { text: anxiety[1].text, direction: 'disagree' },
    { text: anxiety[2].text, direction: 'agree' },
  ])
})

test('neutral answers are never used; ties go to the earlier item', () => {
  assert.deepEqual(strongestAnswers(anxiety.map((q) => ({ questionId: q.id, value: 3 }))), [])
  const tied = strongestAnswers(anxiety.map((q) => ({ questionId: q.id, value: 4 })))
  assert.deepEqual(tied.map((e) => e.text), [anxiety[0].text, anxiety[1].text])
})

test('excluded facets get no evidence: nothing sent from the browser, nothing used on the server', () => {
  assert.ok(RING1_EVIDENCE_EXCLUDED_FACETS.includes('Depression'))
  for (const facet of RING1_EVIDENCE_EXCLUDED_FACETS) {
    const items = FACET_QUESTIONS.get(facet)!
    const strong = items.map((q) => ({ questionId: q.id, value: 5 }))
    assert.deepEqual(facetAnswers(facet, new Map(strong.map((a) => [a.questionId, a.value]))), [])
    assert.deepEqual(evidenceFor(facet, strong), [])
  }
  // A facet that isn't excluded still gets its evidence.
  assert.equal(evidenceFor('Anxiety', anxiety.map((q) => ({ questionId: q.id, value: 5 }))).length, 2)
})
