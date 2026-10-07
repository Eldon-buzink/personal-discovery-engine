'use client'

import { useState } from 'react'
import { InteractiveCluster, OrbitCluster, OrbitCondition, UnlockedContent, userCuratedHue } from '@/components/known/ReportVisuals'
import { SAMPLE_FACETS, SAMPLE_ENVIRONMENT_CONTENT } from './sampleContent'

// The sample report's content column (banner, intro, Who you are, Where
// you thrive), shared by /report/sample and the landing preview's "Your
// full report" section so both show exactly the same report.

export const gray = '#8C8A83'
export const charcoalSoft = '#56534D'
export const charcoal = '#262420'
export const cream = '#F7F4ED'
export const line = '#E5E1D5'
export const sans = 'var(--font-inter), system-ui, sans-serif'
export const serif = 'var(--font-newsreader), serif'

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

export default function SampleReportBody() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [activeEnvIdx, setActiveEnvIdx] = useState(0)
  const activeFacet = SAMPLE_FACETS[activeIdx]
  const activeHue = userCuratedHue(`ring1-pattern-${activeFacet.traitWord.toLowerCase()}`, activeFacet.hueOffset)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sampleReportCSS }} />
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
    </>
  )
}
