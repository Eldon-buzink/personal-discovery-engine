'use client'

import type { ReactNode } from 'react'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'
import {
  COPY, Faq, FinalCta, HeroBackdrop, HeroCtas, HeroNote, PracticeCheckIn, PracticeHome, PracticeNotes,
  PracticeWeek, PracticeWeeks, SampleSpectrum, SampleStatement, SampleTraitCard,
} from './shared'
import { baseCSS } from './styles'

// Option A, "One story": a single centred column, like reading an essay.
// The six steps (three for discovering, three for the practice) hang on one
// thin thread that runs from section 1 into section 2, so the page reads as
// one story: first you find your patterns, then you notice them.

const A_CSS = `
  .a-hero{position:relative;padding:168px 0 128px;text-align:center;}
  .a-hero-inner{position:relative;max-width:760px;margin:0 auto;padding:0 24px;}
  .a-hero .lo-body{max-width:560px;margin:20px auto 36px;}
  .a-head{max-width:640px;margin:0 auto 64px;text-align:center;}
  .a-head .lo-body{margin-top:16px;}
  .a-steps{list-style:none;margin:0 auto;padding:0;max-width:460px;}
  .a-step{position:relative;padding:0 0 56px 52px;}
  .a-step:last-child{padding-bottom:0;}
  .a-num{position:absolute;left:0;top:0;width:32px;height:32px;border-radius:50%;border:1px solid #262420;background:#F7F4ED;
    display:flex;align-items:center;justify-content:center;${css.ui}}
  .a-thread{position:absolute;left:16px;top:40px;bottom:8px;width:1px;background:rgba(38,36,32,0.16);transform-origin:center top;}
  .m-armed:not(.m-play) .a-thread{transform:scaleY(0);}
  .m-play .a-thread{transition:transform var(--dur-enter) var(--ease) var(--d,0ms);}
  .a-step h3{min-height:32px;display:flex;align-items:center;margin-bottom:8px;}
  .a-step .lo-body{margin-bottom:20px;}
  .a-show{display:flex;flex-direction:column;align-items:flex-start;gap:20px;}
  .a-full{width:100%;}
  .a-diff{display:grid;grid-template-columns:1fr 1fr;gap:40px 56px;max-width:880px;margin:0 auto;}
  .a-diff div{border-top:1px solid rgba(38,36,32,0.16);padding-top:18px;}
  .a-diff h3{margin-bottom:8px;}
  .a-foot{${css.meta}text-align:center;margin-top:48px !important;}
  .a-faq{max-width:720px;margin:0 auto;}
  .a-faq h2{text-align:center;margin-bottom:32px;}
  @media(max-width:640px){
    .a-hero{padding:128px 0 88px;}
    .a-diff{grid-template-columns:1fr;gap:28px;}
    .a-step{padding-left:48px;}
  }
`

function Step({ n, title, line, delay, last, children }: { n: number; title: string; line?: string; delay: number; last?: boolean; children: ReactNode }) {
  return (
    <li className="a-step">
      <span className="a-num lo-in" style={{ ['--d' as string]: `${delay}ms` }} aria-hidden="true">{n}</span>
      {!last && <span className="a-thread" style={{ ['--d' as string]: `${delay + 200}ms` }} aria-hidden="true" />}
      <h3 className="lo-in" style={{ ['--d' as string]: `${delay}ms` }}>{title}</h3>
      {line && <p className="lo-body lo-in" style={{ ['--d' as string]: `${delay}ms` }}>{line}</p>}
      <div className="a-show lo-in" style={{ ['--d' as string]: `${delay + 100}ms` }}>{children}</div>
    </li>
  )
}

export default function OptionA() {
  const hero = useEnterOnce<HTMLDivElement>()
  const s1 = useEnterOnce<HTMLOListElement>()
  const s2 = useEnterOnce<HTMLOListElement>()
  const s3 = useEnterOnce<HTMLDivElement>()
  return (
    <div className="lo">
      <style dangerouslySetInnerHTML={{ __html: baseCSS + A_CSS }} />

      <section className="a-hero">
        <HeroBackdrop opacity={0.75} />
        <div ref={hero} className="a-hero-inner">
          <h1 className="lo-in">{COPY.hero.title}</h1>
          <p className="lo-body lo-in" style={{ ['--d' as string]: '100ms' }}>{COPY.hero.body}</p>
          <div className="lo-in" style={{ ['--d' as string]: '200ms' }}><HeroCtas /></div>
          <div className="lo-in" style={{ ['--d' as string]: '300ms' }}><HeroNote /></div>
        </div>
      </section>

      <section className="lo-section">
        <div className="lo-wrap">
          <div className="a-head">
            <h2>{COPY.discover.title}</h2>
            <p className="lo-body">{COPY.discover.body}</p>
          </div>
          <ol ref={s1} className="a-steps">
            <Step n={1} title={COPY.discover.steps[0]} delay={0}><SampleStatement /></Step>
            <Step n={2} title={COPY.discover.steps[1]} delay={250}><SampleSpectrum /></Step>
            <Step n={3} title={COPY.discover.steps[2]} delay={500} last><SampleTraitCard /></Step>
          </ol>
        </div>
      </section>

      <section className="lo-section">
        <div className="lo-wrap">
          <div className="a-head">
            <h2>{COPY.practice.title}</h2>
            <p className="lo-body">{COPY.practice.body}</p>
          </div>
          <ol ref={s2} className="a-steps" start={4}>
            <Step n={4} title={COPY.practice.steps[0]} delay={0}><div className="a-full"><PracticeHome /></div></Step>
            <Step n={5} title={COPY.practice.steps[1]} delay={250}><div className="a-full"><PracticeCheckIn /></div></Step>
            <Step n={6} title={COPY.practice.steps[2]} line={COPY.practice.recapNote} delay={500} last>
              <div className="a-full" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <PracticeWeek /><PracticeWeeks /><PracticeNotes />
              </div>
            </Step>
          </ol>
        </div>
      </section>

      <section className="lo-section">
        <div ref={s3} className="lo-wrap">
          <div className="a-head"><h2>{COPY.different.title}</h2></div>
          <div className="a-diff">
            {COPY.different.points.map((p, i) => (
              <div key={p.title} className="lo-in" style={{ ['--d' as string]: `${i * 100}ms` }}>
                <h3>{p.title}</h3>
                <p className="lo-body">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="a-foot">{COPY.different.footnote}</p>
        </div>
      </section>

      <section className="lo-section faq-section">
        <div className="lo-wrap a-faq">
          <h2>{COPY.faq.title}</h2>
          <Faq />
        </div>
      </section>

      <FinalCta />
    </div>
  )
}
