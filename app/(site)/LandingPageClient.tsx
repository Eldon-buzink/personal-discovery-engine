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

  /* Problem section — heading left-aligned above three .step cards (STEP A
     replaces the earlier two-column divider-list version; .problem-grid/
     .problem-list are gone, nothing else references them). .problem-heading
     kept as-is (copies .section-head h2's type values without its
     text-align:center) since it's reused unchanged. .problem-visual is the
     only new rule: a small fixed-height, relatively-positioned box so the
     three different static visuals (blurred circles, blob+dashed ring, pill)
     align consistently above each card's eyebrow — sizing/position only, no
     new colors (the visuals themselves reuse .final-glow's blur technique,
     .branch-node's pill, and mkRose/mkTeal/mkPeriwinkle from the existing
     palette). */
  .problem-section{padding:20px 32px 90px;}
  .problem-heading{font-family:'Newsreader',serif;font-size:34px;font-weight:500;line-height:1.2;margin:0;text-align:left;}
  /* Root cause of the 1280px heading/grid misalignment: .how-steps (below,
     shared with How it works) carries its own max-width:1000px + margin:0
     auto, designed for sitting directly inside .how (no width cap of its
     own). Nested inside .wrap here, .wrap already caps + centers the content
     area (1120px total, 1056px inside its 32px padding) — .how-steps then
     re-centers its narrower 1000px box a second time, indenting it ~28px
     from .wrap's edge while .problem-heading (no max-width) fills the full
     1056px and starts flush. Scoped to .problem-section only, so How it
     works' own .how-steps usage (not inside .wrap) is untouched. */
  .problem-section .how-steps{max-width:none;margin:0;}
  .problem-visual{position:relative;height:56px;display:flex;align-items:center;margin-bottom:18px;}

  /* Bento grid */
  .bento-section{padding:40px 0 90px;}
  .bento{display:grid;grid-template-columns:1.35fr 1fr;gap:22px;max-width:1120px;margin:0 auto 22px;}
  .bento-card{background:${mkCard};border:1px solid ${mkLine};border-radius:24px;padding:34px;overflow:visible;}
  .bento-card h3{font-family:'Newsreader',serif;font-size:24px;font-weight:500;margin:0 0 8px;line-height:1.2;}
  .bento-card p{font-size:16px;color:${mkCharcoalSoft};line-height:1.6;margin:0;}
  .bento-col{display:flex;flex-direction:column;gap:22px;}
  .bento-row3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;max-width:1120px;margin:0 auto;}
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

  /* .blob-stage/.ring-pulse: pre-existing, already unused before the demo
     section was removed here (DemoBlob's own markup uses inline styles, not
     these classes) — left as-is, not part of this deletion's scope. */
  .blob-stage{width:190px;height:170px;display:flex;align-items:center;justify-content:center;margin:16px auto 22px;position:relative;}
  .ring-pulse{position:absolute;inset:6px;border-radius:50%;border:1px solid hsl(8,50%,65%);opacity:0.5;animation:pulseRing 2.4s ease-out infinite;}

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
    .final-card{padding:56px 28px;}
  }
  @media(max-width:640px){
    /* Top padding was 56px — exactly NAV_H (the fixed nav's own height),
       so the headline had zero breathing room below the nav, not just a
       tight gap. Matches desktop's 88px instead, which already has a
       proven-good ~32px gap above the nav. */
    .hero{padding:88px 20px 40px;}
    .hero p{max-width:100%;}
    .problem-section{padding:10px 20px 60px;}
    .bento-section{padding:28px 0 60px;}
    .usp-section{padding:10px 0 60px;}
    .bento-card{padding:22px;}
    .how{padding:10px 20px 60px;}
    .step{padding:22px 18px;}
    .final-outer{padding:56px 20px;}
    .final-card h2{font-size:30px;}
    .final-card p{font-size:14px;}
    .compare-card{padding:20px;}
    /* Chip flow stacked vertically below the mobile breakpoint — flex-wrap
       was orphaning the second arrow at the end of row 1 and dropping the
       teal chip to its own row. Reusing the existing .branch-flow/
       .branch-arrow classes, not new ones; arrows rotated to point down. */
    .branch-flow{font-size:12px;gap:8px;flex-direction:column;}
    .branch-arrow{display:inline-block;transform:rotate(90deg);}
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
// Autonomous -> Curious (Adventurousness mid) and Durable -> Warm (Friendliness
// mid), verified against lib/known/scoring.ts TRAIT_WORDS — landing-copy-deck.md
// resolves the two previously-invented words. Deliberate (Cautiousness mid)
// and Reflective (Self-Consciousness mid) were already real, unchanged.
// Position/size/hue (cx/cy/r/hueOff) unchanged for all four; only `word`
// changed for these two. Note: each blob's organic wobble profile is seeded
// from its word (sharedBuildPointMotionProfile(sharedHashSeed(tr.word + ...)))
// same as every other blob on this page, so the two renamed blobs will wobble
// with a new (but equally organic) pattern — hue, which is seeded from hueOff
// alone, does not change.
const HERO_TRAITS = [
  { word: 'Deliberate', hueOff: 0,  cx: 270, cy: 245, r: 140, active: true  },
  { word: 'Curious',    hueOff: 5,  cx: 392, cy: 75,  r: 80,  active: false },
  { word: 'Reflective', hueOff: 10, cx: 105, cy: 360, r: 68,  active: false },
  { word: 'Warm',       hueOff: 20, cx: 378, cy: 385, r: 64,  active: false },
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
// Autonomous -> Curious (Adventurousness mid), Durable -> Poised
// (Assertiveness mid), Selective -> Considerate (Altruism mid) — verified
// against lib/known/scoring.ts TRAIT_WORDS. Deliberate (Cautiousness mid)
// and Reflective (Self-Consciousness mid) were already real, unchanged.
// Position/size/hue unchanged; only `word` changed for the three renamed.
const BENTO_CLUSTER_TRAITS = [
  { word: 'Deliberate', hueOff: 0,  cx: 250, cy: 160, r: 112, active: true  },
  { word: 'Curious',    hueOff: 5,  cx: 102, cy: 118, r: 72,  active: false },
  { word: 'Reflective', hueOff: 10, cx: 390, cy: 105, r: 66,  active: false },
  { word: 'Poised',     hueOff: 20, cx: 108, cy: 235, r: 62,  active: false },
  { word: 'Considerate',hueOff: 35, cx: 385, cy: 228, r: 58,  active: false },
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
// Async -> Competence, Deep work -> Structure — the real environment-branch
// dimension labels (DIM_LABELS, app/assessment/environment/page.tsx:54-58).
// Autonomy was already correct. Position/size/hue unchanged.
const ORBIT_ENV = [
  { word: 'Autonomy',   angle: -0.6, dist: 108, r: 46, hueOff: 5  },
  { word: 'Competence', angle: 2.65, dist: 100, r: 42, hueOff: 10 },
  { word: 'Structure',  angle: 0.35, dist: 106, r: 44, hueOff: 15 },
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

// ─── Problem card visuals ───────────────────────────────────────────────────
// Static only — no useBlobAnimation, no RAF, nothing organic. Each reuses an
// existing static technique from elsewhere on this page rather than
// inventing one:
//  - ProblemCirclesVisual: .final-glow's own technique (position:absolute,
//    border-radius:50%, filter:blur, opacity), just smaller and with the
//    blur amount overridden per-instance via inline style (inline style
//    always wins over the class's own blur(60px)). Colors are the existing
//    mkTeal/mkPeriwinkle/mkRose accents, cycled.
//  - ProblemBlobRingVisual: the same blurred-circle technique for the inner
//    "blob", plus a dashed-border circle around it — the same idea as
//    ConnectVisual's dashed "Someone close" node (light fill + dashed
//    stroke), expressed as a plain CSS border since this one doesn't need
//    ConnectVisual's raw-SVG approach.
//  - ProblemPillVisual: .branch-node exactly as already used in the
//    branch-flow chips (not .branch-node.pill, which is reserved on this
//    page for the highlighted/suggested chip — INTJ here represents the
//    generic case, not a highlight).
function ProblemCirclesVisual() {
  const circles = [
    { size: 30, top: 2,  left: 4,  color: mkTeal },
    { size: 20, top: 28, left: 34, color: mkRose },
    { size: 24, top: 0,  left: 44, color: mkPeriwinkle },
    { size: 16, top: 32, left: 4,  color: mkPeriwinkle },
    { size: 18, top: 12, left: 20, color: mkRose },
  ]
  return (
    <div className="problem-visual">
      {circles.map((c, i) => (
        <div
          key={i}
          className="final-glow"
          style={{ width: c.size, height: c.size, top: c.top, left: c.left, background: c.color, filter: 'blur(6px)' }}
        />
      ))}
    </div>
  )
}

function ProblemBlobRingVisual() {
  return (
    <div className="problem-visual">
      <div className="final-glow" style={{ width: 24, height: 24, top: 16, left: 26, background: mkRose, filter: 'blur(5px)' }} />
      <div style={{ position: 'absolute', width: 38, height: 38, top: 9, left: 19, borderRadius: '50%', border: `1.5px dashed ${mkRose}` }} />
    </div>
  )
}

function ProblemPillVisual() {
  return (
    <div className="problem-visual">
      <span className="branch-node">INTJ</span>
    </div>
  )
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
              <h1>Get to know<br /><em>yourself better.</em></h1>
              <p>See the patterns behind how you think, feel and act, and go deeper on how you work, connect and recharge, so your choices fit who you are.</p>
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
                <div>
                  <div className="hero-cta-row">
                    {/* startedUnfinished: same button, same position, just the
                        text/href swap described in the file header — not a new
                        UI element. Arrow removed from "Continue your
                        assessment" so the two states read consistently. */}
                    <Link href={startedUnfinished ? '/assessment' : '/onboarding'}>
                      <button className="mk-btn">{startedUnfinished ? 'Continue your assessment' : 'Start the assessment'}</button>
                    </Link>
                  </div>
                  {/* Moved below the CTA row per the deck's layout note
                      ("small .mk-microcopy line under the CTA row"), not
                      inline beside the button like the old "12-15 min ·
                      nothing to install" text. A <span>, not a <p>: .hero p
                      (font-size:17px, line 60) has higher specificity than
                      .mk-microcopy (element+class beats a single class), so
                      as a <p> this rendered at body size instead of the
                      small-caption size the bento's identical .mk-microcopy
                      note gets. A <span> here isn't targeted by .hero p at
                      all — same fix as leaving this as a <span> the way the
                      final CTA's own .mk-microcopy line already is. Still
                      renders on its own line: it's the sole second child of
                      this wrapping div, after the block-level .hero-cta-row. */}
                  <span className="mk-microcopy" style={{ display: 'block', marginTop: 14 }}>
                    Rate 120 short statements. Your first 5 patterns are free, no account needed. About 15 minutes.
                  </span>
                </div>
              )}
            </div>
            <HeroBlobs />
          </div>
        </section>

        {/* ── PROBLEM ("Sound familiar?") ──────────────────────────── */}
        {/* STEP A: three cards instead of the earlier two-column divider
            list. Heading left-aligned above the grid via the existing
            .problem-heading class; cards reuse .how-steps/.step exactly
            (three columns, one column at <=860px, same as How it works). */}
        <section className="problem-section">
          <div className="wrap">
            <h2 className="problem-heading">Sound familiar?</h2>
            <div className="how-steps" style={{ marginTop: 32 }}>
              <div className="step">
                <ProblemCirclesVisual />
                <div className="mk-eyebrow">NO CLEAR FOCUS</div>
                <div className="compare-title" style={{ fontFamily: serif }}>&ldquo;I reflect a lot, but I still don&apos;t know what to focus on.&rdquo;</div>
              </div>
              <div className="step">
                <ProblemBlobRingVisual />
                <div className="mk-eyebrow">GOING IN CIRCLES</div>
                <div className="compare-title" style={{ fontFamily: serif }}>&ldquo;Every time I think about myself, I land on the same story.&rdquo;</div>
              </div>
              <div className="step">
                <ProblemPillVisual />
                <div className="mk-eyebrow">ONE LABEL</div>
                <div className="compare-title" style={{ fontFamily: serif }}>&ldquo;My result could have been written for anyone.&rdquo;</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BENTO GRID ("Not just who you are...") ───────────────── */}
        <section className="bento-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>What you get</div>
              <h2>See your patterns.<br />Go deeper where it matters.</h2>
            </div>

            <div className="bento">
              {/* Cluster card */}
              <div className="bento-card" style={{ display:'flex', flexDirection:'column' }}>
                <div className="mk-eyebrow">YOUR PATTERNS</div>
                <h3>Your patterns, made visible</h3>
                <p>Each of your 30 facets gets a word and a description, so you see specific patterns instead of one label.</p>
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
                  <p style={{ marginTop:14 }}>Your attachment pattern: how you handle closeness and distance in the relationships that matter most.</p>
                </div>
              </div>
            </div>

            {/* bento-b: full-width single card below the first row, instead
                of .bento-row3's 3-col grid (which would leave 2/3 empty with
                only one card). Reuses .bento-row3 and .bento-card as-is;
                the only change is the column count, overridden inline for
                this one throwaway variant rather than editing the shared
                class. */}
            <div className="bento-row3" style={{ gridTemplateColumns: '1fr' }}>
              <div className="bento-card">
                <div className="mk-eyebrow">What gives you energy</div>
                <h3>The fuel behind your best days</h3>
                <p>Specific activities, environments, and interactions that restore rather than deplete you.</p>
              </div>
            </div>

            <p className="mk-microcopy" style={{ textAlign:'center', marginTop:22 }}>
              Your first 5 patterns are free. The deeper assessments are part of the one-time EUR 49 unlock.
            </p>
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
              <h2>Patterns, not a four-letter type.</h2>
              <p>Journaling and chat tools mostly reflect back what you put in. Bearing starts from the same 120 statements for everyone, in random order, before anything is interpreted.</p>
            </div>

            <div className="compare">
              <div className="compare-card muted">
                <div className="compare-label">A typical result</div>
                <div className="compare-title" style={{ fontFamily:serif }}>&ldquo;INTJ — The Architect&rdquo;</div>
                <p>One label for everything you are.</p>
              </div>
              <div className="compare-vs">vs</div>
              <div className="compare-card highlight">
                <div className="compare-label">An example Bearing pattern</div>
                <div className="compare-title" style={{ fontFamily:serif }}>&ldquo;Your responses showed a pattern of holding space before committing.&rdquo;</div>
                <p>Deliberate. One of 30 facet patterns, each with its own word and description.</p>
              </div>
            </div>

            <div className="branch-flow">
              <span className="branch-node">Your first patterns</span>
              <span className="branch-arrow">→</span>
              <span className="branch-node">a pattern stands out</span>
              <span className="branch-arrow">→</span>
              <span className="branch-node pill">we suggest which assessment to take next</span>
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
