'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  hashSeed,
  userCuratedHue,
  buildPointMotionProfile,
  generateAnimatedBlobPath,
  blobGradientStops,
  useBlobAnimation,
} from '@/lib/blobs'
import { createClient } from '@/lib/supabase/client'
import { fetchIsPaid } from '@/lib/known/paywall'
import {
  MINI_ASSESSMENT_SLUG_TO_FACET,
  MINI_ASSESSMENT_DISPLAY_LABEL,
  type MiniAssessmentSlug,
} from '@/lib/known/miniAssessmentScoring'
import { getCheckInPrompt } from '@/lib/known/checkInOptions'
import {
  LANDING_COPY,
  LANDING_SHARED,
  LANDING_SOUND_FAMILIAR,
  LANDING_PRACTICE_HEADLINE,
  landingPracticeBody,
  landingReassurance,
  type LandingAngle,
} from '@/lib/known/miniAssessmentLanding'
import WhenNear from '@/app/(site)/landing/WhenNear'
import { practiceFixtureFor } from '@/app/(site)/landing/landingPracticeFixture'
import WhyDifferentSection from '@/app/(site)/landing/WhyDifferentSection'
import FaqSection from '@/app/(site)/landing/FaqSection'
import { compareCSS, practiceCSS, faqCSS, finalCSS } from '@/app/(site)/landing/sectionStyles'
import FullAssessmentPreview from '../FullAssessmentPreview'
import { START_LANDING_CSS, mkCream, mkCharcoal, mkTeal, mkRose, mkPeriwinkle, sans, serif } from '../startLandingShared'

// ─── Hero blob cluster ──────────────────────────────────────────────────────
// Same composition as the home page's HeroBlobs (app/(site)/LandingPageClient
// .tsx): one big "active" blob plus three smaller ones, all sharing the
// lib/blobs.ts engine. The active blob carries the page's own facet; the
// three smaller ones are fixed, generic life-areas (not facet-specific) so
// the cluster reads as "this shows up across work, relationships and
// personal life," not as three more quiz questions.
const HERO_VW = 520, HERO_VH = 500
const GENERIC_WORDS = ['Work', 'Relationships', 'Personal'] as const

interface HeroBlobSpec { word: string; hueOff: number; cx: number; cy: number; r: number; active: boolean }

// The home page's "Your practice" phone screens, lazy-loaded (below the
// fold), shown with this page's facet.
const PracticePhoneScreens = dynamic(() => import('@/app/(site)/landing/PracticePhoneScreens'), { ssr: false })

function heroBlobSpecs(activeWord: string): HeroBlobSpec[] {
  return [
    { word: activeWord,         hueOff: 0,  cx: 270, cy: 245, r: 140, active: true  },
    { word: GENERIC_WORDS[0],   hueOff: 5,  cx: 392, cy: 75,  r: 80,  active: false },
    { word: GENERIC_WORDS[1],   hueOff: 10, cx: 105, cy: 360, r: 68,  active: false },
    { word: GENERIC_WORDS[2],   hueOff: 20, cx: 378, cy: 385, r: 64,  active: false },
  ]
}

function StartHeroBlobs({ seed, activeWord }: { seed: string; activeWord: string }) {
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({})
  const wrapRef = useRef<HTMLDivElement>(null)
  const items = useMemo(() => heroBlobSpecs(activeWord).map(b => ({
    ...b,
    hue: userCuratedHue(seed, b.hueOff),
    profile: buildPointMotionProfile(hashSeed(b.word + '-start-hero'), 9),
  })), [seed, activeWord])

  useBlobAnimation(t => {
    items.forEach(b => {
      pathRefs.current[b.word]?.setAttribute('d', generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, t))
    })
  }, [items], wrapRef, { respectReducedMotion: true })

  return (
    <div className="hero-blob-wrap" ref={wrapRef}>
      <svg viewBox={`0 0 ${HERO_VW} ${HERO_VH}`} width="100%" height="100%" style={{ overflow: 'visible', position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <filter id="start-hero-blob-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          {items.map(b => (
            <radialGradient key={b.word} id={`start-hero-grad-${b.word}`} cx="45%" cy="40%" r="70%">
              {blobGradientStops(b.hue, b.active).map((s, i) => (
                <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </radialGradient>
          ))}
        </defs>
        {items.map(b => (
          <path
            key={b.word}
            ref={el => { pathRefs.current[b.word] = el }}
            fill={`url(#start-hero-grad-${b.word})`}
            filter="url(#start-hero-blob-blur)"
            d={generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, 0)}
          />
        ))}
      </svg>
      {items.map(b => (
        <div
          key={b.word}
          style={{
            position: 'absolute',
            left: `${(b.cx / HERO_VW) * 100}%`,
            top: `${(b.cy / HERO_VH) * 100}%`,
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            ...(b.active
              ? { fontFamily: serif, fontStyle: 'italic' as const, fontWeight: 600, fontSize: 28, color: `hsl(${b.hue},45%,24%)` }
              : { fontFamily: sans, fontSize: 12, fontWeight: 500, color: 'rgba(28,28,26,0.65)' }),
          }}
        >
          {b.word}
        </div>
      ))}
    </div>
  )
}

