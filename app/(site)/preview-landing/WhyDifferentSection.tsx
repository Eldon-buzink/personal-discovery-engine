'use client'

/**
 * "Why it's different", expanded for the landing preview: the four
 * comparison points from `/`'s compare cards, each as its own row with a
 * short explanation, the "compared with" side, and a small visual.
 *
 * Every claim restates something the product already says or does:
 * statements are real IPIP-NEO-120 items (lib/known/ring1-questions.ts),
 * the report labels are the real section labels (ReportVisuals), the trait
 * words are real TRAIT_WORDS (lib/known/scoring.ts), and the five branch
 * assessments are the real ones. No visual here uses user data.
 */

import { mkCream, mkCharcoal, mkCharcoalSoft, mkCard, mkLine, mkTeal, mkPeriwinkle, mkRose } from '../LandingPageClient'

const AMBER = '#F2C98A'
const SAGE = '#B9DDB0'

// Five branch assessments evenly around the main report, starting at the top.
const BRANCHES = ['Working style', 'Relationships', 'Energy', 'Environment', 'Direction'].map((name, i) => {
  const a = ((-90 + i * 72) * Math.PI) / 180
  return { name, x: 50 + 38 * Math.cos(a), xm: 50 + 31 * Math.cos(a), y: 50 + 38 * Math.sin(a), color: [mkTeal, mkRose, AMBER, mkPeriwinkle, SAGE][i] }
})

// Big Five domains as columns of six facets. Three dots carry a real trait
// word (Cautiousness → Deliberate, Self-Discipline → Steady,
// Adventurousness → Curious) to show "a word per facet".
const DOMAINS = [
  { color: mkPeriwinkle, words: {} as Record<number, string> },
  { color: mkRose, words: {} },
  { color: mkTeal, words: { 0: 'Curious' } },
  { color: SAGE, words: {} },
  { color: AMBER, words: { 1: 'Steady', 5: 'Deliberate' } },
]

