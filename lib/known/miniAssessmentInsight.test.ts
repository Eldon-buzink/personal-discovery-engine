import test from 'node:test'
import assert from 'node:assert/strict'
import { computeMiniAssessmentInsight, formatMiniAssessmentInsight } from './miniAssessmentInsight'
import { MINI_ASSESSMENT_ITEMS } from './miniAssessmentScoring'

const SD = MINI_ASSESSMENT_ITEMS['Self-Discipline']
const VALUES = MINI_ASSESSMENT_ITEMS.Liberalism

test('all-neutral responses fall back to none', () => {
  const insight = computeMiniAssessmentInsight('Self-Discipline', [3, 3, 3, 3, 3, 3], 'mid')
  assert.deepEqual(insight, { type: 'none' })
  assert.equal(formatMiniAssessmentInsight(insight), null)
})

test('wrong response count falls back to none', () => {
  const insight = computeMiniAssessmentInsight('Self-Discipline', [3, 3], 'mid')
  assert.deepEqual(insight, { type: 'none' })
})

test('single strong straight-item agreement, everything else neutral', () => {
  // Item 1 (index 0) is straight-keyed; strongly agreeing with it should
  // surface as a plain agreement, not tension (nothing else is non-neutral).
  // Mean 20/6 = 3.33 -> mid band.
  const responses = [5, 3, 3, 3, 3, 3]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses, 'mid')
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
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses, 'mid')
  const formatted = formatMiniAssessmentInsight(insight)
  assert.ok(formatted!.endsWith('”.'))
  assert.ok(!formatted!.includes('.”.'))
})

test('single strong reverse-item disagreement reports the raw direction, not the adjusted one', () => {
  // Item 3 (index 2) "I have a hard time making myself do things I don't
  // feel like doing" is reverse-keyed. Strongly DISAGREEing with it (raw
  // response 1) is a high-discipline signal, but the quoted sentence must
  // still say "disagree" because that's what the person actually did with
  // that statement's own wording. Mean 20/6 = 3.33 -> mid band.
  const responses = [3, 3, 1, 3, 3, 3]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses, 'mid')
  assert.deepEqual(insight, { type: 'agreement', itemText: SD[2].text, direction: 'disagree' })
})

test('a tie between two equal-strength items in the same direction resolves to the earlier item, not a fabricated unique pick', () => {
  // Mean 22/6 = 3.667 -> exactly the high boundary -> high band. No item
  // sits below neutral, so bestLow never exists and tension can't fire
  // regardless of band.
  const responses = [5, 5, 3, 3, 3, 3]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses, 'high')
  assert.deepEqual(insight, { type: 'agreement', itemText: SD[0].text, direction: 'agree' })
})

test('tension: genuine mid split, matching the Values worked example', () => {
  // Item 3 (index 2, straight) "I often reconsider beliefs I was raised
  // with" agreed strongly (adjusted high / progressive-leaning).
  // Item 6 (index 5, reverse) "I feel loyalty to the values I was taught..."
  // also agreed strongly (adjusted low / traditional-leaning).
  // Mean 18/6 = 3.0 -> mid band: a real mid split is tension on its own,
  // no extreme-minority requirement.
  const responses = [3, 3, 5, 3, 3, 5]
  const insight = computeMiniAssessmentInsight('Liberalism', responses, 'mid')
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
  // themselves across reverse-keyed pairs. Mean 22/6 = 3.667 -> high band,
  // but the minority (reverse) side still has 2 full-strength items, which
  // clears the low/high band's stricter bar.
  const responses = [5, 5, 5, 5, 5, 5]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses, 'high')
  assert.equal(insight.type, 'tension')
  if (insight.type === 'tension') {
    assert.equal(insight.high.direction, 'agree')
    assert.equal(insight.low.direction, 'agree')
    assert.equal(insight.high.itemText, SD[0].text) // first straight item, index 0
    assert.equal(insight.low.itemText, SD[2].text) // first reverse item, index 2
  }
})

test('extreme uniform answers (all strongly disagree) also surface tension', () => {
  // Mean 14/6 = 2.333, exactly the low boundary -> mid band (not low) per
  // bandForScore's strict '<' comparison.
  const responses = [1, 1, 1, 1, 1, 1]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses, 'mid')
  assert.equal(insight.type, 'tension')
  if (insight.type === 'tension') {
    // Straight items disagreed -> adjusted low; reverse items disagreed -> adjusted high.
    assert.equal(insight.high.direction, 'disagree')
    assert.equal(insight.low.direction, 'disagree')
    assert.equal(insight.high.itemText, SD[2].text) // first reverse item, now high-leaning
    assert.equal(insight.low.itemText, SD[0].text) // first straight item, now low-leaning
  }
})

test('mild non-neutral answers on both sides of a mid result still count as tension', () => {
  // Mean 18/6 = 3.0 -> mid band. Neither side is "extreme" (response 1 or
  // 5), but mid band doesn't require that — any genuinely-held (strength
  // >= 1) answer on each side is a real split.
  const responses = [4, 3, 3, 3, 3, 2]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses, 'mid')
  assert.equal(insight.type, 'tension')
})

test('a consistent high result with one MILD opposing answer is NOT tension', () => {
  // Round 4 feedback case: 5 strongly-high-discipline answers plus one
  // mildly-opposing answer (response 2, strength 1 — not extreme) must not
  // read as a contradiction. Mean 27/6 = 4.5 -> high band. The opposing
  // side has zero full-strength (response 1 or 5) items, so it never
  // clears the low/high band's 2-item minority bar.
  const responses = [5, 5, 1, 5, 1, 2]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses, 'high')
  assert.deepEqual(insight, { type: 'agreement', itemText: SD[0].text, direction: 'agree' })
})

test('a consistent high result with two strongly-worded opposing answers IS tension', () => {
  // idx0,1,3 straight/agree and idx2 reverse/disagree all push high
  // (4 full-strength high items); idx4 reverse/agree and idx5 straight/
  // disagree both push low (2 full-strength low items) — mean 22/6 = 3.667,
  // exactly the high boundary. The low side has 2 items, clearing the
  // minority bar, so this reads as a genuine (if minority) contradiction
  // rather than getting smoothed over just because the overall band is
  // 'high'.
  const responses = [5, 5, 1, 5, 5, 1]
  const insight = computeMiniAssessmentInsight('Self-Discipline', responses, 'high')
  assert.deepEqual(insight, {
    type: 'tension',
    high: { itemText: SD[0].text, direction: 'agree' },
    low: { itemText: SD[4].text, direction: 'agree' },
  })
})
