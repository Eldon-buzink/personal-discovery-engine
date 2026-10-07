'use client'

/**
 * Landing page preview — reference/bearing-landing-preview-spec.md, with
 * the owner's second- and third-round changes.
 *
 * Same page as `/` (LandingPageClient.tsx) with only these sections
 * changed. Kept sections are imported from LandingPageClient, not copied:
 * ProblemSection, FaqSection, FinalCtaSection, HeroCta, the blob visuals,
 * landingCSS and the mk* tokens. `/` itself is not modified by this page.
 *
 * - Hero: original, with the new subhead only.
 * - What you get ("Step 1"): original Environment, Relationships and Energy
 *   tiles; the first tile is the sample report in a scrolling browser frame
 *   (SampleReportPreview, content from app/report/sample/sampleContent.ts).
 * - Why it's different (WhyDifferentSection): four compact cards, 2x2.
 * - Your practice ("Step 2"): flow chart above the phones (PracticeFlow);
 *   phones and Weekly/Monthly/Quarterly text unchanged.
 * - How it works: step 3 wording only.
 *
 * Unlike `/`, signed-in visitors are not redirected away, so the owner can
 * view this while logged in.
 */

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import {
  landingCSS, sans, mkCream, mkCharcoal, mkCharcoalSoft, mkLine,
  useLandingVisitor, HeroCta, ProblemSection, FaqSection, FinalCtaSection,
  HeroBlobs, OrbitVisual, ConnectVisual, StaticDotScale, DemoBlob,
} from '../LandingPageClient'
import WhyDifferentSection from './WhyDifferentSection'
import { LANDING_PRACTICE_FACET_ID } from './landingPracticeFacet'

// Lazy: below-the-fold visuals (and the libs/components they pull in) only
// load once their section is near the viewport. The placeholders reserve
// the final height so nothing shifts when they arrive.
const PracticePhoneScreens = dynamic(() => import('./PracticePhoneScreens'), { ssr: false })
const SampleReportPreview = dynamic(() => import('./SampleReportPreview'), { ssr: false })

// Spec 4.3 — optional variant of the third "Sound familiar?" card, for the
// owner to evaluate. 'current' renders exactly what `/` shows. Try the
// alternative with ?problem=ongoing on this page, or flip the constant.
// TODO(owner): adopt or drop. Only the title changes; the quote under it
// is still the current one and would need its own rewrite if adopted.
type ProblemVariant = 'current' | 'ongoing'
const PROBLEM_THIRD_CARD_VARIANT: ProblemVariant = 'current'
const PROBLEM_THIRD_CARD_TITLE: Record<ProblemVariant, string> = {
  current: 'Stuck in the same pattern.',
  ongoing: 'Insight that doesn’t stick.',
}

const previewCSS = `
  /* Your practice */
  .pv-practice-section{padding:0 0 90px;}
  .pv-practice-hold{min-height:600px;}

  /* What you get: the sample report frame as the first bento tile. It
     stretches to the right column's height on desktop; the hold reserves
     space until it loads. */
  .pv-report-cell{display:flex;flex-direction:column;min-height:560px;}
  .pv-report-cell > .rp-frame{flex:1;}

  /* Your practice: flow chart above the phones */
  .pv-flow{max-width:1080px;margin:0 auto 40px;}
  .pv-flow-row{display:grid;grid-template-columns:repeat(11,auto);justify-content:center;align-items:stretch;column-gap:8px;}
  .pv-flow-node{display:flex;flex-direction:column;justify-content:center;text-align:center;max-width:150px;padding:10px 12px;border-radius:12px;
    border:1px solid ${mkLine};background:#EFEAE0;font-size:13px;line-height:1.35;color:${mkCharcoal};}
  .pv-flow-node small{display:block;font-size:11.5px;color:${mkCharcoalSoft};margin-top:2px;}
  .pv-flow-node.end{background:transparent;border-style:dashed;}
  .pv-flow-arrow{align-self:center;font-size:14px;color:${mkCharcoalSoft};}
  .pv-flow-branch{grid-row:2;grid-column:5;justify-self:center;display:flex;flex-direction:column;align-items:center;}
  .pv-flow-branch::before{content:'';width:0;height:18px;border-left:1.5px dashed rgba(38,36,32,0.3);}
  .pv-flow-branch span{max-width:150px;text-align:center;font-size:12.5px;line-height:1.35;color:${mkCharcoalSoft};padding:7px 11px;border-radius:12px;border:1px dashed rgba(38,36,32,0.25);}
  .pv-flow-branch-inline{display:none;align-items:center;gap:6px;font-size:12.5px;color:${mkCharcoalSoft};max-width:300px;width:100%;padding:6px 12px;border:1px dashed rgba(38,36,32,0.25);border-radius:12px;margin:2px 0 4px;}
  .pv-cadence{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1000px;margin:44px auto 0;}
  .pv-cadence div{border-top:1px solid ${mkLine};padding-top:14px;}
  .pv-cadence b{display:block;font-family:'Newsreader',serif;font-weight:500;font-size:20px;margin-bottom:6px;}
  .pv-cadence p{font-size:15px;line-height:1.6;color:${mkCharcoalSoft};margin:0;}
  .pv-closing{font-family:'Newsreader',serif;font-style:italic;font-size:18px;line-height:1.5;text-align:center;color:${mkCharcoalSoft};max-width:620px;margin:40px auto 0;}

  @media(max-width:860px){
    .pv-cadence{grid-template-columns:1fr;gap:18px;margin-top:36px;}
    .pv-report-cell{min-height:720px;}
    /* Flow chart stacks vertically on mobile; the side branch hangs off
       "Choose what to work on" as an indented item. */
    .pv-flow-row{display:flex;flex-direction:column;align-items:center;row-gap:4px;}
    .pv-flow-node{max-width:300px;width:100%;}
    .pv-flow-arrow{transform:rotate(90deg);}
    .pv-flow-branch{display:none;}
    .pv-flow-branch-inline{display:flex !important;}
  }
  @media(max-width:640px){
    .pv-practice-section{padding-bottom:60px;}
    .pv-closing{font-size:16px;}
  }
`

