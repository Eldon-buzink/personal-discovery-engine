import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Only for trusted server-side code:
// the Stripe webhook (the only place is_paid ever gets written), server
// actions that have already identified the caller from the session cookie
// (lib/supabase/server.ts), and the rate limiter. Never import this from a
// client component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
