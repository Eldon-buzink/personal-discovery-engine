'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  USER_SEED as SHARED_USER_SEED,
  hashSeed as sharedHashSeed,
  userCuratedHue as sharedUserCuratedHue,
  buildPointMotionProfile as sharedBuildPointMotionProfile,
  generateAnimatedBlobPath as sharedGenerateAnimatedBlobPath,
  blobGradientStops,
  useBlobAnimation,
  registerBlobTask,
} from '@/lib/blobs'

// ─── Design tokens ────────────────────────────────────────────────────────────
const sans  = "var(--font-inter), -apple-system, sans-serif"
const serif = "var(--font-newsreader), Georgia, serif"

// ─── Mockup-exact tokens (reference/bearing-landing-v6_2.html :root) ──────────
// Every rebuilt section on this page uses these — confirmed with the user
// that pixel-for-pixel matching wins over token consistency with the
// (untouched) Nav/Footer, which still use the app's own slightly different
// charcoal/cream values. mkPlum/mkAmber are in the mockup's own :root but
// unused by any of the 7 sections rebuilt here, so left out rather than
// carried as dead code.
const mkCream        = '#F7F4ED'
const mkCard         = '#EFEAE0'
const mkCharcoal     = '#262420'
const mkCharcoalSoft = '#57534A'
const mkLine         = 'rgba(38,36,32,0.1)'
const mkTeal         = '#7FD9C4'
const mkCoral        = '#F0A98A'
const mkPeriwinkle   = '#AEBBE8'
const mkRose         = '#E9AFC0'

// ─── Blob engine (ConnectVisual builds its SVG via raw DOM calls, not JSX —
// see comment there — so it subscribes to the shared lib/blobs.ts clock via
// registerBlobTask directly instead of the useBlobAnimation hook) ────────────
const NS = 'http://www.w3.org/2000/svg'

