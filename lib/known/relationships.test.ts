import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateRelationships, winningRelationships, relationshipSignature, evidenceSentence, tensionId,
  type RevealedTrait,
} from './relationships'
import { ACTIVE_THEMES, PARKED_THEMES } from './relationshipDefinitions'

const t = (facet: string, direction: RevealedTrait['direction'], traitWord = `${facet}-${direction}`): RevealedTrait => ({ facet, traitWord, direction })
// Theme tests pass PARKED_THEMES explicitly: themes are parked (off) in the
// app, but the code path stays covered so re-enabling is one line.
const ids = (traits: RevealedTrait[]) => evaluateRelationships(traits, PARKED_THEMES).map((r) => r.id)

test('themes are parked: by default no theme fires, tensions still do', () => {
  assert.deepEqual(ACTIVE_THEMES, [])
  const traits = [t('Cooperation', 'low'), t('Liberalism', 'high'), t('Assertiveness', 'high'), t('Gregariousness', 'high'), t('Friendliness', 'low')]
  assert.deepEqual(evaluateRelationships(traits).map((r) => r.id), [tensionId('Gregariousness', 'Friendliness')])
})

test('(parked themes) a theme fires at its minimum and not below', () => {
  const two = [t('Cooperation', 'low'), t('Liberalism', 'high')]
  assert.ok(!ids(two).includes('self_direction'))
  assert.ok(ids([...two, t('Assertiveness', 'high')]).includes('self_direction'))
})

test('mid never counts, and the wrong direction never counts', () => {
  assert.ok(!ids([t('Cooperation', 'low'), t('Liberalism', 'high'), t('Assertiveness', 'mid')]).includes('self_direction'))
  assert.ok(!ids([t('Cooperation', 'high'), t('Liberalism', 'high'), t('Assertiveness', 'high')]).includes('self_direction'))
})

test('unrevealed facets never count: only the traits passed in are used', () => {
  // Same facets as the firing case minus one — the missing one is "unrevealed".
  assert.deepEqual(ids([t('Cooperation', 'low'), t('Assertiveness', 'high')]), [])
})

test('(parked themes) drive_with_unease needs the Achievement-Striving anchor plus one unease signal', () => {
  assert.ok(!ids([t('Anxiety', 'high'), t('Vulnerability', 'high')]).includes('drive_with_unease'))
  assert.ok(!ids([t('Achievement-Striving', 'high')]).includes('drive_with_unease'))
  assert.ok(ids([t('Achievement-Striving', 'high'), t('Self-Consciousness', 'high')]).includes('drive_with_unease'))
  assert.ok(!ids([t('Achievement-Striving', 'low'), t('Anxiety', 'high')]).includes('drive_with_unease'))
})

test('tensions: same domain, opposite sides only', () => {
  assert.deepEqual(ids([t('Gregariousness', 'high'), t('Friendliness', 'low')]), [tensionId('Gregariousness', 'Friendliness')])
  assert.deepEqual(ids([t('Gregariousness', 'high'), t('Friendliness', 'high')]), [])
  assert.deepEqual(ids([t('Gregariousness', 'high'), t('Trust', 'low')]), []) // different domains
  assert.deepEqual(ids([t('Gregariousness', 'high'), t('Friendliness', 'mid')]), [])
})

test('curated tensions only: grounded pairs fire, other same-domain pairs do not', () => {
  const [curated] = evaluateRelationships([t('Imagination', 'high'), t('Intellect', 'low')])
  assert.equal(curated.grounding, 'Rich inner world, less pull toward abstract debate.')
  assert.deepEqual(ids([t('Trust', 'high'), t('Modesty', 'low')]), [])
})

