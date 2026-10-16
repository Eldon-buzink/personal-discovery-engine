'use client'

import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'
import {
  COPY, Faq, FinalCta, HeroBackdrop, HeroCtas, HeroNote, PracticeCheckIn, PracticeHome, PracticeNotes,
  PracticeWeek, PracticeWeeks, SampleSpectrum, SampleStatement, SampleTraitCard,
} from './shared'
import { baseCSS } from './styles'

// Option B, "Chapters": product first. Each of the first three sections is
// a chapter with its number, a short text column and the real product
// components large beside it (alternating sides on desktop, text first on
// mobile). The components carry the explanation; the text stays short.

const B_CSS = `
  .b-hero{position:relative;padding:176px 0 136px;text-align:center;}
  .b-hero-inner{position:relative;max-width:780px;margin:0 auto;padding:0 24px;}
  .b-hero .lo-body{max-width:580px;margin:20px auto 36px;}
  .b-chapter{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:72px;align-items:start;}
  .b-chapter.flip{grid-template-columns:minmax(0,7fr) minmax(0,5fr);}
  .b-chapter.flip .b-text{order:2;}
  .b-num{${css.ui}color:#8C8A83;display:block;margin-bottom:14px;}
  .b-text h2{margin-bottom:16px;}
  .b-list{list-style:none;margin:28px 0 0;padding:0;counter-reset:b;}
  .b-list li{${css.body}color:#262420;counter-increment:b;display:flex;gap:14px;padding:12px 0;border-top:1px solid rgba(38,36,32,0.1);}
  .b-list li::before{content:counter(b);${css.ui}color:#8C8A83;min-width:14px;padding-top:2px;}
  .b-stage{display:grid;gap:40px;}
  .b-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:start;}
  .b-recap{display:flex;flex-direction:column;gap:16px;}
  .b-diff{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:32px;margin-top:48px;}
  .b-diff div{border-top:1px solid rgba(38,36,32,0.16);padding-top:18px;}
  .b-diff h3{margin-bottom:8px;}
  .b-foot{${css.meta}margin-top:40px !important;}
  .b-faq{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,7fr);gap:72px;align-items:start;}
  @media(max-width:960px){
    .b-chapter,.b-chapter.flip{grid-template-columns:1fr;gap:40px;}
    .b-chapter.flip .b-text{order:0;}
    .b-diff{grid-template-columns:1fr 1fr;}
    .b-faq{grid-template-columns:1fr;gap:28px;}
  }
  @media(max-width:640px){
    .b-hero{padding:128px 0 88px;}
    .b-pair{grid-template-columns:1fr;}
    .b-diff{grid-template-columns:1fr;gap:24px;}
  }
`

export default function OptionB() {
  const hero = useEnterOnce<HTMLDivElement>()
  const c1 = useEnterOnce<HTMLDivElement>()
  const c2 = useEnterOnce<HTMLDivElement>()
  const c3 = useEnterOnce<HTMLDivElement>()
  const d = (ms: number) => ({ ['--d' as string]: `${ms}ms` })
  return (
    <div className="lo">
      <style dangerouslySetInnerHTML={{ __html: baseCSS + B_CSS }} />

      <section className="b-hero">
        <HeroBackdrop opacity={0.9} />
        <div ref={hero} className="b-hero-inner">
          <h1 className="lo-in">{COPY.hero.title}</h1>
          <p className="lo-body lo-in" style={d(100)}>{COPY.hero.body}</p>
          <div className="lo-in" style={d(200)}><HeroCtas /></div>
          <div className="lo-in" style={d(300)}><HeroNote /></div>
        </div>
      </section>

      <section className="lo-section">
        <div ref={c1} className="lo-wrap b-chapter">
          <div className="b-text">
            <span className="b-num lo-in">1</span>
            <h2 className="lo-in">{COPY.discover.title}</h2>
            <p className="lo-body lo-in" style={d(100)}>{COPY.discover.body}</p>
            <ol className="b-list">
              {COPY.discover.steps.map((s, i) => <li key={s} className="lo-in" style={d(200 + i * 100)}>{s}</li>)}
            </ol>
          </div>
          <div className="b-stage">
            <div className="b-pair">
              <div className="lo-in" style={d(150)}><SampleStatement /></div>
              <div className="lo-in" style={d(300)}><SampleSpectrum /></div>
            </div>
            <div className="lo-in" style={d(450)}><SampleTraitCard /></div>
          </div>
        </div>
      </section>

      <section className="lo-section">
        <div ref={c2} className="lo-wrap b-chapter flip">
          <div className="b-text">
            <span className="b-num lo-in">2</span>
            <h2 className="lo-in">{COPY.practice.title}</h2>
            <p className="lo-body lo-in" style={d(100)}>{COPY.practice.body}</p>
            <ol className="b-list">
              {COPY.practice.steps.map((s, i) => <li key={s} className="lo-in" style={d(200 + i * 100)}>{s}</li>)}
            </ol>
          </div>
          <div className="b-stage">
            <div className="b-pair">
              <div className="lo-in" style={d(150)}><PracticeHome /></div>
              <div className="lo-in" style={d(300)}><PracticeCheckIn /></div>
            </div>
            <div className="b-recap lo-in" style={d(450)}>
              <PracticeWeek /><PracticeWeeks /><PracticeNotes />
            </div>
          </div>
        </div>
      </section>

      <section className="lo-section">
        <div ref={c3} className="lo-wrap">
          <span className="b-num lo-in">3</span>
          <h2 className="lo-in">{COPY.different.title}</h2>
          <div className="b-diff">
            {COPY.different.points.map((p, i) => (
              <div key={p.title} className="lo-in" style={d(100 + i * 100)}>
                <h3>{p.title}</h3>
                <p className="lo-body">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="b-foot">{COPY.different.footnote}</p>
        </div>
      </section>

      <section className="lo-section faq-section">
        <div className="lo-wrap b-faq">
          <h2>{COPY.faq.title}</h2>
          <Faq />
        </div>
      </section>

      <FinalCta />
    </div>
  )
}
