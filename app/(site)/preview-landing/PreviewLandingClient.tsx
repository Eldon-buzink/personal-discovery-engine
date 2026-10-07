'use client'

/**
 * Landing page preview — reference/bearing-landing-preview-spec.md, with
 * the owner's second-round changes.
 *
 * Same page as `/` (LandingPageClient.tsx) with only these sections
 * changed. Kept sections are imported from LandingPageClient, not copied:
 * ProblemSection, FaqSection, FinalCtaSection, HeroCta, the blob visuals,
 * landingCSS and the mk* tokens. `/` itself is not modified by this page.
 *
 * - Hero: original, with the new subhead only.
 * - What you get: original content (copied from LandingPageClient's inline
 *   JSX, since `/` isn't touched to extract it).
 * - Your full report (new): the public sample report, scrolling, in a
 *   browser frame (SampleReportPreview → app/report/sample/SampleReportBody).
 * - AI hook and Your practice (new): unchanged from round one.
 * - Why it's different: one extra row, plus a compact branch map (the main
 *   assessment in the center, the five branch assessments around it).
 * - How it works: step 3 wording only.
 *
 * Unlike `/`, signed-in visitors are not redirected away, so the owner can
 * view this while logged in.
 */

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import {
  landingCSS, sans, mkCream, mkCharcoal, mkCharcoalSoft, mkCard, mkLine, mkTeal, mkPeriwinkle, mkRose,
  useLandingVisitor, HeroCta, ProblemSection, FaqSection, FinalCtaSection,
  HeroBlobs, BentoCluster, OrbitVisual, ConnectVisual, StaticDotScale, DemoBlob,
} from '../LandingPageClient'

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

// Branch map: five branch assessments evenly around the main report,
// starting at the top. x/y are percentages of the map box; xm is the
// tighter horizontal radius used at phone width.
const BRANCHES = ['Working style', 'Relationships', 'Energy', 'Environment', 'Direction'].map((name, i) => {
  const a = ((-90 + i * 72) * Math.PI) / 180
  return {
    name,
    x: 50 + 40 * Math.cos(a),
    xm: 50 + 33 * Math.cos(a),
    y: 50 + 40 * Math.sin(a),
    color: [mkTeal, mkRose, '#F2C98A', mkPeriwinkle, '#B9DDB0'][i],
  }
})

