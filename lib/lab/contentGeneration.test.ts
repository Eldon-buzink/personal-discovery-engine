import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildClusterPrompt, buildSummaryPrompt, checkClusterReading, checkSummary, cleanInput, type ContentTrait } from './contentGeneration'

const T = (facet: string, word: string, direction: 'low' | 'mid' | 'high', cluster: string): ContentTrait => ({ facet, word, direction, cluster, headline: `${word} line.` })
const input = [
  T('Assertiveness', 'Take-charge', 'high', 'Extraversion'),
  T('Activity Level', 'Energized', 'high', 'Extraversion'),
  T('Achievement-Striving', 'Ambitious', 'high', 'Conscientiousness'),
  T('Self-Discipline', 'Fluid', 'low', 'Conscientiousness'),
  T('Cautiousness', 'Deliberate', 'mid', 'Conscientiousness'),
]
const tension = { facets: ['Achievement-Striving', 'Self-Discipline'] as [string, string], words: ['Ambitious', 'Fluid'] as [string, string] }
const S = (text: string, ...draws_on: string[]) => ({ text, draws_on })

test('cleanInput drops mismatched words, excluded facets and repeats', () => {
  const dirty = [...input, T('Assertiveness', 'Take-charge', 'high', 'Extraversion'), T('Depression', 'Light', 'low', 'Neuroticism'), T('Trust', 'Wrong', 'mid', 'Agreeableness')]
  assert.deepEqual(cleanInput(dirty).map((t) => t.facet), input.map((t) => t.facet))
})

test('prompts never carry facet or domain names, and mark middle traits', () => {
  const s = buildSummaryPrompt(input, [tension], (c) => ({ Extraversion: 'Social energy', Conscientiousness: 'Drive and discipline' } as Record<string, string>)[c] ?? c)
  const c = buildClusterPrompt('Drive and discipline', 'How hard you push toward goals.', input.slice(2), tension)
  for (const p of [s, c]) assert.ok(!/Assertiveness|Achievement-Striving|Self-Discipline|Extraversion|Conscientiousness/.test(p), p)
  assert.ok(s.includes('Deliberate (near the middle)') && s.includes('Take-charge (leans clearly)'))
})

const good = {
  headline: S('You take the lead and keep a full, fast day.', 'Take-charge', 'Energized'),
  sentences: [
    S('You step in when a group needs direction.', 'Take-charge'),
    S('You like your days busy.', 'Energized'),
    S('Your high bar and slow starts pull in different directions.', 'Ambitious', 'Fluid'),
  ],
  pointer: { word: 'Ambitious', phrase: 'Your high bar and slow starts pull in different directions' },
}
const sum = (o: unknown) => checkSummary(JSON.stringify(o), input, [tension])

test('a clean traced summary passes; draws_on maps to facets', () => {
  const c = sum(good)
  assert.ok(c.ok, JSON.stringify(c))
  if (c.ok) { assert.deepEqual(c.drawsOn, ['Assertiveness', 'Activity Level', 'Achievement-Striving', 'Self-Discipline']); assert.equal(c.pointer?.facet, 'Achievement-Striving'); assert.equal(c.violations.length, 0) }
})

test('a sentence with no source, or naming an unlisted trait, is rejected', () => {
  assert.equal(sum({ ...good, sentences: [...good.sentences, S('You are good to know.')] }).ok, false)
  assert.equal(sum({ ...good, sentences: [S('You are Energized and quick.', 'Take-charge'), ...good.sentences.slice(1)] }).ok, false)
  assert.equal(sum({ ...good, sentences: [S('You trust people.', 'Trusting'), ...good.sentences.slice(1)] }).ok, false)
})

test('combining and contrast connectors only for a fired same-cluster pair', () => {
  const bad = (text: string, ...w: string[]) => sum({ ...good, sentences: [S(text, ...w), ...good.sentences.slice(1)] })
  assert.equal(bad('You lead, yet you like full days.', 'Take-charge', 'Energized').ok, false)
  assert.equal(bad('Together, leading and pace make you quick.', 'Take-charge', 'Energized').ok, false)
  assert.equal(bad('You lead, so people follow.', 'Take-charge').ok, false)
  assert.ok(bad('You set a high bar, but starting waits for the mood.', 'Ambitious', 'Fluid').ok)
  assert.ok(bad('You know what you lead well, and you are comfortable saying so.', 'Take-charge').ok)
  assert.equal(bad('You lead so you get things done.', 'Take-charge').ok, false)
})

test('never built around middle traits', () => {
  assert.equal(sum({ ...good, headline: S('You think before you act.', 'Deliberate') }).ok, false)
  assert.equal(sum({ ...good, sentences: [S('You think first.', 'Deliberate'), S('You weigh things.', 'Deliberate'), S('You lead.', 'Take-charge')] }).ok, false)
})

test('the forbidden claims are still rejected', () => {
  const bad = (text: string) => sum({ ...good, sentences: [S(text, 'Take-charge'), ...good.sentences.slice(1)] })
  for (const t of ['Your Extraversion shows when you lead.', 'You score high when you lead.', 'You should lead more.', 'Leading is why you get things done.', 'You lead — fast.', "It's not bossiness, it's leading."]) assert.equal(bad(t).ok, false, t)
})

test('sentence and word counts are retry notes, not rejections', () => {
  const four = sum({ ...good, sentences: [...good.sentences, S('You move fast.', 'Energized'), S('You step up first.', 'Take-charge')] })
  assert.ok(four.ok && four.violations.some((v) => v.includes('sentences')))
})

test('cluster reading checks', () => {
  const cl = input.slice(2)
  const ok = checkClusterReading(JSON.stringify({ sentences: [S('You set a high bar.', 'Ambitious'), S('Starting often waits for a push.', 'Fluid')] }), cl, [tension])
  assert.ok(ok.ok && ok.violations.length === 0, JSON.stringify(ok))
  const one = checkClusterReading(JSON.stringify({ sentences: [S('You set a high bar.', 'Ambitious')] }), cl, [tension])
  assert.ok(one.ok && one.violations.length > 0)
  assert.equal(checkClusterReading(JSON.stringify({ sentences: [S('Together, that makes you easy to read.', 'Ambitious', 'Deliberate'), S('You set a bar.', 'Ambitious')] }), cl, [tension]).ok, false)
  const middleFirst = checkClusterReading(JSON.stringify({ sentences: [S('You think first.', 'Deliberate'), S('You set a high bar.', 'Ambitious')] }), cl, [tension])
  assert.ok(middleFirst.ok && middleFirst.violations.includes('Lead with a trait that leans clearly.'))
})
