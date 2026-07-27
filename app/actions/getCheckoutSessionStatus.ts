'use server'

import type Stripe from 'stripe'
import { getStripeClient } from '@/lib/stripe'

// Read-only — does NOT write is_paid anywhere. The webhook remains the only
// place entitlement is ever granted; this exists purely so the modal can
// show "payment confirmed" the instant Stripe's own records reflect it,
// instead of waiting on the webhook round trip (Stripe -> our endpoint ->
// Supabase write), which is what PaywallModal was polling before and what
// made the "this could take a while" state so easy to hit locally.
export async function getCheckoutSessionStatus(sessionId: string): Promise<Stripe.Checkout.Session.PaymentStatus> {
  const session = await getStripeClient().checkout.sessions.retrieve(sessionId)
  return session.payment_status
}
