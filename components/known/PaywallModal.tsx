'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase/client'
import { createCheckoutSession } from '@/app/actions/createCheckoutSession'
import { getCheckoutSessionStatus } from '@/app/actions/getCheckoutSessionStatus'
import { fetchIsPaid } from '@/lib/known/paywall'

/**
 * The single modal for every post-cap/unlock entry point (top-right nav CTA,
 * the consolidated branch suggestion card, the sticky bar, the continue-Ring-1
 * prompt). Distinct from AuthModal, which stays scoped to its one original
 * trigger — the pre-cap "keep going" save-progress prompt after the first
 * reveal — per the explicit "two distinct modals" requirement.
 *
 * Always opens on the payment view (pricing + USP bullets, pulled verbatim
 * from app/(site)/pricing/page.tsx) regardless of auth state.
 *
 * ── LOGIN: LINK IS ACTIVE, CODE IS DORMANT ─────────────────────────────────
 * The ideal flow is a typed 6-digit code entered right in this modal
 * (verifyOtp) instead of a clicked email link — no tab-switch/redirect round
 * trip. That requires a custom Supabase email template with a {{ .Token }}
 * placeholder, which Supabase's free tier blocks entirely (styled or bare)
 * unless a custom SMTP provider is configured. That's deferred until a real
 * domain exists for launch (see project notes, 2026-07-19), so:
 *   - 'confirm' (magic link) is the reachable, working path today.
 *   - 'otp' (typed code) and handleVerifyCode() are fully built and left in
 *     place, just never navigated to — flip handleSendLink's setView target
 *     from 'confirm' to 'otp' once the template is unblocked.
 * The POST_AUTH_REOPEN_KEY/POST_AUTH_PATH_KEY mechanism below exists only to
 * soften the link-click round trip (resume straight into checkout on
 * return) — it's irrelevant once the code path is reactivated.
 *
 * Payment status is never set from anything that happens in this component.
 * On EmbeddedCheckout's onComplete, two things happen in sequence:
 *   1. A fast, read-only direct check against Stripe's own session status
 *      (getCheckoutSessionStatus) — near-instant since it doesn't depend on
 *      our webhook infra, used only to show a confident "confirmed" state
 *      quickly rather than an ambiguous "processing" one.
 *   2. A background poll of the Supabase-backed is_paid flag, which the
 *      Stripe webhook (app/api/webhooks/stripe/route.ts) is the only thing
 *      that ever actually writes — that's still the real gate; step 1 never
 *      grants entitlement by itself. The poll window is generous (~45s) so
 *      the "this is taking a while" state is a genuine rare-failure signal,
 *      not something normal webhook latency routinely triggers.
 * If a tab closes mid-checkout, the webhook still fires from Stripe's side
 * and the user shows up paid next time they load the app — this component
 * just isn't around to see it happen.
 */

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type PaywallView = 'payment' | 'login' | 'confirm' | 'otp' | 'checkout'
type PaymentState = 'idle' | 'confirming' | 'confirmed' | 'delayed'

export interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  isAuthenticated: boolean
  userId: string | null
  traitCount: number
  // Called the instant auth succeeds (today: after the magic-link redirect
  // resolves in the parent's own session check; dormant code path: the
  // instant verifyOtp succeeds) — parent updates its own isAuthenticated/
  // userId state so the rest of the page (nav, gating) stays in sync.
  onAuthenticated: (userId: string) => void
  // Called once the Supabase is_paid flag actually flips true (confirmed by
  // polling after Stripe's onComplete) — parent re-fetches its own isPaid
  // state and typically closes the modal.
  onPaymentConfirmed: () => void
  // Lets a parent reopen straight into checkout — used when the user just
  // came back from the login-step magic link specifically to pay, so they
  // land on the card form instead of the pricing view they already saw.
  initialView?: 'payment' | 'checkout'
}

// Set right before signInWithOtp in the login step, read by /auth/claim to
// know where to send the user back and whether to reopen this modal already
// past the pricing screen — without this, "click unlock, check email, click
// the link, land back at the start, click unlock again" reads as broken.
export const POST_AUTH_REOPEN_KEY = 'known_post_auth_reopen_paywall'
export const POST_AUTH_PATH_KEY = 'known_post_auth_path'

const USP_ITEMS = [
  "See how your patterns actually play out — in how you connect, work, and decide what's next",
  'Five more branches, each grounded in a different part of your life, added to the same report',
  'Concrete things worth trying, not just things about yourself',
  'One payment. Yours for as long as you want it.',
]

