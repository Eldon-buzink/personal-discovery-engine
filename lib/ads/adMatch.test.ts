import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adMatchMetadata, buildMetaPurchaseEvent, NEUTRAL_EVENT_SOURCE_URL } from './adMatch'

const FBP = 'fb.1.1728300000000.1234567890'
const FBC = 'fb.1.1728300000000.IwAR2abc_DEF-123'

test('no consent: metadata carries no identifiers at all', () => {
  assert.deepEqual(adMatchMetadata({ consent: false, fbp: FBP, fbc: FBC, ip: '1.2.3.4', userAgent: 'UA' }), { adConsent: 'denied' })
})

test('consent: fbp, fbc, ip and user agent are copied', () => {
  assert.deepEqual(adMatchMetadata({ consent: true, fbp: FBP, fbc: FBC, ip: '1.2.3.4', userAgent: 'Mozilla/5.0' }), {
    adConsent: 'granted', adFbp: FBP, adFbc: FBC, adIp: '1.2.3.4', adUa: 'Mozilla/5.0',
  })
})

test('consent: malformed or missing cookies are dropped, not forwarded', () => {
  const m = adMatchMetadata({ consent: true, fbp: 'not-a-cookie', fbc: 'fb.1.x.y', ip: null, userAgent: '' })
  assert.deepEqual(m, { adConsent: 'granted' })
})

test('consent: values over Stripe\'s 500-character metadata limit are dropped', () => {
  const m = adMatchMetadata({ consent: true, userAgent: 'x'.repeat(501) })
  assert.equal(m.adUa, undefined)
})

test('server Purchase: none without consent', () => {
  assert.equal(buildMetaPurchaseEvent('cs_1', 'a@b.c', { userId: 'u', adConsent: 'denied' }, 1), null)
  assert.equal(buildMetaPurchaseEvent('cs_1', 'a@b.c', { userId: 'u' }, 1), null) // pre-consent sessions
  assert.equal(buildMetaPurchaseEvent('cs_1', 'a@b.c', null, 1), null)
})

test('server Purchase: neutral source URL, session id as event_id, match data included', () => {
  const e = buildMetaPurchaseEvent('cs_1', ' A@B.c ', { adConsent: 'granted', adFbp: FBP, adFbc: FBC, adIp: '1.2.3.4', adUa: 'UA' }, 1700000000)
  assert.ok(e)
  assert.equal(e.event_source_url, NEUTRAL_EVENT_SOURCE_URL)
  assert.equal(e.event_id, 'cs_1')
  assert.equal(e.event_time, 1700000000)
  assert.deepEqual(e.user_data.fbp, FBP)
  assert.deepEqual(e.user_data.fbc, FBC)
  assert.equal(e.user_data.client_ip_address, '1.2.3.4')
  assert.equal(e.user_data.client_user_agent, 'UA')
  // email is trimmed, lowercased and hashed — never sent in clear
  assert.equal(e.user_data.em.length, 1)
  assert.match(e.user_data.em[0], /^[0-9a-f]{64}$/)
  assert.ok(!JSON.stringify(e).includes('a@b.c'))
})

test('server Purchase: no page address anywhere in the event', () => {
  const e = buildMetaPurchaseEvent('cs_1', 'a@b.c', { adConsent: 'granted' }, 1)
  const json = JSON.stringify(e)
  for (const path of ['/report', '/practice', '/assessment', '/pricing', 'session_id=']) assert.ok(!json.includes(path), path)
})
