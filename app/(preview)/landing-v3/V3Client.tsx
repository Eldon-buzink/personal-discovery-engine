'use client'

import Link from 'next/link'
import { HeroBlobsBackdrop } from '@/app/(site)/landing-options/shared2'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'
import V3Nav, { v3NavCSS } from './V3Nav'

// Landing v3, step 1: the hero. After traitstack.com's hero (a large serif
// headline with a grey second sentence, one short line, one pill button),
// with the original hero's blobs drifting behind the text instead of a
// visual below it.

const HERO_CSS = `
  .v3{background:#F7F4ED;color:#262420;overflow-x:hidden;}
  .v3-hero{position:relative;min-height:min(860px,100svh);padding:160px 24px 120px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;}
  /* The blobs, centred behind the copy, soft enough for the text on top. */
  .v3-hero .a2-hero-blobs{position:absolute;left:50%;top:54%;width:min(880px,140vw);aspect-ratio:520/500;transform:translate(-50%,-50%);opacity:0.6;pointer-events:none;}
  .v3-copy{position:relative;max-width:1080px;}
  .v3-eyebrow{${css.meta}margin:0 0 20px;}
  .v3-h1{font-family:var(--font-display);font-weight:400;font-size:clamp(42px,5.4vw,76px);line-height:1.04;letter-spacing:-0.03em;margin:0 auto;}
  .v3-h1 span{display:block;color:#7d7a72;}
  .v3-sub{${css.body}font-size:18px;color:#46433d;max-width:540px;margin:24px auto 0;}
  .v3-ctas{margin-top:36px;display:flex;justify-content:center;}
  .v3-btn{${css.ui}font-size:15px;display:inline-flex;align-items:center;gap:10px;height:52px;padding:0 26px;border-radius:999px;background:#262420;color:#F7F4ED;
    box-shadow:0 1px 2px rgba(38,36,32,0.2),0 8px 24px -10px rgba(38,36,32,0.45);transition:transform var(--dur-ui) var(--ease);}
  .v3-btn svg{transition:transform var(--dur-ui) var(--ease);}
  .v3-btn:hover svg{transform:translateX(3px);}
  .v3-btn:active{transform:scale(0.98);}
  .v3-btn:focus-visible{outline:2px solid #262420;outline-offset:3px;}
  .v3-note{display:flex;justify-content:center;flex-wrap:wrap;gap:8px 20px;list-style:none;margin:20px 0 0;padding:0;}
  .v3-note li{${css.meta}color:#46433d;display:inline-flex;align-items:center;gap:6px;}
  .v3-note svg{color:#3D6B5C;}

  /* Entrance: once (lib/design/motion). */
  .m-armed:not(.m-play) .v3-in{opacity:0;transform:translateY(12px);}
  .m-play .v3-in{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}

  @media(max-width:640px){
    .v3-hero{min-height:0;padding:128px 16px 96px;}
    .v3-sub{font-size:16px;}
  }
`

const arrow = <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
const tick = <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function V3Client() {
  const copyRef = useEnterOnce<HTMLDivElement>()
  const d = (ms: number) => ({ ['--d' as string]: `${ms}ms` })
  return (
    <div className="v3">
      <style dangerouslySetInnerHTML={{ __html: v3NavCSS + HERO_CSS }} />
      <V3Nav />
      <main>
        <section className="v3-hero">
          <HeroBlobsBackdrop />
          <div ref={copyRef} className="v3-copy">
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
        </section>
      </main>
    </div>
  )
}
