// Ad-measurement consent (Meta Pixel, Meta and Pinterest conversion
// events). Nothing in this group runs unless the visitor said yes.
//
// Stored as a first-party cookie, not localStorage, so server code (the
// Pinterest lead action, checkout) can read the same answer. No value means
// "not asked yet", which is treated exactly like "no".

export const CONSENT_COOKIE = 'bearing_consent'
export type ConsentValue = 'granted' | 'denied'

const MAX_AGE_SECONDS = 60 * 60 * 24 * 180 // ask again after ~6 months
export const CONSENT_CHANGED_EVENT = 'bearing-consent-changed'
export const CONSENT_REOPEN_EVENT = 'bearing-consent-reopen'

// Pages whose address alone could say something personal (taking the
// Anxiety check, viewing a report, a practice page). Meta never gets a
// PageView for these, whatever the consent.
const NO_PAGEVIEW_PREFIXES = ['/mini-assessment', '/start', '/report', '/practice']

export function isPageViewExcluded(pathname: string): boolean {
  return NO_PAGEVIEW_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function parseConsent(value: string | undefined | null): ConsentValue | null {
  return value === 'granted' || value === 'denied' ? value : null
}

// ── Browser side ──────────────────────────────────────────────────────

export function readConsent(): ConsentValue | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  return parseConsent(match?.split('=')[1])
}

export function writeConsent(value: ConsentValue): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }))
}

export function reopenConsentChoice(): void {
  window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT))
}

type Fbq = (...args: unknown[]) => void

// Meta browser events (Lead, Purchase). Sent only with consent and only if
// the Pixel actually loaded; a silent no-op otherwise.
export function trackMetaEvent(name: string, params: Record<string, unknown>, options?: Record<string, unknown>): void {
  if (readConsent() !== 'granted') return
  const fbq = (window as unknown as { fbq?: Fbq }).fbq
  if (!fbq) return
  if (options) fbq('track', name, params, options)
  else fbq('track', name, params)
}