const css = `
  .pv-why-section{padding:10px 0 90px;}
  .pv-why-list{max-width:1000px;margin:0 auto;}
  .pv-why-row{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;padding:44px 0;border-top:1px solid ${mkLine};}
  .pv-why-row:first-child{border-top:none;padding-top:8px;}
  .pv-why-row:nth-child(even) .pv-why-visual{order:2;}
  .pv-why-num{font-family:'Newsreader',serif;font-style:italic;font-size:15px;color:${mkCharcoalSoft};margin-bottom:10px;}
  .pv-why-text h3{font-family:'Newsreader',serif;font-size:28px;font-weight:500;line-height:1.2;margin:0 0 12px;}
  .pv-why-text > p{font-size:16px;line-height:1.65;color:${mkCharcoalSoft};margin:0;}
  .pv-why-vs{display:flex;gap:12px;align-items:baseline;margin-top:20px;padding:12px 16px;border-radius:12px;border:1px dashed rgba(38,36,32,0.2);}
  .pv-why-vs span{flex-shrink:0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${mkCharcoalSoft};}
  .pv-why-vs p{margin:0;font-size:14px;line-height:1.5;color:${mkCharcoalSoft};}
  .pv-why-vs b{font-weight:500;color:${mkCharcoal};}

  .pv-why-visual{position:relative;background:${mkCard};border:1px solid ${mkLine};border-radius:24px;height:280px;
    display:flex;align-items:center;justify-content:center;overflow:hidden;}
  .pv-why-caption{position:absolute;left:0;right:0;bottom:16px;text-align:center;font-size:12px;color:${mkCharcoalSoft};}

  /* 1 · statements */
  .pv-stmts{display:flex;flex-direction:column;gap:10px;width:78%;margin-bottom:26px;}
  .pv-stmt{display:flex;align-items:center;justify-content:space-between;gap:12px;background:${mkCream};border:1px solid ${mkLine};border-radius:12px;padding:11px 14px;}
  .pv-stmt span{font-family:'Newsreader',serif;font-size:16px;}
  .pv-dots{display:flex;gap:6px;flex-shrink:0;}
  .pv-dots i{width:9px;height:9px;border-radius:50%;border:1.5px solid ${mkCharcoalSoft};}
  .pv-dots i.on{background:${mkCharcoal};border-color:${mkCharcoal};}

  /* 2 · report card */
  .pv-mini-report{width:72%;background:${mkCream};border:1px solid ${mkLine};border-radius:16px;padding:18px 20px;box-shadow:0 14px 30px -24px rgba(38,36,32,0.5);}
  .pv-mini-report .w{font-family:'Newsreader',serif;font-style:italic;font-size:22px;margin-bottom:12px;}
  .pv-mini-block{margin-top:10px;}
  .pv-mini-block b{display:block;font-size:11.5px;font-weight:600;color:${mkCharcoal};margin-bottom:6px;}
  .pv-bar{height:6px;border-radius:3px;background:rgba(38,36,32,0.1);margin-bottom:5px;}

  /* 3 · 30 facets */
  .pv-facets{display:flex;gap:22px;margin:30px 0 26px;}
  .pv-facet-col{display:flex;flex-direction:column;gap:9px;}
  .pv-facet{position:relative;width:16px;height:16px;border-radius:50%;}
  .pv-facet.w{box-shadow:0 0 0 3px ${mkCream},0 0 0 4px ${mkCharcoal};}
  .pv-facet em.up{left:50%;top:-12px;transform:translate(-50%,-100%);}
  .pv-facet em{position:absolute;left:24px;top:50%;transform:translateY(-50%);font-family:'Newsreader',serif;font-size:14px;color:${mkCharcoal};
    background:${mkCream};border:1px solid ${mkLine};border-radius:999px;padding:1px 8px;white-space:nowrap;z-index:1;}

  /* 4 · branch map */
  .pv-map{position:relative;width:100%;height:100%;}
  .pv-map-ring{position:absolute;left:12%;right:12%;top:12%;bottom:12%;border:1.5px dashed rgba(38,36,32,0.18);border-radius:50%;}
  .pv-map-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:104px;height:104px;border-radius:50%;
    background:${mkCharcoal};color:${mkCream};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;}
  .pv-map-core b{font-family:'Newsreader',serif;font-weight:500;font-size:16px;line-height:1.15;}
  .pv-map-core span{font-size:10.5px;color:#C9C4B8;}
  .pv-map-node{position:absolute;left:var(--x);top:var(--y);transform:translate(-50%,-50%);white-space:nowrap;display:flex;align-items:center;gap:6px;
    background:${mkCream};border:1px solid ${mkLine};border-radius:999px;padding:6px 11px;font-size:12.5px;color:${mkCharcoal};}
  .pv-map-node i{width:8px;height:8px;border-radius:50%;background:var(--c);}

  @media(max-width:860px){
    .pv-why-row{grid-template-columns:1fr;gap:22px;padding:32px 0;}
    .pv-why-row .pv-why-visual,.pv-why-row:nth-child(even) .pv-why-visual{order:2;}
    .pv-why-visual{height:240px;}
  }
  @media(max-width:640px){
    .pv-why-section{padding:10px 0 60px;}
    .pv-why-text h3{font-size:23px;}
    .pv-why-text > p{font-size:15px;}
    .pv-stmts{width:90%;}
    .pv-stmt span{font-size:14.5px;}
    .pv-mini-report{width:84%;}
    .pv-facets{gap:16px;}
    .pv-map-node{left:var(--xm);font-size:11px;padding:5px 8px;}
    .pv-map-ring{left:19%;right:19%;}
    .pv-map-core{width:86px;height:86px;}
    .pv-map-core b{font-size:14px;}
  }
`

function Statements() {
  const items: [string, number][] = [['Worry about things.', 1], ['Make friends easily.', 3], ['Trust others.', 2]]
  return (
    <>
      <div className="pv-stmts">
        {items.map(([text, on]) => (
          <div key={text} className="pv-stmt">
            <span>{text}</span>
            <div className="pv-dots">{[0, 1, 2, 3, 4].map(i => <i key={i} className={i === on ? 'on' : undefined} />)}</div>
          </div>
        ))}
      </div>
      <div className="pv-why-caption">Same statements for everyone · scored before any AI</div>
    </>
  )
}

