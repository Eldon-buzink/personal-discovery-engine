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
//
// payment_method_types is deliberately omitted (not set to ['card']) so
// Stripe resolves eligible methods automatically from the Dashboard's
// payment method settings + the customer's currency/locale — e.g. iDEAL,
// Bancontact, cards, wallets. (automatic_payment_methods is a PaymentIntent
// param, not a valid Checkout Session one — confirmed against the live API,
// not assumed.) That means redirect_on_completion can no longer be 'never':
// iDEAL/Bancontact fundamentally require leaving the page to authenticate
// with the customer's bank, which 'never' doesn't support (Stripe silently
// falls back to card-only under 'never', regardless of what's enabled in
// the Dashboard — verified directly). 'if_required' keeps card payments
// exactly as before (never redirects) and only sends a redirect-requiring
// method's customer away, back to returnUrl on completion.
export async function createCheckoutSession(userId: string, returnUrl: string): Promise<CheckoutSessionResult> {
  // Prefill the email so Stripe's own form doesn't ask for it a second time
  // right after the user already gave it during sign-in. Looked up
  // server-side (not trusted from the client) since this is the same email
  // Supabase Auth already has on file for this user.
  const admin = createAdminClient()
  const { data: userData } = await admin.auth.admin.getUserById(userId)
  const customerEmail = userData?.user?.email

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded_page',
    mode: 'payment',
    redirect_on_completion: 'if_required',
    return_url: returnUrl,
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
