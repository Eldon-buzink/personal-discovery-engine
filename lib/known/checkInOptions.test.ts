import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { CHECK_IN_PROMPTS, checkInOptionLabel, checkInOptionWord } from './checkInOptions'
import { checkInOptionsSnapshot } from './checkInOptionsSnapshot'

// Taken before the labels changed from "Word — Clause." to "Word. Clause.":
// ids, trait words and trend results must be exactly the same after it.
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'checkInOptions.snapshot.json'), 'utf8'))

test('check-in option ids, trait words and trend results are unchanged by the label text', () => {
  const now = checkInOptionsSnapshot()
  assert.deepEqual(Object.keys(now), Object.keys(before))
  for (const facet of Object.keys(before)) {
    assert.deepEqual(now[facet].ids, before[facet].ids, `${facet} ids`)
    assert.deepEqual(now[facet].words, before[facet].words, `${facet} words`)
    assert.deepEqual(now[facet].trend, before[facet].trend, `${facet} trend`)
  }
})

test('check-in labels: no dashes, "Word. Clause." shape', () => {
  for (const [facet, prompt] of Object.entries(CHECK_IN_PROMPTS)) {
    assert.deepEqual(prompt.options.map((o) => o.id), ['low', 'mid', 'high'], facet)
    for (const o of prompt.options) {
      assert.doesNotMatch(o.label, /[—–]/, `${facet} ${o.id}`)
      assert.equal(checkInOptionLabel(facet, o.id), o.label)
      assert.ok(o.label.startsWith(`${checkInOptionWord(facet, o.id)}. `), `${facet} ${o.id}`)
    }
  }
})
