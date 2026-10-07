'use server'

import { getStripeClient } from '@/lib/stripe'
import { getSessionUser } from '@/lib/supabase/server'
import { isSafePath, requestOrigin } from '@/lib/server/siteOrigin'

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
// The buyer is the signed-in caller (session cookie), never an argument: a
// server action is a public endpoint, so a userId parameter would let anyone
// create a session for someone else's account and see that account's email
// prefilled on Stripe's page. The return URL is built here from an allowed
// origin plus a same-site path — the client only says which page it's on.
export async function createCheckoutSession(returnPath: string): Promise<CheckoutSessionResult> {
  const user = await getSessionUser()
  if (!user) throw new Error('Not signed in')

  const origin = requestOrigin()
  if (!origin || !isSafePath(returnPath)) throw new Error('Invalid return path')
  // Existing query params are dropped so there's no ambiguity about which
  // session_id wins on the way back. {CHECKOUT_SESSION_ID} is substituted
  // by Stripe, not here.
  const path = returnPath.split('?')[0]
  const returnUrl = `${origin}${path}?session_id={CHECKOUT_SESSION_ID}`

  const session = await getStripeClient().checkout.sessions.create({
    ui_mode: 'embedded_page',
    mode: 'payment',
    redirect_on_completion: 'if_required',
    return_url: returnUrl,
    // Same email Supabase Auth already has for this user, so Stripe's own
    // form doesn't ask for it again.
    customer_email: user.email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    metadata: { userId: user.id },
    allow_promotion_codes: true,
  })

  if (!session.client_secret) {
    throw new Error('Stripe did not return a client secret for the checkout session')
  }
  return { clientSecret: session.client_secret, sessionId: session.id }
}
