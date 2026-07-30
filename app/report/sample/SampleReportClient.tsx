'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { PatternContent } from '@/lib/known/types'
import { FacetEntry, InteractiveCluster, OrbitCluster, OrbitCondition, UnlockedContent, userCuratedHue } from '@/components/known/ReportVisuals'
import SiteNav, { NAV_H } from '@/components/known/SiteNav'
import SiteFooter from '@/components/known/SiteFooter'

// Static example report shown behind the landing page's "See an example
// report" CTA. Reuses the real report page's presentational components
// (InteractiveCluster/UnlockedContent/OrbitCluster, shared via
// components/known/ReportVisuals.tsx) so the sample stays visually
// identical to a real one — but with fixed illustrative content instead of
// localStorage/Supabase-backed data, no paywall, and everything unlocked.

const gray = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal = '#262420'
const cream = '#F7F4ED'
const line = '#E5E1D5'
const sans = 'var(--font-inter), system-ui, sans-serif'
const serif = 'var(--font-newsreader), serif'

// UnlockedContent (from ReportVisuals) renders its "Go deeper"/"Worth
// trying" cards with className="report-cards-row" — same mobile stacking
// rule the real report page defines locally; duplicated here since this
// page doesn't import report/page.tsx's CSS.
const sampleReportCSS = `
  .report-cards-row{display:flex;gap:12px;}
  @media(max-width:560px){
    .report-cards-row{flex-direction:column;}
  }
`

const SAMPLE_FACETS: FacetEntry[] = [
  {
    facet: 'assertiveness',
    traitWord: 'Deliberate',
    hueOffset: 0,
    content: {
      trait_quote: "You don't speak until you've thought it through — and when you do, people tend to listen.",
      where_it_shows_up: 'In meetings, you let the room talk itself out before you weigh in — and when you do, it usually reframes the whole conversation. Friends bring you the decision they\'ve been avoiding, not the one they\'ve already made.',
      tags: ['Considered', 'Low reactivity', 'High signal-to-noise'],
      go_deeper: 'This isn\'t hesitation — it\'s a preference for being right over being first. The risk is that people read the pause as disengagement when it\'s actually the opposite.',
      worth_trying: 'Name the pause out loud once in a while: "give me a second on this" costs nothing and stops people from filling the silence with the wrong assumption.',
    } satisfies PatternContent,
  },
  {
    facet: 'independence',
    traitWord: 'Autonomous',
    hueOffset: 1,
    content: {
      trait_quote: 'Left alone with a hard problem, you don\'t stall — you speed up.',
      where_it_shows_up: 'You\'ll take the ambiguous project nobody wants to own. Check-ins feel like overhead unless you asked for them yourself.',
      tags: ['Self-directed', 'Comfortable with ambiguity', 'Low oversight need'],
      go_deeper: 'Autonomy is fuel for you, not just a preference — the work that drains you fastest is the work with someone looking over your shoulder, regardless of how good they are at their job.',
      worth_trying: 'On team projects, ask for a clearly-owned lane up front. You\'ll do your best work there and resent the shared one.',
    } satisfies PatternContent,
  },
  {
    facet: 'reflection',
    traitWord: 'Reflective',
    hueOffset: 2,
    content: {
      trait_quote: 'You process out loud, mostly with yourself.',
      where_it_shows_up: 'The nights you replay a conversation aren\'t anxiety — they\'re how you actually finish thinking about it. You notice patterns in your own behavior weeks before anyone points them out.',
      tags: ['Self-aware', 'Internally processed', 'Slow to conclude, hard to shake'],
      go_deeper: 'The depth is real, but it has a ceiling: reflection without a second opinion can loop instead of resolve. The stuck patterns you\'ve had longest are usually the ones you\'ve only ever examined alone.',
      worth_trying: 'Once a stuck thought hits its third replay, say it to one other person before continuing to think about it alone. External friction moves it faster than more solitary reflection will.',
    } satisfies PatternContent,
  },
]

const ENV_CONDITIONS: OrbitCondition[] = [
  { traitWord: 'Deep work', hue: userCuratedHue('env-pattern-deep-work', 0) },
  { traitWord: 'Async', hue: userCuratedHue('env-pattern-async', 0) },
  { traitWord: 'Low noise', hue: userCuratedHue('env-pattern-low-noise', 0) },
]

