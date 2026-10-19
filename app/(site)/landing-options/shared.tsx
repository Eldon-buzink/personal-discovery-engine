'use client'

/**
 * Shared parts of the three landing options (/landing-options/a|b|c).
 * One story, one copy deck and the same real product components in all
 * three; the options differ only in how the story is laid out.
 *
 * Research behind it: ~/Documents/bearing-copy-review/landing-options/research.md
 *
 * Type: only the design tokens (lib/design/type.ts): display1 for the hero,
 * display2 for section titles, display4 for small titles, body, ui, meta.
 * Italic only for trait words. No uppercase labels.
 * Boxes: only real product components (they are cards in the product) and
 * the closing call-to-action card. Marketing copy sits on the page.
 * Motion: entrances once (useEnterOnce, .m-* classes), the blobs on the
 * shared clock; nothing scroll-linked; reduced motion shows the final state.
 */

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DotScale } from '@/components/known/QuestionCard'
import BandSpectrum from '@/components/known/BandSpectrum'
import { UnlockedContent } from '@/components/known/ReportVisuals'
import EvidenceDialog from '@/components/known/EvidenceDialog'
import PracticeHomeCard from '@/components/known/practice/PracticeHomeCard'
import CheckInAnswerRows from '@/components/known/practice/CheckInAnswerRows'
import { RecentNotes, WeekCallout, WeeksStrip } from '@/components/known/practice/PatternReportParts'
import FaqAccordion, { type FaqAccordionItem } from '../FaqAccordion'
import { FAQ_ITEMS } from '../landing/FaqSection'
import { landingPracticeFixture } from '../landing/landingPracticeFixture'
import { buildJourneyExample } from '@/lib/known/journeyExample'
import { sampleEvidencePanel } from '@/lib/known/sampleEvidence'
import { facetTraitWords } from '@/lib/known/scoring'
import { prefersReducedMotion } from '@/lib/design/motion'
import {
  blobGradientStops, buildPointMotionProfile, generateAnimatedBlobPath, hashSeed,
  useBlobAnimation, userCuratedHue, USER_SEED,
} from '@/lib/blobs'
import type { PatternContent } from '@/lib/known/types'

// ─── Copy ────────────────────────────────────────────────────────────────────

export const COPY = {
  hero: {
    title: 'Know your patterns. Then see them in your days.',
    body: 'Bearing starts with a 15-minute Big Five assessment that names 30 of your patterns. Then a short check-in each evening shows where they turn up in your life, week by week.',
    note: ['About 15 minutes', 'First 5 patterns free', 'No account to start'],
  },
  discover: {
    title: 'Find out how you tend to think, feel and act.',
    body: 'You rate 120 short statements. Bearing scores them on the 30 traits of the Big Five, the most widely used model in personality research, and gives each trait a word, a place on its scale and a short explanation in plain words.',
    steps: [
      'Rate how well each statement fits you.',
      'Each trait gets its own word, on its own scale.',
      'Read what it means for you, and what it is based on.',
    ],
  },
  practice: {
    title: 'Then notice them where they happen.',
    body: 'Pick up to four patterns to follow. Each evening, answer one question about how a pattern showed up that day, and add a note if you like. Over the weeks, your own answers show where it turns up in your life and whether it is moving.',
    steps: [
      'Pick a pattern to follow.',
      'Check in at the end of the day.',
      'See what you noticed.',
    ],
    recapNote: 'Once you have enough check-ins, you get a short read of your week and the words you wrote.',
  },
  different: {
    title: 'Why Bearing is different',
    points: [
      { title: '30 patterns, no type', body: 'You see how you lean on 30 specific traits, each with its own word, instead of one label for all of you.' },
      { title: 'It keeps going after the report', body: 'Evening check-ins, a weekly read and a 90-day review turn a one-time result into something you can follow.' },
      { title: 'Built on published research', body: '120 fixed statements from a public-domain Big Five inventory. Everyone answers the same ones.' },
      { title: 'AI writes the words, never the scores', body: 'An AI model explains your results in plain words. Your scores come only from your answers.' },
    ],
    footnote: 'Bearing describes how you tend to be. It is not a diagnosis.',
  },
  faq: { title: 'Common questions' },
  final: {
    meta: 'About 15 minutes · First 5 patterns free',
    title: 'You already sense there’s more to know.',
    body: 'Start with a clear picture of your patterns in about 15 minutes. Then keep noticing them, one evening at a time.',
  },
}