// ─── "Sound familiar?" visuals ──────────────────────────────────────────────
// Ported as-is from the home page's Problem section — same static visuals
// (blurred circle cluster, dashed-ring blob, three-in-a-row, single circle),
// re-pointed at this file's copy of the mk* tokens. A 4th visual (single
// circle) was added this round since the section now shows 4 cards (3 real
// items + 1 reverse-keyed) instead of 3.
function ProblemCirclesVisual() {
  const circles = [
    { size: 45, top: 3,  left: 0,  color: mkTeal },
    { size: 30, top: 42, left: 45, color: mkRose },
    { size: 36, top: 0,  left: 60, color: mkPeriwinkle },
    { size: 24, top: 48, left: 0,  color: mkPeriwinkle },
    { size: 27, top: 18, left: 24, color: mkRose },
  ]
  return (
    <div className="problem-visual">
      <div style={{ position: 'relative', width: 96, height: 72 }}>
        {circles.map((c, i) => (
          <div
            key={i}
            className="final-glow"
            style={{ width: c.size, height: c.size, top: c.top, left: c.left, background: c.color, filter: 'blur(9px)' }}
          />
        ))}
      </div>
    </div>
  )
}

function ProblemBlobRingVisual() {
  return (
    <div className="problem-visual">
      <div style={{ position: 'relative', width: 57, height: 70.5 }}>
        <div className="final-glow" style={{ width: 36, height: 36, top: 24, left: 10.5, background: mkRose, filter: 'blur(7.5px)' }} />
        <div style={{ position: 'absolute', width: 57, height: 57, top: 13.5, left: 0, borderRadius: '50%', border: `2.25px dashed ${mkRose}` }} />
      </div>
    </div>
  )
}

function ProblemTrioVisual() {
  const lefts = [0, 39, 78]
  return (
    <div className="problem-visual">
      <div style={{ position: 'relative', width: 105, height: 55.5 }}>
        {lefts.map((left, i) => (
          <div
            key={i}
            className="final-glow"
            style={{ width: 27, height: 27, top: 28.5, left, background: mkTeal, filter: 'blur(7.5px)' }}
          />
        ))}
      </div>
    </div>
  )
}

const PROBLEM_VISUALS = [ProblemCirclesVisual, ProblemBlobRingVisual, ProblemTrioVisual]

