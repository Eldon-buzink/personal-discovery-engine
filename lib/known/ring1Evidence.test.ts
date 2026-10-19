import test from 'node:test'
import assert from 'node:assert/strict'
import { RING1_EVIDENCE_EXCLUDED_FACETS, RING1_EVIDENCE_EXCLUDED_ITEMS, evidenceFor, facetAnswers, strongestAnswers } from './ring1Evidence'
import { FACET_QUESTIONS, QUESTION_BY_ID } from './ring1-questions'
import { computeFacetScore } from './scoring'

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

test('every excluded item is never sent or used, and still counts in its facet score', () => {
  assert.deepEqual([...RING1_EVIDENCE_EXCLUDED_ITEMS].sort((a, b) => a - b), [18, 19, 20, 44, 69, 71, 72, 77, 80])
  for (const id of RING1_EVIDENCE_EXCLUDED_ITEMS) {
    const item = QUESTION_BY_ID.get(id)!
    const items = FACET_QUESTIONS.get(item.facet)!
    // Every item answered 5, so each one is as strong as it can be.
    const answers = new Map(items.map((q) => [q.id, 5]))
    const asSent = items.map((q) => ({ questionId: q.id, value: 5 }))

    // Browser payload and model evidence: never this item.
    assert.ok(!facetAnswers(item.facet, answers).some((a) => a.questionId === id), `payload ${id}`)
    assert.ok(!evidenceFor(item.facet, asSent).some((e) => e.text === item.text), `evidence ${id}`)

    // Score: the plain four-item average, reverse-keyed items as 6 - answer.
    const expected = items.reduce((sum, q) => sum + (q.reverseScored ? 1 : 5), 0) / 4
    assert.equal(computeFacetScore(item.facet, answers), expected, `score ${id}`)
    // Changing only this item moves the score by its share, so it still counts.
    const changed = new Map(answers)
    changed.set(id, 1)
    assert.equal(computeFacetScore(item.facet, changed), expected + (item.reverseScored ? 4 : -4) / 4, `counts ${id}`)
  }
})

test('facets left with one or no evidence items still work', () => {
  const strong = (facet: string) => FACET_QUESTIONS.get(facet)!.map((q) => ({ questionId: q.id, value: 5 }))
  // Liberalism and Immoderation keep a single item; Depression none.
  assert.deepEqual(evidenceFor('Liberalism', strong('Liberalism')).map((e) => e.text), [QUESTION_BY_ID.get(70)!.text])
  assert.deepEqual(evidenceFor('Immoderation', strong('Immoderation')).map((e) => e.text), [QUESTION_BY_ID.get(17)!.text])
  assert.deepEqual(evidenceFor('Depression', strong('Depression')), [])
  // A neutral answer on the one remaining item leaves none.
  const neutral = strong('Immoderation').map((a) => (a.questionId === 17 ? { ...a, value: 3 } : a))
  assert.deepEqual(evidenceFor('Immoderation', neutral), [])
})