// The FAQ: the site's questions plus one about the practice, which the
// current FAQ never mentions.
export const FAQ: FaqAccordionItem[] = [
  FAQ_ITEMS[0],
  FAQ_ITEMS[1],
  {
    question: 'What happens after the report?',
    answer: 'You can pick up to four patterns to follow. Each evening, one short question asks how a pattern showed up that day. After three check-ins in a week you get a short read of that week, and over time a 4-week report and a review after 90 days. The practice needs an account.',
  },
  ...FAQ_ITEMS.slice(2),
]

// ─── Hero ────────────────────────────────────────────────────────────────────

// Blobs as a quiet background: no trait words, low contrast, drifting on
// the shared clock (useBlobAnimation; paused off-screen; still with
// reduced motion).
const BACKDROP = [
  { key: 'a', hueOff: 0, cx: 250, cy: 300, r: 210 },
  { key: 'b', hueOff: 5, cx: 980, cy: 180, r: 170 },
  { key: 'c', hueOff: 10, cx: 760, cy: 520, r: 150 },
  { key: 'd', hueOff: 20, cx: 520, cy: 90, r: 110 },
] as const

export function HeroBackdrop({ opacity = 0.5 }: { opacity?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const refs = useRef<Record<string, SVGPathElement | null>>({})
  const items = useMemo(() => BACKDROP.map((b) => ({
    ...b,
    hue: userCuratedHue(USER_SEED, b.hueOff),
    profile: buildPointMotionProfile(hashSeed(`${b.key}-backdrop`), 9),
  })), [])
  useBlobAnimation((t) => {
    items.forEach((b) => refs.current[b.key]?.setAttribute('d', generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, t)))
  }, [items], wrapRef, { respectReducedMotion: true })
  return (
    <div ref={wrapRef} aria-hidden="true" style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity,
      // Fades out toward the bottom, so the hero has no hard lower edge.
      maskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
    }}>
      <svg viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <defs>
          <filter id="lo-backdrop-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="34" /></filter>
          {items.map((b) => (
            <radialGradient key={b.key} id={`lo-backdrop-${b.key}`} cx="45%" cy="40%" r="70%">
              {blobGradientStops(b.hue, false).map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />)}
            </radialGradient>
          ))}
        </defs>
        {items.map((b) => (
          <path key={b.key} ref={(el) => { refs.current[b.key] = el }} fill={`url(#lo-backdrop-${b.key})`} filter="url(#lo-backdrop-blur)"
            d={generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, 0)} />
        ))}
      </svg>
    </div>
  )
}

// The three facts under the call to action, as a quiet row with a small
// tick each, instead of one long grey sentence.
export function HeroNote() {
  return (
    <ul className="lo-note" aria-label="Before you start">
      {COPY.hero.note.map((n) => (
        <li key={n}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {n}
        </li>
      ))}
    </ul>
  )
}

export function HeroCtas() {
  return (
    <div className="lo-ctas">
      <Link href="/onboarding" className="lo-btn">Start the assessment</Link>
      <Link href="/report/sample" className="lo-link">See a sample report</Link>
    </div>
  )
}

// ─── Discover: real assessment and report components ────────────────────────

