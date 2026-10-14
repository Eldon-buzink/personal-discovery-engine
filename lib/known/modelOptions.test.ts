import test from 'node:test'
import assert from 'node:assert/strict'
import { GENERATION_BUDGET_MS, acceptsTemperature, attemptTimeout, temperatureFor } from './modelOptions'

test('no temperature is sent to Sonnet 5.5 or unknown models', () => {
  assert.equal(acceptsTemperature('claude-sonnet-5-5'), false)
  assert.equal(temperatureFor('claude-sonnet-5-5', 0.5), undefined)
  assert.equal(temperatureFor('claude-opus-5-5', 0.5), undefined)
  assert.equal(temperatureFor('some-future-model', 0.5), undefined)
})

test('Haiku 4.5 still gets its temperature', () => {
  assert.equal(temperatureFor('claude-haiku-4-5-20251001', 0.5), 0.5)
})

test('both attempts share one 20 s budget', () => {
  assert.equal(GENERATION_BUDGET_MS, 20_000)
  assert.equal(attemptTimeout(1_000, 1_000), 20_000)
  assert.equal(attemptTimeout(1_000, 13_000), 8_000)
  // Too little left to start a second attempt.
  assert.equal(attemptTimeout(1_000, 19_000), null)
  assert.equal(attemptTimeout(1_000, 30_000), null)
})
