/**
 * app/start/startLandingShared.ts
 *
 * Design tokens + CSS for the /start/{facet} acquisition pages, pulled from
 * app/(site)/LandingPageClient.tsx (reference/bearing-landing-v6_2.html) —
 * same mk* values, same class names, so this stays visually identical to
 * the home page's design system. Only the subset of classes these shorter
 * pages actually use (hero, mk-btn/eyebrow/microcopy, section-head,
 * how-steps/step, the "Sound familiar?" problem section) is carried over —
 * the sections shared with the home page ("Why it's different", "Your
 * practice", FAQ, the final card) bring their own CSS from
 * app/(site)/landing/sectionStyles.ts.
 */

export const mkCream = '#F7F4ED'
export const mkCard = '#EFEAE0'
export const mkCharcoal = '#262420'
export const mkCharcoalSoft = '#57534A'
export const mkLine = 'rgba(38,36,32,0.1)'
export const mkTeal = '#7FD9C4'
export const mkPeriwinkle = '#AEBBE8'
export const mkRose = '#E9AFC0'

export const sans = 'var(--font-inter), -apple-system, sans-serif'
export const serif = 'var(--font-newsreader), Georgia, serif'

export const START_LANDING_CSS = `
  .wrap{max-width:1120px;margin:0 auto;padding:0 32px;}
  .section-head{max-width:600px;margin:0 auto 40px;text-align:center;}
  .section-head h2{font-family:Newsreader,serif;font-size:30px;font-weight:500;line-height:1.2;margin:0;}

  .hero{padding:64px 32px 8px;}
  .hero-inner{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1.1fr 0.9fr;gap:40px;align-items:center;}
  .hero h1{font-size:42px;line-height:1.12;font-weight:500;margin:0 0 18px;}
  .hero p{font-size:17px;line-height:1.55;color:${mkCharcoalSoft};max-width:440px;margin:0 0 24px;}
  .hero-cta-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
  .hero-blob-wrap{position:relative;width:100%;aspect-ratio:520/500;overflow:visible;}

  .mk-eyebrow{font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${mkCharcoalSoft};margin-bottom:14px;}
  .mk-microcopy{font-size:13px;color:${mkCharcoalSoft};}
  .mk-btn{background:${mkCharcoal};color:${mkCream};border:none;border-radius:999px;padding:13px 24px;font-size:15px;font-weight:500;cursor:pointer;font-family:Inter,var(--font-inter),sans-serif;}

  /* First-statement preview — sits directly under the hero (no section
     padding of its own above it) so there's no dead gap between the hero
     and the first real, concrete thing on the page. */
  .start-preview-section{padding:20px 0 48px;}
  .start-preview-card{background:${mkCard};border:1px solid ${mkLine};border-radius:20px;padding:24px 26px;max-width:560px;margin:0 auto;text-align:left;}
  .start-preview-text{font-family:Newsreader,serif;font-size:20px;line-height:1.4;margin:0 0 16px;}
  .start-preview-scale{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:${mkCharcoalSoft};}
  .start-preview-dots{display:flex;gap:8px;}
  .start-preview-dots span{width:10px;height:10px;border-radius:50%;border:1.5px solid ${mkCharcoalSoft};background:none;padding:0;cursor:default;}
  .start-preview-dots button{width:10px;height:10px;border-radius:50%;border:1.5px solid ${mkCharcoalSoft};background:none;padding:0;cursor:pointer;}
  .start-preview-dots button[aria-pressed="true"]{background:${mkCharcoal};border-color:${mkCharcoal};}

  /* "Sound familiar?" — ported from the home page's Problem section
     (same classes, same visuals), subtitle + 4 cards (3 real items + 1
     reverse-keyed) swapped per facet. */
  .problem-section{padding:8px 0 56px;}
  .problem-heading{font-family:Newsreader,serif;font-size:30px;font-weight:500;line-height:1.2;margin:0;text-align:left;}
  .problem-subtitle{font-size:15px;color:${mkCharcoalSoft};line-height:1.6;margin:10px 0 0;text-align:left;}
  .problem-visual{position:relative;height:84px;display:flex;align-items:center;justify-content:center;margin-bottom:18px;}
  .problem-title{font-family:Newsreader,serif;font-size:22px;font-weight:500;line-height:1.2;margin:0 0 8px;}
  .problem-line{font-family:Newsreader,serif;font-style:italic;font-size:16px;color:${mkCharcoalSoft};line-height:1.6;margin:0;}
  .final-glow{position:absolute;border-radius:50%;opacity:0.55;z-index:0;}
  .sound-familiar-grid{max-width:900px;margin:32px auto 0;display:grid;grid-template-columns:repeat(2,1fr);gap:20px;}

  .how-steps{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
  .step{border:1px solid ${mkLine};border-radius:18px;padding:24px 20px;background:${mkCard};text-align:left;}
  .step-mark{width:26px;height:26px;border-radius:50%;background:${mkCharcoal};color:${mkCream};display:flex;align-items:center;justify-content:center;font-size:12px;margin-bottom:14px;font-family:Newsreader,serif;}
  .step h3{font-size:15px;font-weight:600;margin:0 0 6px;}
  .step p{font-size:13.5px;line-height:1.55;color:${mkCharcoalSoft};margin:0;}

  /* "What you get" — band-word preview + tomorrow's check-in preview
     (Part C4), same card look as the hero's preview card. */
  .get-section{padding:8px 0 56px;}
  .get-card{background:${mkCard};border:1px solid ${mkLine};border-radius:20px;padding:28px 26px;max-width:560px;margin:0 auto;text-align:left;}
  .get-bands{display:flex;justify-content:space-between;margin:0 0 20px;padding-bottom:20px;border-bottom:1px solid ${mkLine};}
  .get-band-word{font-family:Newsreader,serif;font-style:italic;font-size:16px;color:${mkCharcoal};}
  .get-checkin-question{font-size:16px;line-height:1.4;margin:0 0 12px;}
  .get-checkin-option{font-size:13px;color:${mkCharcoalSoft};line-height:1.5;padding:8px 12px;background:#ffffff;border:1px solid ${mkLine};border-radius:8px;margin-bottom:8px;}

  .section-head p{font-size:15px;color:${mkCharcoalSoft};line-height:1.6;margin:12px 0 0;}

  @media(max-width:860px){
    .hero-inner{grid-template-columns:1fr;}
    .hero h1{font-size:34px;}
    .how-steps{grid-template-columns:1fr;}
    .sound-familiar-grid{grid-template-columns:1fr;}
  }
  @media(max-width:640px){
    .hero{padding:48px 20px 4px;}
    .hero p{max-width:100%;}
    .wrap{padding:0 20px;}
    .start-preview-section{padding:14px 0 40px;}
    .problem-section .step{
      display:grid;grid-template-columns:56px 1fr;column-gap:14px;align-items:start;text-align:left;
    }
    .problem-section .problem-visual{grid-column:1;grid-row:1 / span 2;width:56px;height:56px;margin-bottom:0;justify-content:flex-start;}
    .problem-section .problem-title{grid-column:2;grid-row:1;font-size:18px;}
    .problem-section .problem-line{grid-column:2;grid-row:2;}
  }
`