const previewCSS = `
  /* AI hook */
  .pv-hook-section{padding:0 0 90px;}
  .pv-hook-section .section-head{margin-bottom:0;}

  /* Your full report */
  .pv-report-section{padding:0 0 90px;}
  .pv-report-hold{min-height:600px;}
  .pv-report-link{display:block;text-align:center;margin-top:22px;color:${mkCharcoal};font-size:14px;text-decoration:underline;}

  /* Your practice */
  .pv-practice-section{padding:0 0 90px;}
  .pv-practice-hold{min-height:600px;}
  .pv-cadence{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1000px;margin:44px auto 0;}
  .pv-cadence div{border-top:1px solid ${mkLine};padding-top:14px;}
  .pv-cadence b{display:block;font-family:'Newsreader',serif;font-weight:500;font-size:20px;margin-bottom:6px;}
  .pv-cadence p{font-size:15px;line-height:1.6;color:${mkCharcoalSoft};margin:0;}
  .pv-closing{font-family:'Newsreader',serif;font-style:italic;font-size:18px;line-height:1.5;text-align:center;color:${mkCharcoalSoft};max-width:620px;margin:40px auto 0;}
  .pv-todo{max-width:620px;margin:28px auto 0;border:1.5px dashed #D85A30;border-radius:12px;padding:12px 16px;font-size:13px;color:#8a5a3d;text-align:center;}

  /* Why it's different: four rows instead of three (desktop subgrid only;
     the 860px rule in landingCSS already resets mobile to a single column). */
  @media(min-width:861px){
    .compare.pv-compare-4{grid-template-rows:repeat(4,auto);}
    .compare.pv-compare-4 .compare-card,.compare.pv-compare-4 .compare-vs{grid-row:1/span 4;}
  }

  /* Branch map, under the comparison */
  .pv-branch{max-width:640px;margin:8px auto 44px;text-align:center;}
  .pv-branch h3{font-family:'Newsreader',serif;font-size:26px;font-weight:500;line-height:1.25;margin:0 0 10px;}
  .pv-branch > p{font-size:15px;line-height:1.6;color:${mkCharcoalSoft};margin:0 auto;max-width:520px;}
  .pv-branch-map{position:relative;height:320px;max-width:560px;margin:18px auto 0;}
  .pv-branch-ring{position:absolute;left:10%;right:10%;top:10%;bottom:10%;border:1.5px dashed rgba(38,36,32,0.18);border-radius:50%;}
  .pv-branch-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:132px;height:132px;border-radius:50%;
    background:${mkCharcoal};color:${mkCream};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;}
  .pv-branch-core b{font-family:'Newsreader',serif;font-weight:500;font-size:19px;line-height:1.15;}
  .pv-branch-core span{font-size:11.5px;color:#C9C4B8;}
  .pv-branch-node{position:absolute;left:var(--x);top:var(--y);transform:translate(-50%,-50%);white-space:nowrap;
    display:flex;align-items:center;gap:8px;background:${mkCard};border:1px solid ${mkLine};border-radius:999px;padding:8px 14px;font-size:14px;color:${mkCharcoal};}
  .pv-branch-node i{width:10px;height:10px;border-radius:50%;background:var(--c);flex-shrink:0;}

  @media(max-width:860px){
    .pv-cadence{grid-template-columns:1fr;gap:18px;margin-top:36px;}
  }
  @media(max-width:640px){
    .pv-hook-section,.pv-report-section,.pv-practice-section{padding-bottom:60px;}
    .pv-report-hold{min-height:540px;}
    .pv-closing{font-size:16px;}
    .pv-branch h3{font-size:22px;}
    .pv-branch-map{height:280px;}
    .pv-branch-ring{left:17%;right:17%;}
    .pv-branch-node{left:var(--xm);padding:6px 10px;font-size:12.5px;gap:6px;}
    .pv-branch-node i{width:8px;height:8px;}
    .pv-branch-core{width:104px;height:104px;}
    .pv-branch-core b{font-size:16px;}
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

        {/* ── AI HOOK (new) ─────────────────────────────────────────── */}
        <section className="pv-hook-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Why self-knowledge stalls</div>
              <h2>AI reflects what you feed it.</h2>
              <p>Ask a chatbot about yourself and it builds on what you already believe. Bearing starts differently: the same 120 fixed statements for everyone, scored before any AI is involved. AI only explains what your answers show.</p>
            </div>
          </div>
        </section>

        {/* ── WHAT YOU GET (original content, as on `/`) ────────────── */}
        <section className="bento-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>What you get</div>
              <h2>See your patterns.<br />Go deeper where it matters.</h2>
            </div>

            <div className="bento">
              <div className="bento-card" style={{ display:'flex', flexDirection:'column' }}>
                <div className="mk-eyebrow">YOUR PATTERNS</div>
                <h3>Your patterns, made visible</h3>
                <p>Each of your 30 facets gets a word and a description, so you see specific patterns instead of one label.</p>
                <Link href="/report/sample" className="bento-example-link">See an example report</Link>
                <div className="bento-cluster-canvas-wrap">
                  <BentoCluster />
                </div>
              </div>

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

        {/* ── YOUR FULL REPORT (new) ────────────────────────────────── */}
        {/* TODO(owner): heading copy is a placeholder, not from the spec. */}
        <section className="pv-report-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Your full report</div>
              <h2>Every pattern, explained.</h2>
            </div>
            <WhenNear className="pv-report-hold">
              <SampleReportPreview />
            </WhenNear>
            <Link href="/report/sample" className="pv-report-link">See the full sample report</Link>
          </div>
        </section>

        {/* ── YOUR PRACTICE (new) ───────────────────────────────────── */}
        <section className="pv-practice-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Your practice</div>
              <h2>Insight sticks when you keep noticing.</h2>
              <p>Choose the patterns that matter to you. Each evening, a short check-in. Over time you build a record of your own evidence, not a generic tip list.</p>
            </div>

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

            {/* TODO(owner): free vs paid in "Your practice". Spec section 6 —
                deliberately says nothing until decided. */}
            <p className="pv-todo">TODO (owner): what&apos;s free and what&apos;s paid in Your practice. Left blank on purpose.</p>
          </div>
        </section>

        {/* ── WHY IT'S DIFFERENT (one row added + branch map) ───────── */}
        <section className="usp-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Why it&apos;s different</div>
              <h2>Fixed questions, specific patterns.</h2>
            </div>

            <div className="compare pv-compare-4">
              <div className="compare-card muted">
                <div className="compare-item">
                  <div className="mk-eyebrow">AI chat</div>
                  <p>Tends to tell you what you want to hear.</p>
                </div>
                <div className="compare-item">
                  <div className="mk-eyebrow">Professional assessments</div>
                  <p>Often need a certified coach to explain what your results mean.</p>
                </div>
                <div className="compare-item">
                  <div className="mk-eyebrow">Type tests</div>
                  <p>Sort you into one of a fixed set of four-letter labels.</p>
                </div>
                <div className="compare-item">
                  <div className="mk-eyebrow">After the report</div>
                  <p>Most tools stop here.</p>
                </div>
              </div>
              <div className="compare-vs">vs</div>
              <div className="compare-card highlight">
                <div className="compare-item">
                  <div className="mk-eyebrow">Fixed questions</div>
                  <p>Your scores come from the same 120 statements for everyone. AI only explains them.</p>
                </div>
                <div className="compare-item">
                  <div className="mk-eyebrow">Explained in the report</div>
                  <p>Each pattern comes with a written explanation in the report itself.</p>
                </div>
                <div className="compare-item">
                  <div className="mk-eyebrow">30 facets</div>
                  <p>Specific patterns across the Big Five, not one label.</p>
                </div>
                <div className="compare-item">
                  <div className="mk-eyebrow">After the report</div>
                  <p>Bearing keeps going, with a short daily check-in on the patterns you choose.</p>
                </div>
              </div>
            </div>

            <div className="pv-branch">
              <h3>Most assessments end at the report. Yours points to what to explore next.</h3>
              <p>Working style, relationships, energy, environment, direction. Bearing suggests where to start, based on your results.</p>
              <div className="pv-branch-map" role="img" aria-label="Your main report in the center, with five deeper assessments around it: working style, relationships, energy, environment and direction.">
                <div className="pv-branch-ring" />
                <div className="pv-branch-core">
                  <b>Your report</b>
                  <span>30 facets</span>
                </div>
                {BRANCHES.map(b => (
                  <div
                    key={b.name}
                    className="pv-branch-node"
                    style={{ ['--x' as string]: `${b.x}%`, ['--xm' as string]: `${b.xm}%`, ['--y' as string]: `${b.y}%`, ['--c' as string]: b.color }}
                  >
                    <i />{b.name}
                  </div>
                ))}
              </div>
            </div>

            <p className="mk-microcopy" style={{ textAlign:'center', marginTop:22 }}>
              Built on the IPIP-NEO-120, a public-domain Big Five inventory from published research (Johnson, 2014).
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