// ─── Responsive CSS ───────────────────────────────────────────────────────────
// Class names and breakpoints below are transcribed directly from
// reference/bearing-landing-v6_2.html, not reinterpreted — same selectors,
// same values, so this file stays diffable against the mockup source.
// Report Preview's .lp-report-grid was removed along with that section
// (confirmed with the user — no mockup counterpart).
const landingCSS = `
  .wrap{max-width:1120px;margin:0 auto;padding:0 32px;}
  .section-head{max-width:600px;margin:0 auto 48px;text-align:center;}
  .section-head h2{font-family:'Newsreader',serif;font-size:34px;font-weight:500;line-height:1.2;margin:0 0 14px;}
  .section-head p{font-size:15px;color:${mkCharcoalSoft};line-height:1.6;margin:0;}

  /* Hero */
  .hero{padding:88px 32px 70px;}
  .hero-inner{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1.1fr 0.9fr;gap:40px;align-items:center;}
  .hero h1{font-size:52px;line-height:1.08;font-weight:500;margin:0 0 22px;}
  .hero h1 em{font-style:italic;font-weight:400;color:${mkCharcoalSoft};}
  .hero p{font-size:17px;line-height:1.55;color:${mkCharcoalSoft};max-width:440px;margin:0 0 28px;}
  .hero-cta-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
  .hero-blob-wrap{position:relative;width:100%;aspect-ratio:520/500;overflow:visible;}
  .trait-label-active{font-family:'Newsreader',Georgia,serif;font-style:italic;font-weight:600;font-size:30px;}

  /* Gap/stat section */
  .gap-section{padding:70px 32px 90px;}
  .gap-inner{max-width:760px;margin:0 auto;display:flex;align-items:flex-start;justify-content:center;}
  .gap-point{text-align:center;flex:0 0 auto;width:200px;position:relative;padding-top:20px;}
  .gap-blob{position:absolute;width:150px;height:150px;border-radius:50%;filter:blur(38px);opacity:0.55;top:0;left:50%;transform:translateX(-50%);z-index:0;}
  .gap-label{display:none;}
  .gap-num{font-size:40px;font-weight:500;font-style:italic;position:relative;z-index:1;}
  .gap-point.start .gap-num{color:${mkCharcoalSoft};}
  .gap-point.end .gap-num{color:${mkCharcoal};}
  .gap-cap{font-size:13.5px;color:${mkCharcoalSoft};line-height:1.5;max-width:170px;margin:10px auto 0;position:relative;z-index:1;}
  .gap-src{display:block;font-size:11px;color:${mkCharcoalSoft};opacity:0.55;margin-top:10px;position:relative;z-index:1;}
  .gap-track-wrap{flex:1 1 auto;position:relative;top:36px;padding:0 10px;}
  .gap-track{height:1px;background:repeating-linear-gradient(90deg,${mkCharcoalSoft} 0 6px,transparent 6px 12px);}
  .gap-track-label{position:absolute;left:50%;top:-26px;transform:translateX(-50%);font-size:12px;color:${mkCharcoalSoft};white-space:nowrap;}

  /* Bento grid */
  .bento-section{padding:40px 0 90px;}
  .bento{display:grid;grid-template-columns:1.35fr 1fr;gap:22px;max-width:1120px;margin:0 auto 22px;}
  .bento-card{background:${mkCard};border:1px solid ${mkLine};border-radius:24px;padding:34px;overflow:visible;}
  .bento-card h3{font-family:'Newsreader',serif;font-size:24px;font-weight:500;margin:0 0 8px;line-height:1.2;}
  .bento-card p{font-size:16px;color:${mkCharcoalSoft};line-height:1.6;margin:0;}
  .bento-col{display:flex;flex-direction:column;gap:22px;}
  .bento-row3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;max-width:1120px;margin:0 auto;}
  .bento-card.dark{background:${mkCharcoal};color:${mkCream};}
  .bento-card.dark h3{color:${mkCream};}
  .bento-card.dark p{color:#C9C4B8;}
  .badge-pill{display:inline-block;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;background:rgba(247,244,237,0.1);color:#D8D4C8;padding:5px 12px;border-radius:999px;margin-bottom:14px;}
  .bento-cluster-canvas-wrap{position:relative;flex:1;min-height:280px;margin:16px -8px -8px;overflow:visible;}
  .bento-orbit-wrap{position:relative;width:100%;aspect-ratio:380/160;margin-top:14px;overflow:visible;}
  .bento-connect-wrap{position:relative;width:100%;aspect-ratio:380/110;margin-top:16px;overflow:visible;}

  /* USP compare section */
  .usp-section{padding:20px 0 90px;}
  .compare{max-width:900px;margin:0 auto 44px;display:grid;grid-template-columns:1fr auto 1fr;gap:20px;align-items:center;}
  .compare-card{border-radius:18px;padding:26px;}
  .compare-card.muted{background:${mkCard};border:1px solid ${mkLine};opacity:0.75;}
  .compare-card.highlight{background:${mkCharcoal};color:${mkCream};}
  .compare-label{font-size:11px;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;color:${mkCharcoalSoft};}
  .compare-card.highlight .compare-label{color:#B9B4A8;}
  .compare-title{font-size:18px;font-style:italic;line-height:1.4;margin:0 0 10px;}
  .compare-card p{font-size:13px;line-height:1.55;margin:0;color:${mkCharcoalSoft};}
  .compare-card.highlight p{color:#C9C4B8;}
  .compare-vs{font-size:13px;color:${mkCharcoalSoft};text-align:center;}
  .branch-flow{max-width:760px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;font-size:13px;color:${mkCharcoalSoft};}
  .branch-node{padding:9px 16px;border-radius:999px;border:1px solid ${mkLine};background:${mkCard};}
  .branch-node.pill{background:${mkTeal};border-color:${mkTeal};color:${mkCharcoal};font-weight:500;}
  .branch-arrow{opacity:0.5;}

  /* Demo section */
  .demo-wrap{padding:0 32px 90px;}
  .demo{padding:20px 40px 0;text-align:center;}
  .demo .section-head{margin-bottom:32px;}
  .app-card{background:${mkCard};color:${mkCharcoal};border:1px solid ${mkLine};border-radius:22px;box-shadow:0 20px 40px -20px rgba(38,36,32,0.12);max-width:380px;margin:0 auto 24px;padding:44px 36px;text-align:center;}
  .progress-trace{font-size:12px;color:${mkCharcoalSoft};margin-bottom:16px;}
  .reveal-eyebrow{font-size:10.5px;letter-spacing:0.1em;text-transform:uppercase;color:${mkCharcoalSoft};font-weight:600;margin:0 0 8px;}
  .blob-stage{width:190px;height:170px;display:flex;align-items:center;justify-content:center;margin:16px auto 22px;position:relative;}
  .ring-pulse{position:absolute;inset:6px;border-radius:50%;border:1px solid hsl(8,50%,65%);opacity:0.5;animation:pulseRing 2.4s ease-out infinite;}
  .reveal-line{font-family:'Newsreader',serif;font-style:italic;font-size:14px;line-height:1.55;color:${mkCharcoal};margin:0 0 16px;}
  .reveal-sub{font-size:12px;color:${mkCharcoalSoft};margin:0;}

  /* How it works */
  .how{padding:20px 32px 90px;}
  .how-steps{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
  .step{border:1px solid ${mkLine};border-radius:18px;padding:26px 22px;background:${mkCard};text-align:left;}
  .step-mark{width:28px;height:28px;border-radius:50%;background:${mkCharcoal};color:${mkCream};display:flex;align-items:center;justify-content:center;font-size:12px;margin-bottom:16px;font-family:'Newsreader',serif;}
  .step h3{font-size:16px;font-weight:600;margin:0 0 8px;}
  .step p{font-size:13.5px;line-height:1.55;color:${mkCharcoalSoft};margin:0;}

  /* Final CTA */
  .final-outer{background:${mkCharcoal};padding:90px 32px;}
  .final-card{max-width:900px;margin:0 auto;border-radius:32px;padding:80px 60px;text-align:center;position:relative;overflow:hidden;background:${mkCream};}
  .final-glow{position:absolute;border-radius:50%;filter:blur(60px);opacity:0.55;z-index:0;}
  .final-content{position:relative;z-index:1;}
  .final-card h2{font-family:'Newsreader',serif;font-size:38px;font-weight:500;max-width:560px;margin:0 auto 18px;line-height:1.2;}
  .final-card h2 em{display:block;font-style:italic;font-weight:400;}
  .final-card p{color:${mkCharcoalSoft};font-size:15px;max-width:480px;margin:0 auto 32px;}
  .final-cta-row{display:flex;justify-content:center;gap:24px;flex-wrap:wrap;align-items:center;margin-bottom:16px;}
  .final-link{color:${mkCharcoal};font-size:14px;text-decoration:underline;align-self:center;}

  /* Shared eyebrow/microcopy/btn — mockup's global .eyebrow/.microcopy/.btn,
     kept as classes (rather than inline per-instance) since they're reused
     across every rebuilt section here, same as the mockup. */
  .mk-eyebrow{font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${mkCharcoalSoft};margin-bottom:14px;}
  .mk-microcopy{font-size:13px;color:${mkCharcoalSoft};}
  .mk-btn{background:${mkCharcoal};color:${mkCream};border:none;border-radius:999px;padding:11px 20px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Inter',var(--font-inter),sans-serif;}

  @media(max-width:860px){
    .hero-inner{grid-template-columns:1fr;}
    .bento{grid-template-columns:1fr;}
    .bento-row3{grid-template-columns:1fr;}
    .how-steps{grid-template-columns:1fr;}
    .compare{grid-template-columns:1fr;}
    .hero h1{font-size:38px;}
    .hero-blob-wrap{margin-top:20px;}
    .gap-card{max-width:480px;margin:0 auto;background:${mkCream};border:1px solid ${mkLine};border-radius:20px;padding:26px 8px 22px;}
    .gap-inner{flex-direction:row;gap:0;align-items:stretch;}
    .gap-point{width:auto;flex:1 1 0;padding-top:0;}
    .gap-point.start{border-right:1px solid ${mkLine};padding-right:14px;}
    .gap-point.end{padding-left:14px;}
    .gap-blob{display:none;}
    .gap-label{display:block;font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:${mkCharcoalSoft};opacity:0.65;margin-bottom:8px;}
    .gap-num{font-size:30px;}
    .gap-cap{font-size:12px;max-width:none;}
    .gap-point.end .gap-cap{display:none;}
    .gap-track-wrap{display:none;}
    .final-card{padding:56px 28px;}
  }
  @media(max-width:640px){
    .hero{padding:56px 20px 40px;}
    .hero p{max-width:100%;}
    .gap-section{padding:48px 20px 60px;}
    .bento-section{padding:28px 0 60px;}
    .usp-section{padding:10px 0 60px;}
    .bento-card{padding:22px;}
    .demo-wrap{padding:0 20px 60px;}
    .demo{padding:12px 4px 0;}
    .how{padding:10px 20px 60px;}
    .step{padding:22px 18px;}
    .final-outer{padding:56px 20px;}
    .final-card h2{font-size:30px;}
    .final-card p{font-size:14px;}
    .compare-card{padding:20px;}
    .branch-flow{font-size:12px;gap:8px;}
    .branch-node{padding:7px 12px;}
  }
`