function MiniReport() {
  const blocks: [string, number[]][] = [['Where this shows up', [92, 70]], ['Go deeper', [86, 54]], ['Worth trying', [78]]]
  return (
    <div className="pv-mini-report">
      <div className="w">Deliberate</div>
      {blocks.map(([label, widths]) => (
        <div key={label} className="pv-mini-block">
          <b>{label}</b>
          {widths.map((w, i) => <div key={i} className="pv-bar" style={{ width: `${w}%` }} />)}
        </div>
      ))}
    </div>
  )
}

function Facets() {
  return (
    <>
      <div className="pv-facets">
        {DOMAINS.map((d, c) => (
          <div key={c} className="pv-facet-col">
            {[0, 1, 2, 3, 4, 5].map(r => {
              const word = (d.words as Record<number, string>)[r]
              return (
                <div key={r} className={`pv-facet${word ? ' w' : ''}`} style={{ background: d.color, opacity: word ? 1 : 0.75 }}>
                  {word && <em className={c < DOMAINS.length - 1 ? 'up' : undefined}>{word}</em>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="pv-why-caption">5 traits × 6 facets, a word for each</div>
    </>
  )
}

function BranchMap() {
  return (
    <div className="pv-map">
      <div className="pv-map-ring" />
      <div className="pv-map-core"><b>Your report</b><span>30 facets</span></div>
      {BRANCHES.map(b => (
        <div key={b.name} className="pv-map-node" style={{ ['--x' as string]: `${b.x}%`, ['--xm' as string]: `${b.xm}%`, ['--y' as string]: `${b.y}%`, ['--c' as string]: b.color }}>
          <i />{b.name}
        </div>
      ))}
    </div>
  )
}

const POINTS = [
  {
    title: 'The same 120 statements for everyone.',
    body: 'Your scores come straight from how you rate fixed statements from the IPIP-NEO-120, a public-domain Big Five inventory from published research. AI comes in only afterwards, to explain your scores in plain words. It can’t change them.',
    vs: ['AI chat', 'Builds on what you tell it, so it tends to tell you what you want to hear.'],
    visual: <Statements />,
    label: 'Three example statements, each rated on a five-point scale.',
  },
  {
    title: 'Explained in the report itself.',
    body: 'Every pattern comes with its own written explanation: where it shows up in your day, what sits underneath it, and one thing worth trying. You can read it on your own, at your own pace.',
    vs: ['Professional assessments', 'Often need a certified coach to explain what your results mean.'],
    visual: <MiniReport />,
    label: 'A report card for one pattern, with sections Where this shows up, Go deeper and Worth trying.',
  },
  {
    title: '30 specific patterns, not one label.',
    body: 'The Big Five breaks down into 30 facets, and each one gets its own word, like Deliberate, Steady or Curious. Your result describes the specific ways you lean, instead of sorting you into a type.',
    vs: ['Type tests', 'Sort you into one of a fixed set of four-letter labels.'],
    visual: <Facets />,
    label: 'Thirty dots in five columns, one per facet.',
  },
  {
    title: 'It doesn’t stop at the report.',
    body: 'Choose the patterns you want to work with and check in on them each evening, so you build up your own record over time. Five deeper assessments go further, and Bearing suggests which to take first.',
    vs: ['Most tools', 'Stop once you’ve seen your results.'],
    visual: <BranchMap />,
    label: 'Your report in the center, with five deeper assessments around it: working style, relationships, energy, environment and direction.',
  },
]

export default function WhyDifferentSection() {
  return (
    <section className="pv-why-section">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="wrap">
        <div className="section-head">
          <div className="mk-eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>Why it&apos;s different</div>
          <h2>Fixed questions, specific patterns.</h2>
        </div>
        <div className="pv-why-list">
          {POINTS.map((p, i) => (
            <div key={p.title} className="pv-why-row">
              <div className="pv-why-visual" role="img" aria-label={p.label}>{p.visual}</div>
              <div className="pv-why-text">
                <div className="pv-why-num">{String(i + 1).padStart(2, '0')}</div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <div className="pv-why-vs">
                  <span>Compared with</span>
                  <p><b>{p.vs[0]}:</b> {p.vs[1]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
