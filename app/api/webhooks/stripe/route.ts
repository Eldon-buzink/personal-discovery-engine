import type Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/stripe'

export const runtime = 'nodejs'

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

// event_id is the Stripe session id — the same value the client passes as
// eventID for the mirrored browser-side Purchase event (see PaywallModal's
// confirmPayment), so Meta collapses the two into one event.
async function sendMetaPurchase(session: Stripe.Checkout.Session, email: string) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const token = process.env.META_CONVERSIONS_API_TOKEN
  if (!pixelId || !token) return

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: session.id,
          action_source: 'website',
          user_data: { em: [sha256(email)] },
          custom_data: { value: 49.00, currency: 'EUR' },
        }],
      }),
    })
    if (!res.ok) console.error('[stripe webhook] Meta CAPI failed:', res.status, await res.text())
  } catch (err) {
    console.error('[stripe webhook] Meta CAPI request failed:', err)
  }
}

// Reuses the same Stripe session id as event_id for potential future dedup
// once a Pinterest tag is added client-side.
async function sendPinterestCheckout(session: Stripe.Checkout.Session, email: string) {
  const adAccountId = process.env.PINTEREST_AD_ACCOUNT_ID
  const token = process.env.PINTEREST_CONVERSIONS_TOKEN
  if (!adAccountId || !token) return

  try {
    const res = await fetch(`https://api.pinterest.com/v5/ad_accounts/${adAccountId}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'checkout',
          action_source: 'web',
          event_time: Math.floor(Date.now() / 1000),
          event_id: session.id,
          user_data: { em: [sha256(email)] },
          custom_data: { value: '49.00', currency: 'EUR' },
        }],
      }),
    })
    if (!res.ok) console.error('[stripe webhook] Pinterest CAPI failed:', res.status, await res.text())
  } catch (err) {
    console.error('[stripe webhook] Pinterest CAPI request failed:', err)
  }
}

// This route is the ONLY place is_paid ever gets written; nothing else has a
// write policy on public.users (see
// supabase/migrations/20260717000000_create_users_table.sql). Deliberately
// not derived from the redirect/return_url — a closed tab or dropped
// connection means that path never fires, but Stripe retries this webhook
// until it gets a 2xx, so it's the only trustworthy signal.
//
// createAdminClient() is called inside the handler, not at module top level —
// same reasoning as getStripeClient() (see lib/stripe.ts): Supabase's
// createClient() also validates its arguments eagerly and throws
// synchronously on a missing/malformed URL or key, which would otherwise
// crash the whole production build during Next's "Collecting page data"
// step, not just fail this one route at request time.

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId

    if (!userId) {
      console.error('[stripe webhook] checkout.session.completed with no metadata.userId, session:', session.id)
      return NextResponse.json({ error: 'Missing userId in session metadata' }, { status: 400 })
    }

    // 'paid' is the normal case; 'no_payment_required' is what a 100%-off
    // promotion code produces (total due is 0, so Stripe never even asks for
    // a card) — both are legitimate, Stripe-computed completions of this
    // checkout, not something a client could spoof. 'unpaid' is the only
    // real rejection case.
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      console.warn('[stripe webhook] session completed but payment_status is', session.payment_status, '— not marking paid. session:', session.id)
      return NextResponse.json({ received: true })
    }

    const { error } = await supabaseAdmin
      .from('users')
      .upsert({ id: userId, is_paid: true, paid_at: new Date().toISOString() })

    if (error) {
      console.error('[stripe webhook] failed to mark user paid:', error.message, 'userId:', userId)
      return NextResponse.json({ error: 'Failed to update paid status' }, { status: 500 })
    }

    console.log('[stripe webhook] user marked paid:', userId, 'session:', session.id)

    const email = session.customer_details?.email ?? session.customer_email
    if (email) {
      await Promise.all([sendMetaPurchase(session, email), sendPinterestCheckout(session, email)])
    } else {
      console.warn('[stripe webhook] no email on session, skipping Meta/Pinterest conversion events. session:', session.id)
    }
  }

  return NextResponse.json({ received: true })
}
