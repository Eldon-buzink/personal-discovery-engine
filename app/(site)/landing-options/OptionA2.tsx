'use client'

import type { ReactNode } from 'react'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'
import { Faq, FinalCta, HeroCtas, HeroNote, PracticeCheckIn, PracticeHome, PracticeNotes, PracticeWeek, PracticeWeeks, SampleStatement } from './shared'
import { CheckInAffirmation, COPY2, DifferentVisual, HeroBlobsBackdrop, ReportVisual, WeeklyInsights } from './shared2'
import { baseCSS } from './styles'

// Option A, iteration 2. Same single column and numbered thread as A, with
// the owner's feedback: the original hero blobs behind the text and copy
// about how it feels; section 1 the problems people feel; section 2 the
// solution with the real report visual; section 3 the practice (you decide
// what matters, why the evening check-in helps, the affirmation and a
// fuller weekly read with insights and tips, both CONCEPTS); section 4
// "why different" with one real visual per point.

const A2_CSS = `
  .a2-hero{position:relative;padding:176px 0 136px;text-align:center;overflow:hidden;}
  .a2-hero-blobs{position:absolute;left:50%;top:50%;width:min(860px,130vw);aspect-ratio:520/500;transform:translate(-50%,-48%);opacity:0.55;pointer-events:none;}
  .a2-hero-inner{position:relative;max-width:760px;margin:0 auto;padding:0 24px;}
  .a2-hero .lo-body{max-width:560px;margin:20px auto 36px;color:#3f3c36;}
  .a2-head{max-width:640px;margin:0 auto 56px;text-align:center;}
  .a2-head .lo-body{margin-top:16px;}

  .a2-problems{max-width:640px;margin:0 auto;list-style:none;padding:0;}
  .a2-problem{display:grid;grid-template-columns:112px minmax(0,1fr);gap:24px;align-items:center;padding:28px 0;border-top:1px solid rgba(38,36,32,0.12);}
  .a2-problem:last-child{border-bottom:1px solid rgba(38,36,32,0.12);}
  .problem-visual{position:relative;height:84px;display:flex;align-items:center;justify-content:center;}
  .a2-problem h3{margin-bottom:6px;}
  .a2-quote{${css.body}color:#56534D;}
  .a2-bridge{${css.display4}text-align:center;max-width:560px;margin:48px auto 0 !important;color:#262420;}

  .a2-why{list-style:none;margin:0 0 24px;padding:0;}
  .a2-why li{${css.body}color:#262420;display:flex;gap:10px;padding:8px 0;}
  .a2-why svg{flex-shrink:0;margin-top:5px;color:#3D6B5C;}

  .a2-steps{list-style:none;margin:0 auto;padding:0;max-width:480px;}
  .a2-step{position:relative;padding:0 0 64px 52px;}
  .a2-step:last-child{padding-bottom:0;}
  .a2-num{position:absolute;left:0;top:0;width:32px;height:32px;border-radius:50%;border:1px solid #262420;background:#F7F4ED;display:flex;align-items:center;justify-content:center;${css.ui}}
  .a2-thread{position:absolute;left:16px;top:40px;bottom:8px;width:1px;background:rgba(38,36,32,0.16);transform-origin:center top;}
  .m-armed:not(.m-play) .a2-thread{transform:scaleY(0);}
  .m-play .a2-thread{transition:transform var(--dur-enter) var(--ease) var(--d,0ms);}
  .a2-step h3{min-height:32px;display:flex;align-items:center;margin-bottom:8px;}
  .a2-step > .lo-body{margin-bottom:22px;}
  .a2-show{display:flex;flex-direction:column;gap:20px;width:100%;}
  /* The report visual at the sample report's own width, centred. */
  .a2-report{max-width:560px;margin:48px auto 0;text-align:center;}

  .a2-affirm{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:12px;background:#EEF4F1;border:1px solid #CFE2DA;}
  .a2-affirm-title{${css.ui}color:#262420;margin-bottom:2px !important;}
  .a2-insights{display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:14px;background:#FFFFFF;border:1px solid #E5E1D5;}
  .a2-insights .lo-meta{margin-bottom:4px !important;}
  .a2-insight-text{${css.body}color:#262420;}

  .a2-diff{display:grid;grid-template-columns:1fr 1fr;gap:56px 56px;max-width:920px;margin:0 auto;}
  .a2-diff-item{display:flex;flex-direction:column;}
  .a2-diff-visual{height:200px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;border-bottom:1px solid rgba(38,36,32,0.12);padding-bottom:20px;}
  .a2-diff-item h3{margin-bottom:8px;}
  .a2-cluster{position:relative;width:100%;max-width:320px;aspect-ratio:500/320;}
  .a2-mini-statement{${css.display4}color:#262420;margin-bottom:18px !important;}
  .a2-faq{max-width:720px;margin:0 auto;}
  .a2-faq h2{text-align:center;margin-bottom:32px;}

  @media(max-width:640px){
    .a2-hero{padding:128px 0 88px;}
    .a2-problem{grid-template-columns:72px minmax(0,1fr);gap:16px;}
    .a2-diff{grid-template-columns:1fr;gap:48px;}
    .a2-diff-visual{height:auto;min-height:120px;padding:8px 0 20px;}
    .a2-step{padding-left:48px;}
  }
`

