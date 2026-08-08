'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { trackPinterestLead } from '@/app/actions/trackPinterestLead'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

// No user/session id exists yet this early in the funnel — generate and
// persist one so the Pinterest lead event (and any later re-fires) has a
// stable identifier to hash.
const ANON_ID_KEY = 'known_anon_id'
function getOrCreateAnonId(): string {
  let id = localStorage.getItem(ANON_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(ANON_ID_KEY, id)
  }
  return id
}

function fade(delayMs: number): CSSProperties {
  return {
    animation: 'fadeIn 0.6s ease both',
    animationDelay: `${delayMs}ms`,
  }
}

function Divider() {
  return <hr className="border-none h-px bg-line" />
}

const trustItems = [
  {
    bold: 'Built on real psychology.',
    rest: 'The same models researchers and trained consultants use — not invented categories.',
  },
  {
    bold: 'What you tell us stays yours.',
    rest: "Nothing is shared or sold — and there's nothing here to perform.",
  },
  {
    bold: 'Go at your own pace.',
    rest: "You can stop and pick up later — nothing is lost.",
  },
]

export default function OnboardingClient() {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  function handleStart() {
    setExiting(true)

    // Meta Pixel: assessment-start Lead. event_id lets a future server-side
    // Lead event (Conversions API) dedupe against this browser-side one.
    window.fbq?.('track', 'Lead', { content_name: 'ipip_neo_120_start' }, { eventID: crypto.randomUUID() })

    // Pinterest Conversions API — server-side only, PINTEREST_CONVERSIONS_TOKEN
    // never reaches the browser. No email yet, so hash the anonymous id.
    trackPinterestLead(getOrCreateAnonId()).catch(() => {})

    setTimeout(() => {
      sessionStorage.setItem('known_from', 'onboarding')
      router.push('/assessment')
    }, 320)
  }

  return (
    <main
      className="bg-cream min-h-screen py-16 px-6"
      style={{
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-18px)' : 'none',
      }}
    >
      <div className="max-w-[480px] mx-auto flex flex-col gap-10 pb-28 sm:pb-0">

        {/* 1. Wordmark */}
        <div style={fade(0)} className="text-center">
          <span className="font-serif text-sm text-muted">Bearing</span>
        </div>

        {/* 2. Mirror line */}
        <div style={fade(300)}>
          <p className="font-serif italic text-[18px] leading-[1.7] text-charcoal text-center">
            You&apos;re here because something isn&apos;t quite clicking — not in a crisis way, just a sense that you&apos;re making decisions without really knowing why.
          </p>
        </div>

        {/* 3. Divider + Differentiation block */}
        <div style={fade(600)} className="flex flex-col gap-8">
          <Divider />
          <div className="flex flex-col gap-4">
            <span className="font-sans text-[11px] uppercase tracking-widest text-muted">
              This isn&apos;t a personality test
            </span>
            <h2 className="font-serif text-[26px] font-medium leading-[1.3] text-charcoal">
              There&apos;s no wrong way to answer any of this.
            </h2>
            <p className="font-sans text-[15px] leading-[1.7] text-charcoal-soft">
              No types, no scores, no &lsquo;you are a...&rsquo; label to live up to. Just a clearer picture of how you actually work — built from how you answer, not from a quiz you can game.
            </p>
          </div>
        </div>

        {/* 4. Divider + Trust rows */}
        <div style={fade(900)} className="flex flex-col gap-8">
          <Divider />
          <div className="flex flex-col gap-5">
            {trustItems.map((item) => (
              <div key={item.bold} className="flex items-start gap-3">
                <span
                  className="shrink-0 mt-[3px] text-[10px] leading-[1.65] text-accent"
                  aria-hidden="true"
                >
                  ●
                </span>
                <p className="font-sans text-[15px] leading-[1.7] text-charcoal-soft">
                  <span className="font-semibold text-charcoal">{item.bold}</span>
                  {' '}{item.rest}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 5. CTA — the content above (mirror line, differentiation block,
            3 trust rows) routinely runs taller than a phone viewport, so
            this sat below the fold with no visible affordance to scroll for
            it. Fixed to the bottom on mobile only (sm: and up reverts to
            the normal in-flow placement, where it already fits on typical
            desktop viewport heights); the pb-28 on the content column above
            reserves clearance so the fixed bar doesn't cover the last
            trust row. */}
        <div
          className="onboarding-cta-bar fixed bottom-0 left-0 right-0 bg-cream border-t border-line z-50 sm:static sm:border-t-0 sm:bg-transparent"
        >
          <div className="max-w-[480px] mx-auto flex flex-col items-center gap-3 px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:px-0 sm:pt-0 sm:pb-4">
            <button
              onClick={handleStart}
              className="w-full bg-charcoal text-cream font-serif text-[18px] text-center py-4 rounded-[100px] transition-opacity hover:opacity-90 cursor-pointer"
              style={{ fontFamily: 'var(--font-newsreader), serif' }}
            >
              Start
            </button>
            <p className="font-sans text-[13px] text-muted">
              Takes most people 12–15 minutes, in one go or several
            </p>
          </div>
        </div>

      </div>

      {/* The CTA bar's staggered 1200ms fade-in matches the rest of the
          page's top-to-bottom reveal choreography, which made sense while
          it sat in-flow at the bottom of the content. Now that it's fixed
          chrome on mobile, that same delay meant it rendered translucent
          for ~1.8s after load — trust-row text visibly bleeding through
          the button bar. Disabled below 640px so it's opaque immediately;
          desktop keeps the original staggered reveal. */}
      <style>{`
        .onboarding-cta-bar { animation: fadeIn 0.6s ease 1200ms both; }
        @media (max-width: 640px) {
          .onboarding-cta-bar { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
    </main>
  )
}