export default function SampleReportClient() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [activeEnvIdx, setActiveEnvIdx] = useState(0)
  const activeFacet = SAMPLE_FACETS[activeIdx]
  const activeHue = userCuratedHue(`ring1-pattern-${activeFacet.traitWord.toLowerCase()}`, activeFacet.hueOffset)

  return (
    <>
      <style>{sampleReportCSS}</style>
      <SiteNav />

      <div style={{ background: cream, minHeight: '100vh', paddingTop: NAV_H }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 22px 64px' }}>

          {/* ── Sample banner ─────────────────────────────── */}
          <div style={{
            marginTop: 20, padding: '10px 16px', borderRadius: 10,
            background: '#F3F1EB', border: `1px solid ${line}`, textAlign: 'center',
          }}>
            <p style={{ fontFamily: sans, fontSize: 12.5, color: charcoalSoft, margin: 0 }}>
              This is a sample report with illustrative results — not your data.
            </p>
          </div>

          {/* ── Intro ─────────────────────────────────────── */}
          <div style={{ padding: '28px 0 30px', textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 12 }}>
              Example report
            </p>
            <h1 style={{ fontFamily: serif, fontSize: 27, fontWeight: 500, lineHeight: 1.3, color: charcoal, margin: '0 0 12px' }}>
              Here&apos;s what yours could look like.
            </h1>
            <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
              Patterns surface as you go, then build into a full picture — this is a stand-in for one person&apos;s.
            </p>
          </div>

          {/* ── Who you are ──────────────────────────────── */}
          <section style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
              Who you are
            </p>

            <InteractiveCluster facets={SAMPLE_FACETS} activeIdx={activeIdx} onSelect={setActiveIdx} />

            <div style={{ marginTop: 28 }}>
              <UnlockedContent
                traitWord={activeFacet.traitWord}
                content={activeFacet.content!}
                hue={activeHue}
              />
            </div>
          </section>

          {/* ── Where you thrive ─────────────────────────── */}
          <div style={{ borderTop: `1px solid ${line}`, padding: '44px 0 28px', marginTop: 40, textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: gray, fontWeight: 600, margin: '0 0 10px' }}>
              What&apos;s next
            </p>
            <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 15, color: charcoalSoft, maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
              Optional branches build out the picture — like where you actually do your best work.
            </p>
          </div>

          <section style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
              Where you thrive
            </p>
            <OrbitCluster
              conditions={ENV_CONDITIONS}
              primaryTraitWord={ENV_CONDITIONS[0].traitWord}
              primaryHue={ENV_CONDITIONS[0].hue}
              activeIdx={activeEnvIdx}
              onSelect={setActiveEnvIdx}
            />
            <div style={{ marginTop: 20 }}>
              <UnlockedContent
                traitWord={ENV_CONDITIONS[activeEnvIdx].traitWord}
                hue={ENV_CONDITIONS[activeEnvIdx].hue}
                subtitle="Your environment pattern"
                source="From your environment branch"
                content={{
                  trait_quote: 'Quiet, unscheduled stretches are when your actual best work happens.',
                  where_it_shows_up: 'A full calendar with no gaps between meetings leaves you foggy by 3pm, even on a light day. Given a free morning, you\'ll default to the hardest task on the list, not the easiest.',
                  tags: ['Deep work', 'Low interruption', 'Self-paced'],
                  go_deeper: 'This isn\'t about introversion — it\'s about context-switching cost. Every interruption resets a ramp-up you weren\'t consciously tracking.',
                  worth_trying: 'Block one interruption-free stretch daily and treat it like an unmovable meeting, not a nice-to-have.',
                }}
              />
            </div>
          </section>

          {/* ── CTA ───────────────────────────────────────── */}
          <div style={{ marginTop: 56, paddingTop: 32, borderTop: `1px solid ${line}`, textAlign: 'center' }}>
            <p style={{ fontFamily: serif, fontSize: 19, fontWeight: 600, color: charcoal, margin: '0 0 10px', lineHeight: 1.35 }}>
              Curious what yours would say?
            </p>
            <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, maxWidth: 340, margin: '0 auto 22px', lineHeight: 1.6 }}>
              15 minutes, first 5 patterns free — no account needed to start.
            </p>
            <Link href="/onboarding">
              <button style={{
                background: charcoal, color: cream, borderRadius: 9999, border: 'none',
                padding: '15px 30px', fontFamily: sans, fontSize: 14.5, fontWeight: 500, cursor: 'pointer',
                minHeight: 44,
              }}>
                Start your report — it&apos;s free
              </button>
            </Link>
          </div>

        </div>
      </div>
      <SiteFooter />
    </>
  )
}
