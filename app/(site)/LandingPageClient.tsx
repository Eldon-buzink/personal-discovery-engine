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
import FaqAccordion, { type FaqAccordionItem } from './FaqAccordion'

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

  /* Problem section — heading left-aligned above three .step cards.
     .problem-heading kept as-is (copies .section-head h2's type values
     without its text-align:center) since it's reused unchanged. Each card
     now holds just two plain text elements: .problem-title (copies
     .bento-card h3's type values) and .problem-line (copies .bento-card p's
     type values) — both rendered as <div>, not <h3>/<p>, so the .step h3/
     .step p element+class rules below can't override them (the same
     specificity trap fixed elsewhere on this page). */
  /* Horizontal padding is 0 here, not 32px — .problem-section wraps its
     content in .wrap (below), which already supplies its own 32px
     horizontal padding. A second 32px here doubled the inset to 64px,
     invisible at wide desktop widths (where .wrap hits its own
     max-width:1120px and centers regardless) but visible on mobile, where
     .wrap no longer hits that cap and both paddings stack. Matches
     .bento-section/.usp-section, which never had this extra padding. */
  .problem-section{padding:20px 0 90px;}
  .problem-heading{font-family:'Newsreader',serif;font-size:34px;font-weight:500;line-height:1.2;margin:0;text-align:left;}
  /* Same type values as .section-head p (15px/mkCharcoalSoft/1.6), but
     left-aligned instead of inheriting .section-head's own text-align:center
     — this section's heading has always been left-aligned, unlike every
     other section-head. */
  .problem-subtitle{font-size:15px;color:${mkCharcoalSoft};line-height:1.6;margin:10px 0 0;text-align:left;}
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
  /* Centered text, scoped to .problem-section's own .step cards only — the
     shared .step{text-align:left} (below, used by How it works too) stays
     untouched there. No min-height workaround: card 1's title ("Insight,
     but no focus.") is short enough to fit on one line at every width
     alongside cards 2 and 3, so all three .problem-line elements already
     start at the same y without reserving extra space for a wrap that
     never happens. */
  .problem-section .step{text-align:center;}
  .problem-title{font-family:'Newsreader',serif;font-size:24px;font-weight:500;line-height:1.2;margin:0 0 8px;}
  /* Serif italic, same body color as before (mkCharcoalSoft) — a quote now,
     not plain body copy. */
  .problem-line{font-family:'Newsreader',serif;font-style:italic;font-size:16px;color:${mkCharcoalSoft};line-height:1.6;margin:0;}
  /* 84px, up from 56px (x1.5, matching the visuals themselves) — the
     tallest of the three enlarged visuals (card 1's circles) now bottoms
     out at 72px, so this still clears it with room to spare.
     justify-content:center centers each visual's inner wrapper (see
     ProblemCirclesVisual etc. above) instead of leaving it flush left. */
  .problem-visual{position:relative;height:84px;display:flex;align-items:center;justify-content:center;margin-bottom:18px;}

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
  /* column-gap/row-gap, not the shorthand gap, so the 20px horizontal gap
     between the two cards (and the vs column) doesn't also open up
     unwanted vertical banding between the 3 subgrid rows inside each card
     — that separation comes from .compare-item's own hairline instead.
     grid-template-rows:repeat(3,auto) gives .compare-card's subgrid rows
     (below) 3 explicit tracks to align to, shared by both cards, so row 1
     in the muted card is exactly as tall as row 1 in the highlight card
     (whichever is taller), same for rows 2 and 3. */
  .compare{max-width:900px;margin:0 auto 44px;display:grid;grid-template-columns:1fr auto 1fr;grid-template-rows:repeat(3,auto);column-gap:20px;row-gap:0;align-items:stretch;}
  /* grid-row:1/span 3 + grid-template-rows:subgrid: the card claims all 3
     of .compare's row tracks and hands them straight to its own
     .compare-item children, instead of sizing its own rows independently
     of the other card. */
  .compare-card{grid-row:1/span 3;display:grid;grid-template-rows:subgrid;border-radius:18px;padding:26px;}
  /* No opacity — the muted look comes from the lighter mkCard fill and
     mkLine border against the highlight card's solid mkCharcoal, not from
     translucency. opacity:0.75 here previously diluted the text along with
     the background, dropping label/body contrast against mkCard to ~3.6:1
     (below the 4.5:1 AA minimum for body text) even though their color
     value was already the solid mkCharcoalSoft token — removing it alone
     restores that token's real, solid contrast (~6.4:1). */
  .compare-card.muted{background:${mkCard};border:1px solid ${mkLine};}
  .compare-card.highlight{background:${mkCharcoal};color:${mkCream};}
  /* Each card is now a 3-item list — .compare-item holds one lead+body
     pair and is one subgrid row. Hairline only between items (the
     adjacent-sibling selector), not framing the list's top/bottom edge;
     mkLine is a dark-based translucent color, invisible on the highlight
     card's mkCharcoal background, so that card gets a light-based one. */
  .compare-item{padding:14px 0;}
  .compare-item:first-child{padding-top:0;}
  .compare-item:last-child{padding-bottom:0;}
  .compare-item + .compare-item{border-top:1px solid ${mkLine};}
  .compare-card.highlight .compare-item + .compare-item{border-top-color:rgba(247,244,237,0.15);}
  .compare-card.highlight .mk-eyebrow{color:#B9B4A8;}
  /* 16px/1.6, matching .bento-card p/.problem-line — an existing size/
     line-height pair, not a new one — replacing the previous 13px/1.55. */
  .compare-card p{font-size:16px;line-height:1.6;margin:0;color:${mkCharcoalSoft};}
  .compare-card.highlight p{color:#C9C4B8;}

  /* grid-row:1/span 3, same as .compare-card — otherwise, now that
     .compare has 3 row tracks instead of 1, auto-placement would only put
     "vs" in row 1, not spanning the full height of the cards beside it.
     align-self:center then centers it within that full 3-row span. */
  .compare-vs{grid-row:1/span 3;font-size:13px;color:${mkCharcoalSoft};text-align:center;align-self:center;}

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

  /* Static 5-dot scale (step 1), restored from the earlier /home-v2 build
     (HomeV2Client.tsx's StaticDotScale/.hv2-dotscale*, renamed without the
     hv2- prefix since this file isn't home-v2). Sizes match
     QuestionCard.tsx's own DotScale: dots 20px, connecting line inset 10px
     (half a dot's width) from each end, row-to-labels gap 16px. Colors are
     mk* tokens, not QuestionCard's Tailwind colors — matching size/
     thickness/gaps was the ask, not recoloring. */
  .dotscale{display:flex;flex-direction:column;gap:16px;max-width:220px;margin:16px 0 0;}
  .dotscale-row{position:relative;display:flex;align-items:center;justify-content:space-between;}
  .dotscale-line{position:absolute;left:10px;right:10px;top:50%;transform:translateY(-50%);height:1px;background:${mkLine};}
  .dotscale-dot{position:relative;z-index:1;width:20px;height:20px;border-radius:50%;background:${mkCream};border:2px solid ${mkCharcoalSoft};}
  .dotscale-labels{display:flex;justify-content:space-between;font-size:11px;color:${mkCharcoalSoft};}

  /* Light-background pill (step 3), restored from the earlier /home-v2
     build's .hv2-benefit-pill — itself a recolor of .badge-pill (radius
     999px, padding 5px 12px kept) for a light/cream context, since
     .badge-pill's own translucent-white-on-dark colors are for the dark
     .bento-card.dark it was designed to sit on and would be invisible here.
     Font-size 13px matches .mk-microcopy, not a new value. */
  .step-pill-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;}
  .step-pill{font-size:13px;color:${mkCharcoalSoft};border:1px solid ${mkLine};border-radius:999px;padding:5px 12px;background:${mkCard};}

  /* FAQ — FaqAccordion.tsx (moved from the old /home-v2 build, see that
     file's own comment). .faq-row is a real <button>, not a <div> — its
     type carries no visual styling of its own (buttons don't inherit font/
     color/text-align from a UA stylesheet, and default to their own
     padding/border/background), so all of that is reset/reapplied here.
     .faq-item h3 is just the heading wrapper around that button; margin:0
     keeps it from adding the browser's default h3 spacing.
     Owner-approved exception to reusing only existing spacing values, for
     this section only — the rows were too tall. Row padding 26px 22px ->
     16px 0, question 14.5px->15px, answer 13.5px->15px (both still 600/1.6
     as before), all new values here. .faq-icon's 18px is unchanged (this
     one already matched the ask). Layout is now two columns on desktop —
     .problem-heading (reused as-is) + a left-aligned "FAQ" eyebrow in the
     left column, the accordion capped at 640px in the right column — one
     column, heading above list, at <=860px (same breakpoint every other
     two-column section on this page collapses at). */
  .faq-section{padding:20px 0 90px;}
  .faq-cols{display:grid;grid-template-columns:1fr 640px;column-gap:40px;align-items:start;}
  .faq-item{border-bottom:1px solid ${mkLine};padding:16px 0;}
  .faq-item h3{margin:0;}
  .faq-row{
    display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:44px;
    width:100%;background:none;border:none;padding:0;margin:0;cursor:pointer;
    font:inherit;font-size:15px;font-weight:600;color:${mkCharcoal};text-align:left;
  }
  /* :focus-visible, not :focus — shows the outline for keyboard focus only,
     not on a mouse click, matching how focus rings work everywhere else a
     browser draws one natively. */
  .faq-row:focus-visible{outline:2px solid ${mkCharcoal};outline-offset:2px;}
  .faq-icon{font-size:18px;color:${mkCharcoalSoft};transition:transform 0.25s ease;flex-shrink:0;}
  .faq-body{max-height:0;overflow:hidden;transition:max-height 0.35s ease;}
  .faq-body-inner{padding-top:10px;}
  .faq-body-inner p{font-size:15px;line-height:1.6;color:${mkCharcoalSoft};margin:0 0 6px;text-align:left;}
  @media(prefers-reduced-motion: reduce){
    .faq-body{transition:none;}
  }

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
    .faq-cols{grid-template-columns:1fr;}
    /* grid-row:auto (was 1/span 3) + display:block (was grid/subgrid) on
       both the cards and "vs" — single column now, so nothing should span
       multiple row tracks anymore; without this override the muted card,
       "vs", and highlight card would all try to occupy the same single
       column's rows 1-3 at once and stack on top of each other. */
    .compare{grid-template-columns:1fr;}
    .compare-card{grid-row:auto;display:block;}
    /* .compare's own row-gap:0 (needed for the desktop subgrid, above)
       left "vs" flush against both cards once stacked — 14px top and
       bottom gives it breathing room between them. */
    .compare-vs{grid-row:auto;margin:14px 0;}
    .hero h1{font-size:38px;}
    /* .hero-blob-wrap's own margin-top:20px (removed) stacked on top of
       .hero-inner's grid gap:40px, double-spacing the text column and the
       blob once they're single-column here — the grid's own gap already
       separates them. */
    .final-card{padding:56px 28px;}
  }
  @media(max-width:640px){
    /* Top padding was 56px — exactly NAV_H (the fixed nav's own height),
       so the headline had zero breathing room below the nav, not just a
       tight gap. Matches desktop's 88px instead, which already has a
       proven-good ~32px gap above the nav. */
    .hero{padding:88px 20px 40px;}
    .hero p{max-width:100%;}
    .problem-section{padding:10px 0 60px;}
    /* 10px, matching .problem-section/.usp-section/.faq-section's mobile
       top padding — this was the one section-padding outlier at 28px. */
    .bento-section{padding:10px 0 60px;}
    .usp-section{padding:10px 0 60px;}
    /* 20px, matching .compare-card's own mobile padding. */
    .bento-card{padding:20px;}
    /* 16px, matching .dotscale's own gap — desktop's 22px card-to-card
       gaps, unchanged there, are this page's spacing for a 2-column grid;
       single-column here, so the tighter existing 16px value already used
       elsewhere on the page fits better. */
    .bento{gap:16px;margin:0 auto 16px;}
    .bento-col{gap:16px;}
    .bento-cluster-canvas-wrap{min-height:220px;}
    /* B6 (optional/revertable): horizontal card layout — visual left
       (~64px), title+line stacked to its right, left-aligned, instead of
       stacked-and-centered. Grid, not a JSX change (this round is CSS-
       only): .problem-visual/.problem-title/.problem-line keep their
       existing DOM order and classes, just placed via grid-column/row. */
    .problem-section .step{
      display:grid;grid-template-columns:64px 1fr;column-gap:16px;align-items:start;text-align:left;
    }
    .problem-section .problem-visual{grid-column:1;grid-row:1 / span 2;width:64px;height:64px;margin-bottom:0;justify-content:flex-start;}
    .problem-section .problem-title{grid-column:2;grid-row:1;}
    .problem-section .problem-line{grid-column:2;grid-row:2;}
    .how{padding:10px 20px 60px;}
    .step{padding:22px 18px;}
    .faq-section{padding:10px 0 60px;}
    .final-outer{padding:56px 20px;}
    .final-card h2{font-size:30px;}
    .final-card p{font-size:14px;}
    .compare-card{padding:20px;}
    .problem-title{font-size:20px;}
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
  }, [items], wrapRef, { respectReducedMotion: true })

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
  }, [items], wrapRef, { respectReducedMotion: true })

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
              // fontWeight:600 matches HeroBlobs' own active label — same
              // serif italic treatment, just scaled down (22px vs 30px) for
              // this smaller visual. Missing here before; the two visuals'
              // active labels are the same "Deliberate" pattern name and
              // should read with the same weight.
              ? { fontFamily: serif, fontStyle: 'italic' as const, fontWeight: 600, fontSize: 22, color: `hsl(${b.hue},45%,24%)` }
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
  }, [envItems, youProfile], wrapRef, { respectReducedMotion: true })

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
//
// `scale` (default 1, the original size) shrinks every pixel value below by
// the same factor. The SVG's viewBox stays a fixed "0 0 220 220" — its own
// path/gradient/blur math is untouched — only the rendered width/height
// attributes shrink, so the browser scales the whole drawing down for free.
// Only the wrapper box, the pulseRing div, and the label's font-size are
// plain CSS pixels outside that viewBox and need scaling by hand.
//
// `marginTop` optionally overrides the wrapper's top margin (otherwise
// 16*scale, e.g. 7.2px at scale 0.45) — decoupled from scale so a call site
// can set an exact gap above the blob regardless of how small it's scaled.
// `center` switches the wrapper's horizontal margin from 0 (flush left,
// matching StaticDotScale/.step-pill-row) to auto (centered) — default
// false so existing call sites keep their current alignment.
function DemoBlob({ scale = 1, marginTop, center }: { scale?: number; marginTop?: number; center?: boolean }) {
  const pathRef = useRef<SVGPathElement | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const hue = useMemo(() => sharedUserCuratedHue(SHARED_USER_SEED, 0), [])
  const profile = useMemo(() => sharedBuildPointMotionProfile(sharedHashSeed('Deliberate-shape'), 9), [])

  useBlobAnimation(t => {
    pathRef.current?.setAttribute('d', sharedGenerateAnimatedBlobPath(110, 110, 78, profile, 0.3, t))
  }, [profile], wrapRef, { respectReducedMotion: true })

  return (
    <div ref={wrapRef} style={{ width: 190 * scale, height: 170 * scale, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: `${marginTop ?? 16 * scale}px ${center ? 'auto' : '0'} ${22 * scale}px`, position: 'relative' }}>
      {/* Fires once on reveal in the real assessment flow; the landing page
          has no reveal moment to key off, so it loops (matches the mockup's
          own note on this same tradeoff). Reuses the app's existing global
          pulseRing keyframe (globals.css) rather than the mockup's near-
          identical inline one, for visual consistency with the same ring
          used on the assessment page's real pattern-reveal moment. */}
      <div style={{
        position: 'absolute', inset: 6 * scale, borderRadius: '50%',
        border: '1px solid hsl(8,50%,65%)', opacity: 0.5,
        animation: 'pulseRing 2.4s ease-out infinite',
      }} />
      <svg viewBox="0 0 220 220" width={220 * scale} height={220 * scale} style={{ overflow: 'visible' }}>
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
        fontFamily: serif, fontStyle: 'italic', fontWeight: 600, fontSize: 30 * scale,
        color: `hsl(${hue},45%,24%)`,
      }}>
        Deliberate
      </span>
    </div>
  )
}

