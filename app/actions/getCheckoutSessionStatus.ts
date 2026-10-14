'use server'

import type Stripe from 'stripe'
import { getStripeClient } from '@/lib/stripe'
import { getSessionUser } from '@/lib/supabase/server'

// Read-only — does NOT write is_paid anywhere. The webhook remains the only
// place entitlement is ever granted; this exists purely so the modal can
// show "payment confirmed" the instant Stripe's own records reflect it,
// instead of waiting on the webhook round trip (Stripe -> our endpoint ->
// Supabase write), which is what PaywallModal was polling before and what
// made the "this could take a while" state so easy to hit locally.
//
// Only the user the session was created for can read its status.
export async function getCheckoutSessionStatus(sessionId: string): Promise<Stripe.Checkout.Session.PaymentStatus> {
  if (typeof sessionId !== 'string' || !/^cs_[A-Za-z0-9_]{1,250}$/.test(sessionId)) throw new Error('Invalid session id')
  const user = await getSessionUser()
  if (!user) throw new Error('Not signed in')

  const session = await getStripeClient().checkout.sessions.retrieve(sessionId)
  if (session.metadata?.userId !== user.id) throw new Error('Not found')
  return session.payment_status
}
