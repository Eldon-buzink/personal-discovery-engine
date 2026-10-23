'use client'

/**
 * The example report with the first ring complete. Same page structure and
 * components as app/report/page.tsx, fed by a fixed example
 * (lib/known/exampleReport.ts) instead of the visitor's session:
 *   - scores and trait words from the real scoring over 120 example answers;
 *   - traits in the report's own strength order, with domains, hues and
 *     subtitles worked out the same way;
 *   - "See what this is based on" from the real evidence panel;
 *   - What's next: the practice card (to the practice example), "Fully
 *     mapped.", and the next-step suggestion from the real engine.
 * No paywall, no account, no AI calls. Relationship notes on a trait are
 * left out: in a real report they are written live per person.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SiteNav, { NAV_H } from '@/components/known/SiteNav'
import SiteFooter from '@/components/known/SiteFooter'
import { TraitCarousel, domainNote, patternSubtitle, type CarouselTrait } from '@/components/known/TraitCarousel'
import { UnlockedContent, userCuratedHue } from '@/components/known/ReportVisuals'
import EvidenceDialog from '@/components/known/EvidenceDialog'
import { BRANCH_DISPLAY_NAMES, BranchSuggestionCard, PracticeCard, Ring1CompleteCard, WhatsnextDivider } from '@/components/known/ReportSections'
import { EXAMPLE_BANDS, EXAMPLE_CARDS, exampleResponses } from '@/lib/known/exampleReport'
import { computeFacetScore, getTraitWord } from '@/lib/known/scoring'
import { FACET_QUESTIONS } from '@/lib/known/ring1-questions'
import { domainOf, orderByStrength, traitStrength } from '@/lib/known/traitOrder'
import { evidencePanelData } from '@/lib/known/evidencePanel'
import { suggestNextBranch } from '@/lib/known/branchSuggestion'
import { type } from '@/lib/design/type'
import { REPORT_PAID_V2 } from '@/lib/known/reportFlags'
import { PaidFirstSection, type ReportTrait } from '@/components/known/report/PaidFirstSection'
import { CLUSTER_COLOURS } from '@/lib/known/blobColour'
import { winningRelationships } from '@/lib/known/relationships'

const charcoalSoft = '#56534D'
const charcoal = '#262420'
const cream = '#F7F4ED'
const line = '#E5E1D5'

// Same as the report page: UnlockedContent's card row stacks on phones.
const reportCSS = `
  .report-cards-row{display:flex;gap:12px;}
  @media(max-width:560px){ .report-cards-row{flex-direction:column;} }
`

interface ExampleFacet { facet: string; traitWord: string; hueOffset: number; score: number }

function buildExample() {
  const responses = exampleResponses()
  // Reveal order as if answered in question order (a facet reveals once all
  // four of its statements are in); hueOffset follows it, as in the report.
  const lastQuestion = (f: string) => Math.max(...(FACET_QUESTIONS.get(f) ?? []).map((q) => q.id))
  const revealed = Object.keys(EXAMPLE_BANDS).sort((a, b) => lastQuestion(a) - lastQuestion(b))
  const facets: ExampleFacet[] = revealed.map((facet, idx) => {
    const score = computeFacetScore(facet, responses) ?? 3
    return { facet, traitWord: getTraitWord(facet, score), hueOffset: idx, score }
  })
  const order = orderByStrength(facets, (f) => traitStrength(f.score))
  const suggestion = suggestNextBranch(
    facets.map((f) => ({ facet: f.facet, traitWord: f.traitWord, scoreDirection: EXAMPLE_BANDS[f.facet], branch: 'ring1', content: EXAMPLE_CARDS[f.facet] })),
    [],
  )
  return { responses, facets, order, suggestion }
}

const hueOf = (f: ExampleFacet) => userCuratedHue(`ring1-pattern-${f.traitWord.toLowerCase()}`, f.hueOffset)

export default function ExampleReportClient() {
  const router = useRouter()
  const { responses, facets, order, suggestion } = useMemo(buildExample, [])
  const [activeIdx, setActiveIdx] = useState(0)

  const carouselTraits: CarouselTrait[] = useMemo(
    () => order.map((i) => ({ key: facets[i].facet, traitWord: facets[i].traitWord, hue: hueOf(facets[i]), domain: domainOf(facets[i].facet) })),
    [facets, order],
  )
  const active = facets[order[activeIdx]]
  // The paid redesign (NEXT_PUBLIC_REPORT_PAID_V2), on the same example data.
  const paidTraits: ReportTrait[] = useMemo(() => facets.map((f) => {
    const cluster = domainOf(f.facet) ?? 'Neuroticism'
    return { facet: f.facet, word: f.traitWord, cluster, score: f.score, strength: traitStrength(f.score), revealIndex: f.hueOffset, direction: EXAMPLE_BANDS[f.facet], colour: CLUSTER_COLOURS[cluster], content: EXAMPLE_CARDS[f.facet] }
  }), [facets])
  const paidRelationships = useMemo(() => Array.from(new Map(Array.from(winningRelationships(facets.map((f) => ({ facet: f.facet, traitWord: f.traitWord, direction: EXAMPLE_BANDS[f.facet], score: f.score })), 5).values()).map((r) => [r.id, r])).values()), [facets])
  const evidence = evidencePanelData(active.facet, EXAMPLE_BANDS[active.facet], responses, true)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: reportCSS }} />
      <SiteNav />

      <div style={{ background: cream, minHeight: '100vh', paddingTop: NAV_H }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 22px 64px' }}>

          <div style={{ marginTop: 20, padding: '10px 16px', borderRadius: 10, background: '#F3F1EB', border: `1px solid ${line}`, textAlign: 'center' }}>
            <p style={{ ...type.meta, color: charcoalSoft, margin: 0 }}>
              This is an example report with illustrative results, all 30 traits of the first ring. It is not your data.
            </p>
          </div>

          {/* ── Intro (as in the report) ─────────────────── */}
          <div style={{ padding: '36px 0 30px', textAlign: 'center' }}>
            <p style={{ ...type.meta, marginBottom: 12 }}>Your report</p>
            <h1 style={{ ...type.display2, color: charcoal, margin: '0 0 12px' }}>Everything found so far.</h1>
            <p style={{ ...type.body, color: charcoalSoft, maxWidth: 380, margin: '0 auto' }}>All patterns surface here as you explore.</p>
          </div>

          {/* ── Who you are ──────────────────────────────── */}
          <section style={{ textAlign: 'center' }}>
            <p style={{ ...type.meta, marginBottom: 6, textAlign: 'center' }}>Who you are</p>
            {REPORT_PAID_V2 ? (
              <PaidFirstSection
                traits={paidTraits}
                responses={responses}
                relationships={paidRelationships}
                insightFor={() => undefined}
                renderPending={() => null}
              />
            ) : (
              <TraitCarousel traits={carouselTraits} activeIdx={activeIdx} onSelect={setActiveIdx}>
                <div style={{ marginTop: 12 }}>
                  <UnlockedContent
                    traitWord={active.traitWord}
                    content={EXAMPLE_CARDS[active.facet]}
                    hue={hueOf(active)}
                    subtitle={patternSubtitle(active.hueOffset)}
                    subtitleNote={domainNote(domainOf(active.facet)) ?? undefined}
                    source={null}
                    variant="ring1"
                    evidence={<EvidenceDialog key={active.facet} data={evidence} />}
                  />
                </div>
              </TraitCarousel>
            )}
          </section>

          {/* ── What's next ──────────────────────────────── */}
          <WhatsnextDivider />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PracticeCard isAuthenticated={false} href="/practice/example" />
            <Ring1CompleteCard />
            {suggestion && (
              <BranchSuggestionCard
                branchLabel={BRANCH_DISPLAY_NAMES[suggestion.branch]}
                reason={suggestion.reason}
                isPaid={true}
                onSelect={() => router.push('/onboarding')}
              />
            )}
          </div>

          <div style={{ marginTop: 64, paddingTop: 28, borderTop: `1px solid ${line}`, textAlign: 'center' }}>
            <p style={{ ...type.meta }}>A living report. It grows as you keep exploring.</p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
