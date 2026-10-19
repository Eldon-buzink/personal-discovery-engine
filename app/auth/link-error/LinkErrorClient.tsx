'use client'

import { useState } from 'react'
import Link from 'next/link'
import EmailLinkSent, { sendSignInLink } from '@/components/known/EmailLinkStep'

export default function LinkErrorClient() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function send() {
    const address = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { setError(true); return }
    setBusy(true)
    setError(false)
    try {
      await sendSignInLink(address)
      setSent(true)
    } catch (err) {
      console.error('[link-error] send error:', err instanceof Error ? err.message : 'unknown error')
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {sent ? (
          <EmailLinkSent email={email.trim()} onChangeEmail={() => { setSent(false); setEmail('') }} />
        ) : (
          <>
            <h1 className="font-display font-normal text-display-2 text-charcoal" style={{ marginBottom: 12 }}>
              This link has expired
            </h1>
            <p className="font-sans text-body text-charcoal-soft" style={{ marginBottom: 24 }}>
              Links work for 24 hours, and only once. If you saved your answers, they&apos;re still here. Send yourself a
              new link and you&apos;ll go straight back to where you stopped.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder="Your email address"
              aria-label="Your email address"
              autoComplete="email"
              className="w-full font-sans text-body text-charcoal bg-white outline-none"
              style={{ padding: '13px 16px', borderRadius: 10, border: `1.5px solid ${error ? 'hsl(8, 60%, 55%)' : '#E5E1D5'}`, marginBottom: 12 }}
            />
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="w-full font-sans font-medium text-ui text-cream bg-charcoal"
              style={{ borderRadius: 999, padding: 15, opacity: busy ? 0.7 : 1 }}
            >
              {busy ? 'Sending…' : 'Send me a new one'}
            </button>
            {error && (
              <p className="font-sans text-meta" style={{ color: '#8a5a3d', marginTop: 10 }}>
                That didn&apos;t work. Check the address and try again.
              </p>
            )}
            <Link href="/" className="font-sans text-meta text-muted underline inline-block" style={{ marginTop: 18, minHeight: 44, lineHeight: '44px' }}>
              Go to Bearing
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
