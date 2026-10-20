'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import EmailLinkSent, { sendSignInLink } from '@/components/known/EmailLinkStep'
import type { LinkErrorReason } from '@/lib/auth/linkError'

// The same card as the emails (supabase/templates): white on cream, serif
// heading, one charcoal button. What went wrong comes first, then the way
// back: a new link, which works on any device.
const COPY: Record<LinkErrorReason, { heading: string; why: string }> = {
  expired: {
    heading: 'This link has expired',
    why: 'Links work for 24 hours, and only once.',
  },
  browser: {
    heading: 'This link opened in another browser',
    why: 'Older links only work in the browser where you asked for them. A new link works on any device.',
  },
  invalid: {
    heading: 'This link didn’t work',
    why: 'It may have expired, been used already, or been cut short by your email app.',
  },
}

function LinkMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center"
      style={{ width: 48, height: 48, borderRadius: 999, background: 'rgba(38,36,32,0.06)', color: '#56534D', marginBottom: 18 }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 14a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.66 0l-2.83 2.83a4 4 0 0 0 5.66 5.66l1-1" />
      </svg>
    </span>
  )
}

export default function LinkErrorClient({ reason: serverReason }: { reason: LinkErrorReason }) {
  const [reason, setReason] = useState<LinkErrorReason>(serverReason)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [waitSeconds, setWaitSeconds] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  // Answers kept in this browser. A link works once, so after it was used
  // in another browser this one says "expired", but its own progress is
  // still right here.
  const [localAnswers, setLocalAnswers] = useState(0)

  // Links from Supabase's own templates report an expired link in the URL
  // fragment (#error_code=otp_expired), which never reaches the server.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (hash.get('error_code') === 'otp_expired') setReason('expired')
    try {
      const saved = JSON.parse(localStorage.getItem('known_session') ?? 'null') as { responses?: unknown } | null
      if (Array.isArray(saved?.responses)) setLocalAnswers(saved!.responses.length)
    } catch {}
  }, [])

  async function send() {
    const address = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { setError(true); return }
    setBusy(true)
    setError(false)
    try {
      const { waitSeconds: wait } = await sendSignInLink(address)
      setWaitSeconds(wait)
      setSent(true)
    } catch (err) {
      console.error('[link-error] send error:', err instanceof Error ? err.message : 'unknown error')
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const copy = COPY[reason]

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center px-4">
      <header className="w-full flex justify-center" style={{ paddingTop: 28 }}>
        <Link href="/" className="text-charcoal" style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.02em' }}>
          Bearing
        </Link>
      </header>

      <main className="w-full flex-1 flex flex-col items-center justify-center" style={{ paddingBottom: 72 }}>
        <div
          className="w-full bg-white text-center"
          style={{ maxWidth: 440, borderRadius: 24, border: '1px solid #E5E1D5', padding: '40px 28px 32px', boxShadow: '0 1px 2px rgba(38,36,32,0.04), 0 24px 48px -28px rgba(38,36,32,0.25)' }}
        >
          {sent ? (
            <EmailLinkSent
              email={email.trim()}
              waitSeconds={waitSeconds}
              detail="It works for 24 hours, on any device, and takes you back to where you stopped."
              onChangeEmail={() => { setSent(false); setEmail('') }}
            />
          ) : (
            <>
              <LinkMark />
              <h1 className="font-display font-normal text-display-3 text-charcoal" style={{ marginBottom: 10 }}>
                {copy.heading}
              </h1>
              <p className="font-sans text-body text-charcoal-soft" style={{ marginBottom: 6 }}>
                {copy.why}
              </p>
              {localAnswers > 0 ? (
                <>
                  <p className="font-sans text-body text-charcoal-soft" style={{ marginBottom: 24 }}>
                    Your {localAnswers} {localAnswers === 1 ? 'answer is' : 'answers are'} still saved in this browser.
                  </p>
                  <Link
                    href="/assessment"
                    className="w-full inline-flex justify-center font-sans font-medium text-ui text-cream bg-charcoal"
                    style={{ borderRadius: 999, padding: 15 }}
                  >
                    Continue on this device
                  </Link>
                  <p className="font-sans text-meta text-muted" style={{ margin: '24px 0 10px' }}>
                    Or get a new link for another device
                  </p>
                </>
              ) : (
                <p className="font-sans text-body text-charcoal-soft" style={{ marginBottom: 24 }}>
                  If you saved your answers, they&apos;re still here. Send yourself a new link and you&apos;ll go straight back to where you stopped.
                </p>
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                placeholder="Your email address"
                aria-label="Your email address"
                autoComplete="email"
                className="w-full font-sans text-body text-charcoal bg-cream outline-none text-left"
                style={{ padding: '13px 16px', borderRadius: 12, border: `1.5px solid ${error ? 'hsl(8, 60%, 55%)' : '#E5E1D5'}`, marginBottom: 10 }}
              />
              <button
                type="button"
                onClick={send}
                disabled={busy}
                className={`w-full font-sans font-medium text-ui ${localAnswers > 0 ? 'text-charcoal bg-white' : 'text-cream bg-charcoal'}`}
                style={{ borderRadius: 999, padding: 15, opacity: busy ? 0.7 : 1, border: localAnswers > 0 ? '1.5px solid #262420' : 'none' }}
              >
                {busy ? 'Sending…' : 'Send me a new link'}
              </button>
              <p className="font-sans text-meta" role="status" style={{ color: '#8a5a3d', minHeight: 20, marginTop: 10 }}>
                {error ? 'That didn’t work. Check the address and try again.' : ''}
              </p>
            </>
          )}
        </div>
        <Link href="/" className="font-sans text-meta text-muted hover:text-charcoal underline underline-offset-2" style={{ marginTop: 20, minHeight: 44, lineHeight: '44px' }}>
          Go to Bearing
        </Link>
      </main>
    </div>
  )
}