function Step({ n, title, body, delay, last, children }: { n: number; title: string; body: string; delay: number; last?: boolean; children: ReactNode }) {
  return (
    <li className="a2-step">
      <span className="a2-num lo-in" style={{ ['--d' as string]: `${delay}ms` }} aria-hidden="true">{n}</span>
      {!last && <span className="a2-thread" style={{ ['--d' as string]: `${delay + 200}ms` }} aria-hidden="true" />}
      <h3 className="lo-in" style={{ ['--d' as string]: `${delay}ms` }}>{title}</h3>
      <p className="lo-body lo-in" style={{ ['--d' as string]: `${delay}ms` }}>{body}</p>
      <div className="a2-show lo-in" style={{ ['--d' as string]: `${delay + 100}ms` }}>{children}</div>
    </li>
  )
}

const tick = <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function OptionA2() {
  const hero = useEnterOnce<HTMLDivElement>()
  const s1 = useEnterOnce<HTMLUListElement>()
  const s2 = useEnterOnce<HTMLOListElement>()
  const s3 = useEnterOnce<HTMLOListElement>()
  const s4 = useEnterOnce<HTMLDivElement>()
  const d = (ms: number) => ({ ['--d' as string]: `${ms}ms` })
  const P = COPY2.practice
  return (
    <div className="lo">
      <style dangerouslySetInnerHTML={{ __html: baseCSS + A2_CSS }} />

      <section className="a2-hero">
        <HeroBlobsBackdrop />
        <div ref={hero} className="a2-hero-inner">
          <h1 className="lo-in">{COPY2.hero.title}</h1>
          <p className="lo-body lo-in" style={d(100)}>{COPY2.hero.body}</p>
          <div className="lo-in" style={d(200)}><HeroCtas /></div>
          <div className="lo-in" style={d(300)}><HeroNote /></div>
        </div>
      </section>

      {/* 1. The problems people feel */}
      <section className="lo-section">
        <div className="lo-wrap">
          <div className="a2-head"><h2>{COPY2.problems.title}</h2></div>
          <ul ref={s1} className="a2-problems">
            {COPY2.problems.items.map(({ title, quote, Visual }, i) => (
              <li key={title} className="a2-problem lo-in" style={d(i * 120)}>
                <Visual />
                <div>
                  <h3>{title}</h3>
                  <p className="a2-quote">&ldquo;{quote}&rdquo;</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="a2-bridge">{COPY2.problems.bridge}</p>
        </div>
      </section>

      {/* 2. The solution: the assessment and the real report */}
      <section className="lo-section">
        <div className="lo-wrap">
          <div className="a2-head">
            <h2>{COPY2.solution.title}</h2>
            <p className="lo-body">{COPY2.solution.body}</p>
          </div>
          <ol ref={s2} className="a2-steps">
            <Step n={1} title="Answer 120 short statements." body="About 15 minutes. Say how well each one fits you." delay={0}>
              <SampleStatement />
            </Step>
            <Step n={2} title="Get your report." body="Your patterns, the way the report shows them. Try the arrows, or see what a pattern is based on." delay={250} last>
              <ul className="a2-why">
                {COPY2.solution.why.map((w) => <li key={w}>{tick}{w}</li>)}
              </ul>
            </Step>
          </ol>
          <div className="a2-report"><ReportVisual /></div>
        </div>
      </section>

      {/* 3. The practice */}
      <section className="lo-section">
        <div className="lo-wrap">
          <div className="a2-head">
            <h2>{P.title}</h2>
            <p className="lo-body">{P.body}</p>
          </div>
          <ol ref={s3} className="a2-steps" start={3}>
            <Step n={3} title={P.decide.title} body={P.decide.body} delay={0}><PracticeHome /></Step>
            <Step n={4} title={P.checkin.title} body={P.checkin.body} delay={250}>
              <PracticeCheckIn />
              <CheckInAffirmation />
            </Step>
            <Step n={5} title={P.weekly.title} body={P.weekly.body} delay={500} last>
              <PracticeWeek />
              <WeeklyInsights />
              <PracticeWeeks />
              <PracticeNotes />
            </Step>
          </ol>
        </div>
      </section>

      {/* 4. Why Bearing is different */}
      <section className="lo-section">
        <div ref={s4} className="lo-wrap">
          <div className="a2-head"><h2>{COPY2.different.title}</h2></div>
          <div className="a2-diff">
            {COPY2.different.points.map((p, i) => (
              <div key={p.title} className="a2-diff-item lo-in" style={d(i * 120)}>
                <div className="a2-diff-visual"><DifferentVisual kind={p.visual} /></div>
                <h3>{p.title}</h3>
                <p className="lo-body">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lo-section faq-section">
        <div className="lo-wrap a2-faq">
          <h2>Common questions</h2>
          <Faq />
        </div>
      </section>

      <FinalCta />
    </div>
  )
}
