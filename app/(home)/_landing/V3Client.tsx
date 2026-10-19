'use client'

import Link from 'next/link'
import { useId, useMemo, useRef, type ReactNode } from 'react'
import { blobGradientStops, buildPointMotionProfile, CURATED_HUES, generateAnimatedBlobPath, hashSeed, useBlobAnimation } from '@/lib/blobs'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'
import { HeroCta, useLandingVisitor } from '@/app/(site)/LandingPageClient'
import { mkCharcoal, mkCream } from '@/app/start/startLandingShared'
import SiteNav from '@/components/known/SiteNav'
import { ctaFor, VisitorContext } from './visitor'

// The landing page shell and its hero. After traitstack.com's hero (a large
// serif headline with a grey second sentence, one short line, one pill
// button), with blobs drifting behind the text: one in each of the eight
// brand hues (CURATED_HUES), on the shared blob clock. The sections below
// come in as props from app/(home)/page.tsx.
//
// Visitor state is the old landing's own (useLandingVisitor): signed-in
// visitors go on to their report or assessment, a returning visitor with
// patterns gets the welcome-back sign-in (HeroCta), and one who started
// but didn't finish sees "Continue your assessment" on every button.
// Unlike the old page, the content renders straight away (no blank page
// until the check is done), so the HTML is there for search engines.


// Eight blobs, one per brand hue, spread around the headline. Two larger
// ones carry the stronger "active" gradient.
const BLOBS = CURATED_HUES.map((hue, i) => ({
  hue,
  ...[
    { cx: 300, cy: 270, r: 150, active: true },   // 8 coral
    { cx: 860, cy: 470, r: 95, active: false },   // 35 amber
    { cx: 390, cy: 85, r: 62, active: false },    // 145 green
    { cx: 520, cy: 420, r: 130, active: false },  // 175 teal
    { cx: 935, cy: 130, r: 64, active: false },   // 205 sky
    { cx: 700, cy: 240, r: 145, active: true },   // 235 periwinkle
    { cx: 140, cy: 470, r: 92, active: false },   // 290 violet
    { cx: 640, cy: 80, r: 70, active: false },    // 335 rose
  ][i],
}))

// SVG ids are per instance, so it can be placed more than once.
export function HeroBlobs() {
  const uid = useId().replace(/:/g, "")
  const wrapRef = useRef<HTMLDivElement>(null)
  const refs = useRef<(SVGPathElement | null)[]>([])
  const items = useMemo(() => BLOBS.map((b, i) => ({ ...b, profile: buildPointMotionProfile(hashSeed(`v3-hero-${i}`), 9) })), [])
  useBlobAnimation((t) => {
    items.forEach((b, i) => refs.current[i]?.setAttribute('d', generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, t)))
  }, [items], wrapRef, { respectReducedMotion: true })
  return (
    <div ref={wrapRef} className="v3-blobs" aria-hidden="true">
      <svg viewBox="0 0 1000 560" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        <defs>
          <filter id={`v3-blur-${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26" /></filter>
          {items.map((b, i) => (
            <radialGradient key={i} id={`v3-grad-${uid}-${i}`} cx="45%" cy="40%" r="70%">
              {blobGradientStops(b.hue, b.active).map((s, j) => <stop key={j} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />)}
            </radialGradient>
          ))}
        </defs>
        {items.map((b, i) => (
          <path key={i} ref={(el) => { refs.current[i] = el }} fill={`url(#v3-grad-${uid}-${i})`} filter={`url(#v3-blur-${uid})`} d={generateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, 0)} />
        ))}
      </svg>
    </div>
  )
}

