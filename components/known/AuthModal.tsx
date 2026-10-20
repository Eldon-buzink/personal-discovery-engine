'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EmailLinkSent, { sendSignInLink } from '@/components/known/EmailLinkStep'
import { saveAnonymousSession } from '@/app/actions/anonymousSession'
import { POST_AUTH_REOPEN_KEY, POST_AUTH_PATH_KEY } from '@/components/known/PaywallModal'
import { SAVED_PROGRESS_KEY } from '@/lib/known/progressAutosave'

// Sign-in is by link (components/known/EmailLinkStep.tsx): the link works in
// any browser, and /auth/claim brings saved progress over to it.
type ModalView = 'email' | 'sent'

// Two known triggers — each its own `context`, both free (no payment
// step, that's PaywallModal's job):
//   - 'save-progress': saving the in-progress full assessment so it can be
//     picked up later, on any device. Opened from "Finish later" in the
//     assessment's top bar at any question count (`leaving`), and after
//     the first trait reveal (the "keep going" prompt). Saves the session
//     to anonymous_sessions with the email, then emails the link.
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
// context, mirroring the saved session's role for the save-progress
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
  // 'save-progress' only: answers so far.
  questionCount?: number
  // 'save-progress' only: opened by "Finish later", so the way out leaves
  // the assessment instead of closing back into it.
  leaving?: boolean
  // 'mini-assessment-signup' only — the mini_assessment_results row id to
  // claim once auth resolves.
  miniAssessmentResultId?: string
  // 'mini-assessment-signup' only — where the claim page should send the
  // user back to (the practice home, once it exists) after a successful
  // claim. Passed through rather than hardcoded here since this modal has
  // no reason to know that route.
  returnPath?: string
}

