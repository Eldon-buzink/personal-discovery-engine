'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Replaces the old hero's inline "Welcome back" box (LandingPageClient.tsx:
// 627-661 — email input + button rendered by default) with a small text
// link per reference/landing-redesign.md section 1: "Header: returning users
// get a small text link 'Continue where you left off' ... Never a hero form."
//
// Interpretation note (nothing in the ledger specifies the click behavior
// beyond "reuses the existing magic-link request"): the link itself is the
// only thing rendered by default — no form. Clicking it reveals a single
// email input + send button inline, which calls the same
// supabase.auth.signInWithOtp(...) pattern the hero box / AuthModal /
// PaywallModal all already use, with the same /auth/callback redirect. This
// keeps "never a hero form" true for the resting state while still letting
// the flow complete. Flagged in the Phase 3 report as an invented detail.
//
// Only rendered for the "welcomeBack" case (has patternContents locally) —
// the other returning state (startedUnfinished: has responses, no patterns
// yet) is handled by CtaButton's own label swap, not this link.
function hasWelcomeBackProgress(): boolean {
  try {
    const raw = localStorage.getItem('known_session')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.patternContents) && parsed.patternContents.length > 0
  } catch {
    return false
  }
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export default function ContinueLink() {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setVisible(hasWelcomeBackProgress())
  }, [])

  if (!visible) return null

  async function handleSend() {
    if (!isValidEmail(email)) {
      setError(true)
      return
    }
    setError(false)
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      setSent(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mk-text-link"
        data-testid="continue-where-left-off"
      >
        Continue where you left off
      </button>
    )
  }

  if (sent) {
    return (
      <p className="mk-microcopy" data-testid="continue-link-sent">
        Check your email for the sign-in link.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
        placeholder="Your email address"
        data-testid="continue-link-email"
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: `1.5px solid ${error ? 'hsl(8,60%,55%)' : 'rgba(38,36,32,0.2)'}`,
          fontSize: 13,
          fontFamily: 'inherit',
          background: 'white',
          outline: 'none',
        }}
      />
      <button
        onClick={handleSend}
        disabled={loading}
        className="mk-text-link"
        data-testid="continue-link-send"
      >
        {loading ? 'Sending…' : 'Send link'}
      </button>
    </div>
  )
}
