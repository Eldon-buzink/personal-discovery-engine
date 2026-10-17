'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import BandSpectrum from '@/components/known/BandSpectrum'
import { TagPill } from '@/components/known/ReportVisuals'
import { SAMPLE_FACETS } from '@/app/report/sample/SampleReportClient'
import { landingPracticeFixture } from '@/app/(site)/landing/landingPracticeFixture'
import { HeroBlobsBackdrop } from '@/app/(site)/landing-options/shared2'
import { buildJourneyExample } from '@/lib/known/journeyExample'
import { formatWeekHeadline } from '@/lib/known/reportCopy'
import { facetTraitWords } from '@/lib/known/scoring'
import { userCuratedHue } from '@/lib/blobs'
import { useEnterOnce } from '@/lib/design/motion'
import { css, type } from '@/lib/design/type'
import V3Nav, { v3NavCSS } from './V3Nav'

// Landing v3, step 1: the hero. After traitstack.com's hero (a large serif
// headline with a grey second sentence, one short line, one pill button,
// a large visual with small cards floating around it), with the person
// replaced by a part of the real report: the trait card for the sample
// report's "Deliberate", the report's blobs behind it, and three small
// cards around it with real report and practice pieces (where you landed,
// how it tends to show up, this week's check-ins). On a phone only the
// trait card stays over the blobs.

const HERO_CSS = `
  .v3{background:#F7F4ED;color:#262420;overflow-x:hidden;}
  .v3-hero{position:relative;padding:148px 24px 40px;text-align:center;}
  .v3-eyebrow{${css.meta}margin:0 0 20px;}
  .v3-h1{font-family:var(--font-display);font-weight:400;font-size:clamp(42px,5.4vw,76px);line-height:1.04;letter-spacing:-0.03em;max-width:1080px;margin:0 auto;}
  .v3-h1 span{display:block;color:#8C8A83;}
  .v3-sub{${css.body}font-size:18px;color:#56534D;max-width:540px;margin:24px auto 0;}
  .v3-ctas{margin-top:36px;display:flex;justify-content:center;}
  .v3-btn{${css.ui}font-size:15px;display:inline-flex;align-items:center;gap:10px;height:52px;padding:0 26px;border-radius:999px;background:#262420;color:#F7F4ED;
    box-shadow:0 1px 2px rgba(38,36,32,0.2),0 8px 24px -10px rgba(38,36,32,0.45);transition:transform var(--dur-ui) var(--ease),box-shadow var(--dur-ui) var(--ease);}
  .v3-btn svg{transition:transform var(--dur-ui) var(--ease);}
  .v3-btn:hover svg{transform:translateX(3px);}
  .v3-btn:active{transform:scale(0.98);}
  .v3-btn:focus-visible{outline:2px solid #262420;outline-offset:3px;}
  .v3-note{display:flex;justify-content:center;flex-wrap:wrap;gap:8px 20px;list-style:none;margin:20px 0 0;padding:0;}
  .v3-note li{${css.meta}color:#56534D;display:inline-flex;align-items:center;gap:6px;}
  .v3-note svg{color:#3D6B5C;}

  /* The visual: blobs behind, the trait card in front, three small cards. */
  .v3-stage{position:relative;max-width:1040px;height:560px;margin:56px auto 0;}
  .v3-stage .a2-hero-blobs{position:absolute;left:50%;top:50%;width:760px;aspect-ratio:520/500;transform:translate(-50%,-50%);opacity:0.95;pointer-events:none;}
  .v3-card{position:absolute;background:rgba(255,255,255,0.86);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
    border:1px solid rgba(38,36,32,0.08);border-radius:18px;box-shadow:0 1px 2px rgba(38,36,32,0.06),0 18px 40px -18px rgba(38,36,32,0.3);text-align:left;}
  .v3-card .v3-k{${css.meta}margin:0 0 10px;}
  /* The trait card is frosted glass over the blobs, so their colour shows. */
  .v3-main{left:50%;top:50%;width:380px;padding:28px 28px 26px;transform:translate(-50%,-50%);text-align:center;
    background:rgba(255,255,255,0.5);-webkit-backdrop-filter:blur(18px) saturate(1.2);backdrop-filter:blur(18px) saturate(1.2);border-color:rgba(255,255,255,0.7);}
  .v3-main .v3-k{text-align:center;}
  .v3-main-quote{${css.display4}color:#56534D;margin:14px 0 0;}
  .v3-land{left:2%;top:58%;width:300px;padding:18px 18px 16px;}
  .v3-land .v3-spec{padding:0 11px;}
  .v3-tags{right:4%;top:6%;width:280px;padding:18px;}
  .v3-tags .v3-pills{display:flex;flex-wrap:wrap;gap:6px;}
  .v3-week{right:0;bottom:4%;width:300px;padding:18px;}
  .v3-week-line{${css.display4}color:#262420;margin:0;}

  /* Entrance: once, cards rise in after the copy (lib/design/motion). */
  .m-armed:not(.m-play) .v3-in{opacity:0;transform:translateY(12px);}
  .m-play .v3-in{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}
  .m-armed:not(.m-play) .v3-main.v3-in{transform:translate(-50%,calc(-50% + 12px));}

  @media(max-width:900px){
    .v3-land,.v3-tags,.v3-week{display:none;}
    .v3-stage{height:440px;margin-top:40px;}
    .v3-stage .a2-hero-blobs{width:min(560px,130vw);}
  }
  @media(max-width:640px){
    .v3-hero{padding:120px 16px 24px;}
    .v3-sub{font-size:16px;}
    .v3-main{width:calc(100% - 24px);max-width:360px;padding:24px 22px 22px;}
    .v3-stage{height:360px;margin-top:28px;}
  }
`

