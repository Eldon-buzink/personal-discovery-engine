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

test('excluded items (political 69, 71; religious 72) are never sent or used, but still count in the score', () => {
  assert.deepEqual([...RING1_EVIDENCE_EXCLUDED_ITEMS].sort((a, b) => a - b), [69, 71, 72])
  const lib = FACET_QUESTIONS.get('Liberalism')!
  const answers = new Map(lib.map((q) => [q.id, 5]))
  const asSent = lib.map((q) => ({ questionId: q.id, value: 5 }))

  // Browser payload: only item 70.
  assert.deepEqual(facetAnswers('Liberalism', answers).map((a) => a.questionId), [70])
  // Model prompt: never the excluded items, even if a request carries them.
  const evidence = evidenceFor('Liberalism', asSent)
  assert.deepEqual(evidence.map((e) => e.text), [QUESTION_BY_ID.get(70)!.text])
  for (const id of RING1_EVIDENCE_EXCLUDED_ITEMS) {
    assert.ok(!evidence.some((e) => e.text === QUESTION_BY_ID.get(id)!.text))
  }

  // Scoring: all four items, item 72 reverse-keyed. 5,5,5 plus (6 - 5) over 4.
  assert.equal(computeFacetScore('Liberalism', answers), (5 + 5 + 5 + 1) / 4)
  // Changing only item 72 moves the score, so it still counts.
  const changed = new Map(answers)
  changed.set(72, 1)
  assert.equal(computeFacetScore('Liberalism', changed), (5 + 5 + 5 + 5) / 4)
})
