'use client'

/**
 * "Why it's different" on the landing preview: four compact cards in a 2x2
 * grid (stacked on mobile), each with a small visual built from existing
 * product content:
 *   01 the 30-dot facet grid (real trait words from lib/known/scoring.ts),
 *   02 a crop of the real daily check-in screen (PracticePhoneScreens'
 *      CheckInScreen over landingPracticeFixture), lazy-loaded,
 *   03 one pattern card from the public sample report (sampleContent.ts),
 *   04 a two-lane flow chart.
 * Copy is the owner's, verbatim.
 */

import dynamic from 'next/dynamic'
import { SAMPLE_FACETS } from '@/app/report/sample/sampleContent'
import { mkCream, mkCharcoal, mkCharcoalSoft, mkCard, mkLine, mkTeal, mkPeriwinkle, mkRose } from '../LandingPageClient'

const AMBER = '#F2C98A'
const SAGE = '#B9DDB0'
const VISUAL_H = 200

// Card 02's crop pulls in the practice libs, so it loads on demand; the
// fixed-height box below reserves its space either way.
const CheckInScreen = dynamic(() => import('./PracticePhoneScreens').then((m) => m.CheckInScreen), { ssr: false })

// Big Five domains as columns of six facets; three dots carry a real trait
// word (Adventurousness → Curious, Self-Discipline → Steady, Cautiousness →
// Deliberate).
const DOMAINS: { color: string; words: Record<number, string> }[] = [
  { color: mkPeriwinkle, words: {} },
  { color: mkRose, words: {} },
  { color: mkTeal, words: { 0: 'Curious' } },
  { color: SAGE, words: {} },
  { color: AMBER, words: { 1: 'Steady', 5: 'Deliberate' } },
]

const css = `
  .pv-why-section{padding:10px 0 90px;}
  .pv-why-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;max-width:1000px;margin:0 auto;}
  .pv-why-card{background:${mkCard};border:1px solid ${mkLine};border-radius:22px;padding:28px 28px 26px;display:flex;flex-direction:column;}
  .pv-why-num{font-family:'Newsreader',serif;font-style:italic;font-size:14px;color:${mkCharcoalSoft};margin-bottom:6px;}
  .pv-why-card h3{font-family:'Newsreader',serif;font-size:24px;font-weight:500;line-height:1.2;margin:0 0 10px;}
  .pv-why-card > p{font-size:15px;line-height:1.6;color:${mkCharcoalSoft};margin:0 0 20px;}
  .pv-why-visual{position:relative;margin-top:auto;height:${VISUAL_H}px;border-radius:16px;background:${mkCream};border:1px solid ${mkLine};
    overflow:hidden;display:flex;align-items:center;justify-content:center;}
  .pv-why-note{grid-column:2;font-size:12.5px;color:${mkCharcoalSoft};margin:-8px 0 0 4px;}

  /* 01 · facets */
  .pv-facets{display:flex;gap:20px;margin-top:22px;}
  .pv-facet-col{display:flex;flex-direction:column;gap:8px;}
  .pv-facet{position:relative;width:15px;height:15px;border-radius:50%;}
  .pv-facet.w{box-shadow:0 0 0 3px ${mkCream},0 0 0 4px ${mkCharcoal};}
  .pv-facet em{position:absolute;left:23px;top:50%;transform:translateY(-50%);font-family:'Newsreader',serif;font-size:13.5px;color:${mkCharcoal};
    background:${mkCream};border:1px solid ${mkLine};border-radius:999px;padding:1px 8px;white-space:nowrap;z-index:1;}
  .pv-facet em.up{left:50%;top:-11px;transform:translate(-50%,-100%);}

  /* 02 · check-in crop: the 360px-wide screen, scaled and shifted up past
     the back link so the label, question and first options show. */
  .pv-crop{position:absolute;left:50%;top:0;width:360px;transform:translateX(-50%) translateY(-50px) scale(0.68);transform-origin:top center;pointer-events:none;}

  /* 03 · pattern card */
  .pv-pattern{width:84%;text-align:center;}
  .pv-pattern .w{font-family:'Newsreader',serif;font-size:22px;font-weight:600;margin:0 0 8px;}
  .pv-pattern .q{font-family:'Newsreader',serif;font-style:italic;font-size:15.5px;line-height:1.5;color:${mkCharcoalSoft};margin:0 0 10px;}
  .pv-pattern .l{font-size:11.5px;font-weight:600;color:${mkCharcoal};margin:0 0 4px;}
  .pv-pattern .t{font-size:13px;line-height:1.55;color:${mkCharcoalSoft};margin:0;}

  /* 04 · two lanes */
  .pv-lanes{width:92%;display:flex;flex-direction:column;gap:14px;}
  .pv-lane-label{font-size:10.5px;letter-spacing:0.1em;text-transform:uppercase;color:${mkCharcoalSoft};margin-bottom:6px;text-align:left;}
  .pv-lane-row{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:center;gap:6px;}
  .pv-node{font-size:11.5px;line-height:1.3;padding:7px 8px;border-radius:10px;border:1px solid ${mkLine};background:#fff;color:${mkCharcoal};text-align:center;min-height:44px;display:flex;align-items:center;justify-content:center;}
  .pv-lane.bearing .pv-node{background:${mkCharcoal};color:${mkCream};border-color:${mkCharcoal};}
  .pv-arrow{font-size:12px;color:${mkCharcoalSoft};}

  @media(max-width:860px){
    .pv-why-grid{grid-template-columns:1fr;gap:16px;}
    .pv-why-note{grid-column:1;}
  }
  @media(max-width:640px){
    .pv-why-section{padding:10px 0 60px;}
    .pv-why-card{padding:22px 20px 20px;}
    .pv-why-card h3{font-size:22px;}
    .pv-node{font-size:11px;padding:6px 5px;}
    .pv-lanes{width:96%;}
    .pv-why-visual{height:240px;}
    .pv-crop{transform:translateX(-50%) translateY(-46px) scale(0.66);}
  }
`

