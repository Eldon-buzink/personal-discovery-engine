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

// The "check your inbox" step after the email is sent: what was sent and to
// whom, send it again, or use another address. `heading` and `body` let the
// caller say what the link does; `actions` adds the caller's own buttons.
export default function EmailLinkSent({
  email,
  heading = 'Check your inbox',
  body,
  onChangeEmail,
  actions,
  variant = 'modal',
}: {
  email: string
  heading?: string
  body?: ReactNode
  onChangeEmail: () => void
  actions?: ReactNode
  // 'modal': centred (AuthModal, PaywallModal). 'inline': left-aligned, for
  // the home page's welcome-back box.
  variant?: 'modal' | 'inline'
}) {
  const [resent, setResent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const inline = variant === 'inline'
  const align = inline ? 'text-left' : 'text-center'

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

  return (
    <div className={align}>
      {!inline && (
        <p className="font-display font-normal text-display-3 text-charcoal" style={{ marginBottom: 10 }}>
          {heading}
        </p>
      )}
      <p className="font-sans text-body text-charcoal-soft" style={{ marginBottom: inline ? 12 : 22 }}>
        {body ?? <>We sent a link to <span className="font-medium text-charcoal">{email}</span>. It works for 24 hours, on any device.</>}
      </p>
      {actions}
      <div className={inline ? 'flex gap-5' : 'flex justify-center gap-5'} style={{ marginTop: actions ? 14 : 0 }}>
        <button
          type="button"
          onClick={resend}
          disabled={busy || resent}
          className="font-sans text-meta text-muted underline"
          style={{ background: 'none', border: 'none', padding: 0, minHeight: 44, cursor: busy || resent ? 'default' : 'pointer' }}
        >
          {failed ? 'Could not send. Try again' : resent ? 'Sent again' : busy ? 'Sending…' : 'Send it again'}
        </button>
        <button
          type="button"
          onClick={onChangeEmail}
          className="font-sans text-meta text-muted underline"
          style={{ background: 'none', border: 'none', padding: 0, minHeight: 44, cursor: 'pointer' }}
        >
          Use a different email
        </button>
      </div>
    </div>
  )
}
