'use client'

/**
 * Landing page preview — reference/bearing-landing-preview-spec.md.
 *
 * Same page as `/` (LandingPageClient.tsx) with only the sections the spec
 * marks modify/new changed. Kept sections are imported from
 * LandingPageClient, not copied: ProblemSection, FaqSection,
 * FinalCtaSection, HeroCta, the blob visuals, landingCSS and the mk*
 * tokens. Modified sections (Hero, What you get, Why it's different, How it
 * works) reuse the same classes with their changed copy inline here. New
 * sections (AI hook, Deep-dives, Your practice) add the pv-* classes below.
 *
 * Every example on this page is labeled "Example" and comes from existing
 * product content, never from a user:
 * - Report excerpts: SAMPLE_FACETS / SAMPLE_ENVIRONMENT_CONTENT, the same
 *   sample content the public /report/sample page shows. The repo stores no
 *   other written explanations (they're generated per user at runtime).
 * - Deep-dive findings: the branches' own templated/label output (working
 *   style reveal line, energy CATEGORY_LABELS, direction TYPE_LABELS,
 *   relationships quadrant word) plus the environment sample.
 * - Practice screens: PracticePhoneScreens over landingPracticeFixture.
 *
 * Unlike `/`, signed-in visitors are not redirected away, so the owner can
 * view this while logged in.
 */

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import {
  landingCSS, sans, mkCream, mkCharcoal, mkCharcoalSoft, mkCard, mkLine,
  useLandingVisitor, HeroCta, ProblemSection, FaqSection, FinalCtaSection,
  HeroBlobs, BentoCluster, OrbitVisual, ConnectVisual, StaticDotScale, DemoBlob,
} from '../LandingPageClient'
import { SAMPLE_FACETS, SAMPLE_ENVIRONMENT_CONTENT } from '@/app/report/sample/sampleContent'
import { CATEGORY_LABELS } from '@/lib/known/energyScoring'
import { TYPE_LABELS } from '@/lib/known/directionScoring'

// Lazy: the phone frames (and the practice libs they pull in) only load
// once the section is near the viewport. The placeholder reserves the
// frame row's height so nothing shifts when they arrive.
const PracticePhoneScreens = dynamic(() => import('./PracticePhoneScreens'), {
  ssr: false,
  loading: () => <div style={{ height: PRACTICE_ROW_HEIGHT }} />,
})
const PRACTICE_ROW_HEIGHT = 600 // PracticePhoneScreens: 557px frame + caption

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

// First sentence only, so an excerpt always ends cleanly at a sentence end.
function firstSentence(text: string): string {
  const m = text.match(/^.+?[.!?](?=\s|$)/)
  return m ? m[0] : text
}

const HERO_EXAMPLE = SAMPLE_FACETS[0] // Deliberate — also the active word in HeroBlobs
const BENTO_EXAMPLES = SAMPLE_FACETS.slice(1) // Autonomous, Reflective

// One example finding per branch, from the branch's own output.
const DEEP_DIVES: { name: string; finding: string; note?: string }[] = [
  {
    name: 'Working style',
    // Reveal line template + AXIS_LEAN_PHRASE.independence.left, both in
    // app/assessment/working-style/page.tsx (a page file, so not importable).
    finding: 'Your pull toward working things out on your own is one of the clearest signals in how you answered.',
  },
  {
    name: 'Relationships',
    // TODO(owner): the relationships branch has no stored written finding,
    // only its quadrant word (lib/known/relationshipsScoring.ts). Swap in a
    // real generated finding when one is available.
    finding: 'Independent',
    note: 'Your attachment pattern',
  },
  {
    name: 'Energy',
    finding: CATEGORY_LABELS.competence_fuel,
    note: 'Your top fuel',
  },
  {
    name: 'Environment',
    finding: SAMPLE_ENVIRONMENT_CONTENT.trait_quote,
  },
  {
    name: 'Direction',
    // TYPE_LABELS are marked "Draft labels" in lib/known/directionScoring.ts.
    finding: TYPE_LABELS.investigative,
    note: 'One direction that fits',
  },
]