function Facets() {
  return (
    <div className="pv-facets" aria-hidden="true">
      {DOMAINS.map((d, c) => (
        <div key={c} className="pv-facet-col">
          {[0, 1, 2, 3, 4, 5].map((r) => {
            const word = d.words[r]
            return (
              <div key={r} className={`pv-facet${word ? ' w' : ''}`} style={{ background: d.color, opacity: word ? 1 : 0.75 }}>
                {word && <em className={c < DOMAINS.length - 1 ? 'up' : undefined}>{word}</em>}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function PatternCard() {
  const f = SAMPLE_FACETS[0] // Deliberate
  const firstSentence = f.content?.where_it_shows_up.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? f.content?.where_it_shows_up
  return (
    <div className="pv-pattern" aria-hidden="true">
      <p className="w">{f.traitWord}</p>
      <p className="q">{f.content?.trait_quote}</p>
      <p className="l">Where this shows up</p>
      <p className="t">{firstSentence}</p>
    </div>
  )
}

function Lanes() {
  const lanes = [
    { name: 'AI chat', cls: '', nodes: ['You describe yourself', 'AI builds on your framing', 'You hear back what you already believe'] },
    { name: 'Bearing', cls: ' bearing', nodes: ['120 fixed statements', 'Scores calculated from your answers', 'AI explains your scores'] },
  ]
  return (
    <div className="pv-lanes">
      {lanes.map((lane) => (
        <div key={lane.name} className={`pv-lane${lane.cls}`}>
          <div className="pv-lane-label">{lane.name}</div>
          <div className="pv-lane-row">
            {lane.nodes.map((n, i) => (
              <span key={n} style={{ display: 'contents' }}>
                {i > 0 && <span className="pv-arrow" aria-hidden="true">→</span>}
                <span className="pv-node">{n}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const CARDS = [
  {
    title: 'Patterns, not labels',
    body: 'Type tests sort you into one of a fixed set of four-letter labels. Bearing shows 30 specific patterns, each with its own word, so you see how you actually lean.',
    visual: <Facets />,
    label: 'Thirty dots in five columns, one per facet, three of them labelled Curious, Steady and Deliberate.',
  },
  {
    title: 'Guidance, not just a report',
    body: 'Most tools stop once you’ve seen your results. Bearing helps you keep working with your patterns: evening check-ins, recaps, and deeper assessments it suggests.',
    visual: <div className="pv-crop"><CheckInScreen standalone /></div>,
    label: 'Example: the daily check-in screen for Self-Discipline.',
  },
  {
    title: 'No coach needed',
    body: 'Professional assessments often need a certified coach to explain what the results mean. Every pattern comes with its own written explanation, ready to read at your own pace.',
    visual: <PatternCard />,
    label: 'Example: one pattern from a sample report, with its written explanation.',
  },
  {
    title: 'Not another AI echo',
    body: 'AI chat builds on what you tell it. Bearing starts from 120 fixed statements from a published Big Five inventory, the same for everyone. AI only explains your scores afterwards and can’t change them.',
    visual: <Lanes />,
    label: null,
  },
]

export default function WhyDifferentSection() {
  return (
    <section className="pv-why-section">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="wrap">
        <div className="section-head">
          <div className="mk-eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>Why it&apos;s different</div>
          <h2>Not just an insight. A way to work with it.</h2>
        </div>
        <div className="pv-why-grid">
          {CARDS.map((c, i) => (
            <div key={c.title} className="pv-why-card">
              <div className="pv-why-num">{String(i + 1).padStart(2, '0')}</div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <div className="pv-why-visual" {...(c.label ? { role: 'img', 'aria-label': c.label } : {})}>{c.visual}</div>
            </div>
          ))}
          <p className="pv-why-note">Still self-report: Bearing describes patterns, not a diagnosis.</p>
        </div>
      </div>
    </section>
  )
}
