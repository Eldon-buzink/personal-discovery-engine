'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// One CTA component, used everywhere on this page (hero, mid-page, final
// band, sticky mobile bar) so the label/destination can never drift between
// placements the way the old page's did ("Discover yourself ->" in the hero
// vs "Start the assessment" in the nav). Same detection shape LandingPageClient
// and SiteNav already use (known_session in localStorage) — duplicated here
// rather than imported, since LandingPageClient.tsx is explicitly left
// untouched and doesn't export this logic.
//
// Labels are exactly the ledger's text (reference/landing-redesign.md
// sections 1 and 5) with no added arrow/decoration — the old page's "->" is
// styling, not copy the ledger specifies.
function readStartedUnfinished(): boolean {
  try {
    const raw = localStorage.getItem('known_session')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const hasResponses = Array.isArray(parsed.responses) && parsed.responses.length > 0
    const hasPatterns = Array.isArray(parsed.patternContents) && parsed.patternContents.length > 0
    return hasResponses && !hasPatterns
  } catch {
    return false
  }
}

export type CtaVariant = 'hero' | 'mid' | 'final' | 'sticky'

export default function CtaButton({ variant, className }: { variant: CtaVariant; className?: string }) {
  const [startedUnfinished, setStartedUnfinished] = useState(false)

  useEffect(() => {
    setStartedUnfinished(readStartedUnfinished())
  }, [])

  const label = startedUnfinished ? 'Continue your assessment' : 'Start the assessment'
  const href = startedUnfinished ? '/assessment' : '/onboarding'

  return (
    <Link href={href} className={className} data-cta-variant={variant}>
      <button className="mk-btn" data-testid={`cta-${variant}`}>
        {label}
      </button>
    </Link>
  )
}