const HERO_CSS = `
  .v3{background:#F7F4ED;color:#262420;overflow-x:hidden;}
  .v3-hero{position:relative;min-height:min(860px,100svh);padding:160px 24px 120px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;}
  /* The blobs, centred behind the copy, soft enough for the text on top. */
  .v3-blobs{position:absolute;left:50%;top:52%;width:min(1240px,180vw);aspect-ratio:1000/560;transform:translate(-50%,-50%);opacity:0.5;pointer-events:none;}
  .v3-copy{position:relative;max-width:1080px;}
  .v3-eyebrow{${css.meta}margin:0 0 20px;}
  .v3-h1{font-family:var(--font-display);font-weight:400;font-size:clamp(42px,5.4vw,76px);line-height:1.04;letter-spacing:-0.03em;margin:0 auto;}
  .v3-h1 span{display:block;color:#7d7a72;}
  .v3-sub{${css.body}font-size:18px;color:#46433d;max-width:540px;margin:24px auto 0;}
  .v3-ctas{margin-top:36px;display:flex;justify-content:center;}
  .v3-btn{${css.ui}display:inline-flex;align-items:center;gap:10px;height:52px;padding:0 26px;border-radius:999px;background:#262420;color:#F7F4ED;
    box-shadow:0 1px 2px rgba(38,36,32,0.2),0 8px 24px -10px rgba(38,36,32,0.45);transition:transform var(--dur-ui) var(--ease);}
  .v3-btn svg{transition:transform var(--dur-ui) var(--ease);}
  .v3-btn:hover svg{transform:translateX(3px);}
  .v3-btn:active{transform:scale(0.98);}
  .v3-btn:focus-visible{outline:2px solid #262420;outline-offset:3px;}
  .v3-note{display:flex;justify-content:center;flex-wrap:wrap;gap:8px 20px;list-style:none;margin:20px 0 0;padding:0;}
  .v3-note li{${css.meta}color:#46433d;display:inline-flex;align-items:center;gap:6px;}
  .v3-note svg{color:#3D6B5C;}
  .v3-welcome{display:flex;justify-content:center;margin-top:36px;}
  .v3-welcome > div{width:100%;max-width:440px;}

  /* The old landing's shared classes, used by HeroCta (welcome back) and
     the closing section (FinalCtaSection), copied unchanged. */
  .mk-eyebrow{${css.meta}margin-bottom:14px;}
  .mk-microcopy{${css.meta}}
  .mk-btn{${css.ui}background:${mkCharcoal};color:${mkCream};border:none;border-radius:999px;padding:11px 20px;min-height:44px;cursor:pointer;}

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

export default function V3Client({ problems, solution, practice, faq, closing }: { problems?: ReactNode; solution?: ReactNode; practice?: ReactNode; faq?: ReactNode; closing?: ReactNode }) {
  const copyRef = useEnterOnce<HTMLDivElement>()
  const { welcomeBack, startedUnfinished } = useLandingVisitor()
  const cta = ctaFor(startedUnfinished)
  const d = (ms: number) => ({ ['--d' as string]: `${ms}ms` })
  return (
    <VisitorContext.Provider value={{ welcomeBack, startedUnfinished }}>
    <div className="v3">
      <style dangerouslySetInnerHTML={{ __html: HERO_CSS }} />
      <SiteNav />
      <main>
        <section className="v3-hero">
          <HeroBlobs />
          <div ref={copyRef} className="v3-copy">
            <p className="v3-eyebrow v3-in">Personality report and daily practice</p>
            <h1 className="v3-h1 v3-in" style={d(80)}>
              Know why you do what you do.<span>Then work with it.</span>
            </h1>
            <p className="v3-sub v3-in" style={d(160)}>
              The worry that won’t settle. The plan you drop halfway. Bearing shows you the patterns behind them, and helps you notice them in your days.
            </p>
            {welcomeBack ? (
              <div className="v3-welcome v3-in" style={d(240)}>
                <HeroCta welcomeBack startedUnfinished={false} />
              </div>
            ) : (
              <div className="v3-ctas v3-in" style={d(240)}>
                <Link href={cta.href} className="v3-btn">{cta.label} {arrow}</Link>
              </div>
            )}
            <ul className="v3-note v3-in" style={d(300)} aria-label="Before you start">
              {['About 15 minutes', 'First 5 patterns free', 'No account to start'].map((n) => <li key={n}>{tick}{n}</li>)}
            </ul>
          </div>
        </section>
        {problems}
        {solution}
        {practice}
        {faq}
        {closing}
      </main>
    </div>
    </VisitorContext.Provider>
  )
}
