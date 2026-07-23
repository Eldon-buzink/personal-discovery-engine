'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ModalView = 'email' | 'confirm'

// This modal is scoped to exactly one trigger now: the pre-cap "keep going"
// prompt after the first Ring 1 reveal (save-progress framing only). Every
// post-cap/unlock entry point goes through PaywallModal instead — see that
// component for why these stayed as two distinct modals rather than one
// growing a third context here.
export interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  questionCount: number
  onSuccess: () => void
}

export default function AuthModal({
  isOpen,
  onClose,
  questionCount,
  onSuccess,
}: AuthModalProps) {
  const [view, setView] = useState<ModalView>('email')
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [inputError, setInputError] = useState(false)
  // No server-side account lookup — this just flips the copy so a returning
  // user isn't told to "create an account." The actual submit action
  // (signInWithOtp) is identical either way; magic-link auth doesn't need to
  // know signup vs. login intent.
  const [isReturning, setIsReturning] = useState(false)

  if (!isOpen) return null

  const headline = isReturning ? 'Sign in to keep going' : 'Save your progress to keep going'

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

      console.log('[AuthModal] calling signInWithOtp for', email)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (otpError) throw otpError
      console.log('[AuthModal] OTP sent successfully')

      setSubmittedEmail(email)
      setView('confirm')
      onSuccess()
    } catch (err) {
      console.error('[AuthModal] handleSubmit error:', err)
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
        {view === 'email' ? (
          <>
            <p
              className="font-sans font-semibold uppercase text-muted text-center"
              style={{ fontSize: 11, letterSpacing: '0.07em', marginBottom: 10 }}
            >
              {isReturning ? 'Welcome back' : 'Save your progress'}
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
                ? "Enter your email and we'll send you a link to get back in."
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
              {isLoading ? 'Sending…' : isReturning ? 'Send sign-in link' : 'Save and continue'}
            </button>

            <p
              className="font-sans text-muted text-center"
              style={{ fontSize: 12, marginBottom: 16 }}
            >
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

            <button
              onClick={onClose}
              className="font-sans text-muted underline text-center w-full"
              style={{ fontSize: 12.5 }}
            >
              Skip — I don&apos;t mind starting over
            </button>
          </>
        ) : (
          <>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: '#3D6B5C',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', animation: 'blobReveal 0.35s ease both',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#F7F4ED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p
              className="font-serif font-medium text-charcoal text-center"
              style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 14 }}
            >
              Check your email
            </p>

            <p
              className="font-sans text-charcoal-soft text-center"
              style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 24 }}
            >
              We sent a link to{' '}
              <span className="font-medium text-charcoal">{submittedEmail}</span>. Click it
              {isReturning ? ' to sign back in.' : ' to save your progress and keep going.'}
            </p>

            <button
              onClick={() => {
                setView('email')
                setEmail('')
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