const previewCSS = `
  .pv-tag{display:inline-block;font-size:10.5px;letter-spacing:0.1em;text-transform:uppercase;color:${mkCharcoalSoft};
    border:1px solid ${mkLine};border-radius:999px;padding:3px 9px;background:${mkCream};}

  /* Hero example card — tucked under the blob composition, overlapping
     only its empty lower edge so HeroBlobs' own "Deliberate" label stays
     visible above it. */
  .pv-hero-visual{position:relative;}
  .pv-hero-card{position:relative;margin:-56px 0 0 auto;max-width:380px;background:${mkCream};border:1px solid ${mkLine};
    border-radius:18px;padding:18px 20px;box-shadow:0 14px 32px -22px rgba(38,36,32,0.45);}
  .pv-hero-card .pv-word{font-family:'Newsreader',serif;font-style:italic;font-size:24px;line-height:1.2;margin:10px 0 6px;}
  .pv-hero-card p{font-size:14px !important;line-height:1.55 !important;color:${mkCharcoalSoft};margin:0 0 6px !important;max-width:none !important;}
  .pv-hero-card p:last-child{margin-bottom:0 !important;}

  /* Report excerpts inside the What you get cards */
  .pv-excerpts{display:flex;flex-direction:column;gap:12px;margin-top:14px;}
  .pv-excerpt{border-left:2px solid ${mkLine};padding-left:14px;}
  .pv-excerpt-word{font-family:'Newsreader',serif;font-style:italic;font-size:19px;line-height:1.25;margin-bottom:2px;}
  .bento-card .pv-excerpt p{font-size:15px;}
  .pv-energy-pair{display:flex;gap:28px;margin-top:14px;flex-wrap:wrap;}
  .pv-energy-pair span{display:block;font-size:12px;color:${mkCharcoalSoft};letter-spacing:0.04em;}

  /* AI hook */
  .pv-hook-section{padding:0 0 90px;}
  .pv-hook-section .section-head{margin-bottom:0;}

  /* Deep-dives */
  .pv-deep-section{padding:0 0 90px;}
  .pv-deep-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;}
  .pv-deep-card{background:${mkCard};border:1px solid ${mkLine};border-radius:18px;padding:22px 20px;display:flex;flex-direction:column;}
  .pv-deep-card h3{font-family:'Newsreader',serif;font-size:20px;font-weight:500;margin:0 0 14px;line-height:1.2;}
  .pv-deep-note{font-size:12px;color:${mkCharcoalSoft};margin:12px 0 4px;}
  .pv-deep-finding{font-family:'Newsreader',serif;font-style:italic;font-size:17px;line-height:1.4;margin:0;}
  .pv-deep-card .pv-tag{align-self:flex-start;margin-top:auto;}
  .pv-deep-card .pv-deep-body{margin-bottom:16px;}

  /* Your practice */
  .pv-practice-section{padding:0 0 90px;}
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

  @media(max-width:1080px){
    .pv-deep-grid{grid-template-columns:repeat(3,1fr);}
  }
  @media(max-width:860px){
    .pv-hero-card{margin:-40px 0 0;max-width:none;}
    .pv-deep-grid{grid-template-columns:1fr 1fr;}
    .pv-cadence{grid-template-columns:1fr;gap:18px;margin-top:36px;}
  }
  @media(max-width:640px){
    .pv-hook-section,.pv-deep-section,.pv-practice-section{padding-bottom:60px;}
    .pv-deep-grid{grid-template-columns:1fr;}
    .pv-closing{font-size:16px;}
  }
`