// ─── HeroBlobs ────────────────────────────────────────────────────────────────
// Static 4-blob composition (Deliberate active + 3 fixed satellites,
// continuously wobbling, never swapping which one is "active") — matches
// reference/bearing-landing-v6_2.html exactly. Renders as JSX with refs for
// the per-frame `d` update (InteractiveCluster's pattern on the report page),
// not the mockup's own raw document.createElementNS tree-building.
//
// Sizing: the mockup's .hero-blob-wrap is `width:100%;aspect-ratio:520/500`
// — it scales fluidly with its grid column at any viewport width, no JS or
// transform hackery needed. (Previous version used a fixed 520x500px box
// plus a hand-tuned transform:scale() at two breakpoints — replaced, since
// aspect-ratio is what the mockup actually does and handles every width,
// not just the two breakpoints that were hand-tuned before.)
const HERO_VW = 520, HERO_VH = 500
const HERO_TRAITS = [
  { word: 'Deliberate', hueOff: 0,  cx: 270, cy: 245, r: 140, active: true  },
  { word: 'Autonomous', hueOff: 5,  cx: 392, cy: 75,  r: 80,  active: false },
  { word: 'Reflective', hueOff: 10, cx: 105, cy: 360, r: 68,  active: false },
  { word: 'Durable',    hueOff: 20, cx: 378, cy: 385, r: 64,  active: false },
] as const

function HeroBlobs() {
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({})
  const wrapRef = useRef<HTMLDivElement>(null)
  const items = useMemo(() => HERO_TRAITS.map(tr => ({
    ...tr,
    hue: sharedUserCuratedHue(SHARED_USER_SEED, tr.hueOff),
    profile: sharedBuildPointMotionProfile(sharedHashSeed(tr.word + '-hero-shape'), 9),
  })), [])

  useBlobAnimation(t => {
    items.forEach(b => {
      pathRefs.current[b.word]?.setAttribute('d', sharedGenerateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, t))
    })
  }, [items], wrapRef)

  return (
    <div className="hero-blob-wrap" ref={wrapRef}>
      <svg viewBox={`0 0 ${HERO_VW} ${HERO_VH}`} width="100%" height="100%" style={{ overflow: 'visible', position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <filter id="hero-blob-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          {items.map(b => (
            <radialGradient key={b.word} id={`hero-grad-${b.word}`} cx="45%" cy="40%" r="70%">
              {blobGradientStops(b.hue, b.active).map((s, i) => (
                <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </radialGradient>
          ))}
        </defs>
        {items.map(b => (
          <path
            key={b.word}
            ref={el => { pathRefs.current[b.word] = el }}
            fill={`url(#hero-grad-${b.word})`}
            filter="url(#hero-blob-blur)"
            d={sharedGenerateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, 0)}
          />
        ))}
      </svg>
      {items.map(b => (
        <div
          key={b.word}
          style={{
            position: 'absolute',
            left: `${(b.cx / HERO_VW) * 100}%`,
            top: `${(b.cy / HERO_VH) * 100}%`,
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            ...(b.active
              ? { fontFamily: serif, fontStyle: 'italic' as const, fontWeight: 600, fontSize: 30, color: `hsl(${b.hue},45%,24%)` }
              : { fontFamily: sans, fontSize: 13, fontWeight: 500, color: 'rgba(28,28,26,0.65)' }),
          }}
        >
          {b.word}
        </div>
      ))}
    </div>
  )
}

