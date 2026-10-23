'use client'

// Report lab: the whole report page per CTA state, with the real first
// section, the real practice card, the ringed closing panel at the end of
// "What's next" (placement 1) and a working sticky bar (option A). What the
// plan removes is gone: the "Keep discovering" / "Fully mapped" card, the
// branch suggestion card and the line under "What's next". Example data only.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { type } from '@/lib/design/type'
import { reportCta, type CtaState } from '@/lib/known/reportCta'
import { PracticeCard } from '@/components/known/ReportSections'
import { FreeTraitCluster } from '@/components/known/report/FreeTraitCluster'
import { PaidFirstSection, type ReportTrait } from '@/components/known/report/PaidFirstSection'
import { patternSubtitle, type CarouselTrait } from '@/components/known/TraitCarousel'
import { UnlockedContent, userCuratedHue } from '@/components/known/ReportVisuals'
import EvidenceDialog from '@/components/known/EvidenceDialog'
import { EXAMPLE_BANDS, EXAMPLE_CARDS, exampleResponses } from '@/lib/known/exampleReport'
import { computeFacetScore, getTraitWord } from '@/lib/known/scoring'
import { FACET_QUESTIONS } from '@/lib/known/ring1-questions'
import { domainOf, orderByStrength, traitStrength } from '@/lib/known/traitOrder'
import { evidencePanelData } from '@/lib/known/evidencePanel'
import { CLUSTER_COLOURS } from '@/lib/known/blobColour'
import { winningRelationships } from '@/lib/known/relationships'
import { BASE, Bar, Panel, STATES, type Ring } from '../CtaBoard'

const charcoal = '#262420'
const charcoalSoft = '#56534D'
const cream = '#F7F4ED'
const line = '#E5E1D5'
const LABELS: Record<CtaState, string> = {
  'not-started': 'Example (not started)',
  'free-in-progress': 'Free, 3 traits',
  'free-locked': 'Free, 5 traits',
  'paid-in-progress': 'Paid, branch started',
  'paid-suggestion': 'Paid, suggestion',
  'paid-done': 'Paid, all explored',
}

const reportCSS = `
  .report-cards-row{display:flex;gap:12px;}
  @media(max-width:560px){ .report-cards-row{flex-direction:column;} }
  .cta-ring-moving{animation:gradientRotate 4s ease infinite}
  .full-bar{position:fixed;left:0;right:0;bottom:0;z-index:40;transition:transform var(--dur-ui) var(--ease),opacity var(--dur-ui) var(--ease)}
  .full-bar[data-hidden="true"]{transform:translateY(100%);opacity:0;pointer-events:none}
  @media (prefers-reduced-motion: reduce){.cta-ring-moving{animation:none}.full-bar{transition:none}}
`

function useExample() {
  return useMemo(() => {
    const responses = exampleResponses()
    const lastQuestion = (f: string) => Math.max(...(FACET_QUESTIONS.get(f) ?? []).map((q) => q.id))
    const revealed = Object.keys(EXAMPLE_BANDS).sort((a, b) => lastQuestion(a) - lastQuestion(b))
    const facets = revealed.map((facet, idx) => {
      const score = computeFacetScore(facet, responses) ?? 3
      return { facet, traitWord: getTraitWord(facet, score), hueOffset: idx, score }
    })
    const paid: ReportTrait[] = facets.map((f) => {
      const cluster = domainOf(f.facet) ?? 'Neuroticism'
      return { facet: f.facet, word: f.traitWord, cluster, score: f.score, strength: traitStrength(f.score), revealIndex: f.hueOffset, direction: EXAMPLE_BANDS[f.facet], colour: CLUSTER_COLOURS[cluster], content: EXAMPLE_CARDS[f.facet] }
    })
    const relationships = Array.from(new Map(Array.from(winningRelationships(facets.map((f) => ({ facet: f.facet, traitWord: f.traitWord, direction: EXAMPLE_BANDS[f.facet], score: f.score })), 5).values()).map((r) => [r.id, r])).values())
    return { responses, facets, paid, relationships }
  }, [])
}

function FreeSection({ count }: { count: number }) {
  const { responses, facets } = useExample()
  const shown = facets.slice(0, count)
  const order = orderByStrength(shown, (f) => traitStrength(f.score))
  const [activeIdx, setActiveIdx] = useState(0)
  const hueOf = (f: (typeof shown)[number]) => userCuratedHue(`ring1-pattern-${f.traitWord.toLowerCase()}`, f.hueOffset)
  const traits: CarouselTrait[] = order.map((i) => ({ key: shown[i].facet, traitWord: shown[i].traitWord, hue: hueOf(shown[i]), domain: null }))
  const strengths = Object.fromEntries(shown.map((f) => [f.facet, traitStrength(f.score)]))
  const active = shown[order[Math.min(activeIdx, order.length - 1)]]
  return (
    <FreeTraitCluster traits={traits} strengths={strengths} activeIdx={activeIdx} onSelect={setActiveIdx}>
      <div style={{ marginTop: 12 }}>
        <UnlockedContent
          traitWord={active.traitWord}
          content={EXAMPLE_CARDS[active.facet]}
          hue={hueOf(active)}
          subtitle={patternSubtitle(active.hueOffset)}
          source={null}
          variant="ring1"
          evidence={<EvidenceDialog key={active.facet} data={evidencePanelData(active.facet, EXAMPLE_BANDS[active.facet], responses, true)} />}
        />
      </div>
    </FreeTraitCluster>
  )
}

