import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Only for trusted server-side contexts
// that need to act across users: the Stripe webhook (the only place is_paid
// ever gets written) and createCheckoutSession (looking up a user's email
// server-side to prefill Stripe Checkout, rather than trusting a
// client-supplied value).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
