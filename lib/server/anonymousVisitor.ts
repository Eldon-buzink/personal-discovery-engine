import 'server-only'

import { randomUUID } from 'node:crypto'
import { readSignedCookie, writeSignedCookie, clearCookie } from './signedCookie'

// The anonymous visitor's browser, identified by a signed httpOnly cookie
// the server issues. Anonymous rows (mini-assessment results) are stamped
// with this id, and claiming one requires the same cookie — so knowing a
// row's id is not enough to claim it from another browser.
const ANON_COOKIE = 'bearing_anon'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function readAnonId(): string | null {
  const id = readSignedCookie(ANON_COOKIE, 'anon')
  return id && UUID.test(id) ? id : null
}

export function getOrCreateAnonId(): string {
  const existing = readAnonId()
  if (existing) return existing
  const id = randomUUID()
  writeSignedCookie(ANON_COOKIE, 'anon', id)
  return id
}

// The anonymous_sessions row this browser saved before signing in. Kept for
// a week (long enough to finish signing in), cleared once claimed.
const PENDING_SESSION_COOKIE = 'bearing_pending_session'
const ONE_WEEK = 60 * 60 * 24 * 7

export function setPendingSessionId(id: string): void {
  writeSignedCookie(PENDING_SESSION_COOKIE, 'pending-session', id, ONE_WEEK)
}

export function readPendingSessionId(): string | null {
  const id = readSignedCookie(PENDING_SESSION_COOKIE, 'pending-session')
  return id && UUID.test(id) ? id : null
}

export function clearPendingSessionId(): void {
  clearCookie(PENDING_SESSION_COOKIE)
}
