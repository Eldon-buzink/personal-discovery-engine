import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDataExport, type ExportInput } from './dataExport'

const base: ExportInput = {
  exportedAt: '2026-10-09T10:00:00.000Z',
  account: { email: 'me@example.com', created_at: '2026-09-01T00:00:00Z', last_sign_in_at: '2026-10-08T00:00:00Z' },
  payment: { is_paid: true, paid_at: '2026-09-02T00:00:00Z' },
  sessions: [{ id: 's1', created_at: '2026-09-01T00:00:00Z', responses: { responses: [{ questionId: 1, value: 4 }], revealedFacets: ['Anxiety'] } }],
  reportContent: [{ facet: 'Anxiety', trait_quote: 'Q' }],
  miniResults: [
    { id: 'm1', facet_id: 'Liberalism', band: 'mid', responses: [3, 3, 4, 2, 3, 3], created_at: '2026-09-03T00:00:00Z', claimed_by: 'u1' },
    { id: 'm2', facet_id: 'Anxiety', band: 'low', responses: [1, 2, 1, 2, 1, 2], created_at: '2026-09-04T00:00:00Z', claimed_by: null },
  ],
  activations: [{ id: 'a1', facet_id: 'Self-Discipline', source: 'mini_assessment', directional: true, created_at: '2026-09-05T00:00:00Z' }],
  periods: [{ facet_activation_id: 'a1', started_at: '2026-09-05T00:00:00Z', ended_at: null }],
  checkIns: [
    { facet_activation_id: 'a1', check_in_date: '2026-09-07', response_option: 'high', note: 'Kept going — even "after" lunch.\nSecond line.', created_at: '' },
    { facet_activation_id: 'a1', check_in_date: '2026-09-06', response_option: 'mid', note: null, created_at: '' },
  ],
  reveals: [{ facet_id: 'Anxiety', revealed_at: '2026-09-01T00:00:00Z' }],
}

test('full assessment answers are exported exactly as stored', () => {
  const out = buildDataExport(base)
  assert.deepEqual(out.full_assessment[0].saved_session, base.sessions[0].responses)
})

test('check-in notes are exported verbatim, check-ins in date order', () => {
  const out = buildDataExport(base)
  const cis = out.practice[0].check_ins
  assert.deepEqual(cis.map((c) => c.date), ['2026-09-06', '2026-09-07'])
  assert.equal(cis[1].note, 'Kept going — even "after" lunch.\nSecond line.')
  assert.equal(cis[0].note, null)
})

test('facet names use display labels (Liberalism is "Values")', () => {
  const out = buildDataExport(base)
  assert.equal(out.mini_assessments[0].facet, 'Values')
  assert.equal(out.practice[0].facet, 'Self-Discipline')
})

test('mini-assessment answers and claimed flag are included', () => {
  const out = buildDataExport(base)
  assert.deepEqual(out.mini_assessments[0].answers, [3, 3, 4, 2, 3, 3])
  assert.deepEqual(out.mini_assessments.map((m) => m.claimed), [true, false])
})

test('every part has an explanation, and a missing payment row reads as unpaid', () => {
  const out = buildDataExport({ ...base, payment: null })
  for (const key of ['account', 'payment', 'full_assessment', 'report_text', 'mini_assessments', 'practice', 'facet_reveals'])
    assert.ok(key in out.about, key)
  assert.deepEqual(out.payment, { is_paid: false, paid_at: null })
})

test('the export is plain JSON (round-trips unchanged)', () => {
  const out = buildDataExport(base)
  assert.deepEqual(JSON.parse(JSON.stringify(out)), out)
})
