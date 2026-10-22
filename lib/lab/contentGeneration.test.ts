import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildClusterPrompt, buildSummaryPrompt, checkClusterReading, checkSummary, cleanInput, type ContentTrait } from './contentGeneration'

const T = (facet: string, word: string, direction: 'low' | 'mid' | 'high', cluster: string): ContentTrait => ({ facet, word, direction, cluster, headline: `${word} line.` })
const input = [
  T('Assertiveness', 'Take-charge', 'high', 'Extraversion'),
  T('Activity Level', 'Energized', 'high', 'Extraversion'),
  T('Achievement-Striving', 'Ambitious', 'high', 'Conscientiousness'),
  T('Self-Discipline', 'Fluid', 'low', 'Conscientiousness'),
]
const tension = { facets: ['Achievement-Striving', 'Self-Discipline'] as [string, string], words: ['Ambitious', 'Fluid'] as [string, string] }

test('cleanInput drops mismatched words, excluded facets and repeats', () => {
  const dirty = [...input, T('Assertiveness', 'Take-charge', 'high', 'Extraversion'), T('Depression', 'Light', 'low', 'Neuroticism'), T('Trust', 'Wrong', 'mid', 'Agreeableness')]
  assert.deepEqual(cleanInput(dirty).map((t) => t.facet), input.map((t) => t.facet))
})

test('prompts never carry facet or domain names', () => {
  const s = buildSummaryPrompt(input, [tension], (c) => ({ Extraversion: 'Social energy', Conscientiousness: 'Drive and discipline' } as Record<string, string>)[c] ?? c)
  const c = buildClusterPrompt('Drive and discipline', 'How hard you push toward goals.', input.slice(2), tension)
  for (const p of [s, c]) assert.ok(!/Assertiveness|Achievement-Striving|Self-Discipline|Extraversion|Conscientiousness/.test(p), p)
})

const good = {
  headline: 'You take the lead and keep a full, fast day.',
  text: 'You step in when a group needs direction. You like your days busy. You also set big goals, and you tend to start tasks in bursts.',
  pointer: { word: 'Ambitious', phrase: 'set big goals' },
  draws_on: ['Take-charge', 'Energized', 'Ambitious', 'Fluid'],
}

test('a clean summary passes and maps draws_on to facets', () => {
  const c = checkSummary(JSON.stringify(good), input, [tension])
  assert.ok(c.ok, JSON.stringify(c))
  if (c.ok) { assert.deepEqual(c.drawsOn, ['Assertiveness', 'Activity Level', 'Achievement-Striving', 'Self-Discipline']); assert.equal(c.pointer?.facet, 'Achievement-Striving') }
})

test('summary checks reject the forbidden claims', () => {
  const bad = (patch: Partial<typeof good>) => checkSummary(JSON.stringify({ ...good, ...patch }), input, [tension])
  assert.equal(bad({ text: 'Your Extraversion is clear. You step in. You like busy days. You set big goals.' }).ok, false)
  assert.equal(bad({ text: 'You score high in drive. You step in. You like busy days. You set big goals.' }).ok, false)
  assert.equal(bad({ text: 'You should rest more. You step in. You like busy days. You set big goals.' }).ok, false)
  assert.equal(bad({ text: 'Your energy is why you lead. You step in. You like busy days. You set big goals.' }).ok, false)
  assert.equal(bad({ text: 'You step in — fast. You like busy days. You set big goals. You start in bursts.' }).ok, false)
  assert.equal(bad({ text: "It's not stubbornness, it's focus. You step in. You like busy days. You set big goals." }).ok, false)
  assert.equal(bad({ draws_on: ['Take-charge', 'Trusting'] }).ok, false)
  assert.equal(bad({ draws_on: ['Take-charge'] }).ok, false) // the pointer's trait must be listed
  assert.equal(bad({ pointer: { word: 'Take-charge', phrase: 'step in' } }).ok, false)
  assert.equal(bad({ pointer: { word: 'Ambitious', phrase: 'not in the text' } }).ok, false)
})

test('cluster reading checks', () => {
  const ok = checkClusterReading(JSON.stringify({ text: 'You set big goals. Getting started often waits for a push.', draws_on: ['Ambitious', 'Fluid'] }), input.slice(2))
  assert.ok(ok.ok, JSON.stringify(ok))
  assert.equal(checkClusterReading(JSON.stringify({ text: 'You are high in drive. You set big goals.', draws_on: ['Ambitious'] }), input.slice(2)).ok, false)
  assert.equal(checkClusterReading(JSON.stringify({ text: 'One sentence only.', draws_on: ['Ambitious'] }), input.slice(2)).ok, false)
  assert.equal(checkClusterReading(JSON.stringify({ text: 'You are Ambitious. You are also Fluid.', draws_on: ['Ambitious'] }), input.slice(2)).ok, false)
})
