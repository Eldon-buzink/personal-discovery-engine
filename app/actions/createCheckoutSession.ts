'use server'

import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

// Pinned explicitly — the Stripe account's dashboard-configured default API
// version is much older (2020-08-27) and predates Embedded Checkout, so this
// must be set per-client rather than left to the account default.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
})

export interface CheckoutSessionResult {
  clientSecret: string
  sessionId: string
}

// Creates the Checkout Session that EmbeddedCheckout renders inline in
// PaywallModal. One-time payment (mode: 'payment'), not a subscription.
// userId rides in metadata so the webhook — the only place that ever marks
// someone paid — can tie checkout.session.completed back to a Supabase row
// without relying on the client session at webhook time.
export async function createCheckoutSession(userId: string): Promise<CheckoutSessionResult> {
  // Prefill the email so Stripe's own form doesn't ask for it a second time
  // right after the user already gave it during sign-in. Looked up
  // server-side (not trusted from the client) since this is the same email
  // Supabase Auth already has on file for this user.
  const admin = createAdminClient()
  const { data: userData } = await admin.auth.admin.getUserById(userId)
  const customerEmail = userData?.user?.email

  // redirect_on_completion: 'never' means Stripe guarantees the browser is
  // never navigated away — the API actively rejects return_url in that case
  // (it'd be dead code), unlike the SDK's type comment which implies it's
  // required unconditionally. Restricting to card-only payment methods is
  // what makes 'never' safe: no supported method here ever needs a redirect.
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded_page',
    mode: 'payment',
    payment_method_types: ['card'],
    redirect_on_completion: 'never',
    customer_email: customerEmail,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    metadata: { userId },
    allow_promotion_codes: true,
  })

  if (!session.client_secret) {
    throw new Error('Stripe did not return a client secret for the checkout session')
  }
  return { clientSecret: session.client_secret, sessionId: session.id }
}