// Mounts its children once the placeholder is within ~600px of the
// viewport, so below-the-fold visuals don't load with the first paint.
function WhenNear({ minHeight, children }: { minHeight: number; children: React.ReactNode }) {
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
  return <div ref={ref} style={{ minHeight }}>{near ? children : null}</div>
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

        {/* ── HERO (modified: subhead + one example pattern card) ───── */}
        <section className="hero">
          <div className="hero-inner">
            <div>
              <h1>Get to know<br /><em>yourself better.</em></h1>
              <p>See the patterns behind how you think, feel and act, then keep working with them, so your choices fit who you are.</p>
              <HeroCta welcomeBack={welcomeBack} startedUnfinished={startedUnfinished} />
            </div>
            <div className="pv-hero-visual">
              <HeroBlobs />
              <div className="pv-hero-card">
                <span className="pv-tag">Example</span>
                <div className="pv-word">{HERO_EXAMPLE.traitWord}</div>
                <p>{HERO_EXAMPLE.content?.trait_quote}</p>
                <p>{firstSentence(HERO_EXAMPLE.content?.where_it_shows_up ?? "")}</p>
              </div>
            </div>
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

        {/* ── WHAT YOU GET (modified: real excerpts) ────────────────── */}
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
                <div className="pv-excerpts">
                  <span className="pv-tag" style={{ alignSelf:'flex-start' }}>Example</span>
                  {BENTO_EXAMPLES.map(f => (
                    <div key={f.traitWord} className="pv-excerpt">
                      <div className="pv-excerpt-word">{f.traitWord}</div>
                      <p>{f.content?.trait_quote}</p>
                    </div>
                  ))}
                </div>
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
                  <div className="pv-excerpts">
                    <span className="pv-tag" style={{ alignSelf:'flex-start' }}>Example</span>
                    <div className="pv-excerpt">
                      <div className="pv-excerpt-word">{SAMPLE_ENVIRONMENT_CONTENT.tags[0]}</div>
                      <p>{SAMPLE_ENVIRONMENT_CONTENT.trait_quote}</p>
                    </div>
                  </div>
                </div>
                <div className="bento-card">
                  <div className="mk-eyebrow">How you connect</div>
                  <h3>Relationship patterns</h3>
                  <div className="bento-connect-wrap">
                    <ConnectVisual />
                  </div>
                  {/* TODO(owner): no stored relationships excerpt exists to
                      quote, so this keeps the current description. */}
                  <p style={{ marginTop:14 }}>Your attachment pattern: how you handle closeness and distance in the relationships that matter most.</p>
                </div>
              </div>
            </div>

            <div className="bento-row3" style={{ gridTemplateColumns: '1fr' }}>
              <div className="bento-card">
                <div className="mk-eyebrow">What gives you energy</div>
                <h3>The fuel behind your best days</h3>
                <span className="pv-tag" style={{ marginTop:10 }}>Example</span>
                <div className="pv-energy-pair">
                  <div className="pv-excerpt">
                    <div className="pv-excerpt-word">{CATEGORY_LABELS.competence_fuel}</div>
                    <span>fuel</span>
                  </div>
                  <div className="pv-excerpt">
                    <div className="pv-excerpt-word">{CATEGORY_LABELS.autonomy_drain}</div>
                    <span>drain</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="mk-microcopy" style={{ textAlign:'center', marginTop:22 }}>
              Your first 5 patterns are free. The deeper assessments are part of the one-time EUR 49 unlock.
            </p>
          </div>
        </section>

        {/* ── DEEP-DIVES (new) ──────────────────────────────────────── */}
        <section className="pv-deep-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Go deeper where it matters</div>
              <h2>Most assessments end at the report. Yours points to what to explore next.</h2>
              <p>Working style, relationships, energy, environment, direction. Bearing suggests where to start, based on your results.</p>
            </div>
            <div className="pv-deep-grid">
              {DEEP_DIVES.map(d => (
                <div key={d.name} className="pv-deep-card">
                  <div className="pv-deep-body">
                    <h3>{d.name}</h3>
                    {d.note && <p className="pv-deep-note">{d.note}</p>}
                    <p className="pv-deep-finding">{d.finding}</p>
                  </div>
                  <span className="pv-tag">Example</span>
                </div>
              ))}
            </div>
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

            <WhenNear minHeight={PRACTICE_ROW_HEIGHT}>
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

        {/* ── WHY IT'S DIFFERENT (modified: one row added) ──────────── */}
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

            <p className="mk-microcopy" style={{ textAlign:'center', marginTop:22 }}>
              Built on the IPIP-NEO-120, a public-domain Big Five inventory from published research (Johnson, 2014).
            </p>
          </div>
        </section>

        {/* ── HOW IT WORKS (modified: step 3 wording; the pill list moved
            out into the Deep-dives cards above) ───────────────────── */}
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
