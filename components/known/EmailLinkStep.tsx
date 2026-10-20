'use client'

import { useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

// Sign-in is by link only. The emails (supabase/templates) link to
// /auth/confirm with a token hash, which signs the person in in whatever
// browser opens it, so starting in an Instagram or Pinterest browser and
// opening the email in Safari works: /auth/claim then brings their saved
// progress over.

export async function sendSignInLink(email: string): Promise<void> {
  // emailRedirectTo is only used by the default Supabase templates
  // ({{ .ConfirmationURL }}); ours build the /auth/confirm link themselves.
  const { error } = await createClient().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw error
}

const sage = '#3D6B5C'

function MailMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center"
      style={{ width: 48, height: 48, borderRadius: 999, background: 'rgba(61,107,92,0.1)', color: sage, marginBottom: 16 }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
        <path d="M4 7.5l8 6 8-6" />
      </svg>
    </span>
  )
}

// The "check your inbox" step after the email is sent: who it went to,
// what the link does (`detail`), the caller's own buttons (`actions`), then
// send it again or use another address.
export default function EmailLinkSent({
  email,
  heading = 'Check your inbox',
  detail = 'It works for 24 hours, on any device.',
  onChangeEmail,
  actions,
  variant = 'modal',
}: {
  email: string
  heading?: string
  detail?: ReactNode
  onChangeEmail: () => void
  actions?: ReactNode
  // 'modal': centred (AuthModal, PaywallModal, the expired-link page).
  // 'inline': left-aligned, for the home page's welcome-back box.
  variant?: 'modal' | 'inline'
}) {
  const [resent, setResent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const inline = variant === 'inline'

  async function resend() {
    setBusy(true)
    setFailed(false)
    try {
      await sendSignInLink(email)
      setResent(true)
    } catch (err) {
      console.error('[EmailLinkSent] resend error:', err instanceof Error ? err.message : 'unknown error')
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const linkStyle = { background: 'none', border: 'none', padding: 0, minHeight: 44 } as const

  return (
    <div className={inline ? 'text-left' : 'flex flex-col items-center text-center'}>
      {!inline && <MailMark />}
      {!inline && (
        <p className="font-display font-normal text-display-3 text-charcoal" style={{ marginBottom: 10 }}>
          {heading}
        </p>
      )}
      <p className="font-sans text-body text-charcoal-soft">
        We sent a link to{inline ? ' ' : <br />}
        <span className="font-medium text-charcoal" style={{ overflowWrap: 'anywhere' }}>{email}</span>
      </p>
      <p className="font-sans text-ui font-normal text-muted" style={{ marginTop: 8, marginBottom: inline ? 4 : 24, maxWidth: 320 }}>
        {detail}
      </p>
      {actions && <div className="w-full">{actions}</div>}
      <div className={`flex items-center gap-3 ${inline ? '' : 'justify-center'}`} style={{ marginTop: actions ? 8 : 0 }}>
        <button
          type="button"
          onClick={resend}
          disabled={busy || resent}
          className="font-sans text-meta text-muted hover:text-charcoal underline underline-offset-2"
          style={{ ...linkStyle, cursor: busy || resent ? 'default' : 'pointer' }}
        >
          {failed ? 'Could not send. Try again' : resent ? 'Sent again' : busy ? 'Sending…' : 'Send it again'}
        </button>
        <span aria-hidden="true" className="text-meta text-muted">·</span>
        <button
          type="button"
          onClick={onChangeEmail}
          className="font-sans text-meta text-muted hover:text-charcoal underline underline-offset-2"
          style={{ ...linkStyle, cursor: 'pointer' }}
        >
          Use a different email
        </button>
      </div>
    </div>
  )
}
