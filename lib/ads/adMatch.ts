// Server-side Purchase conversion (Meta Conversions API), built from what
// checkout recorded in the Stripe session metadata.
//
// The browser Purchase event was dropped (it sent the page address). To keep
// match quality without it, checkout copies Meta's own browser cookies
// (_fbp, _fbc) and the request's IP and user agent into the session metadata,
// only when the visitor allowed ad measurement. The webhook then sends them
// with the hashed email. The event's source URL is always the homepage.
//
// Pure functions (no request or env access) so they can be unit-tested.

import { createHash } from 'node:crypto'

export const NEUTRAL_EVENT_SOURCE_URL = 'https://www.getbearing.me/'

// Stripe metadata values are limited to 500 characters.
const MAX_METADATA_VALUE = 500

export interface AdMatchInput {
  consent: boolean
  fbp?: string | null
  fbc?: string | null
  ip?: string | null
  userAgent?: string | null
}

export type AdMatchMetadata = Record<string, string>

// Meta's cookie formats: _fbp = fb.<subdomain index>.<ms timestamp>.<random>,
// _fbc = fb.<subdomain index>.<ms timestamp>.<fbclid>. Anything else is
// dropped rather than forwarded.
const FBP = /^fb\.\d\.\d{10,13}\.\d{1,20}$/
const FBC = /^fb\.\d\.\d{10,13}\.[A-Za-z0-9_-]{1,450}$/

function clean(value: string | null | undefined, pattern?: RegExp): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim()
  if (!v || v.length > MAX_METADATA_VALUE) return undefined
  if (pattern && !pattern.test(v)) return undefined
  return v
}

// What checkout puts in the Stripe session metadata (alongside userId).
// Without consent: only adConsent='denied', no identifiers at all.
export function adMatchMetadata(input: AdMatchInput): AdMatchMetadata {
  if (!input.consent) return { adConsent: 'denied' }
  const out: AdMatchMetadata = { adConsent: 'granted' }
  const fbp = clean(input.fbp, FBP)
  const fbc = clean(input.fbc, FBC)
  const ip = clean(input.ip)
  const ua = clean(input.userAgent)
  if (fbp) out.adFbp = fbp
  if (fbc) out.adFbc = fbc
  if (ip) out.adIp = ip
  if (ua) out.adUa = ua
  return out
}

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export interface MetaPurchaseEvent {
  event_name: 'Purchase'
  event_time: number
  event_id: string
  action_source: 'website'
  event_source_url: string
  user_data: {
    em: string[]
    fbp?: string
    fbc?: string
    client_ip_address?: string
    client_user_agent?: string
  }
  custom_data: { value: number; currency: string }
}

// The Conversions API event, or null when the buyer didn't allow ad
// measurement (no metadata.adConsent === 'granted'). event_id is the Stripe
// session id.
export function buildMetaPurchaseEvent(
  sessionId: string,
  email: string,
  metadata: Record<string, string> | null | undefined,
  nowSeconds: number
): MetaPurchaseEvent | null {
  if (metadata?.adConsent !== 'granted') return null
  const user_data: MetaPurchaseEvent['user_data'] = { em: [sha256(email)] }
  if (metadata.adFbp) user_data.fbp = metadata.adFbp
  if (metadata.adFbc) user_data.fbc = metadata.adFbc
  if (metadata.adIp) user_data.client_ip_address = metadata.adIp
  if (metadata.adUa) user_data.client_user_agent = metadata.adUa
  return {
    event_name: 'Purchase',
    event_time: nowSeconds,
    event_id: sessionId,
    action_source: 'website',
    event_source_url: NEUTRAL_EVENT_SOURCE_URL,
    user_data,
    custom_data: { value: 49.0, currency: 'EUR' },
  }
}
