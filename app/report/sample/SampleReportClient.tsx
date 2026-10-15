'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { PatternContent } from '@/lib/known/types'
import { FacetEntry, OrbitCluster, OrbitCondition, UnlockedContent, userCuratedHue } from '@/components/known/ReportVisuals'
import { TraitCarousel, patternSubtitle } from '@/components/known/TraitCarousel'
import type { CarouselTrait } from '@/components/known/TraitCarousel'
import SiteNav, { NAV_H } from '@/components/known/SiteNav'
import SiteFooter from '@/components/known/SiteFooter'
import { type } from '@/lib/design/type'
import EvidenceDialog from '@/components/known/EvidenceDialog'
import { sampleEvidencePanel } from '@/lib/known/sampleEvidence'

// Static example report shown behind the landing page's "See an example
// report" CTA. Reuses the real report page's presentational components
// (TraitCarousel/UnlockedContent/OrbitCluster, shared via
// components/known/ReportVisuals.tsx) so the sample stays visually
// identical to a real one — but with fixed illustrative content instead of
// localStorage/Supabase-backed data, no paywall, and everything unlocked.

const gray = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal = '#262420'
const cream = '#F7F4ED'
const line = '#E5E1D5'

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
    facet: 'Cautiousness',
    traitWord: 'Deliberate',
    hueOffset: 0,
    content: {
      trait_quote: "You don't speak until you've thought it through, and when you do, people tend to listen.",
      body: 'In meetings you often let the room talk itself out before you weigh in. That tends to give what you say more weight, and it can mean people read the pause as distance when you are fully engaged.',
      tags: ['Considered', 'Low reactivity', 'High signal-to-noise'],
    } satisfies PatternContent,
  },
  {
    facet: 'Self-Efficacy',
    traitWord: 'Self-assured',
    hueOffset: 1,
    content: {
      trait_quote: 'Left alone with a hard problem, you speed up rather than stall.',
      body: 'It often shows on the ambiguous project nobody else wants to own. That independence tends to get things moving without much oversight, and it can make check-ins and shared ownership feel like friction.',
      tags: ['Self-directed', 'Comfortable with ambiguity', 'Low oversight need'],
    } satisfies PatternContent,
  },
  {
    facet: 'Self-Consciousness',
    traitWord: 'Aware',
    hueOffset: 2,
    content: {
      trait_quote: 'You often finish thinking about a conversation hours after it ended.',
      body: 'Replaying it is how you tend to make sense of things, and it often lets you spot patterns in yourself before anyone points them out. The same habit can loop when there is no second voice in it.',
      tags: ['Self-aware', 'Internally processed', 'Slow to conclude'],
    } satisfies PatternContent,
  },
]

// Sample traits keep their listed order (no scores), and domain is left
// null so the carousel shows no related row for them.
const SAMPLE_TRAITS: CarouselTrait[] = SAMPLE_FACETS.map((f) => ({
  key: f.facet,
  traitWord: f.traitWord,
  hue: userCuratedHue(`ring1-pattern-${f.traitWord.toLowerCase()}`, f.hueOffset),
  domain: null,
}))

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
      <style dangerouslySetInnerHTML={{ __html: sampleReportCSS }} />
      <SiteNav />

      <div style={{ background: cream, minHeight: '100vh', paddingTop: NAV_H }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 22px 64px' }}>

          {/* ── Sample banner ─────────────────────────────── */}
          <div style={{
            marginTop: 20, padding: '10px 16px', borderRadius: 10,
            background: '#F3F1EB', border: `1px solid ${line}`, textAlign: 'center',
          }}>
            <p style={{ ...type.meta, color: charcoalSoft, margin: 0 }}>
              This is a sample report with illustrative results. It is not your data.
            </p>
          </div>

          {/* ── Intro ─────────────────────────────────────── */}
          <div style={{ padding: '28px 0 30px', textAlign: 'center' }}>
            <p style={{ ...type.meta, color: gray, marginBottom: 12 }}>
              Example report
            </p>
            <h1 style={{ ...type.display2, color: charcoal, margin: '0 0 12px' }}>
              Here&apos;s what yours could look like.
            </h1>
            <p style={{ ...type.body, color: charcoalSoft, maxWidth: 380, margin: '0 auto' }}>
              Patterns surface as you go, then build into a full picture. This is a stand-in for one person&apos;s.
            </p>
          </div>

          {/* ── Who you are ──────────────────────────────── */}
          <section style={{ textAlign: 'center' }}>
            <p style={{ ...type.meta, color: gray, marginBottom: 6, textAlign: 'center' }}>
              Who you are
            </p>

            <TraitCarousel traits={SAMPLE_TRAITS} activeIdx={activeIdx} onSelect={setActiveIdx}>
              <div style={{ marginTop: 12 }}>
                <UnlockedContent
                  traitWord={activeFacet.traitWord}
                  content={activeFacet.content!}
                  hue={activeHue}
                  subtitle={patternSubtitle(activeFacet.hueOffset)}
                  source={null}
                  variant="ring1"
                  evidence={(() => {
                    const data = sampleEvidencePanel(activeFacet.facet)
                    return <EvidenceDialog key={activeFacet.facet} data={data} />
                  })()}
                />
              </div>
            </TraitCarousel>
          </section>

          {/* ── Where you thrive ─────────────────────────── */}
          <div style={{ borderTop: `1px solid ${line}`, padding: '44px 0 28px', marginTop: 40, textAlign: 'center' }}>
            <p style={{ ...type.meta, color: gray, margin: '0 0 10px' }}>
              What&apos;s next
            </p>
            <p style={{ ...type.body, color: charcoalSoft, maxWidth: 340, margin: '0 auto' }}>
              Optional branches build out the picture, like where you actually do your best work.
            </p>
          </div>

          <section style={{ textAlign: 'center' }}>
            <p style={{ ...type.meta, color: gray, marginBottom: 6, textAlign: 'center' }}>
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
                  go_deeper: 'Every interruption costs you more than it seems. Each one resets a ramp-up you weren\'t consciously tracking.',
                  worth_trying: 'Block one interruption-free stretch daily and treat it like an unmovable meeting, not a nice-to-have.',
                }}
              />
            </div>
          </section>

          {/* ── CTA ───────────────────────────────────────── */}
          <div style={{ marginTop: 56, paddingTop: 32, borderTop: `1px solid ${line}`, textAlign: 'center' }}>
            <p style={{ ...type.display4, color: charcoal, margin: '0 0 10px' }}>
              Curious what yours would say?
            </p>
            <p style={{ ...type.body, color: charcoalSoft, maxWidth: 340, margin: '0 auto 22px' }}>
              15 minutes, first 5 patterns free. No account needed to start.
            </p>
            <Link href="/onboarding">
              <button style={{
                background: charcoal, color: cream, borderRadius: 9999, border: 'none',
                ...type.ui, padding: '15px 30px', cursor: 'pointer',
                minHeight: 44,
              }}>
                Start your free report
              </button>
            </Link>
          </div>

        </div>
      </div>
      <SiteFooter />
    </>
  )
}