function PaidSection() {
  const { responses, paid, relationships } = useExample()
  return <PaidFirstSection traits={paid} responses={responses} relationships={relationships} insightFor={() => undefined} renderPending={() => null} />
}

export default function FullBoard({ state, ring, mobile }: { state: CtaState; ring: Ring; mobile: boolean }) {
  const s = STATES.find((x) => x.state === state) ?? STATES[2]
  const cta = reportCta({ ...BASE, ...s.input })
  const isFree = state === 'free-in-progress' || state === 'free-locked'

  // The bar shows once the first section has been scrolled past its top, and
  // hides while the closing panel is on screen.
  const firstRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  const [panelInView, setPanelInView] = useState(false)
  useEffect(() => {
    setSeen(false)
    const io1 = new IntersectionObserver(([e]) => { if (e.boundingClientRect.top < 0 || e.intersectionRatio > 0.4) setSeen(true) }, { threshold: [0, 0.4] })
    const io2 = new IntersectionObserver(([e]) => setPanelInView(e.isIntersecting), { threshold: 0.15 })
    if (firstRef.current) io1.observe(firstRef.current)
    if (panelRef.current) io2.observe(panelRef.current)
    return () => { io1.disconnect(); io2.disconnect() }
  }, [state])

  const qs = (k: string, v: string) => { const p = new URLSearchParams({ state, ring }); p.set(k, v); return `?${p.toString()}` }
  const chip = (on: boolean): React.CSSProperties => ({ ...type.ui, padding: '6px 12px', borderRadius: 999, border: `1px solid ${on ? charcoal : line}`, background: on ? charcoal : '#FFFFFF', color: on ? cream : charcoal, textDecoration: 'none', whiteSpace: 'nowrap' })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: reportCSS }} />
      <div style={{ background: '#EFEBE2', borderBottom: `1px solid ${line}`, padding: '12px 16px' }}>
        <p style={{ ...type.meta, textAlign: 'center', margin: '0 0 8px' }}>Report lab · the whole page per state · ring {ring}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {STATES.map((x) => <Link key={x.state} href={qs('state', x.state)} style={chip(x.state === state)}>{LABELS[x.state]}</Link>)}
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
          {(['still', 'moving', 'none'] as Ring[]).map((r) => <Link key={r} href={qs('ring', r)} style={chip(r === ring)}>Ring {r}</Link>)}
        </div>
      </div>

      <div style={{ background: cream, minHeight: '100vh' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 22px 120px' }}>
          {state === 'not-started' && (
            <div style={{ marginTop: 20, padding: '10px 16px', borderRadius: 10, background: '#F3F1EB', border: `1px solid ${line}`, textAlign: 'center' }}>
              <p style={{ ...type.meta, color: charcoalSoft, margin: 0 }}>This is an example report with illustrative results, all 30 traits of the first ring. It is not your data.</p>
            </div>
          )}

          <div style={{ padding: '36px 0 30px', textAlign: 'center' }}>
            <h1 style={{ ...type.display2, color: charcoal, margin: '0 0 12px' }}>Everything found so far.</h1>
            <p style={{ ...type.body, color: charcoalSoft, maxWidth: 380, margin: '0 auto' }}>All patterns surface here as you explore.</p>
          </div>

          <section ref={firstRef} style={{ textAlign: 'center' }}>
            <p style={{ ...type.meta, marginBottom: 6 }}>Who you are</p>
            {isFree ? <FreeSection key={state} count={state === 'free-locked' ? 5 : 3} /> : <PaidSection key={state} />}
          </section>

          <p style={{ ...type.meta, textAlign: 'center', margin: '56px 0 14px' }}>What&apos;s next</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {state !== 'paid-done' && state !== 'not-started' && <PracticeCard isAuthenticated={false} href="/practice/example" label="Go to your practice" />}
          </div>
          <div ref={panelRef}><Panel cta={cta} ring={ring} /></div>

          <div style={{ marginTop: 64, paddingTop: 28, borderTop: `1px solid ${line}`, textAlign: 'center' }}>
            <p style={{ ...type.meta }}>A living report. It grows as you keep exploring.</p>
          </div>
        </div>
      </div>

      <div className="full-bar" data-hidden={!seen || panelInView}>
        <Bar cta={cta} mobile={mobile} flush />
      </div>
    </>
  )
}
