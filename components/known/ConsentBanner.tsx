'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CONSENT_REOPEN_EVENT, readConsent, writeConsent } from '@/lib/consent'

// Asks once whether we may measure ads. Shown until the visitor chooses;
// "Cookie settings" in the footer brings it back. Both buttons look the
// same: saying no is as easy as saying yes, and nothing loads before an
// answer. Fixed at the bottom of the screen, so it never shifts the page.
export default function ConsentBanner() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (readConsent() === null) setOpen(true)
    const reopen = () => setOpen(true)
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen)
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen)
  }, [])

  if (!open) return null

  function choose(value: 'granted' | 'denied') {
    writeConsent(value)
    setOpen(false)
  }

  const button: React.CSSProperties = {
    fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: 14, fontWeight: 500,
    padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
    background: '#F7F4ED', color: '#262420', border: '1px solid #F7F4ED', minWidth: 112,
  }

  return (
    <div
      role="dialog"
      aria-label="Ad measurement"
      style={{
        position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 4000,
        maxWidth: 720, margin: '0 auto', background: '#262420', color: '#F7F4ED',
        borderRadius: 16, padding: '18px 20px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16,
      }}
    >
      <p style={{ flex: '1 1 320px', margin: 0, fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: 14, lineHeight: 1.55 }}>
        Can we measure our ads? We&apos;d use Meta and Pinterest to see which ads bring people here.
        It stays off unless you say yes, and you can change it any time.{' '}
        <Link href="/privacy" style={{ color: '#F7F4ED', textDecoration: 'underline' }}>Privacy</Link>
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" style={button} onClick={() => choose('denied')}>No thanks</button>
        <button type="button" style={button} onClick={() => choose('granted')}>Allow</button>
      </div>
    </div>
  )
}
