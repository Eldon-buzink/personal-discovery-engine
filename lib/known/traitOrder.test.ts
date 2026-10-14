import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DOMAIN_FACETS } from './ring1-questions'
import { DOMAIN_LABELS, domainOf, orderByStrength, traitStrength } from './traitOrder'

test('every domain in the mapping has a label', () => {
  assert.deepEqual(Object.keys(DOMAIN_LABELS).sort(), Object.keys(DOMAIN_FACETS).sort())
})

test('domainOf reads the mapping, and returns null for unknown facets', () => {
  assert.equal(domainOf('Anxiety'), 'Neuroticism')
  assert.equal(domainOf('Cautiousness'), 'Conscientiousness')
  assert.equal(domainOf('assertiveness'), null)
})

test('low and high ends are equally strong; the middle is weakest', () => {
  assert.equal(traitStrength(1.5), traitStrength(4.5))
  assert.equal(traitStrength(3), 0)
  assert.equal(traitStrength(null), 0)
  assert.equal(traitStrength(5), 2)
})

test('orderByStrength: strongest first, ties keep reveal order', () => {
  const scores = [3.0, 4.5, 1.5, 3.25, 2.0]
  assert.deepEqual(orderByStrength(scores, traitStrength), [1, 2, 4, 3, 0])
})