// Mounts its children once the placeholder is within ~600px of the
// viewport, so below-the-fold visuals don't load with the first paint.
function WhenNear({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect() }
    }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={className}>{near ? children : null}</div>
}

// Your practice, as a flow: from the full assessment to recaps, using the
// same Self-Discipline fixture as the phone screens. A side branch hangs off
// "Choose what to work on". Horizontal on desktop, stacked on mobile.
function PracticeFlow() {
  const example = LANDING_PRACTICE_FACET_ID
  const nodes: { text: string; sub?: string; end?: boolean }[] = [
    { text: 'Full assessment' },
    { text: 'Your patterns', sub: `e.g. ${example}` },
    { text: 'Choose what to work on' },
    { text: 'Evening check-in' },
    { text: 'Weekly, monthly and quarterly recaps' },
    { text: 'Optional next step after a multi-week trend', end: true },
  ]
  const branch = 'Optional: a deeper assessment, suggested by Bearing'
  return (
    <div className="pv-flow" role="list" aria-label="How your practice works">
      <div className="pv-flow-row">
        {nodes.map((n, i) => (
          <span key={n.text} style={{ display: 'contents' }}>
            {i > 0 && <span className="pv-flow-arrow" aria-hidden="true">→</span>}
            <span className={`pv-flow-node${n.end ? ' end' : ''}`} role="listitem">
              {n.text}
              {n.sub && <small>{n.sub}</small>}
            </span>
            {i === 2 && <span className="pv-flow-branch-inline" role="listitem">↳ {branch}</span>}
          </span>
        ))}
        {/* Desktop: hangs below "Choose what to work on" (column 5). */}
        <div className="pv-flow-branch" aria-hidden="true"><span>{branch}</span></div>
      </div>
    </div>
  )
}