export default function StartLandingClient({ slug, angle }: { slug: MiniAssessmentSlug; angle: LandingAngle }) {
  const router = useRouter()
  const facet = MINI_ASSESSMENT_SLUG_TO_FACET[slug]
  const label = MINI_ASSESSMENT_DISPLAY_LABEL[facet]
  const copy = LANDING_COPY[slug][angle]
  const soundFamiliar = LANDING_SOUND_FAMILIAR[slug]
  const checkInPrompt = getCheckInPrompt(facet)
  const quizHref = `/mini-assessment/${slug}`
  const practiceFixture = useMemo(() => practiceFixtureFor(facet), [facet])

  // Mirrors the quiz page's own is_paid gate (app/mini-assessment/[facet]/
  // page.tsx) but non-blocking: that page holds render until the check
  // resolves, which is right for the quiz itself but wrong here — this page
  // exists to receive ad traffic, most of which is logged-out, and nothing
  // should make that visitor wait on an auth round-trip. Content renders
  // immediately; a paid user (stale ad link, shared URL, bookmarked result)
  // is redirected to /practice as soon as the check resolves a moment later.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user && (await fetchIsPaid(user.id))) router.replace('/practice')
    })
  }, [router])

  // Page order (owner's spec): hero, Sound familiar?, Why it's different,
  // Your practice, FAQ, Free preview, footer (from app/start/layout.tsx).
  // Hero, Sound familiar? and Your practice are written for this page's
  // facet; Why it's different, FAQ and Free preview are the same on every
  // page (shared with the home page, except the full-assessment preview).
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: START_LANDING_CSS + compareCSS + practiceCSS + faqCSS + finalCSS }} />
      <div style={{ background: mkCream, color: mkCharcoal, fontFamily: sans }}>
        <section className="hero">
          <div className="hero-inner">
            <div>
              <p className="mk-eyebrow">{label} · quick check</p>
              <h1>{copy.headline}</h1>
              <p>{copy.subhead}</p>
              <div className="hero-cta-row">
                <Link href={quizHref}>
                  <button className="mk-btn">{LANDING_SHARED.cta}</button>
                </Link>
              </div>
              <span className="mk-microcopy" style={{ display: 'block', marginTop: 14 }}>
                {LANDING_SHARED.microcopy}
              </span>
              <span className="mk-microcopy" style={{ display: 'block', marginTop: 8 }}>
                {landingReassurance(label)}
              </span>
            </div>
            <StartHeroBlobs seed={`start-${slug}`} activeWord={label} />
          </div>
        </section>

        <section className="problem-section">
          <div className="wrap">
            <h2 className="problem-heading">Sound familiar?</h2>
            <p className="problem-subtitle">{soundFamiliar.subtitle}</p>
            <div className="sound-familiar-grid">
              {soundFamiliar.cards.map((card, i) => {
                const Visual = PROBLEM_VISUALS[i]
                return (
                  <div className="step" key={card.title}>
                    <Visual />
                    <div className="problem-title">{card.title}</div>
                    <div className="problem-line">“{card.line}”</div>
                  </div>
                )
              })}
            </div>
            <p className="mk-microcopy" style={{ textAlign: 'center', marginTop: 24 }}>
              {LANDING_SHARED.neitherWrong}
            </p>
          </div>
        </section>

        <WhyDifferentSection />

        {/* Your practice, for this facet: what "Add to your daily
            check-ins" leads to after the result. Phone screens run over
            practiceFixtureFor(facet); the line under the headline quotes
            this facet's real check-in question. Nothing about free vs paid. */}
        <section className="practice-section">
          <div className="wrap">
            <div className="section-head">
              <p className="mk-eyebrow" style={{ marginBottom: 12 }}>Your practice</p>
              <h2>{LANDING_PRACTICE_HEADLINE[slug]}</h2>
              <p>{landingPracticeBody(label, checkInPrompt.question)}</p>
            </div>

            <WhenNear className="practice-hold">
              <PracticePhoneScreens fixture={practiceFixture} />
            </WhenNear>

            <div className="practice-cadence">
              <div><b>Weekly</b><p>A summary of what you logged.</p></div>
              <div><b>Monthly</b><p>Your own patterns reflected back, with counts and shifts in how you describe things.</p></div>
              <div><b>Quarterly</b><p>A review of how far you&apos;ve come, and whether these are still the right patterns to work on.</p></div>
            </div>

            <p className="practice-closing">
              No praise, no predictions. A suggested next step appears only after a consistent multi-week trend, and it&apos;s always optional.
            </p>

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Link href={quizHref}>
                <button className="mk-btn">{LANDING_SHARED.cta}</button>
              </Link>
              <p className="mk-microcopy" style={{ margin: '14px auto 0', maxWidth: 420 }}>
                {LANDING_SHARED.honesty}
              </p>
            </div>
          </div>
        </section>

        <FaqSection />

        <FullAssessmentPreview />
      </div>
    </>
  )
}