// ─── BentoCluster ─────────────────────────────────────────────────────────────
// Converted to JSX + refs (see HeroBlobs comment) and switched to the shared
// lib/blobs.ts primitives. Data/positions unchanged — already matched the
// mockup exactly.
const BENTO_CLUSTER_VW = 500, BENTO_CLUSTER_VH = 320
const BENTO_CLUSTER_TRAITS = [
  { word: 'Deliberate', hueOff: 0,  cx: 250, cy: 160, r: 112, active: true  },
  { word: 'Autonomous', hueOff: 5,  cx: 102, cy: 118, r: 72,  active: false },
  { word: 'Reflective', hueOff: 10, cx: 390, cy: 105, r: 66,  active: false },
  { word: 'Durable',    hueOff: 20, cx: 108, cy: 235, r: 62,  active: false },
  { word: 'Selective',  hueOff: 35, cx: 385, cy: 228, r: 58,  active: false },
] as const

function BentoCluster() {
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({})
  const wrapRef = useRef<HTMLDivElement>(null)
  const items = useMemo(() => BENTO_CLUSTER_TRAITS.map(tr => ({
    ...tr,
    hue: sharedUserCuratedHue(SHARED_USER_SEED, tr.hueOff),
    profile: sharedBuildPointMotionProfile(sharedHashSeed(tr.word + '-shape'), 9),
  })), [])

  useBlobAnimation(t => {
    items.forEach(b => pathRefs.current[b.word]?.setAttribute('d', sharedGenerateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, t)))
  }, [items], wrapRef)

  return (
    <div style={{ position: 'absolute', inset: 0 }} ref={wrapRef}>
      <svg viewBox={`0 0 ${BENTO_CLUSTER_VW} ${BENTO_CLUSTER_VH}`} width="100%" height="100%" style={{ overflow: 'visible', position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <filter id="bento-cluster-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          {items.map(b => (
            <radialGradient key={b.word} id={`bento-cluster-grad-${b.word}`} cx="45%" cy="40%" r="70%">
              {blobGradientStops(b.hue, b.active).map((s, i) => (
                <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </radialGradient>
          ))}
        </defs>
        {items.map(b => (
          <path
            key={b.word}
            ref={el => { pathRefs.current[b.word] = el }}
            fill={`url(#bento-cluster-grad-${b.word})`}
            filter="url(#bento-cluster-blur)"
            d={sharedGenerateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.3, 0)}
          />
        ))}
      </svg>
      {items.map(b => (
        <div
          key={b.word}
          style={{
            position: 'absolute',
            left: `${(b.cx / BENTO_CLUSTER_VW) * 100}%`,
            top: `${(b.cy / BENTO_CLUSTER_VH) * 100}%`,
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
            ...(b.active
              ? { fontFamily: serif, fontStyle: 'italic' as const, fontSize: 22, color: `hsl(${b.hue},45%,24%)` }
              : { fontFamily: sans, fontSize: 12.5, fontWeight: 500, color: 'rgba(28,28,26,0.58)' }),
          }}
        >
          {b.word}
        </div>
      ))}
    </div>
  )
}

// ─── OrbitVisual ──────────────────────────────────────────────────────────────
// Converted to JSX + refs and the shared lib/blobs.ts primitives, same as
// BentoCluster above. Data/positions unchanged.
const ORBIT_VW = 380, ORBIT_VH = 160
const ORBIT_CX = ORBIT_VW * 0.48, ORBIT_CY = ORBIT_VH * 0.52
const ORBIT_ENV = [
  { word: 'Autonomy',  angle: -0.6, dist: 108, r: 46, hueOff: 5  },
  { word: 'Async',     angle: 2.65, dist: 100, r: 42, hueOff: 10 },
  { word: 'Deep work', angle: 0.35, dist: 106, r: 44, hueOff: 15 },
] as const

function OrbitVisual() {
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({})
  const youPathRef = useRef<SVGPathElement | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const envItems = useMemo(() => ORBIT_ENV.map(e => {
    const hue = sharedUserCuratedHue(SHARED_USER_SEED, e.hueOff)
    const profile = sharedBuildPointMotionProfile(sharedHashSeed(e.word + '-env'), 8)
    const cx = ORBIT_CX + Math.cos(e.angle) * e.dist
    const cy = ORBIT_CY + Math.sin(e.angle) * e.dist * 0.65
    return { ...e, hue, profile, cx, cy }
  }), [])
  const youHue = useMemo(() => sharedUserCuratedHue(SHARED_USER_SEED, 0), [])
  const youProfile = useMemo(() => sharedBuildPointMotionProfile(sharedHashSeed('you-centre'), 8), [])

  useBlobAnimation(t => {
    envItems.forEach(b => pathRefs.current[b.word]?.setAttribute('d', sharedGenerateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.28, t)))
    youPathRef.current?.setAttribute('d', sharedGenerateAnimatedBlobPath(ORBIT_CX, ORBIT_CY, 20, youProfile, 0.25, t))
  }, [envItems, youProfile], wrapRef)

  return (
    <div style={{ position: 'absolute', inset: 0 }} ref={wrapRef}>
      <svg viewBox={`0 0 ${ORBIT_VW} ${ORBIT_VH}`} width="100%" height="100%" style={{ overflow: 'visible', position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <filter id="bento-orbit-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          {envItems.map((b, i) => (
            <radialGradient key={b.word} id={`orbit-grad-${i}`} cx="45%" cy="40%" r="70%">
              {blobGradientStops(b.hue, false).map((s, j) => (
                <stop key={j} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </radialGradient>
          ))}
          <radialGradient id="orbit-grad-you" cx="45%" cy="40%" r="70%">
            {blobGradientStops(youHue, true).map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
            ))}
          </radialGradient>
        </defs>
        {envItems.map((b, i) => (
          <path
            key={b.word}
            ref={el => { pathRefs.current[b.word] = el }}
            fill={`url(#orbit-grad-${i})`}
            filter="url(#bento-orbit-blur)"
            d={sharedGenerateAnimatedBlobPath(b.cx, b.cy, b.r, b.profile, 0.28, 0)}
          />
        ))}
        <path
          ref={youPathRef}
          fill="url(#orbit-grad-you)"
          filter="url(#bento-orbit-blur)"
          d={sharedGenerateAnimatedBlobPath(ORBIT_CX, ORBIT_CY, 20, youProfile, 0.25, 0)}
        />
      </svg>
      {envItems.map(b => (
        <div
          key={b.word}
          style={{
            position: 'absolute',
            left: `${(b.cx / ORBIT_VW) * 100}%`,
            top: `${(b.cy / ORBIT_VH) * 100}%`,
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
            fontFamily: sans, fontSize: 13, fontWeight: 400, color: 'rgba(28,28,26,0.65)',
          }}
        >
          {b.word}
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: `${(ORBIT_CX / ORBIT_VW) * 100}%`,
          top: `${(ORBIT_CY / ORBIT_VH) * 100}%`,
          transform: 'translate(-50%,-50%)',
          pointerEvents: 'none',
          fontFamily: sans, fontSize: 13, fontWeight: 500, color: `hsl(${youHue},45%,24%)`,
        }}
      >
        You
      </div>
    </div>
  )
}

