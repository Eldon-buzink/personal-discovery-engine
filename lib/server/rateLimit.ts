import 'server-only'

import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Sliding-window rate limit backed by Postgres (public.rate_limit_check, see
// supabase/migrations/20261007000001_rate_limit.sql), so the limit holds
// across every serverless instance instead of resetting per cold start.
//
// Fails OPEN: if the function doesn't exist yet (code is deployed before the
// migration runs) or the call errors, the request is allowed and a warning
// is logged. Blocking every report because the limiter is unavailable would
// be worse than briefly not limiting.
export async function checkRateLimit(key: string, windowSeconds: number, max: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc('rate_limit_check', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: max,
    })
    if (error) {
      console.warn('[rateLimit] unavailable, allowing request:', error.message)
      return true
    }
    return data === true
  } catch (err) {
    console.warn('[rateLimit] unavailable, allowing request:', err instanceof Error ? err.message : 'unknown error')
    return true
  }
}

// Rate-limit key for a caller: the user id when signed in, otherwise a
// salted hash of the IP so raw IP addresses are never stored. The salt is
// derived from a server-only secret that's already configured.
export function rateLimitKey(scope: string, userId: string | null, ip: string | null): string {
  if (userId) return `${scope}:u:${userId}`
  const salt = createHash('sha256').update(`bearing-rate-limit:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`).digest('hex')
  const hashed = createHash('sha256').update(`${salt}:${ip ?? 'unknown'}`).digest('hex').slice(0, 32)
  return `${scope}:ip:${hashed}`
}