// Where "Finish later" and "Exit without saving" take the person.
const EXIT_PATH = '/onboarding'

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  context = 'save-progress',
  questionCount = 0,
  leaving = false,
  miniAssessmentResultId,
  returnPath,
}: AuthModalProps) {
  const router = useRouter()
  const [view, setView] = useState<ModalView>('email')
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [waitSeconds, setWaitSeconds] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [inputError, setInputError] = useState(false)
  // No server-side account lookup — this just flips the copy so a returning
  // user isn't told to "create an account." The actual submit action
  // (signInWithOtp) is identical either way; passwordless sign-in doesn't
  // need to know signup vs. login intent.
  const [isReturning, setIsReturning] = useState(false)

  if (!isOpen) return null

  const isMiniAssessment = context === 'mini-assessment-signup'
  const nextQuestion = questionCount + 1

  function flashError() {
    setInputError(true)
    setTimeout(() => setInputError(false), 1200)
  }

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  }

  async function handleSubmit() {
    const address = email.trim()
    if (!isValidEmail(address)) {
      flashError()
      return
    }

    setIsLoading(true)
    try {
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
        // The whole local session (answers, question order, revealed
        // traits, report text) is saved with the email, so the link can
        // bring it back on another device. From here on the assessment
        // keeps that saved copy up to date (lib/known/progressAutosave.ts).
        const raw = localStorage.getItem('known_session')
        const session = raw ? JSON.parse(raw) : { questionOrder: [], responses: [] }
        const { id } = await saveAnonymousSession(session, address)
        localStorage.setItem('known_pending_session_id', id)
        localStorage.setItem(SAVED_PROGRESS_KEY, id)
      }

      const { waitSeconds: wait } = await sendSignInLink(address)
      setWaitSeconds(wait)
      setSubmittedEmail(address)
      setView('sent')
      onSuccess()
    } catch (err) {
      console.error('[AuthModal] handleSubmit error:', err instanceof Error ? err.message : 'unknown error')
      flashError()
    } finally {
      setIsLoading(false)
    }
  }

  function exitWithoutSaving() {
    if (leaving) router.push(EXIT_PATH)
    else onClose()
  }

  const eyebrow = isReturning ? 'Welcome back' : isMiniAssessment ? 'One more step' : 'Finish later'
  const headline = isReturning
    ? 'Sign in to keep going'
    : isMiniAssessment
      ? 'Create a free account to track this'
      : 'Your progress is safe with us'
  const body = isReturning
    ? "Enter your email and we'll send you a link back in."
    : isMiniAssessment
      ? "No payment, no verdict, just a daily check-in on what you noticed. Leave your email and we'll set you up."
      : `You're ${questionCount} ${questionCount === 1 ? 'question' : 'questions'} in, nicely done. Leave your email and we'll send a link that takes you back to exactly where you stopped.`
  const submitLabel = isReturning ? 'Send my link' : isMiniAssessment ? 'Continue' : 'Save and send my link'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: 'rgba(38,36,32,0.55)', backdropFilter: 'blur(3px)', zIndex: 3000 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-heading"
    >
      <div
        className="bg-cream w-full max-w-[420px] flex flex-col"
        style={{
          borderRadius: 18,
          padding: '32px 28px 24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          animation: 'modalReveal 0.3s ease both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'email' ? (
          <>
            <p className="font-sans text-meta text-muted text-center" style={{ marginBottom: 8 }}>
              {eyebrow}
            </p>
            <p id="auth-modal-heading" className="font-display font-normal text-display-3 text-charcoal text-center" style={{ marginBottom: 10 }}>
              {headline}
            </p>
            <p className="font-sans text-body text-charcoal-soft text-center" style={{ marginBottom: 22 }}>
              {body}
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit()
              }}
              placeholder="Your email address"
              aria-label="Your email address"
              autoComplete="email"
              className="w-full font-sans text-body text-charcoal bg-white outline-none"
              style={{
                padding: '13px 16px',
                borderRadius: 10,
                border: `1.5px solid ${inputError ? 'hsl(8, 60%, 55%)' : '#E5E1D5'}`,
                marginBottom: 10,
                transition: 'border-color 0.15s',
              }}
            />

            {!isMiniAssessment && !isReturning && (
              <p className="font-sans text-meta text-muted" style={{ marginBottom: 14 }}>
                We only use your email to save your answers, send you this link, and send one reminder if you
                haven&apos;t finished. Unfinished progress is deleted after 30 days.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full font-sans font-medium text-ui text-cream bg-charcoal"
              style={{ borderRadius: 999, padding: 15, marginBottom: 6, opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? 'Sending…' : submitLabel}
            </button>

            <button
              onClick={() => setIsReturning((v) => !v)}
              className="font-sans text-meta text-muted underline text-center w-full"
              style={{ minHeight: 44 }}
            >
              {isReturning ? 'New here? Save your progress instead' : 'Already have an account? Sign in'}
            </button>

            <div className="w-full h-px bg-line" style={{ margin: '4px 0 6px' }} />

            {isMiniAssessment ? (
              <button onClick={onClose} className="font-sans text-meta text-muted underline text-center w-full" style={{ minHeight: 44 }}>
                Not now
              </button>
            ) : (
              <>
                <button onClick={exitWithoutSaving} className="font-sans text-meta text-charcoal underline text-center w-full" style={{ minHeight: 44 }}>
                  {leaving ? 'Exit without saving' : 'Not now, keep going'}
                </button>
                <p className="font-sans text-meta text-muted text-center">
                  Without an email, your progress is kept on this device only.
                </p>
              </>
            )}
          </>
        ) : isMiniAssessment || isReturning ? (
          <EmailLinkSent
            email={submittedEmail}
            waitSeconds={waitSeconds}
            onChangeEmail={() => { setView('email'); setEmail('') }}
          />
        ) : (
          <EmailLinkSent
            email={submittedEmail}
            waitSeconds={waitSeconds}
            heading="Saved. Check your inbox"
            detail={<>Open it on any device to continue from question {nextQuestion}. Your progress is kept for 30 days.</>}
            onChangeEmail={() => { setView('email'); setEmail('') }}
            actions={
              <button
                onClick={() => (leaving ? router.push(EXIT_PATH) : onClose())}
                className="w-full font-sans font-medium text-ui text-cream bg-charcoal"
                style={{ borderRadius: 999, padding: 15 }}
              >
                {leaving ? 'Done' : 'Keep going'}
              </button>
            }
          />
        )}
      </div>
    </div>
  )
}