export default function PreviewLandingClient() {
  const { ready, welcomeBack, startedUnfinished } = useLandingVisitor({ redirectSignedIn: false })
  const [problemVariant, setProblemVariant] = useState<ProblemVariant>(PROBLEM_THIRD_CARD_VARIANT)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('problem') === 'ongoing') setProblemVariant('ongoing')
  }, [])

  if (!ready) return <div style={{ minHeight:'100vh', background:mkCream }} />

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: landingCSS + previewCSS }} />
      <div style={{ background:mkCream, color:mkCharcoal, fontFamily:sans }}>

        {/* ── HERO (original, new subhead only) ─────────────────────── */}
        <section className="hero">
          <div className="hero-inner">
            <div>
              <h1>Get to know<br /><em>yourself better.</em></h1>
              <p>See the patterns behind how you think, feel and act, then keep working with them, so your choices fit who you are.</p>
              <HeroCta welcomeBack={welcomeBack} startedUnfinished={startedUnfinished} />
            </div>
            <HeroBlobs />
          </div>
        </section>

        <ProblemSection thirdCardTitle={PROBLEM_THIRD_CARD_TITLE[problemVariant]} />

        <WhyDifferentSection />

        {/* ── WHAT YOU GET (original content, as on `/`) ────────────── */}
        <section className="bento-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Step 1 · See your patterns</div>
              <h2>See your patterns.<br />Go deeper where it matters.</h2>
            </div>

            <div className="bento">
              {/* The sample report in a frame, in place of the "Your
                  patterns" tile; lazy-loaded, with its height reserved. */}
              <WhenNear className="pv-report-cell">
                <SampleReportPreview />
              </WhenNear>

              <div className="bento-col">
                <div className="bento-card">
                  <div className="mk-eyebrow">Where you thrive</div>
                  <h3>Your ideal environment</h3>
                  <div className="bento-orbit-wrap">
                    <OrbitVisual />
                  </div>
                  <p style={{ marginTop:16 }}>The settings, structures, and contexts where you naturally do your best work.</p>
                </div>
                <div className="bento-card">
                  <div className="mk-eyebrow">How you connect</div>
                  <h3>Relationship patterns</h3>
                  <div className="bento-connect-wrap">
                    <ConnectVisual />
                  </div>
                  <p style={{ marginTop:14 }}>Your attachment pattern: how you handle closeness and distance in the relationships that matter most.</p>
                </div>
              </div>
            </div>

            <div className="bento-row3" style={{ gridTemplateColumns: '1fr' }}>
              <div className="bento-card">
                <div className="mk-eyebrow">What gives you energy</div>
                <h3>The fuel behind your best days</h3>
                <p>Specific activities, environments, and interactions that restore rather than deplete you.</p>
              </div>
            </div>

            <p className="mk-microcopy" style={{ textAlign:'center', marginTop:22 }}>
              Your first 5 patterns are free. The deeper assessments are part of the one-time EUR 49 unlock.
            </p>
          </div>
        </section>

        {/* ── YOUR PRACTICE (new) ───────────────────────────────────── */}
        <section className="pv-practice-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Step 2 · Work with them</div>
              <h2>Insight sticks when you keep noticing.</h2>
              <p>Choose the patterns that matter to you. Each evening, a short check-in. Over time you build a record of your own evidence, not a generic tip list.</p>
            </div>

            <PracticeFlow />

            <WhenNear className="pv-practice-hold">
              <PracticePhoneScreens />
            </WhenNear>

            <div className="pv-cadence">
              <div><b>Weekly</b><p>A summary of what you logged.</p></div>
              <div><b>Monthly</b><p>Your own patterns reflected back, with counts and shifts in how you describe things.</p></div>
              <div><b>Quarterly</b><p>A review of how far you&apos;ve come, and whether these are still the right patterns to work on.</p></div>
            </div>

            <p className="pv-closing">
              No praise, no predictions. A suggested next step appears only after a consistent multi-week trend, and it&apos;s always optional.
            </p>

          </div>
        </section>

        {/* ── HOW IT WORKS (modified: step 3 wording) ───────────────── */}
        <section id="how-it-works" className="how">
          <div className="section-head">
            <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>How it works</div>
            <h2>Three steps. One honest picture.</h2>
          </div>
          <div className="how-steps">
            <div className="step">
              <div className="step-mark">1</div>
              <h3>Rate 120 short statements</h3>
              <p>Statements like &lsquo;Worry about things.&rsquo;, rated from very inaccurate to very accurate. About 15 minutes.</p>
              <StaticDotScale />
            </div>
            <div className="step">
              <div className="step-mark">2</div>
              <h3>See if it resonates</h3>
              <p>Your first patterns appear while you&apos;re still answering, usually before the halfway point. If it doesn&apos;t feel right, stop: no cost, no account.</p>
              <DemoBlob scale={0.45} marginTop={14} center />
            </div>
            <div className="step">
              <div className="step-mark">3</div>
              <h3>Go deeper</h3>
              <p>Unlock all 30 facets plus five deeper assessments for EUR 49, once. Bearing suggests which to take first.</p>
            </div>
          </div>
          <p className="mk-microcopy" style={{ textAlign:'center', marginTop:32 }}>
            The written explanation of each pattern is generated by AI from your results.
          </p>
        </section>

        <FaqSection />

        <FinalCtaSection startedUnfinished={startedUnfinished} />

      </div>
    </>
  )
}
