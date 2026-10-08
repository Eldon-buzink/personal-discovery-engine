'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// The one "enter the 6-digit code from your email" screen, used everywhere
// someone signs in: AuthModal (save progress, mini-assessment signup),
// PaywallModal (before checkout) and the home page's welcome-back box.
//
// The code is the main path because it finishes sign-in in the browser
// that started it. Ad traffic lands in Instagram/Pinterest in-app browsers,
// and a magic link opens in a different browser (the system one), where
// the PKCE verifier and the visitor's progress don't exist. The email still
// carries the link as a fallback (/auth/callback, /auth/link-error).
//
// The caller sends the first email (signInWithOtp) and decides what happens
// after verification (onVerified). This component only verifies, resends,
// and offers a way back to change the address.

export function emailRedirectTo(): string {
  return `${window.location.origin}/auth/callback`
}

export async function sendSignInCode(email: string): Promise<void> {
  const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: emailRedirectTo() } })
  if (error) throw error
}

interface EmailCodeStepProps {
  email: string
  onVerified: (user: User) => void | Promise<void>
  onChangeEmail: () => void
  // 'modal': centered, with eyebrow + headline (AuthModal, PaywallModal).
  // 'inline': left-aligned and compact, for the home page hero.
  variant?: 'modal' | 'inline'
}

export default function EmailCodeStep({ email, onVerified, onChangeEmail, variant = 'modal' }: EmailCodeStepProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [inputError, setInputError] = useState(false)
  const [resent, setResent] = useState(false)
  const inline = variant === 'inline'
  const align = inline ? 'text-left' : 'text-center'

  function flashError() {
    setInputError(true)
    setTimeout(() => setInputError(false), 1200)
  }

  async function handleVerify() {
    const token = code.trim()
    if (!/^\d{6}$/.test(token)) {
      flashError()
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await createClient().auth.verifyOtp({ email, token, type: 'email' })
      if (error) throw error
      if (!data.user) throw new Error('No user returned')
      await onVerified(data.user)
    } catch (err) {
      console.error('[EmailCodeStep] verify error:', err instanceof Error ? err.message : 'unknown error')
      flashError()
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend() {
    setIsLoading(true)
    try {
      await sendSignInCode(email)
      setResent(true)
    } catch (err) {
      console.error('[EmailCodeStep] resend error:', err instanceof Error ? err.message : 'unknown error')
      flashError()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {!inline && (
        <>
          <p className="font-sans font-semibold uppercase text-muted text-center" style={{ fontSize: 11, letterSpacing: '0.07em', marginBottom: 10 }}>
            Check your email
          </p>
          <p className="font-serif font-medium text-charcoal text-center" style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 12 }}>
            Enter your code
          </p>
        </>
      )}
      <p className={`font-sans text-charcoal-soft ${align}`} style={{ fontSize: inline ? 14 : 13.5, lineHeight: 1.5, marginBottom: inline ? 14 : 24 }}>
        We sent a 6-digit code to <span className="font-medium text-charcoal">{email}</span>. Type it below.
        {!inline && <> You don&apos;t need to leave this page.</>}
      </p>

      <div style={inline ? { display: 'flex', gap: 10, maxWidth: 440 } : undefined}>
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
          className={`font-sans text-charcoal bg-white outline-none text-center ${inline ? '' : 'w-full'}`}
          style={{
            flex: inline ? 1 : undefined,
            fontSize: inline ? 18 : 22,
            letterSpacing: '0.3em',
            padding: inline ? '11px 14px' : '14px 16px',
            borderRadius: 10,
            border: `1.5px solid ${inputError ? 'hsl(8, 60%, 55%)' : '#E5E1D5'}`,
            marginBottom: inline ? 0 : 12,
            transition: 'border-color 0.15s',
          }}
        />
        <button
          onClick={handleVerify}
          disabled={isLoading}
          className={`font-sans font-medium text-cream bg-charcoal ${inline ? '' : 'w-full'}`}
          style={inline
            ? { fontSize: 14, borderRadius: 999, padding: '11px 20px', whiteSpace: 'nowrap', opacity: isLoading ? 0.6 : 1 }
            : { fontSize: 15, borderRadius: 10, padding: 15, marginBottom: 12, opacity: isLoading ? 0.6 : 1 }}
        >
          {isLoading ? 'Checking…' : inline ? 'Sign in' : 'Verify and continue →'}
        </button>
      </div>

      <p className={`font-sans text-muted ${align}`} style={{ fontSize: 12, lineHeight: 1.5, margin: inline ? '12px 0 8px' : '0 0 16px' }}>
        No code in the email? Use the link in it instead.
      </p>

      <div className={inline ? 'flex gap-4' : ''}>
        <button
          onClick={handleResend}
          disabled={isLoading}
          className={`font-sans text-muted underline ${inline ? '' : 'text-center w-full'}`}
          style={{ fontSize: 12.5, marginBottom: inline ? 0 : 16, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          {resent ? 'New code sent' : 'Send a new code'}
        </button>
        {!inline && <div className="w-full h-px bg-line" style={{ marginBottom: 16 }} />}
        <button
          onClick={onChangeEmail}
          className={`font-sans text-muted underline ${inline ? '' : 'text-center w-full'}`}
          style={{ fontSize: 12.5, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          Use a different email
        </button>
      </div>
    </>
  )
}
