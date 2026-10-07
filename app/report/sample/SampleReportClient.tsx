'use client'

import Link from 'next/link'
import { useState } from 'react'
import { InteractiveCluster, OrbitCluster, OrbitCondition, UnlockedContent, userCuratedHue } from '@/components/known/ReportVisuals'
import { SAMPLE_FACETS, SAMPLE_ENVIRONMENT_CONTENT } from './sampleContent'
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
                content={SAMPLE_ENVIRONMENT_CONTENT}
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