// One real statement from the assessment (Cautiousness, item 117) with the
// assessment's own answer scale. It can be tried; on first view it shows an
// answer being picked once, unless the visitor prefers reduced motion.
export function SampleStatement() {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState('')
  const touched = useRef(false)
  useEffect(() => {
    if (prefersReducedMotion()) { setValue('4'); return }
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setValue('4'); return }
    let t: number | undefined
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { t = window.setTimeout(() => { if (!touched.current) setValue('4') }, 500); io.disconnect() }
    }, { threshold: 0.6 })
    io.observe(el)
    return () => { io.disconnect(); if (t) window.clearTimeout(t) }
  }, [])
  return (
    <div ref={ref} className="lo-statement">
      <p className="lo-statement-count">12 of 120</p>
      <p className="lo-statement-text">Think before I speak.</p>
      <DotScale value={value} onChange={(v) => { touched.current = true; setValue(v) }} labels={['Very Inaccurate', 'Very Accurate']} />
    </div>
  )
}

const SAMPLE_CARD: PatternContent = {
  trait_quote: "You don't speak until you've thought it through, and when you do, people tend to listen.",
  body: 'In meetings you often let the room talk itself out before you weigh in. That tends to give what you say more weight, and it can mean people read the pause as distance when you are fully engaged.',
  tags: ['Considered', 'Low reactivity', 'High signal-to-noise'],
}

// Where the sample lands on Cautiousness, with the real trait words.
export function SampleSpectrum() {
  const words = facetTraitWords('Cautiousness')!
  return (
    <div className="lo-spectrum">
      <BandSpectrum band="mid" labels={words} />
    </div>
  )
}

// The report's own trait card (the sample report's Deliberate), with the
// real "See what this is based on" dialog.
export function SampleTraitCard() {
  const hue = userCuratedHue('ring1-pattern-deliberate', 0)
  return (
    <UnlockedContent
      traitWord="Deliberate" content={SAMPLE_CARD} hue={hue}
      subtitle="Example pattern" source={null} variant="ring1"
      evidence={<EvidenceDialog data={sampleEvidencePanel('Cautiousness')} />}
    />
  )
}

// ─── Practice: real practice components over the landing fixture ───────────

// directional: false. The "Directional · from mini-assessment" label and its
// coral card belong to the mini-assessment flow and mean nothing to a first
// visitor here; everything else is the landing fixture as is.
const PRACTICE_FIXTURE = { ...landingPracticeFixture, directional: false }

export function usePracticeExample() {
  return useMemo(() => buildJourneyExample(PRACTICE_FIXTURE), [])
}

export function PracticeHome() {
  const ex = usePracticeExample()
  return <PracticeHomeCard facetId={ex.facetId} {...ex.home} showUnlockLine={false} />
}

export function PracticeCheckIn() {
  const ex = usePracticeExample()
  return (
    <div>
      <p className="lo-checkin-q">{ex.checkIn.question}</p>
      <CheckInAnswerRows options={ex.checkIn.options} selected={ex.checkIn.selected} />
    </div>
  )
}

export function PracticeWeek() {
  const ex = usePracticeExample()
  return <WeekCallout facetId={ex.facetId} weekly={ex.recap.weekly} />
}

export function PracticeWeeks() {
  const ex = usePracticeExample()
  return <WeeksStrip facetId={ex.facetId} weeks={ex.recap.weeks} chipClassName="lo-chip" />
}

export function PracticeNotes() {
  const ex = usePracticeExample()
  return <RecentNotes notes={ex.recap.notes} />
}

// ─── FAQ and closing card ────────────────────────────────────────────────────

export function Faq() {
  return <FaqAccordion items={FAQ} />
}

// The closing card (section 5): cream card on charcoal, two soft glows.
export function FinalCta() {
  return (
    <section className="final-outer">
      <div className="final-card">
        <div className="final-glow" style={{ width: 360, height: 360, top: -120, left: -100, background: '#AEBBE8' }} />
        <div className="final-glow" style={{ width: 320, height: 320, bottom: -120, right: -80, background: '#E9AFC0' }} />
        <div className="final-content">
          <p className="lo-meta" style={{ marginBottom: 12 }}>{COPY.final.meta}</p>
          <h2>{COPY.final.title}</h2>
          <p>{COPY.final.body}</p>
          <div className="final-cta-row">
            <Link href="/onboarding" className="lo-btn">Start the assessment</Link>
            <Link href="/report/sample" className="lo-link">See a sample report</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
