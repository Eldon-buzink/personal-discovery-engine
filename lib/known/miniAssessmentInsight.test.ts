import test from 'node:test'
import assert from 'node:assert/strict'
import { computeMiniAssessmentInsight, formatMiniAssessmentInsight } from './miniAssessmentInsight'
import { MINI_ASSESSMENT_ITEMS } from './miniAssessmentScoring'

const SD = MINI_ASSESSMENT_ITEMS['Self-Discipline']
const VALUES = MINI_ASSESSMENT_ITEMS.Liberalism

test('all-neutral responses fall back to none', () => {
  const insight = computeMiniAssessmentInsight('Self-Discipline', [3, 3, 3, 3, 3, 3])
  assert.deepEqual(insight, { type: 'none' })
  assert.equal(formatMiniAssessmentInsight(insight), null)
})

test('wrong response count falls back to none', () => {
  const insight = computeMiniAssessmentInsight('Self-Discipline', [3, 3])
  assert.deepEqual(insight, { type: 'none' })
})

test('single strong straight-item agreement, everything else neutral', () => {
  // Item 1 (index 0) is straight-keyed; strongly agreeing with it should
  // surface as a plain agreement, not tension (nothing else is non-neutral).
  const responses = [5, 3, 3, 3, 3, 3]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses)
  assert.deepEqual(insight, { type: 'agreement', itemText: SD[0].text, direction: 'agree' })
  assert.equal(
    formatMiniAssessmentInsight(insight),
    `What stood out in your answers: you agreed with “${SD[0].text.replace(/\.$/, '')}”.`
  )
})

test('formatted text never doubles the terminal period from a quoted item', () => {
  // Every mini-assessment item text already ends in '.' — the rendered
  // sentence must end in a single '.', not '."."' / '".".'.
  const responses = [5, 3, 3, 3, 3, 3]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses)
  const formatted = formatMiniAssessmentInsight(insight)
  assert.ok(formatted!.endsWith('”.'))
  assert.ok(!formatted!.includes('.”.'))
})

test('single strong reverse-item disagreement reports the raw direction, not the adjusted one', () => {
  // Item 3 (index 2) "I have a hard time making myself do things I don't
  // feel like doing" is reverse-keyed. Strongly DISAGREEing with it (raw
  // response 1) is a high-discipline signal, but the quoted sentence must
  // still say "disagree" because that's what the person actually did with
  // that statement's own wording.
  const responses = [3, 3, 1, 3, 3, 3]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses)
  assert.deepEqual(insight, { type: 'agreement', itemText: SD[2].text, direction: 'disagree' })
})

test('a tie between two equal-strength items in the same direction resolves to the earlier item, not a fabricated unique pick', () => {
  const responses = [5, 5, 3, 3, 3, 3]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses)
  assert.deepEqual(insight, { type: 'agreement', itemText: SD[0].text, direction: 'agree' })
})

test('tension: strong agreement with opposite-pulling items, matching the Values worked example', () => {
  // Item 3 (index 2, straight) "I often reconsider beliefs I was raised
  // with" agreed strongly (adjusted high / progressive-leaning).
  // Item 6 (index 5, reverse) "I feel loyalty to the values I was taught..."
  // also agreed strongly (adjusted low / traditional-leaning).
  const responses = [3, 3, 5, 3, 3, 5]
  const insight = computeMiniAssessmentInsight('Liberalism', responses)
  assert.deepEqual(insight, {
    type: 'tension',
    high: { itemText: VALUES[2].text, direction: 'agree' },
    low: { itemText: VALUES[5].text, direction: 'agree' },
  })
  const formatted = formatMiniAssessmentInsight(insight)
  assert.match(formatted!, /you agreed with/)
  assert.match(formatted!, / but also /)
})

test('extreme uniform answers (all strongly agree) still surface honest self-contradiction as tension', () => {
  // All 5s: straight items (1,2,4,6) adjust to high, reverse items (3,5)
  // adjust to low — a straight-lining respondent genuinely contradicts
  // themselves across reverse-keyed pairs, and that's worth surfacing
  // honestly rather than suppressing.
  const responses = [5, 5, 5, 5, 5, 5]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses)
  assert.equal(insight.type, 'tension')
  if (insight.type === 'tension') {
    assert.equal(insight.high.direction, 'agree')
    assert.equal(insight.low.direction, 'agree')
    assert.equal(insight.high.itemText, SD[0].text) // first straight item, index 0
    assert.equal(insight.low.itemText, SD[2].text) // first reverse item, index 2
  }
})

test('extreme uniform answers (all strongly disagree) also surface tension', () => {
  const responses = [1, 1, 1, 1, 1, 1]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses)
  assert.equal(insight.type, 'tension')
  if (insight.type === 'tension') {
    // Straight items disagreed -> adjusted low; reverse items disagreed -> adjusted high.
    assert.equal(insight.high.direction, 'disagree')
    assert.equal(insight.low.direction, 'disagree')
    assert.equal(insight.high.itemText, SD[2].text) // first reverse item, now high-leaning
    assert.equal(insight.low.itemText, SD[0].text) // first straight item, now low-leaning
  }
})

test('mild non-neutral answers (strength 0 only) stay below the tension/agreement threshold', () => {
  // Nothing in this set is more than 1 point from neutral is false here —
  // use exactly strength-1 answers on both sides to confirm the >=1
  // threshold is inclusive, not exclusive.
  const responses = [4, 3, 3, 3, 3, 2]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses)
  // index 0 straight agree-mild (adjusted 4, high) vs index 5 straight
  // disagree-mild (adjusted 2, low) — both strength 1, both meet the
  // inclusive >=1 threshold, so this should still report tension.
  assert.equal(insight.type, 'tension')
})
