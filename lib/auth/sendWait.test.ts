import test from 'node:test'
import assert from 'node:assert/strict'
import { sendWaitSeconds } from './sendWait'

test('reads the seconds from Supabase’s rate-limit message', () => {
  assert.equal(sendWaitSeconds({ status: 429, code: 'over_email_send_rate_limit', message: 'For security purposes, you can only request this after 17 seconds.' }), 17)
  assert.equal(sendWaitSeconds({ message: 'For security purposes, you can only request this after 1 second.' }), 1)
})

test('a rate limit without a number waits a minute', () => {
  assert.equal(sendWaitSeconds({ status: 429, message: 'email rate limit exceeded' }), 60)
})

test('other errors are not a wait', () => {
  assert.equal(sendWaitSeconds({ status: 400, message: 'Unable to validate email address: invalid format' }), null)
  assert.equal(sendWaitSeconds(null), null)
})
