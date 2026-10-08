// CSS for the landing sections shared by the home page (LandingPageClient)
// and the /start/{facet} mini-assessment landing pages: "Why it's
// different" (compare), "Your practice", FAQ and the dark final CTA card.
// Moved out of LandingPageClient's landingCSS unchanged — each block keeps
// its own mobile overrides right after it — so both pages share one copy.

import { mkCard, mkCharcoal, mkCharcoalSoft, mkCream, mkLine } from '@/app/start/startLandingShared'

export const compareCSS = `
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
  .compare{max-width:900px;margin:0 auto 44px;display:grid;grid-template-columns:1fr auto 1fr;grid-template-rows:repeat(4,auto);column-gap:20px;row-gap:0;align-items:stretch;}
  /* grid-row:1/span 3 + grid-template-rows:subgrid: the card claims all 3
     of .compare's row tracks and hands them straight to its own
     .compare-item children, instead of sizing its own rows independently
     of the other card. */
  .compare-card{grid-row:1/span 4;display:grid;grid-template-rows:subgrid;border-radius:18px;padding:26px;}
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
  /* Row numbers: same look as How it works' .step-mark, smaller, inverted
     on the dark card. Rows are numbered 1-4 on both sides so each pair
     reads across. */
  .compare-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
  .compare-head .mk-eyebrow{margin-bottom:0;}
  .compare-num{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:${mkCharcoal};color:${mkCream};display:flex;align-items:center;justify-content:center;font-size:11px;font-family:'Newsreader',serif;}
  .compare-card.highlight .compare-num{background:${mkCream};color:${mkCharcoal};}
  /* 16px/1.6, matching .bento-card p/.problem-line — an existing size/
     line-height pair, not a new one — replacing the previous 13px/1.55. */
  .compare-card p{font-size:16px;line-height:1.6;margin:0;color:${mkCharcoalSoft};}
  .compare-card.highlight p{color:#C9C4B8;}

  /* grid-row:1/span 3, same as .compare-card — otherwise, now that
     .compare has 3 row tracks instead of 1, auto-placement would only put
     "vs" in row 1, not spanning the full height of the cards beside it.
     align-self:center then centers it within that full 3-row span. */
  .compare-vs{grid-row:1/span 4;font-size:13px;color:${mkCharcoalSoft};text-align:center;align-self:center;}
  @media(max-width:860px){
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
  }
  @media(max-width:640px){
    .usp-section{padding:10px 0 60px;}
    .compare-card{padding:20px;}
  }
`

export const practiceCSS = `
  /* Your practice */
  .practice-section{padding:0 0 90px;}
  .practice-hold{min-height:600px;}
  .practice-cadence{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1000px;margin:44px auto 0;}
  .practice-cadence div{border-top:1px solid ${mkLine};padding-top:14px;}
  .practice-cadence b{display:block;font-family:'Newsreader',serif;font-weight:500;font-size:20px;margin-bottom:6px;}
  .practice-cadence p{font-size:15px;line-height:1.6;color:${mkCharcoalSoft};margin:0;}
  .practice-closing{font-family:'Newsreader',serif;font-style:italic;font-size:18px;line-height:1.5;text-align:center;color:${mkCharcoalSoft};max-width:620px;margin:40px auto 0;}
  @media(max-width:860px){
    .practice-cadence{grid-template-columns:1fr;gap:18px;margin-top:36px;}
  }
  @media(max-width:640px){
    .practice-section{padding-bottom:60px;}
    .practice-closing{font-size:16px;}
  }
`

export const faqCSS = `
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
  @media(max-width:860px){
    .faq-cols{grid-template-columns:1fr;}
  }
  @media(max-width:640px){
    .faq-section{padding:10px 0 60px;}
  }
`

export const finalCSS = `
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
  @media(max-width:860px){
    .final-card{padding:56px 28px;}
  }
  @media(max-width:640px){
    .final-outer{padding:56px 20px;}
    .final-card h2{font-size:30px;}
    .final-card p{font-size:14px;}
  }
`