export default function PaywallModal({ isOpen, onClose, isAuthenticated, userId, traitCount, onAuthenticated, onPaymentConfirmed, initialView }: PaywallModalProps) {
  const traitWord = traitCount === 1 ? 'pattern' : 'patterns'
  const [view, setView] = useState<PaywallView>('payment')
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [inputError, setInputError] = useState(false)
  // No server-side account lookup — this just flips the copy on the login
  // step so a returning user isn't told to "create an account." The submit
  // action (signInWithOtp) is identical either way.
  const [isReturning, setIsReturning] = useState(false)
  const [paymentState, setPaymentState] = useState<PaymentState>('idle')
  // Bridges the gap between "verifyOtp just succeeded in this modal" and
  // "the isAuthenticated/userId props the parent passes down have caught up"
  // — those props update on the parent's next render, which is one tick too
  // late for checkout to use immediately after verification. Only reachable
  // via the dormant code path right now (see file header).
  const [localUserId, setLocalUserId] = useState<string | null>(null)

  const effectiveUserId = localUserId ?? userId
  const effectiveIsAuthenticated = isAuthenticated || localUserId !== null

  // Defaults to the payment view — the paywall content is the point of this
  // modal, not a gate in front of it — unless the parent says to resume
  // straight into checkout (see initialView doc comment above).
  useEffect(() => {
    if (isOpen) {
      setView(initialView ?? 'payment')
      setPaymentState('idle')
      setOtpCode('')
    }
  }, [isOpen, initialView])

  // Set by fetchClientSecret when it creates the Checkout Session, read by
  // handleCheckoutComplete for the fast direct-Stripe status check. A ref,
  // not state — it's write-once-per-session and only ever read from inside
  // the onComplete callback, so it doesn't need to trigger a re-render.
  const sessionIdRef = useRef<string | null>(null)

  const fetchClientSecret = useCallback(async () => {
    if (!effectiveUserId) throw new Error('createCheckoutSession called with no userId')
    const { clientSecret, sessionId } = await createCheckoutSession(effectiveUserId)
    sessionIdRef.current = sessionId
    return clientSecret
  }, [effectiveUserId])

  async function handleCheckoutComplete() {
    setPaymentState('confirming')

    const sessionId = sessionIdRef.current
    if (sessionId) {
      for (let i = 0; i < 4; i++) {
        try {
          const status = await getCheckoutSessionStatus(sessionId)
          // 'no_payment_required' is what a 100%-off promotion code produces.
          if (status === 'paid' || status === 'no_payment_required') break
        } catch (err) {
          console.error('[PaywallModal] getCheckoutSessionStatus error:', err)
        }
        await new Promise((resolve) => setTimeout(resolve, 400))
      }
    }
    setPaymentState('confirmed')

    // Real gate — see file header. Generous window: this poll routinely
    // succeeding within a couple seconds is the point of the fast check
    // above; this budget is for the rare case it doesn't.
    let attempts = 0
    const poll = async () => {
      attempts++
      const paid = await fetchIsPaid(effectiveUserId)
      if (paid) {
        onPaymentConfirmed()
        return
      }
      if (attempts >= 30) {
        setPaymentState('delayed')
        return
      }
      setTimeout(poll, 1500)
    }
    poll()
  }

  const checkoutOptions = useMemo(
    () => ({ fetchClientSecret, onComplete: handleCheckoutComplete }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchClientSecret]
  )

  if (!isOpen) return null

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  }

  function flashError() {
    setInputError(true)
    setTimeout(() => setInputError(false), 1200)
  }

  function handleUnlockClick() {
    setView(effectiveIsAuthenticated ? 'checkout' : 'login')
  }

  // Active path today: sends the magic link (the default Supabase template
  // only renders {{ .ConfirmationURL }}, no code) and lands on 'confirm'.
  // Once a custom template with {{ .Token }} exists, point this at 'otp'
  // instead to reactivate the inline-code path built below.
  async function handleSendLink() {
    if (!isValidEmail(email)) {
      flashError()
      return
    }
    setIsLoading(true)
    try {
      const supabase = createClient()
      const raw = localStorage.getItem('known_session')
      const session = raw ? JSON.parse(raw) : { questionOrder: [], responses: [] }

      const { data, error } = await supabase
        .from('anonymous_sessions')
        .insert({ responses: session })
        .select('id')
        .single()
      if (error) throw error
      if (data?.id) localStorage.setItem('known_pending_session_id', data.id as string)

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (otpError) throw otpError

      // Only mark "resume into checkout on return" once the email actually
      // sent — an invalid address or a failed request shouldn't leave a
      // stale flag that fires on some unrelated future sign-in.
      localStorage.setItem(POST_AUTH_REOPEN_KEY, '1')
      localStorage.setItem(POST_AUTH_PATH_KEY, window.location.pathname)

      setSubmittedEmail(email)
      setView('confirm')
    } catch (err) {
      console.error('[PaywallModal] send link error:', err)
      flashError()
    } finally {
      setIsLoading(false)
    }
  }

  // Dormant — not navigated to from any active view right now (see file
  // header). Fully wired for when the email template is unblocked.
  async function handleVerifyCode() {
    if (otpCode.trim().length < 6) {
      flashError()
      return
    }
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode.trim(), type: 'email' })
      if (error) throw error
      if (!data.user) throw new Error('verifyOtp succeeded but returned no user')

      const sessionId = localStorage.getItem('known_pending_session_id')
      if (sessionId) {
        await supabase.from('anonymous_sessions').update({ claimed_by: data.user.id }).eq('id', sessionId)
        localStorage.removeItem('known_pending_session_id')
      }

      setLocalUserId(data.user.id)
      onAuthenticated(data.user.id)
      setView('checkout')
    } catch (err) {
      console.error('[PaywallModal] verify code error:', err)
      flashError()
    } finally {
      setIsLoading(false)
    }
  }

  const isCheckout = view === 'checkout'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: 'rgba(38,36,32,0.55)', backdropFilter: 'blur(3px)', zIndex: 3000 }}
      onClick={onClose}
    >
      <div
        className="bg-cream w-full flex flex-col"
        style={{
          maxWidth: isCheckout ? 480 : 400,
          borderRadius: 18,
          padding: '32px 28px 26px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          animation: 'modalReveal 0.3s ease both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'payment' && (
          <>
            <p className="font-sans font-semibold uppercase text-muted text-center" style={{ fontSize: 11, letterSpacing: '0.07em', marginBottom: 10 }}>
              Unlock your full report
            </p>
            <p className="font-serif font-medium text-charcoal text-center" style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 20 }}>
              You&apos;ve found {traitCount} {traitWord}. There&apos;s more underneath.
            </p>

            <ul style={{ listStyle: 'none', margin: '0 0 22px', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {USP_ITEMS.map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{
                    flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                    background: '#EFEBDF', color: '#56534D',
                    fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 1,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif', fontSize: 13.5, lineHeight: 1.5, color: '#56534D',
                  }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-baseline justify-center gap-2" style={{ marginBottom: 22 }}>
              <span className="font-serif text-charcoal" style={{ fontSize: 30, fontStyle: 'italic' }}>€49</span>
              <span className="font-sans text-muted" style={{ fontSize: 12.5 }}>one payment, not a subscription</span>
            </div>

            <button
              onClick={handleUnlockClick}
              className="w-full font-sans font-medium text-cream bg-charcoal"
              style={{ fontSize: 15, borderRadius: 10, padding: 15, marginBottom: 12 }}
            >
              Unlock the full picture →
            </button>
            <button onClick={onClose} className="font-sans text-muted underline text-center w-full" style={{ fontSize: 12.5 }}>
              Not now
            </button>
          </>
        )}

        {view === 'login' && (
          <>
            <p className="font-sans font-semibold uppercase text-muted text-center" style={{ fontSize: 11, letterSpacing: '0.07em', marginBottom: 10 }}>
              {isReturning ? 'Welcome back' : 'One more step'}
            </p>
            <p className="font-serif font-medium text-charcoal text-center" style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 12 }}>
              {isReturning ? 'Sign in to continue' : 'Create an account to continue'}
            </p>
            <p className="font-sans text-charcoal-soft text-center" style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 24 }}>
              {isReturning
                ? "Enter your email and we'll send you a link to get back in."
                : "Leave your email and we'll get you set up — then you can unlock the full report."}
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendLink() }}
              placeholder="Your email address"
              className="w-full font-sans text-charcoal bg-white outline-none"
              style={{
                fontSize: 15, padding: '14px 16px', borderRadius: 10,
                border: `1.5px solid ${inputError ? 'hsl(8, 60%, 55%)' : '#E5E1D5'}`,
                marginBottom: 12, transition: 'border-color 0.15s',
              }}
            />
            <button
              onClick={handleSendLink}
              disabled={isLoading}
              className="w-full font-sans font-medium text-cream bg-charcoal"
              style={{ fontSize: 15, borderRadius: 10, padding: 15, marginBottom: 12 }}
            >
              {isLoading ? 'Sending…' : isReturning ? 'Send sign-in link' : 'Continue →'}
            </button>
            <p className="font-sans text-muted text-center" style={{ fontSize: 12, marginBottom: 16 }}>
              No password needed. We&apos;ll send a link.
            </p>
            <button
              onClick={() => setIsReturning((v) => !v)}
              className="font-sans text-muted underline text-center w-full"
              style={{ fontSize: 12.5, marginBottom: 16 }}
            >
              {isReturning ? 'New here? Create an account instead' : 'Already have an account? Sign in'}
            </button>
            <div className="w-full h-px bg-line" style={{ marginBottom: 16 }} />
            <button onClick={() => setView('payment')} className="font-sans text-muted underline text-center w-full" style={{ fontSize: 12.5 }}>
              Back
            </button>
          </>
        )}

        {view === 'confirm' && (
          <>
            <p className="font-serif font-medium text-charcoal text-center" style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 14 }}>
              Check your email
            </p>
            <p className="font-sans text-charcoal-soft text-center" style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 24 }}>
              We sent a link to <span className="font-medium text-charcoal">{submittedEmail}</span>.
              {isReturning ? ' Click it to sign back in, then come back here to unlock the rest.' : ' Click it, then come back here to unlock the rest.'}
            </p>
            <button onClick={onClose} className="font-sans text-muted underline text-center w-full" style={{ fontSize: 12.5 }}>
              Close
            </button>
          </>
        )}

        {/* Dormant — see file header. Not reachable from any active button
            right now; kept fully wired for when the email template is
            unblocked (custom SMTP or plan upgrade). */}
        {view === 'otp' && (
          <>
            <p className="font-sans font-semibold uppercase text-muted text-center" style={{ fontSize: 11, letterSpacing: '0.07em', marginBottom: 10 }}>
              Check your email
            </p>
            <p className="font-serif font-medium text-charcoal text-center" style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 12 }}>
              Enter your code
            </p>
            <p className="font-sans text-charcoal-soft text-center" style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 24 }}>
              We sent a 6-digit code to <span className="font-medium text-charcoal">{email}</span>. Type it below to continue — you don&apos;t need to leave this page.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyCode() }}
              placeholder="000000"
              className="w-full font-sans text-charcoal bg-white outline-none text-center"
              style={{
                fontSize: 22, letterSpacing: '0.3em', padding: '14px 16px', borderRadius: 10,
                border: `1.5px solid ${inputError ? 'hsl(8, 60%, 55%)' : '#E5E1D5'}`,
                marginBottom: 12, transition: 'border-color 0.15s',
              }}
            />
            <button
              onClick={handleVerifyCode}
              disabled={isLoading}
              className="w-full font-sans font-medium text-cream bg-charcoal"
              style={{ fontSize: 15, borderRadius: 10, padding: 15, marginBottom: 12 }}
            >
              {isLoading ? 'Verifying…' : 'Verify and continue →'}
            </button>
            <button
              onClick={handleSendLink}
              disabled={isLoading}
              className="font-sans text-muted underline text-center w-full"
              style={{ fontSize: 12.5, marginBottom: 16 }}
            >
              Resend code
            </button>
            <div className="w-full h-px bg-line" style={{ marginBottom: 16 }} />
            <button onClick={() => setView('login')} className="font-sans text-muted underline text-center w-full" style={{ fontSize: 12.5 }}>
              Use a different email
            </button>
          </>
        )}

        {view === 'checkout' && (
          <>
            {paymentState === 'idle' && (
              <>
                <button onClick={() => setView('payment')} className="font-sans text-muted underline text-left" style={{ fontSize: 12.5, marginBottom: 16 }}>
                  ← Back
                </button>
                {effectiveUserId ? (
                  <EmbeddedCheckoutProvider stripe={stripePromise} options={checkoutOptions}>
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                ) : (
                  <p className="font-sans text-muted text-center" style={{ fontSize: 13.5 }}>Loading your account…</p>
                )}
              </>
            )}
            {paymentState === 'confirming' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 0' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: '3px solid #E5E1D5', borderTopColor: '#1C1C1A',
                  animation: 'orbit 0.8s linear infinite',
                  marginBottom: 20,
                }} />
                <p className="font-sans text-charcoal-soft text-center" style={{ fontSize: 14 }}>
                  Confirming your payment…
                </p>
              </div>
            )}
            {paymentState === 'confirmed' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', background: '#3D6B5C',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20, animation: 'blobReveal 0.35s ease both',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#F7F4ED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="font-serif font-medium text-charcoal text-center" style={{ fontSize: 19, marginBottom: 8 }}>
                  Payment confirmed
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 13, height: 13, borderRadius: '50%',
                    border: '2px solid #E5E1D5', borderTopColor: '#8C8A83',
                    animation: 'orbit 0.8s linear infinite',
                  }} />
                  <p className="font-sans text-muted text-center" style={{ fontSize: 13 }}>
                    Unlocking your report…
                  </p>
                </div>
              </div>
            )}
            {paymentState === 'delayed' && (
              <>
                <p className="font-serif font-medium text-charcoal text-center" style={{ fontSize: 19, lineHeight: 1.3, marginTop: 24, marginBottom: 14 }}>
                  Payment confirmed
                </p>
                <p className="font-sans text-charcoal-soft text-center" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                  Your payment went through, but unlocking your report is taking longer than expected. Give it a moment and refresh the page — if it still hasn&apos;t unlocked, get in touch and we&apos;ll sort it out.
                </p>
                <button onClick={onClose} className="font-sans text-muted underline text-center w-full" style={{ fontSize: 12.5 }}>
                  Close
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