test('with scores, a tension needs a clear high (>= 3.75)', () => {
  const pair = (hi: number, lo: number) => ids([
    { facet: 'Imagination', traitWord: 'Imaginative', direction: 'high', score: hi },
    { facet: 'Intellect', traitWord: 'Concrete', direction: 'low', score: lo },
  ])
  assert.deepEqual(pair(3.75, 2.25), [tensionId('Imagination', 'Intellect')])
  assert.deepEqual(pair(3.5, 1.0), [])
  // Without scores (the server check) only directions matter.
  assert.deepEqual(ids([t('Imagination', 'high'), t('Intellect', 'low')]), [tensionId('Imagination', 'Intellect')])
})

test('(parked themes) maxRelationships caps how many relationships are used, by rank', () => {
  const traits = [
    t('Cooperation', 'low'), t('Liberalism', 'high'), t('Assertiveness', 'high'), // self_direction
    t('Imagination', 'high'), t('Intellect', 'high'), t('Adventurousness', 'high'), // wide_ranging_mind
    t('Gregariousness', 'high'), t('Friendliness', 'low'), // tension
  ]
  const all = new Set(Array.from(winningRelationships(traits, Infinity, PARKED_THEMES).values()).map((r) => r.id))
  const two = new Set(Array.from(winningRelationships(traits, 2, PARKED_THEMES).values()).map((r) => r.id))
  assert.equal(all.size, 3)
  // wide_ranging_mind has 4 met signals here (Liberalism is in both themes), so it ranks first.
  assert.deepEqual(Array.from(two).sort(), ['self_direction', 'wide_ranging_mind'])
})

test('Depression is never part of a relationship', () => {
  assert.deepEqual(ids([t('Depression', 'high'), t('Anxiety', 'low')]), [])
})

test('(parked themes) one insight per trait; a theme with more met signals beats a tension', () => {
  const traits = [
    t('Cooperation', 'low'), t('Liberalism', 'high'), t('Assertiveness', 'high'),
    t('Altruism', 'high'), // tension with Cooperation low (Agreeableness)
  ]
  const winners = winningRelationships(traits, Infinity, PARKED_THEMES)
  assert.equal(winners.get('Cooperation')!.id, 'self_direction')
  assert.equal(winners.get('Altruism')!.id, tensionId('Altruism', 'Cooperation'))
  for (const rel of Array.from(winners.values())) assert.ok(rel)
  assert.equal(winners.size, 4)
})

test('(parked themes) every contributing trait gets the same relationship', () => {
  const traits = [t('Imagination', 'high'), t('Intellect', 'high'), t('Adventurousness', 'high'), t('Anger', 'mid')]
  const winners = winningRelationships(traits, Infinity, PARKED_THEMES)
  const rels = ['Imagination', 'Intellect', 'Adventurousness'].map((f) => winners.get(f)!)
  assert.ok(rels.every((r) => r === rels[0] && r.id === 'wide_ranging_mind'))
  assert.equal(winners.has('Anger'), false)
})

test('(parked themes) deterministic: same output regardless of input order', () => {
  const traits = [t('Cooperation', 'low'), t('Liberalism', 'high'), t('Assertiveness', 'high'), t('Dutifulness', 'low'), t('Orderliness', 'high'), t('Cautiousness', 'low')]
  const a = evaluateRelationships(traits, PARKED_THEMES)
  const b = evaluateRelationships([...traits].reverse(), PARKED_THEMES)
  assert.deepEqual(a.map((r) => [r.id, relationshipSignature(r)]), b.map((r) => [r.id, relationshipSignature(r)]))
  // Ties: themes before tensions, then table order.
  assert.equal(a[0].id, 'self_direction')
})

test('(parked themes) signature and evidence sentence', () => {
  const [rel] = evaluateRelationships([t('Cooperation', 'low', 'Direct'), t('Liberalism', 'high', 'Progressive'), t('Assertiveness', 'high', 'Take-charge')], PARKED_THEMES)
  assert.equal(relationshipSignature(rel), 'Assertiveness:high,Cooperation:low,Liberalism:high')
  assert.equal(evidenceSentence(rel), 'Based on your Direct, Progressive and Take-charge results.')
  assert.equal(evidenceSentence({ signals: rel.signals.slice(0, 2) }), 'Based on your Direct and Progressive results.')
})
