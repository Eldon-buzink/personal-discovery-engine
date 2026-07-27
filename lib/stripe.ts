import Stripe from 'stripe'

// Constructed lazily inside this function, not at module top level. Next.js's
// "Collecting page data" build step imports and executes every route/server-
// action module to statically analyze it — a top-level `new Stripe(...)` runs
// at BUILD time, not just at request time, so a missing or empty
// STRIPE_SECRET_KEY in the build environment throws during `next build` and
// fails the ENTIRE production deployment, not just the Stripe-dependent
// routes. (Confirmed directly: this took down a full Vercel build via
// app/api/webhooks/stripe/route.ts's module-level construction.) Lazy
// construction means a missing key only breaks the specific request that
// actually needs Stripe, at runtime — the rest of the site still builds.
//
// Also centralizes the API version pin, previously duplicated identically
// across three files (createCheckoutSession.ts, getCheckoutSessionStatus.ts,
// the webhook route) — pinned because the account's dashboard-configured
// default API version is much older and predates Embedded Checkout.
let _stripe: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-06-24.dahlia',
    })
  }
  return _stripe
}
