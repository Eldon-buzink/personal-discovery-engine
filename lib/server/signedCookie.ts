import 'server-only'

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// httpOnly cookies whose value the server can trust: "<payload>.<hmac>".
// The HMAC key is derived per purpose from a server-only secret that's
// already configured (no new env var), so a value can't be forged or edited
// in the browser, and a value signed for one purpose isn't valid for another.

const ONE_YEAR = 60 * 60 * 24 * 365

function key(purpose: string): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Server misconfigured: missing signing secret')
  return createHash('sha256').update(`bearing-${purpose}:${secret}`).digest()
}

function mac(purpose: string, payload: string): string {
  return createHmac('sha256', key(purpose)).update(payload).digest('base64url')
}

export function readSignedCookie(name: string, purpose: string): string | null {
  const raw = cookies().get(name)?.value
  if (!raw) return null
  const dot = raw.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = raw.slice(0, dot)
  const expected = Buffer.from(mac(purpose, payload))
  const given = Buffer.from(raw.slice(dot + 1))
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    return Buffer.from(payload, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

export function writeSignedCookie(name: string, purpose: string, value: string, maxAgeSeconds = ONE_YEAR): void {
  const payload = Buffer.from(value, 'utf8').toString('base64url')
  cookies().set(name, `${payload}.${mac(purpose, payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  })
}

export function clearCookie(name: string): void {
  cookies().set(name, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
}