// ─── DemoBlob ─────────────────────────────────────────────────────────────────
// New — the "Watch it happen" demo section's single pattern-reveal blob,
// ported from the mockup's setupPatternBlob()/patternBlobTick(). Same JSX +
// refs pattern as the other blob components above.
function DemoBlob() {
  const pathRef = useRef<SVGPathElement | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const hue = useMemo(() => sharedUserCuratedHue(SHARED_USER_SEED, 0), [])
  const profile = useMemo(() => sharedBuildPointMotionProfile(sharedHashSeed('Deliberate-shape'), 9), [])

  useBlobAnimation(t => {
    pathRef.current?.setAttribute('d', sharedGenerateAnimatedBlobPath(110, 110, 78, profile, 0.3, t))
  }, [profile], wrapRef)

  return (
    <div ref={wrapRef} style={{ width: 190, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px auto 22px', position: 'relative' }}>
      {/* Fires once on reveal in the real assessment flow; the landing page
          has no reveal moment to key off, so it loops (matches the mockup's
          own note on this same tradeoff). Reuses the app's existing global
          pulseRing keyframe (globals.css) rather than the mockup's near-
          identical inline one, for visual consistency with the same ring
          used on the assessment page's real pattern-reveal moment. */}
      <div style={{
        position: 'absolute', inset: 6, borderRadius: '50%',
        border: '1px solid hsl(8,50%,65%)', opacity: 0.5,
        animation: 'pulseRing 2.4s ease-out infinite',
      }} />
      <svg viewBox="0 0 220 220" width="220" height="220" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="demo-blob-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <radialGradient id="demo-blob-grad" cx="45%" cy="40%" r="70%">
            {blobGradientStops(hue, true).map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
            ))}
          </radialGradient>
        </defs>
        <path ref={pathRef} fill="url(#demo-blob-grad)" filter="url(#demo-blob-blur)" d={sharedGenerateAnimatedBlobPath(110, 110, 78, profile, 0.3, 0)} />
      </svg>
      <span style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 5, pointerEvents: 'none', whiteSpace: 'nowrap',
        fontFamily: serif, fontStyle: 'italic', fontWeight: 600, fontSize: 30,
        color: `hsl(${hue},45%,24%)`,
      }}>
        Deliberate
      </span>
    </div>
  )
}

