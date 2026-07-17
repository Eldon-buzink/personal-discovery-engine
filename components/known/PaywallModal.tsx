'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * The single modal for every post-cap/unlock entry point (top-right nav CTA,
 * the consolidated branch suggestion card, the sticky bar, the continue-Ring-1
 * prompt). Distinct from AuthModal, which stays scoped to its one original
 * trigger — the pre-cap "keep going" save-progress prompt after the first
 * reveal — per the explicit "two distinct modals" requirement.
 *
 * Always opens on the payment view (pricing + USP bullets, pulled verbatim
 * from app/(site)/pricing/page.tsx) regardless of auth state — that's what
 * makes this read as an actual paywall rather than a login form. Login is a
 * secondary step, only entered if an unauthenticated user actually tries to
 * act on "Unlock the full picture"; an already-authenticated user skips
 * straight past it to the (stubbed) checkout action.
 *
 * The final checkout action is a stub, same as pricing's own `href="#checkout"`
 * — no Stripe/checkout integration exists anywhere in this codebase yet.
 * Wire this up for real once that exists.
 */

type PaywallView = 'payment' | 'login' | 'confirm'

export interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  isAuthenticated: boolean
  traitCount: number
}

const USP_ITEMS = [
  "See how your patterns actually play out — in how you connect, work, and decide what's next",
  'Five more branches, each grounded in a different part of your life, added to the same report',
  'Concrete things worth trying, not just things about yourself',
  'One payment. Yours for as long as you want it.',
]

export default function PaywallModal({ isOpen, onClose, isAuthenticated, traitCount }: PaywallModalProps) {
  const traitWord = traitCount === 1 ? 'pattern' : 'patterns'
  const [view, setView] = useState<PaywallView>('payment')
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [inputError, setInputError] = useState(false)
  // No server-side account lookup — this just flips the copy on the login
  // step so a returning user isn't told to "create an account." The submit
  // action (signInWithOtp) is identical either way.
  const [isReturning, setIsReturning] = useState(false)

  // Always re-open on the payment view — the paywall content is the point of
  // this modal, not a gate in front of it.
  useEffect(() => {
    if (isOpen) setView('payment')
  }, [isOpen])

  if (!isOpen) return null

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  }

  function flashError() {
    setInputError(true)
    setTimeout(() => setInputError(false), 1200)
  }

  function handleUnlockClick() {
    if (isAuthenticated) {
      // Stub — no checkout integration exists yet, same as pricing's own href="#checkout".
      console.log('[PaywallModal] checkout not implemented yet')
      return
    }
    setView('login')
  }

  async function handleLoginSubmit() {
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

      setSubmittedEmail(email)
      setView('confirm')
    } catch (err) {
      console.error('[PaywallModal] login submit error:', err)
      flashError()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: 'rgba(38,36,32,0.55)', backdropFilter: 'blur(3px)', zIndex: 3000 }}
      onClick={onClose}
    >
      <div
        className="bg-cream w-full max-w-[400px] flex flex-col"
        style={{
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

            <ul style={{ listStyle: 'none', margin: '0 0 22px', padding: 0 }}>
              {USP_ITEMS.map((item, i) => (
                <li key={i} style={{
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: 13.5, lineHeight: 1.5, padding: '10px 0',
                  borderTop: i === 0 ? 'none' : '1px solid #E5E1D5', color: '#56534D',
                }}>
                  {item}
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
              onKeyDown={(e) => { if (e.key === 'Enter') handleLoginSubmit() }}
              placeholder="Your email address"
              className="w-full font-sans text-charcoal bg-white outline-none"
              style={{
                fontSize: 15, padding: '14px 16px', borderRadius: 10,
                border: `1.5px solid ${inputError ? 'hsl(8, 60%, 55%)' : '#E5E1D5'}`,
                marginBottom: 12, transition: 'border-color 0.15s',
              }}
            />
            <button
              onClick={handleLoginSubmit}
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
      </div>
    </div>
  )
}
