'use client'

/**
 * Parts for option A, iteration 2 (/landing-options/a2), from the feedback
 * on option A. Shares the type, motion and card rules of shared.tsx.
 *
 * CONCEPT parts (not in the product yet, designed here at the owner's
 * request; the live landing page can't show them until they are built):
 * - CheckInAffirmation: a short affirming line after a check-in is saved.
 * - WeeklyInsights: "What stood out" and "Something to try" in the weekly
 *   read. Today the weekly read has the count and the lean only.
 * Everything else is a real product component with example data.
 */

import { useMemo, useRef, useState } from 'react'
import { TraitCarousel } from '@/components/known/TraitCarousel'
import { UnlockedContent } from '@/components/known/ReportVisuals'
import EvidenceDialog from '@/components/known/EvidenceDialog'
import BandSpectrum from '@/components/known/BandSpectrum'
import { DotScale } from '@/components/known/QuestionCard'
import { patternSubtitle } from '@/components/known/TraitCarousel'
import { SAMPLE_FACETS, SAMPLE_TRAITS } from '@/app/report/sample/SampleReportClient'
import { BentoCluster, ProblemBlobRingVisual, ProblemCirclesVisual, ProblemTrioVisual } from '../LandingPageClient'
import { sampleEvidencePanel } from '@/lib/known/sampleEvidence'
import { facetTraitWords } from '@/lib/known/scoring'
import {
  blobGradientStops, buildPointMotionProfile, generateAnimatedBlobPath, hashSeed,
  useBlobAnimation, userCuratedHue, USER_SEED,
} from '@/lib/blobs'
import { PracticeWeeks } from './shared'

// ─── Copy ────────────────────────────────────────────────────────────────────

export const COPY2 = {
  hero: {
    title: 'Understand why you feel and act the way you do.',
    body: 'The worry that won’t settle. The plan you drop halfway. The reaction you only understand later. Bearing shows you the patterns behind them, then helps you notice them in your days.',
  },
  problems: {
    title: 'You can feel it, but it’s hard to put into words.',
    items: [
      { title: 'Not knowing what drives me.', quote: 'I can point to what’s wrong, but not why it keeps happening.', Visual: ProblemCirclesVisual },
      { title: 'Insight, but no direction.', quote: 'I’ve learned a lot about myself, but I don’t know what to do with it.', Visual: ProblemBlobRingVisual },
      { title: 'Stuck in the same pattern.', quote: 'I keep ending up in the same place, and I can’t tell how to break free of it.', Visual: ProblemTrioVisual },
    ],
    bridge: 'Bearing helps with all three: first a clear picture of your patterns, then a way to work with them day by day.',
  },
  solution: {
    title: 'See your patterns clearly.',
    body: 'Answer 120 short statements in about 15 minutes. You get a report of 30 patterns, each with its own word and a plain explanation of how it tends to show up in your life.',
    why: [
      'The same carefully tested statements for everyone, so your results come from your answers alone.',
      '30 specific patterns instead of one type, so you see how you actually lean.',
      'Every pattern shows what it is based on: your own answers.',
    ],
  },
  practice: {
    title: 'Then work with what matters to you.',
    body: 'Your report is the starting point. The practice is where it becomes useful in your life.',
    decide: { title: 'You decide what matters.', body: 'Choose up to four patterns that matter in your life right now. Change them whenever you like.' },
    checkin: { title: 'Check in at the end of the day.', body: 'One question, while the day is still fresh. It takes a moment, and over time you start to notice the pattern while it is happening.' },
    weekly: { title: 'A weekly read with insights and tips.', body: 'Each week Bearing looks at your check-ins and notes, tells you what stood out, and suggests one small thing to try.' },
  },
  different: {
    title: 'Why Bearing is different',
    points: [
      { title: '30 patterns, no type', body: 'You see how you lean on 30 specific traits, each with its own word, instead of one label for all of you.', visual: 'cluster' },
      { title: 'It keeps going after the report', body: 'Evening check-ins, a weekly read and a 90-day review turn a one-time result into something you can follow.', visual: 'weeks' },
      { title: 'Built on published research', body: '120 fixed statements from a public, peer-reviewed questionnaire. Everyone answers the same ones.', visual: 'statement' },
      { title: 'AI writes the words, never the scores', body: 'Your scores come only from your answers. An AI model then explains them in plain words.', visual: 'spectrum' },
    ] as const,
  },
}

// ─── Hero: the original hero's blobs, behind the text, without words ───────

// Same four blobs as the original hero (HeroBlobs in LandingPageClient:
// one large active blob and three smaller ones, same hues, same blur),
// centred behind the headline and scaled up; no trait words.
const HERO = [
  { key: 'Deliberate', hueOff: 0, cx: 270, cy: 245, r: 140, active: true },
  { key: 'Curious', hueOff: 5, cx: 392, cy: 75, r: 80, active: false },
  { key: 'Aware', hueOff: 10, cx: 105, cy: 360, r: 68, active: false },
  { key: 'Warm', hueOff: 20, cx: 378, cy: 385, r: 64, active: false },
] as const