// ─── StaticDotScale ───────────────────────────────────────────────────────────
// Restored from the earlier /home-v2 build (HomeV2Client.tsx's
// StaticDotScale) for How it works step 1. Not imported from
// QuestionCard.tsx: its DotScale isn't exported, and the assessment files
// stay out of scope for this page. All 5 dots render unselected — showing
// the scale itself, not a specific (fabricated) answer.
function StaticDotScale() {
  return (
    <div className="dotscale">
      <div className="dotscale-row">
        <div className="dotscale-line" />
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} className="dotscale-dot" />
        ))}
      </div>
      <div className="dotscale-labels">
        <span>Very Inaccurate</span>
        <span>Very Accurate</span>
      </div>
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
//  - ProblemTrioVisual: the same blurred-circle technique again, but three
//    identical circles (same size, same color) evenly spaced in a row —
//    a visual shorthand for "a repeating pattern," for card 3's "not seeing
//    your patterns" copy. Replaces the old INTJ pill (ProblemPillVisual,
//    deleted along with the chip-flow copy it referenced).
// All three visuals' sizes/positions/blur amounts are the previous values
// x1.5 (e.g. card 1's 30px circle is now 45px; .problem-visual's own height
// grows from 56px to 84px, same factor, to fit the tallest one — card 1's
// circle at top:48/size:24 now bottoms out at 72px — without clipping).
// Each visual's absolutely-positioned circles sit inside an inner
// position:relative wrapper sized to that visual's own bounding footprint
// (not full-width), so .problem-visual's justify-content:center (below)
// centers the wrapper — and everything inside it — as a unit instead of
// leaving the circles pinned to the card's left edge.
function ProblemCirclesVisual() {
  const circles = [
    { size: 45, top: 3,  left: 0,  color: mkTeal },
    { size: 30, top: 42, left: 45, color: mkRose },
    { size: 36, top: 0,  left: 60, color: mkPeriwinkle },
    { size: 24, top: 48, left: 0,  color: mkPeriwinkle },
    { size: 27, top: 18, left: 24, color: mkRose },
  ]
  return (
    <div className="problem-visual">
      <div style={{ position: 'relative', width: 96, height: 72 }}>
        {circles.map((c, i) => (
          <div
            key={i}
            className="final-glow"
            style={{ width: c.size, height: c.size, top: c.top, left: c.left, background: c.color, filter: 'blur(9px)' }}
          />
        ))}
      </div>
    </div>
  )
}

