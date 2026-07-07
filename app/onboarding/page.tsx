'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { CSSProperties } from 'react'

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

export default function OnboardingPage() {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  function handleStart() {
    setExiting(true)
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
      <div className="max-w-[480px] mx-auto flex flex-col gap-10">

        {/* 1. Wordmark */}
        <div style={fade(0)} className="text-center">
          <span className="font-serif text-sm text-muted">known</span>
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

        {/* 5. CTA */}
        <div style={fade(1200)} className="flex flex-col items-center gap-3 pb-4">
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
    </main>
  )
}
