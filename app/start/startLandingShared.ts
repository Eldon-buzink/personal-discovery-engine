/**
 * app/start/startLandingShared.ts
 *
 * Design tokens + CSS for the /start/{facet} acquisition pages, pulled from
 * app/(site)/LandingPageClient.tsx (reference/bearing-landing-v6_2.html) —
 * same mk* values, same class names, so this stays visually identical to
 * the home page's design system. Only the subset of classes these shorter
 * pages actually use (hero, mk-btn/eyebrow/microcopy, section-head,
 * how-steps/step) is carried over — the bento/compare/faq/final-cta CSS
 * from the home page has no counterpart here.
 */

export const mkCream = '#F7F4ED'
export const mkCard = '#EFEAE0'
export const mkCharcoal = '#262420'
export const mkCharcoalSoft = '#57534A'
export const mkLine = 'rgba(38,36,32,0.1)'

export const sans = 'var(--font-inter), -apple-system, sans-serif'
export const serif = 'var(--font-newsreader), Georgia, serif'

export const START_LANDING_CSS = `
  .wrap{max-width:1120px;margin:0 auto;padding:0 32px;}
  .section-head{max-width:600px;margin:0 auto 40px;text-align:center;}
  .section-head h2{font-family:Newsreader,serif;font-size:30px;font-weight:500;line-height:1.2;margin:0;}

  .hero{padding:64px 32px 48px;}
  .hero-inner{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1.1fr 0.9fr;gap:40px;align-items:center;}
  .hero h1{font-size:42px;line-height:1.12;font-weight:500;margin:0 0 18px;}
  .hero p{font-size:17px;line-height:1.55;color:${mkCharcoalSoft};max-width:440px;margin:0 0 24px;}
  .hero-cta-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
  .hero-blob-wrap{position:relative;width:100%;aspect-ratio:1/1;overflow:visible;display:flex;align-items:center;justify-content:center;}

  .mk-eyebrow{font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${mkCharcoalSoft};margin-bottom:14px;}
  .mk-microcopy{font-size:13px;color:${mkCharcoalSoft};}
  .mk-btn{background:${mkCharcoal};color:${mkCream};border:none;border-radius:999px;padding:13px 24px;font-size:15px;font-weight:500;cursor:pointer;font-family:Inter,var(--font-inter),sans-serif;}

  .start-preview-card{background:${mkCard};border:1px solid ${mkLine};border-radius:20px;padding:28px 26px;max-width:560px;margin:0 auto;text-align:left;}
  .start-preview-text{font-family:Newsreader,serif;font-size:21px;line-height:1.4;margin:0 0 18px;}
  .start-preview-scale{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:${mkCharcoalSoft};}
  .start-preview-dots{display:flex;gap:8px;}
  .start-preview-dots span{width:10px;height:10px;border-radius:50%;border:1.5px solid ${mkCharcoalSoft};}

  .how-steps{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
  .step{border:1px solid ${mkLine};border-radius:18px;padding:24px 20px;background:${mkCard};text-align:left;}
  .step-mark{width:26px;height:26px;border-radius:50%;background:${mkCharcoal};color:${mkCream};display:flex;align-items:center;justify-content:center;font-size:12px;margin-bottom:14px;font-family:Newsreader,serif;}
  .step h3{font-size:15px;font-weight:600;margin:0 0 6px;}
  .step p{font-size:13.5px;line-height:1.55;color:${mkCharcoalSoft};margin:0;}

  @media(max-width:860px){
    .hero-inner{grid-template-columns:1fr;}
    .hero h1{font-size:34px;}
    .how-steps{grid-template-columns:1fr;}
  }
  @media(max-width:640px){
    .hero{padding:48px 20px 36px;}
    .hero p{max-width:100%;}
    .wrap{padding:0 20px;}
  }
`