// ─── ConnectVisual ────────────────────────────────────────────────────────────
function ConnectVisual() {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const svg = ref.current; if (!svg) return
    // Strict Mode double-invokes effects in dev (mount → cleanup → mount),
    // and this effect builds its whole visual with raw appendChild calls —
    // without clearing first, the second invocation left stale duplicate
    // circles/text sitting in the SVG (only the second copy ever got a live
    // rAF task after the first's cleanup unregistered it, so the leftover
    // set was invisible in production but broke anything that queried the
    // SVG's children, e.g. re-verifying this animation after the RAF
    // consolidation below).
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    const VW = 380, VH = 110, r = 38
    const youX = VW * 0.30, themX = VW * 0.66, cy = VH * 0.52
    const hue = 340
    const defs = document.createElementNS(NS, 'defs') as SVGDefsElement
    const glowId = 'cg-' + Math.random().toString(36).slice(2)
    const glowGrad = document.createElementNS(NS, 'radialGradient') as SVGRadialGradientElement
    glowGrad.setAttribute('id', glowId); glowGrad.setAttribute('cx','50%'); glowGrad.setAttribute('cy','50%'); glowGrad.setAttribute('r','50%')
    glowGrad.innerHTML = `<stop offset="0%" stop-color="hsl(${hue},70%,70%)" stop-opacity="0.35"/><stop offset="100%" stop-color="hsl(${hue},60%,80%)" stop-opacity="0"/>`
    defs.appendChild(glowGrad); svg.appendChild(defs)
    const glowC = document.createElementNS(NS, 'circle') as SVGCircleElement
    glowC.setAttribute('cx', String(themX)); glowC.setAttribute('cy', String(cy)); glowC.setAttribute('r', String(r * 1.9)); glowC.setAttribute('fill', `url(#${glowId})`); svg.appendChild(glowC)
    const line = document.createElementNS(NS, 'line') as SVGLineElement
    line.setAttribute('x1', String(youX + r)); line.setAttribute('y1', String(cy)); line.setAttribute('x2', String(themX - r)); line.setAttribute('y2', String(cy))
    line.setAttribute('stroke', 'rgba(28,28,26,0.15)'); line.setAttribute('stroke-width', '1.5'); line.setAttribute('stroke-dasharray', '4,4'); svg.appendChild(line)
    const dashed = document.createElementNS(NS, 'circle') as SVGCircleElement
    dashed.setAttribute('cx', String(themX)); dashed.setAttribute('cy', String(cy)); dashed.setAttribute('r', String(r))
    dashed.setAttribute('fill', `hsl(${hue},65%,90%)`); dashed.setAttribute('fill-opacity', '0.25')
    dashed.setAttribute('stroke', `hsl(${hue},60%,65%)`); dashed.setAttribute('stroke-width', '1.5'); dashed.setAttribute('stroke-dasharray', '5,4'); svg.appendChild(dashed)
    const youC = document.createElementNS(NS, 'circle') as SVGCircleElement
    youC.setAttribute('cx', String(youX)); youC.setAttribute('cy', String(cy)); youC.setAttribute('r', String(r)); youC.setAttribute('fill', '#2A2720'); svg.appendChild(youC)
    const youT = document.createElementNS(NS, 'text') as SVGTextElement
    youT.setAttribute('x', String(youX)); youT.setAttribute('y', String(cy + 4)); youT.setAttribute('text-anchor', 'middle')
    youT.setAttribute('font-family', 'Inter,sans-serif'); youT.setAttribute('font-size', '11'); youT.setAttribute('font-weight', '600'); youT.setAttribute('fill', 'rgba(245,242,235,0.9)')
    youT.textContent = 'You'; svg.appendChild(youT)
    const themT = document.createElementNS(NS, 'text') as SVGTextElement
    themT.setAttribute('x', String(themX)); themT.setAttribute('y', String(cy)); themT.setAttribute('text-anchor', 'middle')
    themT.setAttribute('font-family', 'Inter,sans-serif'); themT.setAttribute('font-size', '12'); themT.setAttribute('fill', `hsl(${hue},50%,38%)`)
    // dy gap widened from the old 10px-font pairing (-6/13) to -7/16 to keep the
    // two lines from crowding at the larger 12px size — verified no overlap or
    // clipping against the r=38 circle at 375px/390px viewports.
    themT.innerHTML = `<tspan x="${themX}" dy="-7">Someone</tspan><tspan x="${themX}" dy="16">close</tspan>`; svg.appendChild(themT)
    // Visibility-gated like every other blob component (see lib/blobs.ts's
    // useBlobAnimation doc comment) — ConnectVisual can't use that hook
    // directly since this whole visual is built with raw DOM calls inside a
    // single mount-time effect, not JSX, so the same IntersectionObserver
    // pattern is inlined here instead.
    let isVisible = true
    let observer: IntersectionObserver | null = null
    if (typeof IntersectionObserver !== 'undefined') {
      isVisible = false
      observer = new IntersectionObserver(
        ([entry]) => { isVisible = entry.isIntersecting },
        { rootMargin: '200px 0px' },
      )
      observer.observe(svg)
    }

    const unreg = registerBlobTask(t => {
      if (!isVisible) return
      glowC.setAttribute('r', String(r * 1.9 * (1 + Math.sin(t * 1.2) * 0.08)))
    })
    return () => { unreg(); observer?.disconnect() }
  }, [])
  return <svg ref={ref} viewBox="0 0 380 110" width="100%" height="100%" style={{ overflow:'visible' }} />
}


