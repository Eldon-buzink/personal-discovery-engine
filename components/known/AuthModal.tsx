'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { POST_AUTH_REOPEN_KEY, POST_AUTH_PATH_KEY } from '@/components/known/PaywallModal'

// 'code' is the main path: the user types the 6-digit code from the email
// right here, so sign-in finishes in the same browser that started it. That
// matters for ad traffic, which lands in Instagram/Pinterest in-app
// browsers: a magic link opens in a different browser (the system one),
// where the PKCE code verifier and this visitor's progress don't exist, so
// the link can't sign them in. The link in the email stays as a fallback.
type ModalView = 'email' | 'code'

// Two known triggers now — each its own `context`, both free (no payment
// step, that's PaywallModal's job):
//   - 'save-progress' (original, only trigger until the mini-assessment
//     signup gate needed a second one): the pre-cap "keep going" prompt
//     after the first Ring 1 reveal. Persists the in-progress full
//     assessment session to anonymous_sessions so it survives the
//     magic-link round trip.
//   - 'mini-assessment-signup': fires when a logged-out mini-assessment
//     user taps "Add to your daily check-ins" on the mini-assessment result
//     screen (handover §6). No assessment session to persist — instead
//     stamps PENDING_MINI_ASSESSMENT_ID_KEY so app/auth/claim/page.tsx can
//     claim the mini_assessment_results row and create the resulting
//     facet_activation once auth resolves. Sets POST_AUTH_REOPEN_KEY/
//     POST_AUTH_PATH_KEY the same way PaywallModal does, so the claim page
//     sends the user back to the practice home rather than /assessment.
//
// Every post-cap/unlock (paid) entry point still goes through PaywallModal
// instead — see that component for why these stayed separate rather than
// growing PaywallModal a signup-only mode. A third context here should stay
// the exception, not the default instinct — most new "ask for an email"
// moments belong on one of these two, not a fourth.
export type AuthModalContext = 'save-progress' | 'mini-assessment-signup'

// Read by app/auth/claim/page.tsx — set only for the mini-assessment-signup
// context, mirroring known_pending_session_id's role for the save-progress
// context. Claiming that row (and creating the facet_activation from it) is
// the claim page's job, not this modal's — this modal's only responsibility
// is authenticating the user and leaving a breadcrumb to what should be
// claimed once that succeeds.
export const PENDING_MINI_ASSESSMENT_ID_KEY = 'known_pending_mini_assessment_id'

export interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  context?: AuthModalContext
  // 'save-progress' only.
  questionCount?: number
  // 'mini-assessment-signup' only — the mini_assessment_results row id to
  // claim once auth resolves.
  miniAssessmentResultId?: string
  // 'mini-assessment-signup' only — where the claim page should send the
  // user back to (the practice home, once it exists) after a successful
  // claim. Passed through rather than hardcoded here since this modal has
  // no reason to know that route.
  returnPath?: string
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  context = 'save-progress',
  questionCount,
  miniAssessmentResultId,
  returnPath,
}: AuthModalProps) {
  const router = useRouter()
  const [view, setView] = useState<ModalView>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [inputError, setInputError] = useState(false)
  // No server-side account lookup — this just flips the copy so a returning
  // user isn't told to "create an account." The actual submit action
  // (signInWithOtp) is identical either way; passwordless sign-in doesn't
  // need to know signup vs. login intent.
  const [isReturning, setIsReturning] = useState(false)

  if (!isOpen) return null

  const isMiniAssessment = context === 'mini-assessment-signup'

  const headline = isReturning
    ? 'Sign in to keep going'
    : isMiniAssessment
      ? 'Create a free account to track this'
      : 'Save your progress to keep going'

  function flashError() {
    setInputError(true)
    setTimeout(() => setInputError(false), 1200)
  }

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  }

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      flashError()
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()

      if (isMiniAssessment) {
        // No assessment session to persist here — just leave a breadcrumb
        // to what app/auth/claim/page.tsx should claim once auth resolves.
        if (miniAssessmentResultId) {
          localStorage.setItem(PENDING_MINI_ASSESSMENT_ID_KEY, miniAssessmentResultId)
        }
        if (returnPath) {
          localStorage.setItem(POST_AUTH_REOPEN_KEY, '1')
          localStorage.setItem(POST_AUTH_PATH_KEY, returnPath)
        }
      } else {
        const raw = localStorage.getItem('known_session')
        // Store the full session object (responses + questionOrder + patternShown)
        // The responses jsonb column holds the entire session so it can be restored later
        const session = raw ? JSON.parse(raw) : { questionOrder: [], responses: [] }

        console.log('[AuthModal] inserting session to anonymous_sessions, responses:', session.responses?.length ?? 0)
        const { data, error } = await supabase
          .from('anonymous_sessions')
          .insert({ responses: session })
          .select('id')
          .single()

        if (error) throw error
        console.log('[AuthModal] insert ok, row id:', data?.id)

        if (data?.id) {
          localStorage.setItem('known_pending_session_id', data.id as string)
        }
      }

      await sendCode(email)
      setSubmittedEmail(email)
      setCode('')
      setView('code')
      onSuccess()
    } catch (err) {
      console.error('[AuthModal] handleSubmit error:', err)
      flashError()
    } finally {
      setIsLoading(false)
    }
  }

  // The email carries both a 6-digit code and a link (emailRedirectTo is
  // kept for the link fallback).
  async function sendCode(address: string) {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  }

  async function handleResend() {
    setIsLoading(true)
    try {
      await sendCode(submittedEmail)
    } catch (err) {
      console.error('[AuthModal] resend error:', err instanceof Error ? err.message : 'unknown error')
      flashError()
    } finally {
      setIsLoading(false)
    }
  }

  // On success the session cookie is set in this browser; /auth/claim then
  // links the saved progress (or the mini-assessment result) to the account
  // and returns the user to where they were, exactly as after a link click.
  async function handleVerify() {
    const token = code.trim()
    if (!/^\d{6}$/.test(token)) {
      flashError()
      return
    }
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({ email: submittedEmail, token, type: 'email' })
      if (error) throw error
      router.push('/auth/claim')
    } catch (err) {
      console.error('[AuthModal] verify error:', err instanceof Error ? err.message : 'unknown error')
      flashError()
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
        {view === 'email' ? (
          <>
            <p
              className="font-sans font-semibold uppercase text-muted text-center"
              style={{ fontSize: 11, letterSpacing: '0.07em', marginBottom: 10 }}
            >
              {isReturning ? 'Welcome back' : isMiniAssessment ? 'One more step' : 'Save your progress'}
            </p>

            <p
              className="font-serif font-medium text-charcoal text-center"
              style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 12 }}
            >
              {headline}
            </p>

            <p
              className="font-sans text-charcoal-soft text-center"
              style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 24 }}
            >
              {isReturning
                ? "Enter your email and we'll send you a code to get back in."
                : isMiniAssessment
                  ? "No payment, no verdict — just a daily check-in on what you noticed. Leave your email and we'll set you up."
                  : `You've answered ${questionCount} questions. Leave your email and we'll make sure none of it disappears.`}
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit()
              }}
              placeholder="Your email address"
              className="w-full font-sans text-charcoal bg-white outline-none"
              style={{
                fontSize: 15,
                padding: '14px 16px',
                borderRadius: 10,
                border: `1.5px solid ${inputError ? 'hsl(8, 60%, 55%)' : '#E5E1D5'}`,
                marginBottom: 12,
                transition: 'border-color 0.15s',
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full font-sans font-medium text-cream bg-charcoal"
              style={{ fontSize: 15, borderRadius: 10, padding: 15, marginBottom: 12 }}
            >
              {isLoading ? 'Sending…' : isReturning ? 'Send sign-in code' : isMiniAssessment ? 'Continue →' : 'Save and continue'}
            </button>

            <p
              className="font-sans text-muted text-center"
              style={{ fontSize: 12, marginBottom: 16 }}
            >
              No password needed. We&apos;ll email you a 6-digit code.
            </p>

            <button
              onClick={() => setIsReturning((v) => !v)}
              className="font-sans text-muted underline text-center w-full"
              style={{ fontSize: 12.5, marginBottom: 16 }}
            >
              {isReturning ? 'New here? Create an account instead' : 'Already have an account? Sign in'}
            </button>

            <div className="w-full h-px bg-line" style={{ marginBottom: 16 }} />

            <button
              onClick={onClose}
              className="font-sans text-muted underline text-center w-full"
              style={{ fontSize: 12.5 }}
            >
              {isMiniAssessment ? 'Not now' : "Skip — I don't mind starting over"}
            </button>
          </>
        ) : (
          <>
            <p
              className="font-sans font-semibold uppercase text-muted text-center"
              style={{ fontSize: 11, letterSpacing: '0.07em', marginBottom: 10 }}
            >
              Check your email
            </p>
            <p
              className="font-serif font-medium text-charcoal text-center"
              style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 12 }}
            >
              Enter your code
            </p>
            <p
              className="font-sans text-charcoal-soft text-center"
              style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 24 }}
            >
              We sent a 6-digit code to{' '}
              <span className="font-medium text-charcoal">{submittedEmail}</span>. Type it below.
              You don&apos;t need to leave this page.
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerify()
              }}
              placeholder="000000"
              aria-label="6-digit code"
              className="w-full font-sans text-charcoal bg-white outline-none text-center"
              style={{
                fontSize: 22,
                letterSpacing: '0.3em',
                padding: '14px 16px',
                borderRadius: 10,
                border: `1.5px solid ${inputError ? 'hsl(8, 60%, 55%)' : '#E5E1D5'}`,
                marginBottom: 12,
                transition: 'border-color 0.15s',
              }}
            />

            <button
              onClick={handleVerify}
              disabled={isLoading}
              className="w-full font-sans font-medium text-cream bg-charcoal"
              style={{ fontSize: 15, borderRadius: 10, padding: 15, marginBottom: 12 }}
            >
              {isLoading ? 'Checking…' : 'Verify and continue →'}
            </button>

            <p
              className="font-sans text-muted text-center"
              style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}
            >
              No code in the email? Use the link in it instead.
            </p>

            <button
              onClick={handleResend}
              disabled={isLoading}
              className="font-sans text-muted underline text-center w-full"
              style={{ fontSize: 12.5, marginBottom: 16 }}
            >
              Send a new code
            </button>

            <div className="w-full h-px bg-line" style={{ marginBottom: 16 }} />

            <button
              onClick={() => {
                setView('email')
                setEmail('')
                setCode('')
              }}
              className="font-sans text-muted underline text-center w-full"
              style={{ fontSize: 12.5 }}
            >
              Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  )
}
