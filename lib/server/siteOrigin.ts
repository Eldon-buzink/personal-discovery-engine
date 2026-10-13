import 'server-only'

import { headers } from 'next/headers'

// Origins the app is served from. Anything that ends up in a redirect the
// server builds (Stripe's return_url) must be on one of these, so a crafted
// call can't send a paying customer somewhere else.
const PRODUCTION_ORIGINS = ['https://www.getbearing.me', 'https://getbearing.me']

export function allowedOrigins(): string[] {
  const origins = [...PRODUCTION_ORIGINS]
  // Vercel sets these per deployment (preview and production), so preview
  // builds can complete a checkout against their own URL.
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host) origins.push(`https://${host}`)
  }
  return origins
}

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins().includes(origin)) return true
  // Local development only — never accepted in a production build.
  if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true
  return false
}

// The origin of the current request (server actions send an Origin header;
// fall back to Host), if it's one of ours.
export function requestOrigin(): string | null {
  const h = headers()
  const origin = h.get('origin') ?? (h.get('host') ? `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}` : null)
  if (!origin || !isAllowedOrigin(origin)) return null
  return origin
}

// A same-site path: starts with a single "/", no scheme, no backslashes,
// no control characters. Query strings are allowed (the paywall returns to
// the page it was opened from, which may carry one).
export function isSafePath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0 || path.length > 300) return false
  if (!path.startsWith('/') || path.startsWith('//')) return false
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return false
  return true
}

// Best-effort client IP for rate limiting (Vercel sets x-forwarded-for).
export function requestIp(): string | null {
  const h = headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
}