function ProblemBlobRingVisual() {
  // Blob stays centered inside the ring (ring spans 0-57px, center 28.5px;
  // blob is 36px, so left = 28.5 - 36/2 = 10.5px).
  return (
    <div className="problem-visual">
      <div style={{ position: 'relative', width: 57, height: 70.5 }}>
        <div className="final-glow" style={{ width: 36, height: 36, top: 24, left: 10.5, background: mkRose, filter: 'blur(7.5px)' }} />
        <div style={{ position: 'absolute', width: 57, height: 57, top: 13.5, left: 0, borderRadius: '50%', border: `2.25px dashed ${mkRose}` }} />
      </div>
    </div>
  )
}

function ProblemTrioVisual() {
  // Three identical 27px circles, 39px apart (12px gap between edges).
  const lefts = [0, 39, 78]
  return (
    <div className="problem-visual">
      <div style={{ position: 'relative', width: 105, height: 55.5 }}>
        {lefts.map((left, i) => (
          <div
            key={i}
            className="final-glow"
            style={{ width: 27, height: 27, top: 28.5, left, background: mkTeal, filter: 'blur(7.5px)' }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ_ITEMS: FaqAccordionItem[] = [
  {
    question: 'Why should I trust this?',
    answer: 'Bearing is built on the IPIP-NEO-120, a public-domain Big Five inventory published in peer-reviewed research (Johnson, 2014). Everyone answers the same 120 statements, and your scores are calculated directly from your answers. Like any self-report questionnaire, it reflects how you answer, so it describes patterns rather than diagnosing you.',
  },
  {
    question: 'How long does it take?',
    answer: 'About 15 minutes for the 120 statements. Your first patterns usually appear before the halfway point, and you can stop at any time.',
  },
  {
    question: 'What does it cost?',
    answer: 'Your first 5 patterns are free. Unlocking all 30 facets plus five deeper assessments is a one-time payment of EUR 49. There is no subscription.',
  },
  {
    question: 'Is it just AI telling me what I want to hear?',
    answer: "No. Your scores come from the same fixed questionnaire for everyone. AI only writes the explanation of each pattern from your results, and it can't change your scores.",
  },
  {
    question: 'Do I need an account?',
    answer: 'No. Your first 5 patterns need no account. You can optionally save your progress with your email, and an account is needed when you unlock the full report.',
  },
  {
    question: 'Is this therapy or a diagnosis?',
    answer: "No. Bearing describes patterns in how you answered a questionnaire. It isn't therapy, a diagnosis or a substitute for professional support.",
  },
]

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
        {/* Heading unchanged (.problem-heading, left-aligned) — only the
            three cards are centered (.problem-section .step, scoped so How
            it works' shared .step stays left-aligned). Cards still reuse
            .how-steps/.step exactly (three columns, one column at <=860px,
            same as How it works) — grid default align-items:stretch already
            gives equal card heights with no extra rule needed. Each card is
            a restored static visual (see ProblemCirclesVisual/
            ProblemBlobRingVisual/ProblemTrioVisual above, now centered via
            .problem-visual's justify-content:center) plus a .problem-title
            (serif, the dominant element) and a .problem-line, now a serif
            italic first-person quote in the same body color as before, not
            plain third-person copy. <div>s, not <h3>/<p>: .step h3 (sans/
            16px/600) and .step p (13.5px) would otherwise win on
            specificity over any conflicting class rule on those elements,
            the same trap fixed on the hero microcopy and the STEP A quote
            earlier. */}
        <section className="problem-section">
          <div className="wrap">
            <h2 className="problem-heading">Sound familiar?</h2>
            <p className="problem-subtitle">You&apos;re already doing the work. It still doesn&apos;t quite add up.</p>
            <div className="how-steps" style={{ marginTop: 32 }}>
              <div className="step">
                <ProblemCirclesVisual />
                <div className="problem-title">Not knowing what drives me.</div>
                <div className="problem-line">&ldquo;I can point to what&apos;s wrong, but not why it keeps happening.&rdquo;</div>
              </div>
              <div className="step">
                <ProblemBlobRingVisual />
                <div className="problem-title">Insight, but no direction.</div>
                <div className="problem-line">&ldquo;I&apos;ve learned a lot about myself, but I don&apos;t know what to do with it.&rdquo;</div>
              </div>
              <div className="step">
                <ProblemTrioVisual />
                <div className="problem-title">Stuck in the same pattern.</div>
                <div className="problem-line">&ldquo;I keep ending up in the same place, and I can&apos;t tell how to break free of it.&rdquo;</div>
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
        {/* Each card is now a 3-item hairline-separated list (.compare-item:
            an .mk-eyebrow lead + a body paragraph) instead of a single
            label+line — rows aligned across both cards via CSS subgrid
            (.compare-card{grid-template-rows:subgrid}, above), not just
            equal-height cards with top-aligned lists. */}
        <section className="usp-section">
          <div className="wrap">
            <div className="section-head">
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Why it&apos;s different</div>
              <h2>Fixed questions, specific patterns.</h2>
            </div>

            <div className="compare">
              <div className="compare-card muted">
                <div className="compare-item">
                  <div className="mk-eyebrow">AI chat</div>
                  <p>Tends to tell you what you want to hear.</p>
                </div>
                <div className="compare-item">
                  <div className="mk-eyebrow">Professional assessments</div>
                  <p>Often need a certified coach to explain what your results mean.</p>
                </div>
                <div className="compare-item">
                  <div className="mk-eyebrow">Type tests</div>
                  <p>Sort you into one of a fixed set of four-letter labels.</p>
                </div>
              </div>
              <div className="compare-vs">vs</div>
              <div className="compare-card highlight">
                <div className="compare-item">
                  <div className="mk-eyebrow">Fixed questions</div>
                  <p>Your scores come from the same 120 statements for everyone. AI only explains them.</p>
                </div>
                <div className="compare-item">
                  <div className="mk-eyebrow">Explained in the report</div>
                  <p>Each pattern comes with a written explanation in the report itself.</p>
                </div>
                <div className="compare-item">
                  <div className="mk-eyebrow">30 facets</div>
                  <p>Specific patterns across the Big Five, not one label.</p>
                </div>
              </div>
            </div>

            <p className="mk-microcopy" style={{ textAlign:'center', marginTop:22 }}>
              Built on the IPIP-NEO-120, a public-domain Big Five inventory from published research (Johnson, 2014).
            </p>
          </div>
        </section>

        {/* ── HOW IT WORKS (3-step) ────────────────────────────────── */}
        {/* id="how-it-works" kept even though the mockup's .how section has
            no id — SiteFooter.tsx (untouched, out of scope) links to
            /#how-it-works and would silently break without it. Each step
            gets its own small static visual now (StaticDotScale, DemoBlob,
            the pill row) instead of the shared .map() over plain
            title/desc pairs, since the three visuals aren't interchangeable. */}
        <section id="how-it-works" className="how">
          <div className="section-head">
            <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>How it works</div>
            <h2>Three steps. One honest picture.</h2>
          </div>
          <div className="how-steps">
            <div className="step">
              <div className="step-mark">1</div>
              <h3>Rate 120 short statements</h3>
              <p>Statements like &lsquo;Worry about things.&rsquo;, rated from very inaccurate to very accurate. About 15 minutes.</p>
              <StaticDotScale />
            </div>
            <div className="step">
              <div className="step-mark">2</div>
              {/* "resonates", not the request's "resates" — treated as a
                  dropped syllable, same as "fore"/"before" in the compare
                  section. Flagged in the report. */}
              <h3>See if it resonates</h3>
              <p>Your first patterns appear while you&apos;re still answering, usually before the halfway point. If it doesn&apos;t feel right, stop: no cost, no account.</p>
              <DemoBlob scale={0.45} marginTop={14} center />
            </div>
            <div className="step">
              <div className="step-mark">3</div>
              <h3>Go deeper</h3>
              <p>Unlock all 30 facets plus five deeper assessments for EUR 49, once. Bearing suggests which to take first. No subscription.</p>
              <div className="step-pill-row">
                {['Working style', 'Relationships', 'Energy', 'Environment', 'Direction'].map(label => (
                  <span key={label} className="step-pill">{label}</span>
                ))}
              </div>
            </div>
          </div>
          <p className="mk-microcopy" style={{ textAlign:'center', marginTop:32 }}>
            The written explanation of each pattern is generated by AI from your results.
          </p>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        {/* Two columns on desktop, one column (heading above list) at
            <=860px — see .faq-cols. Left column reuses .problem-heading
            as-is (left-aligned 34px serif, same as the Problem section)
            plus a left-aligned "FAQ" eyebrow — no centering inline style
            this time, unlike every other section's eyebrow, since this
            column isn't centered. FAQ items live in FAQ_ITEMS just below
            the component, not inline here, so FaqAccordion's items prop
            stays a plain array reference rather than a new array literal
            on every render. */}
        <section className="faq-section">
          <div className="wrap">
            <div className="faq-cols">
              <div>
                <div className="mk-eyebrow">FAQ</div>
                <h2 className="problem-heading">Common questions</h2>
              </div>
              <FaqAccordion items={FAQ_ITEMS} />
            </div>
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
              <div className="mk-eyebrow" style={{ justifyContent:'center', display:'flex' }}>Free preview · 15 minutes</div>
              <h2>You already sense<em>there&apos;s more to know.</em></h2>
              <p>Understanding yourself can take years. Bearing gives you a clear starting point in about 15 minutes, built on the IPIP-NEO-120, a public-domain Big Five inventory.</p>
              <div className="final-cta-row">
                {/* startedUnfinished: same text/href swap as the hero CTA
                    above, no arrow — not a new state, just reused here. */}
                <Link href={startedUnfinished ? '/assessment' : '/onboarding'}>
                  <button className="mk-btn">{startedUnfinished ? 'Continue your assessment' : 'Start the assessment'}</button>
                </Link>
                <Link href="/report/sample" className="final-link">
                  See a sample report
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
