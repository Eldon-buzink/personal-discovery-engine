import test from 'node:test'
import assert from 'node:assert/strict'
import { linkErrorPath, linkErrorReason } from './linkError'

test('expired or used links read as expired', () => {
  assert.equal(linkErrorReason({ code: 'otp_expired', message: 'Email link is invalid or has expired' }), 'expired')
  assert.equal(linkErrorReason({ code: 'flow_state_expired' }), 'expired')
})

test('an old-style link in another browser reads as browser', () => {
  assert.equal(linkErrorReason({ code: 'bad_code_verifier' }), 'browser')
  assert.equal(linkErrorReason({ code: 'flow_state_not_found' }), 'browser')
  assert.equal(linkErrorReason({ message: 'invalid request: both auth code and code verifier should be non-empty' }), 'browser')
})

test('anything else reads as invalid, and the path carries the reason', () => {
  assert.equal(linkErrorReason(null), 'invalid')
  assert.equal(linkErrorReason({ code: 'unexpected_failure' }), 'invalid')
  assert.equal(linkErrorPath('expired'), '/auth/link-error?reason=expired')
})
