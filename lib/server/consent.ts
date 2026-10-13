import 'server-only'

import { cookies } from 'next/headers'
import { CONSENT_COOKIE, parseConsent } from '@/lib/consent'

// True only when this request's visitor said yes to ad measurement.
// "Not asked yet" counts as no.
export function hasAdConsent(): boolean {
  return parseConsent(cookies().get(CONSENT_COOKIE)?.value) === 'granted'
}