// ─── Landing Page ──────────────────────────────────────────────────────────────
export default function LandingPageClient() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [welcomeBack, setWelcomeBack] = useState(false)
  // Started-but-unfinished-assessment detection for the hero CTA text swap.
  // Reuses the exact same known_session localStorage shape (responses/
  // patternContents) SiteNav.tsx's readSessionInfo() already checks for its
  // own nav CTA — hasResponses && !hasPatterns means they've answered some
  // questions but haven't hit a pattern reveal yet. Not a new detection
  // mechanism, just the same existing one applied to this button too.
  const [startedUnfinished, setStartedUnfinished] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        try {
          const raw = localStorage.getItem('known_session')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed.patternContents) && parsed.patternContents.length > 0) {
              router.push('/report'); return
            }
          }
        } catch {}
        router.push('/assessment'); return
      }
      try {
        const raw = localStorage.getItem('known_session')
        if (raw) {
          const parsed = JSON.parse(raw)
          const hasResponses = Array.isArray(parsed.responses) && parsed.responses.length > 0
          const hasPatterns = Array.isArray(parsed.patternContents) && parsed.patternContents.length > 0
          if (hasPatterns) setWelcomeBack(true)
          else if (hasResponses) setStartedUnfinished(true)
        }
      } catch {}
      setReady(true)
    })
  }, [router])

  async function handleMagicLink() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(true); setTimeout(() => setEmailError(false), 1200); return
    }
    setEmailLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      setEmailSent(true)
    } catch {
      setEmailError(true); setTimeout(() => setEmailError(false), 1200)
    } finally { setEmailLoading(false) }
  }

  function handleStartFresh() {
    localStorage.removeItem('known_session')
    localStorage.removeItem('known_pending_session_id')
    router.push('/onboarding')
  }

  if (!ready) return <div style={{ minHeight:'100vh', background:mkCream }} />

  return (
    <>
      <style>{landingCSS}</style>
      <div style={{ background:mkCream, color:mkCharcoal, fontFamily:sans }}>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        {/* No min-height:100vh / flex-centering — the mockup's .hero is just
            naturally-sized padding, not a full-viewport hero moment.
            Confirmed with the user before dropping the old full-screen
            behavior, since it's a real visible change, not just styling. */}
        <section className="hero">
          <div className="hero-inner">
            <div>
              <h1>You know something&apos;s off.<br /><em>You don&apos;t know what.</em></h1>
              <p>A 15-minute assessment that surfaces what&apos;s actually driving you. Your first 5 patterns are free — no account needed.</p>
              {welcomeBack ? (
                <div>
                  <p style={{ fontFamily:sans, fontSize:13, color:mkCharcoalSoft, marginBottom:14 }}>
                    Welcome back — pick up where you left off.
                  </p>
                  {emailSent ? (
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#3D6B5C', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'blobReveal 0.35s ease both',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="#F7F4ED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p style={{ fontSize:14, color:mkCharcoalSoft, lineHeight:1.6, margin:0 }}>Check your email for the sign-in link.</p>
                    </div>
                  ) : (
                    <div style={{ display:'flex', gap:10, maxWidth:440 }}>
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleMagicLink() }}
                        placeholder="Your email address"
                        style={{ flex:1, padding:'12px 16px', borderRadius:10, border:`1.5px solid ${emailError ? 'hsl(8,60%,55%)' : 'rgba(38,36,32,0.2)'}`, fontSize:14, fontFamily:sans, background:'white', outline:'none', color:mkCharcoal }}
                      />
                      <button className="mk-btn" onClick={handleMagicLink} disabled={emailLoading} style={{ padding:'12px 20px', fontSize:14, whiteSpace:'nowrap', opacity:emailLoading ? 0.6 : 1 }}>
                        {emailLoading ? 'Sending…' : 'Send me a link'}
                      </button>
                    </div>
                  )}
                  <button onClick={handleStartFresh} style={{ marginTop:14, background:'none', border:'none', cursor:'pointer', fontFamily:sans, fontSize:13, color:mkCharcoalSoft, padding:0, textDecoration:'underline', textUnderlineOffset:3 }}>
                    or start fresh
                  </button>
                </div>
              ) : (
                <div className="hero-cta-row">
                  {/* startedUnfinished: same button, same position, just the
                      text/href swap described in the file header — not a new
                      UI element. */}
                  <Link href={startedUnfinished ? '/assessment' : '/onboarding'}>
                    <button className="mk-btn">{startedUnfinished ? 'Continue your assessment →' : 'Discover yourself →'}</button>
                  </Link>
                  <span className="mk-microcopy">12–15 min &nbsp;·&nbsp; nothing to install</span>
                </div>
              )}
            </div>
            <HeroBlobs />
          </div>
        </section>

        {/* ── GAP / STAT SECTION ("12 yrs" vs "15 min") ────────────── */}
        {/* Fully replaces the old dark 3-stat FactsBlobs section — different
            layout, different message, different (light) background. No
            animated blob math here, just two static blurred circles per the
            mockup's .gap-blob (plain div + filter:blur, not the organic
            blob-path shapes used elsewhere on this page). */}
        <section className="gap-section">
          <div className="gap-card">
            <div className="gap-inner">
              <div className="gap-point start">
                <div className="gap-blob" style={{ background: mkCoral }} />
                <span className="gap-label">Old way</span>
                <div className="gap-num" style={{ fontFamily: serif }}>12 yrs</div>
                <div className="gap-cap">average time to real clarity on a stuck pattern</div>
                <span className="gap-src">WHO Mental Health Atlas, 2022</span>
              </div>
              <div className="gap-track-wrap">
                <div className="gap-track-label">most people never close this gap</div>
                <div className="gap-track" />
              </div>
              <div className="gap-point end">
                <div className="gap-blob" style={{ background: mkTeal }} />
                <span className="gap-label">With Bearing</span>
                <div className="gap-num" style={{ fontFamily: serif, color: mkCharcoal }}>15 min</div>
                <div className="gap-cap">with Bearing</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BENTO GRID ("Not just who you are...") ───────────────── */}
        <section className="bento-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>What you get</div>
              <h2>Not just who you are.<br />What to do about it.</h2>
            </div>

            <div className="bento">
              {/* Cluster card */}
              <div className="bento-card" style={{ display:'flex', flexDirection:'column' }}>
                <div className="mk-eyebrow">Who you are</div>
                <h3>Your trait cluster, made visible</h3>
                <p>Not a label. An organic map of how your traits relate and reinforce each other.</p>
                <div className="bento-cluster-canvas-wrap">
                  <BentoCluster />
                </div>
              </div>

              {/* Right column */}
              <div className="bento-col">
                <div className="bento-card">
                  <div className="mk-eyebrow">Where you thrive</div>
                  <h3>Your ideal environment</h3>
                  <div className="bento-orbit-wrap">
                    <OrbitVisual />
                  </div>
                  <p style={{ marginTop:16 }}>The settings, structures, and contexts where you naturally do your best work.</p>
                </div>
                <div className="bento-card">
                  <div className="mk-eyebrow">How you connect</div>
                  <h3>Relationship patterns</h3>
                  <div className="bento-connect-wrap">
                    <ConnectVisual />
                  </div>
                  <p style={{ marginTop:14 }}>How you show up in relationships — what energises you, what drains you, how others experience you.</p>
                </div>
              </div>
            </div>

            <div className="bento-row3">
              <div className="bento-card">
                <div className="mk-eyebrow">What gives you energy</div>
                <h3>The fuel behind your best days</h3>
                <p>Specific activities, environments, and interactions that restore rather than deplete you.</p>
              </div>
              <div className="bento-card dark">
                <div className="badge-pill">Free to start</div>
                <h3>No consultant. No credit card to begin.</h3>
                <p>The kind of insight that used to cost thousands in coaching sessions. Your first 5 patterns are free, private, and instant — unlock the full picture later for a one-time payment.</p>
              </div>
              <div className="bento-card">
                <div className="mk-eyebrow">Actionable insights</div>
                <h3>Built to use, not just read</h3>
                <p>Every dimension comes with concrete, specific implications — for work, for relationships, for decisions.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── USP COMPARE SECTION ("It's not a label. It's a plan.") ── */}
        {/* Replaces the old "Report Preview" browser-frame mockup section,
            which had no counterpart anywhere in the mockup — removed per
            the user's explicit confirmation, not silently dropped. */}
        <section className="usp-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Why it&apos;s different</div>
              <h2>It&apos;s not a label. It&apos;s a plan.</h2>
              <p>Generic tests hand you four letters and stop there. Bearing reads your answers and tells you what to actually do next — and where it&apos;s worth going deeper.</p>
            </div>

            <div className="compare">
              <div className="compare-card muted">
                <div className="compare-label">A typical result</div>
                <div className="compare-title" style={{ fontFamily:serif }}>&ldquo;INTJ — The Architect&rdquo;</div>
                <p>A type. Interesting to read. Nothing to act on.</p>
              </div>
              <div className="compare-vs">vs</div>
              <div className="compare-card highlight">
                <div className="compare-label">Your Bearing insight</div>
                <div className="compare-title" style={{ fontFamily:serif }}>&ldquo;You&apos;re drained by open-plan noise before you&apos;ve named it as the problem.&rdquo;</div>
                <p>Block two hours of async deep work before your team&apos;s stand-up — the first change most people in your cluster make.</p>
              </div>
            </div>

            <div className="branch-flow">
              <span className="branch-node">Your core results</span>
              <span className="branch-arrow">→</span>
              <span className="branch-node">strong pattern in <strong>Energy</strong></span>
              <span className="branch-arrow">→</span>
              <span className="branch-node pill">we suggest the Energy assessment</span>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS (3-step) ────────────────────────────────── */}
        {/* id="how-it-works" kept even though the mockup's .how section has
            no id — SiteFooter.tsx (untouched, out of scope) links to
            /#how-it-works and would silently break without it. */}
        <section id="how-it-works" className="how">
          <div className="section-head">
            <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>How it works</div>
            <h2>Three steps. One honest picture.</h2>
          </div>
          <div className="how-steps">
            {[
              { n:'1', title:'Answer naturally',      desc:'60–80 real-scenario questions, not abstract sliders. Your first trait shows up after about 15 of them.' },
              { n:'2', title:'See if it resonates',    desc:"If it doesn't feel right, stop — no cost, no account. If it does, keep going for the full picture." },
              { n:'3', title:'Get your plan',          desc:'Six dimensions and concrete next steps, plus a recommendation on which branch to explore deeper — unlocked for a one-time payment.' },
            ].map(step => (
              <div key={step.n} className="step">
                <div className="step-mark">{step.n}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── DEMO ("Watch it happen") ─────────────────────────────── */}
        {/* Replaces the old "Progressive Reveal" 3-card section — same slot,
            same underlying message (results appear early), now a concrete
            visual demo instead of an abstract 3-card explainer. Confirmed
            with the user before replacing rather than keeping both.
            Two nested wrappers, matching the mockup exactly: outer
            .demo-wrap (plain div) sets the horizontal page padding, inner
            .demo (an actual <section>) adds its own smaller top padding —
            not one flattened padding value. */}
        <div className="demo-wrap">
          <section className="demo">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Watch it happen</div>
              <h2>We don&apos;t make you wait 80 questions to tell you anything.</h2>
              <p>Your first trait appears while you&apos;re still mid-assessment. See if it resonates before you commit to the rest.</p>
            </div>

            <div className="app-card">
              <p className="progress-trace">28 responses · pattern identified</p>
              <p className="reveal-eyebrow">Your first pattern</p>
              <DemoBlob />
              <p className="reveal-line">
                &ldquo;You don&apos;t rush toward conclusions. Your responses showed a pattern of holding space before committing.&rdquo;
              </p>
              <p className="reveal-sub">This is the strongest signal so far — there&apos;s more underneath it.</p>
            </div>

            <Link href="/onboarding">
              <button className="mk-btn">Discover yourself →</button>
            </Link>
          </section>
        </div>

        {/* ── FINAL CTA ─────────────────────────────────────────────── */}
        {/* CtaHalos (organic animated blob-path shapes) replaced with the
            mockup's .final-glow — two static blurred circles, no animation
            at all. Not an oversight: the mockup genuinely doesn't animate
            this one, unlike every other blob visual on the page. */}
        <section className="final-outer">
          <div className="final-card">
            <div className="final-glow" style={{ width:280, height:280, background:mkPeriwinkle, top:-80, left:-80 }} />
            <div className="final-glow" style={{ width:260, height:260, background:mkRose, bottom:-90, right:-70 }} />
            <div className="final-content">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Free preview · Private · 15 minutes</div>
              <h2>You already sense<em>there&apos;s more to know.</em></h2>
              <p>Most people spend years trying to understand themselves. Bearing gives you that map in 15 minutes — grounded in research, not guesswork.</p>
              <div className="final-cta-row">
                <Link href="/onboarding">
                  <button className="mk-btn">Start your report — it&apos;s free</button>
                </Link>
                <Link href="/report/sample" className="final-link">
                  See an example report
                </Link>
              </div>
              <span className="mk-microcopy">No account for your first 5 · No credit card to start</span>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