export function HeroBlobsBackdrop() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const refs = useRef<Record<string, SVGPathElement | null>>({})
  const items = useMemo(() => HERO.map((b) => ({
    ...b,
    hue: userCuratedHue(USER_SEED, b.hueOff),
    profile: buildPointMotionProfile(hashSeed(b.key + '-hero-shape'), 9),
  })), [])
  useBlobAnimation((t) => {
    items.forEach((b) => refs.current[b.key]?.setAttribute('d', generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, t)))
  }, [items], wrapRef, { respectReducedMotion: true })
  return (
    <div ref={wrapRef} className="a2-hero-blobs" aria-hidden="true">
      <svg viewBox="0 0 520 500" width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="a2-hero-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" /></filter>
          {items.map((b) => (
            <radialGradient key={b.key} id={`a2-hero-${b.key}`} cx="45%" cy="40%" r="70%">
              {blobGradientStops(b.hue, b.active).map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />)}
            </radialGradient>
          ))}
        </defs>
        {items.map((b) => (
          <path key={b.key} ref={(el) => { refs.current[b.key] = el }} fill={`url(#a2-hero-${b.key})`} filter="url(#a2-hero-blur)"
            d={generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, 0)} />
        ))}
      </svg>
    </div>
  )
}

// ─── Solution: the report's own visual ──────────────────────────────────────

// The report's "Who you are" visual exactly as on the sample report: the
// blob carousel with the three sample traits, and the selected trait's
// card with "See what this is based on". Tap or swipe works as there.
export function ReportVisual() {
  const [i, setI] = useState(0)
  const f = SAMPLE_FACETS[i]
  const hue = userCuratedHue(`ring1-pattern-${f.traitWord.toLowerCase()}`, f.hueOffset)
  return (
    <TraitCarousel traits={SAMPLE_TRAITS} activeIdx={i} onSelect={setI}>
      <div style={{ marginTop: 12 }}>
        <UnlockedContent
          traitWord={f.traitWord} content={f.content!} hue={hue}
          subtitle={patternSubtitle(f.hueOffset)} source={null} variant="ring1"
          evidence={<EvidenceDialog key={f.facet} data={sampleEvidencePanel(f.facet)} />}
        />
      </div>
    </TraitCarousel>
  )
}

// ─── Practice concepts (not built yet) ──────────────────────────────────────

// CONCEPT. Shown right after "Save check-in": a short, plain line that
// counts what the person has done this week. No praise, no score.
export function CheckInAffirmation() {
  return (
    <div className="a2-affirm" role="status">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="9" fill="#3D6B5C" /><path d="M5.2 9.3l2.4 2.4 5.2-5.3" fill="none" stroke="#F7F4ED" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <div>
        <p className="a2-affirm-title">Saved. That’s four evenings this week.</p>
        <p className="lo-meta">Every check-in makes the picture a little clearer.</p>
      </div>
    </div>
  )
}

// CONCEPT. The two parts the weekly read would add to today's headline,
// week chips and notes: what stood out (from the check-ins and notes) and
// one small thing to try. Example text for the Self-Discipline example.
export function WeeklyInsights() {
  return (
    <div className="a2-insights">
      <div>
        <p className="lo-meta">What stood out</p>
        <p className="a2-insight-text">You pushed through most on days you started with the hardest task. Twice you wrote about keeping going when you wanted to stop.</p>
      </div>
      <div>
        <p className="lo-meta">Something to try</p>
        <p className="a2-insight-text">Tomorrow, do the one task you would most like to put off first. Then notice how the rest of the day goes.</p>
      </div>
    </div>
  )
}

// ─── Why different: one real visual per point ───────────────────────────────

function MiniStatement() {
  const [v, setV] = useState('4')
  return (
    <div className="lo-statement" style={{ maxWidth: 300 }}>
      <p className="lo-statement-count">1 of 120</p>
      <p className="a2-mini-statement">Worry about things.</p>
      <DotScale value={v} onChange={setV} labels={['Very Inaccurate', 'Very Accurate']} />
    </div>
  )
}

export function DifferentVisual({ kind }: { kind: 'cluster' | 'weeks' | 'statement' | 'spectrum' }) {
  if (kind === 'cluster') return <div className="a2-cluster"><BentoCluster /></div>
  if (kind === 'weeks') return <div style={{ width: '100%', maxWidth: 340 }}><PracticeWeeks /></div>
  if (kind === 'statement') return <MiniStatement />
  return (
    <div className="lo-spectrum">
      <BandSpectrum band="high" labels={facetTraitWords('Anxiety')!} />
    </div>
  )
}
