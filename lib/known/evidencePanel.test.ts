import test from 'node:test'
import assert from 'node:assert/strict'
import { answersHeading, evidencePanelData, evidenceTriggerShown, itemCountLine } from './evidencePanel'
import { FACET_QUESTIONS, QUESTION_BY_ID } from './ring1-questions'
import { evidenceFor, facetAnswers } from './ring1Evidence'
import { facetTraitWords } from './scoring'

const mapOf = (facet: string, values: number[]) =>
  new Map(FACET_QUESTIONS.get(facet)!.map((q, i) => [q.id, values[i]] as [number, number]))

test('the answers are exactly the ones the model received', () => {
  for (const facet of ['Anxiety', 'Modesty', 'Trust', 'Liberalism', 'Immoderation']) {
    const responses = mapOf(facet, [5, 2, 4, 1])
    const panel = evidencePanelData(facet, 'high', responses, true)!
    const sent = evidenceFor(facet, facetAnswers(facet, responses))
    assert.deepEqual(panel.answers!.map((a) => a.text), sent.map((e) => e.text), facet)
  }
})

test('strongest first, neutral never, ties to the earlier statement', () => {
  const items = FACET_QUESTIONS.get('Anxiety')!
  // strengths: 1, 2, 0 (neutral), 2 → the two 2s, earlier one first
  const panel = evidencePanelData('Anxiety', 'high', mapOf('Anxiety', [4, 1, 3, 5]), true)!
  assert.deepEqual(panel.answers, [
    { text: items[1].text, answer: 'You disagreed' },
    { text: items[3].text, answer: 'You agreed' },
  ])
  // All neutral: no answers, but the part still exists (empty list).
  assert.deepEqual(evidencePanelData('Anxiety', 'mid', mapOf('Anxiety', [3, 3, 3, 3]), true)!.answers, [])
})

test('reverse-keyed statements: agree/disagree is the raw answer, not the scored one', () => {
  // Modesty item 92 "Believe I am better than others." is reverse-keyed.
  const modesty = FACET_QUESTIONS.get('Modesty')!
  const rev = modesty.find((q) => q.reverseScored)!
  assert.equal(rev.id, 92)
  const responses = new Map(modesty.map((q) => [q.id, q.reverseScored ? 5 : 3] as [number, number]))
  const panel = evidencePanelData('Modesty', 'low', responses, true)!
  // Answered 5 on "Believe I am better than others." → "You agreed" (raw),
  // even though it counts toward the low end once reverse-scored.
  assert.deepEqual(panel.answers, [{ text: rev.text, answer: 'You agreed' }])
})

test('sensitive facets and excluded statements never show answers', () => {
  const dep = evidencePanelData('Depression', 'high', mapOf('Depression', [5, 5, 5, 5]), true)!
  assert.equal(dep.answers, null)
  assert.equal(dep.itemCount, 4)
  // Liberalism: the political (69, 71) and religious (72) items never appear.
  const lib = evidencePanelData('Liberalism', 'high', mapOf('Liberalism', [5, 5, 5, 1]), true)!
  for (const a of lib.answers!) {
    assert.ok(![69, 71, 72].some((id) => QUESTION_BY_ID.get(id)!.text === a.text), a.text)
  }
})

test('older cards (written before answers were sent) show no answers', () => {
  assert.equal(evidencePanelData('Anxiety', 'high', mapOf('Anxiety', [5, 5, 5, 5]), false)!.answers, null)
})

test('spectrum words, sentence and the meta line come from the code', () => {
  const w = facetTraitWords('Anxiety')!
  const hi = evidencePanelData('Anxiety', 'high', mapOf('Anxiety', [5, 5, 5, 5]), true)!
  assert.deepEqual(hi.words, w)
  assert.equal(hi.sentence, `You lean toward ${w.high}`)
  assert.equal(evidencePanelData('Anxiety', 'low', mapOf('Anxiety', [1, 1, 1, 1]), true)!.sentence, `You lean toward ${w.low}`)
  assert.equal(evidencePanelData('Anxiety', 'mid', mapOf('Anxiety', [3, 3, 3, 3]), true)!.sentence, 'You land near the middle')
  assert.equal(itemCountLine(hi.itemCount), 'This comes from 4 statements in the assessment. It describes a tendency, not a diagnosis.')
  assert.equal(answersHeading(2), 'Two of your answers on this pattern')
  assert.equal(answersHeading(1), 'One of your answers on this pattern')
  assert.equal(evidencePanelData('Not a facet', 'high', new Map(), true), null)
})

test('slight answers (2 and 4) count, and read like any other agree/disagree', () => {
  const items = FACET_QUESTIONS.get('Anxiety')!
  const panel = evidencePanelData('Anxiety', 'mid', mapOf('Anxiety', [4, 3, 2, 3]), true)!
  assert.deepEqual(panel.answers, [
    { text: items[0].text, answer: 'You agreed' },
    { text: items[2].text, answer: 'You disagreed' },
  ])
})

test('trigger: sensitive facets yes (title and count only), otherwise only with answers', () => {
  assert.equal(evidenceTriggerShown(null), false)
  const dep = evidencePanelData('Depression', 'high', mapOf('Depression', [5, 5, 5, 5]), true)!
  assert.equal(dep.sensitive, true)
  assert.equal(evidenceTriggerShown(dep), true)
  assert.equal(evidenceTriggerShown(evidencePanelData('Anxiety', 'high', mapOf('Anxiety', [5, 5, 5, 5]), false)), false)
  assert.equal(evidenceTriggerShown(evidencePanelData('Anxiety', 'mid', mapOf('Anxiety', [3, 3, 3, 3]), true)), false)
  const one = evidencePanelData('Anxiety', 'mid', mapOf('Anxiety', [3, 3, 4, 3]), true)!
  assert.equal(one.sensitive, false)
  assert.equal(evidenceTriggerShown(one), true)
})
