import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
})

// This route is the ONLY place is_paid ever gets written; nothing else has a
// write policy on public.users (see
// supabase/migrations/20260717000000_create_users_table.sql). Deliberately
// not derived from the redirect/return_url — a closed tab or dropped
// connection means that path never fires, but Stripe retries this webhook
// until it gets a 2xx, so it's the only trustworthy signal.
const supabaseAdmin = createAdminClient()

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
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

    if (session.payment_status !== 'paid') {
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
  }

  return NextResponse.json({ received: true })
}
