'use client'

import type { ReactNode } from 'react'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'
import {
  COPY, Faq, FinalCta, HeroBackdrop, HeroCtas, HeroNote, PracticeCheckIn, PracticeHome, PracticeNotes,
  PracticeWeek, PracticeWeeks, SampleSpectrum, SampleStatement, SampleTraitCard,
} from './shared'
import { baseCSS } from './styles'

// Option C, "A month with Bearing": sections 1 and 2 are one timeline,
// from the first statement on day 1 to what you see after four weeks.
// Each moment has a time, one plain line and the real component for it, on
// a line down the left that draws once per moment. The two section titles
// sit on the timeline where each part starts. This is the option that
// shows most directly that Bearing is a tracker, not only a test.

const C_CSS = `
  .c-hero{position:relative;padding:172px 0 128px;text-align:center;}
  .c-hero-inner{position:relative;max-width:760px;margin:0 auto;padding:0 24px;}
  .c-hero .lo-body{max-width:560px;margin:20px auto 36px;}
  .c-line{max-width:760px;margin:0 auto;}
  .c-part{margin:0 0 48px 44px;}
  .c-part:not(:first-child){margin-top:24px;}
  .c-part .lo-body{margin-top:14px;max-width:600px;}
  .c-moments{list-style:none;margin:0;padding:0;}
  .c-moment{position:relative;padding:0 0 64px 44px;}
  .c-dot{position:absolute;left:0;top:4px;width:13px;height:13px;border-radius:50%;background:#262420;}
  .c-rail{position:absolute;left:6px;top:24px;bottom:0;width:1px;background:rgba(38,36,32,0.16);transform-origin:center top;}
  .m-armed:not(.m-play) .c-rail{transform:scaleY(0);}
  .m-play .c-rail{transition:transform var(--dur-enter) var(--ease) var(--d,0ms);}
  .c-when{${css.meta}display:block;margin-bottom:6px;}
  .c-moment h3{margin-bottom:6px;}
  .c-moment .lo-body{margin-bottom:22px;max-width:560px;}
  .c-show{max-width:460px;}
  .c-recap{display:flex;flex-direction:column;gap:16px;}
  .c-diff{max-width:760px;margin:0 auto;}
  .c-diff h2{margin-bottom:40px;}
  .c-diff-row{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:40px;padding:24px 0;border-top:1px solid rgba(38,36,32,0.16);}
  .c-foot{${css.meta}margin-top:24px !important;}
  .c-faq{max-width:760px;margin:0 auto;}
  .c-faq h2{margin-bottom:32px;}
  @media(max-width:640px){
    .c-hero{padding:128px 0 88px;}
    .c-part{margin-left:32px;}
    .c-moment{padding-left:32px;padding-bottom:52px;}
    .c-diff-row{grid-template-columns:1fr;gap:8px;}
  }
`

function Moment({ when, title, line, last, children }: { when: string; title: string; line?: string; last?: boolean; children: ReactNode }) {
  const ref = useEnterOnce<HTMLLIElement>()
  return (
    <li ref={ref} className="c-moment">
      <span className="c-dot lo-in" aria-hidden="true" />
      {!last && <span className="c-rail" style={{ ['--d' as string]: '300ms' }} aria-hidden="true" />}
      <span className="c-when lo-in">{when}</span>
      <h3 className="lo-in" style={{ ['--d' as string]: '50ms' }}>{title}</h3>
      {line && <p className="lo-body lo-in" style={{ ['--d' as string]: '100ms' }}>{line}</p>}
      <div className="c-show lo-in" style={{ ['--d' as string]: '200ms' }}>{children}</div>
    </li>
  )
}

export default function OptionC() {
  const hero = useEnterOnce<HTMLDivElement>()
  const diff = useEnterOnce<HTMLDivElement>()
  return (
    <div className="lo">
      <style dangerouslySetInnerHTML={{ __html: baseCSS + C_CSS }} />

      <section className="c-hero">
        <HeroBackdrop opacity={0.65} />
        <div ref={hero} className="c-hero-inner">
          <h1 className="lo-in">{COPY.hero.title}</h1>
          <p className="lo-body lo-in" style={{ ['--d' as string]: '100ms' }}>{COPY.hero.body}</p>
          <div className="lo-in" style={{ ['--d' as string]: '200ms' }}><HeroCtas /></div>
          <div className="lo-in" style={{ ['--d' as string]: '300ms' }}><HeroNote /></div>
        </div>
      </section>

      <section className="lo-section">
        <div className="lo-wrap c-line">
          <div className="c-part">
            <h2>{COPY.discover.title}</h2>
            <p className="lo-body">{COPY.discover.body}</p>
          </div>
          <ol className="c-moments">
            <Moment when="Day 1" title="Rate 120 short statements." line="About 15 minutes. Say how well each one fits you.">
              <SampleStatement />
            </Moment>
            <Moment when="Day 1, as you go" title="Your patterns appear, each with its own word." line="Every trait gets a word and a place on its scale. Your first 5 are free.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}><SampleSpectrum /><SampleTraitCard /></div>
            </Moment>
          </ol>
          <div className="c-part">
            <h2>{COPY.practice.title}</h2>
            <p className="lo-body">{COPY.practice.body}</p>
          </div>
          <ol className="c-moments">
            <Moment when="After your report" title="Pick a pattern to follow." line="Up to four at a time. You can change them whenever you like.">
              <PracticeHome />
            </Moment>
            <Moment when="Every evening" title="One question about your day." line="Pick the answer that fits today, and add a note if you want to.">
              <PracticeCheckIn />
            </Moment>
            <Moment when="End of the week" title="A short read of your week." line="After three check-ins in a week.">
              <PracticeWeek />
            </Moment>
            <Moment when="Week 4" title="Where it shows up, in your own words." last>
              <div className="c-recap"><PracticeWeeks /><PracticeNotes /></div>
            </Moment>
          </ol>
        </div>
      </section>

      <section className="lo-section">
        <div ref={diff} className="lo-wrap c-diff">
          <h2 className="lo-in">{COPY.different.title}</h2>
          {COPY.different.points.map((p, i) => (
            <div key={p.title} className="c-diff-row lo-in" style={{ ['--d' as string]: `${100 + i * 100}ms` }}>
              <h3>{p.title}</h3>
              <p className="lo-body">{p.body}</p>
            </div>
          ))}
          <p className="c-foot">{COPY.different.footnote}</p>
        </div>
      </section>

      <section className="lo-section faq-section">
        <div className="lo-wrap c-faq">
          <h2>{COPY.faq.title}</h2>
          <Faq />
        </div>
      </section>

      <FinalCta />
    </div>
  )
}