const arrow = <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
const tick = <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function V3Client() {
  const copyRef = useEnterOnce<HTMLDivElement>()
  const stageRef = useEnterOnce<HTMLDivElement>()
  const f = SAMPLE_FACETS[0] // Deliberate (Cautiousness), the sample report's first pattern
  const hue = userCuratedHue(`ring1-pattern-${f.traitWord.toLowerCase()}`, f.hueOffset)
  const week = useMemo(() => {
    const ex = buildJourneyExample({ ...landingPracticeFixture, directional: false })
    return formatWeekHeadline(ex.facetId, ex.recap.weekly)
  }, [])
  const d = (ms: number) => ({ ['--d' as string]: `${ms}ms` })
  return (
    <div className="v3">
      <style dangerouslySetInnerHTML={{ __html: v3NavCSS + HERO_CSS }} />
      <V3Nav />
      <main>
        <section className="v3-hero">
          <div ref={copyRef}>
            <p className="v3-eyebrow v3-in">Personality report and daily practice</p>
            <h1 className="v3-h1 v3-in" style={d(80)}>
              Know why you do what you do.<span>Then work with it.</span>
            </h1>
            <p className="v3-sub v3-in" style={d(160)}>
              The worry that won’t settle. The plan you drop halfway. Bearing shows you the patterns behind them, and helps you notice them in your days.
            </p>
            <div className="v3-ctas v3-in" style={d(240)}>
              <Link href="/onboarding" className="v3-btn">Start the assessment {arrow}</Link>
            </div>
            <ul className="v3-note v3-in" style={d(300)} aria-label="Before you start">
              {['About 15 minutes', 'First 5 patterns free', 'No account to start'].map((n) => <li key={n}>{tick}{n}</li>)}
            </ul>
          </div>

          <div ref={stageRef} className="v3-stage" aria-label="Example from a Bearing report">
            <HeroBlobsBackdrop />
            <div className="v3-card v3-main v3-in" style={d(0)}>
              <p className="v3-k">Your first pattern</p>
              <p style={{ ...type.traitWord, color: `hsl(${hue},45%,24%)`, margin: 0 }}>{f.traitWord}</p>
              <p className="v3-main-quote">{f.content!.trait_quote}</p>
            </div>
            <div className="v3-card v3-tags v3-in" style={d(200)}>
              <p className="v3-k">How it tends to show up</p>
              <div className="v3-pills">{f.content!.tags.map((t) => <TagPill key={t} label={t} hue={hue} />)}</div>
            </div>
            <div className="v3-card v3-land v3-in" style={d(300)}>
              <p className="v3-k">Where you landed</p>
              <div className="v3-spec"><BandSpectrum band="mid" labels={facetTraitWords(f.facet)!} /></div>
            </div>
            <div className="v3-card v3-week v3-in" style={d(400)}>
              <p className="v3-k">Your practice · this week</p>
              <p className="v3-week-line">{week}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
