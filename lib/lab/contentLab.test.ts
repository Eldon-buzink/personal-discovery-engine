import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CLUSTER_DESCRIPTIONS, descriptionCoversCluster, validateDrawsOn, summaryEligible, clusterReadingEligible } from './contentLab'
import { browserContentCache, contentKey } from './contentCache'
import { filterTraits } from './filterLab'

test('every description draft covers its six facets, each phrase present in the text', () => {
  for (const [cluster, drafts] of Object.entries(CLUSTER_DESCRIPTIONS)) {
    for (const d of drafts) assert.ok(descriptionCoversCluster(cluster, d), `${cluster}: ${d.text}`)
  }
})

test('description drafts follow the copy rules', () => {
  const banned = /—|–|neuroticism|extraversion|openness|agreeableness|conscientiousness|\b(high|low)(er)? (in|on)\b|\bscore|\blevel/i
  for (const drafts of Object.values(CLUSTER_DESCRIPTIONS)) for (const d of drafts) assert.ok(!banned.test(d.text), d.text)
})

test('draws_on is checked against the input facets', () => {
  const input = ['Assertiveness', 'Intellect', 'Depression']
  assert.deepEqual(validateDrawsOn(['Assertiveness', 'Intellect'], input), { ok: true, facets: ['Assertiveness', 'Intellect'] })
  assert.equal(validateDrawsOn([], input).ok, false)
  assert.equal(validateDrawsOn('Assertiveness', input).ok, false)
  assert.equal(validateDrawsOn(['Trust'], input).ok, false)
  assert.equal(validateDrawsOn(['Depression'], input).ok, false)
  assert.equal(validateDrawsOn(['Intellect', 'Intellect'], input).ok, false)
})

test('eligibility thresholds', () => {
  const all = filterTraits()
  assert.equal(summaryEligible(all.slice(0, 7)), false)
  assert.equal(summaryEligible(all.slice(0, 8)), true)
  assert.equal(clusterReadingEligible(all.slice(0, 2)), false)
  assert.equal(clusterReadingEligible(all.slice(0, 3)), true)
})

test('cache key ignores order and changes with inputs; storage round-trips and counts attempts', () => {
  const a = { facet: 'Trust', word: 'Discerning', direction: 'mid' }
  const b = { facet: 'Morality', word: 'Sincere', direction: 'high' }
  assert.equal(contentKey('cluster', [a, b], { cluster: 'Agreeableness' }), contentKey('cluster', [b, a], { cluster: 'Agreeableness' }))
  assert.notEqual(contentKey('cluster', [a, b]), contentKey('cluster', [a, { ...b, direction: 'mid' }]))
  const mem = new Map<string, string>()
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) } } as unknown as Storage
  const cache = browserContentCache(storage)
  const key = contentKey('summary', [a, b])
  assert.equal(cache.get(key), null)
  cache.recordAttempt(key)
  cache.set({ key, kind: 'summary', text: 't', drawsOn: ['Trust'], createdAt: 'now' })
  assert.equal(cache.get(key)?.text, 't')
  assert.equal(cache.attempts(key), 1)
})

test('trait-word slugs never collide', async () => {
  const { allWordsDistinct } = await import('./slugs')
  assert.ok(allWordsDistinct())
})
