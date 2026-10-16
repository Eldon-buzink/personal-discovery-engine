import { css } from '@/lib/design/type'
import { faqCSS, finalCSS } from '../landing/sectionStyles'

// Base styles for all three options. Every text style is a design token
// (lib/design/type.ts css.*); colours are the existing palette.
const ink = '#262420'
const soft = '#56534D'
const cream = '#F7F4ED'
const line = 'rgba(38,36,32,0.1)'

export const baseCSS = `
  .lo{background:${cream};color:${ink};overflow-x:hidden;}
  /* Page headings only: real product components (the report card's trait
     word, for one) style their own headings inline and keep them. */
  .lo h1:not([style]){${css.display1}margin:0;}
  .lo h2:not([style]){${css.display2}margin:0;}
  .lo h3:not([style]){${css.display4}margin:0;}
  .lo p{margin:0;}
  .lo-body{${css.body}color:${soft};}
  .lo-meta{${css.meta}}
  .lo-wrap{max-width:1120px;margin:0 auto;padding:0 32px;}
  .lo-section{padding:112px 0;}
  .lo-section + .lo-section{border-top:1px solid ${line};}

  /* Buttons: one primary, one text link. Press = 2% smaller. */
  .lo-ctas{display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap;}
  .lo-btn{${css.ui}display:inline-flex;align-items:center;min-height:48px;padding:0 28px;border-radius:999px;background:${ink};color:${cream};
    transition:transform var(--dur-ui) var(--ease),background-color var(--dur-ui) var(--ease);}
  .lo-btn:hover{background:#3a3731;}
  .lo-btn:active{transform:scale(0.98);}
  .lo-link{${css.ui}color:${ink};text-decoration:underline;text-underline-offset:4px;text-decoration-color:rgba(38,36,32,0.35);
    transition:text-decoration-color var(--dur-ui) var(--ease);min-height:44px;display:inline-flex;align-items:center;}
  .lo-link:hover{text-decoration-color:${ink};}
  .lo-btn:focus-visible,.lo-link:focus-visible{outline:2px solid ${ink};outline-offset:3px;}

  /* The three facts under the call to action. */
  .lo-note{display:flex;justify-content:center;flex-wrap:wrap;gap:8px 20px;list-style:none;margin:20px 0 0;padding:0;}
  .lo-note li{${css.meta}color:${soft};display:inline-flex;align-items:center;gap:6px;}
  .lo-note svg{color:#3D6B5C;flex-shrink:0;}

  /* Sample statement: the assessment's own scale on a plain surface. */
  .lo-statement{width:100%;max-width:400px;}
  /* The scale's dots are 20px in the product; here each gets an invisible
     44px hit area so they can be tapped on a phone. */
  .lo-statement button{position:relative;}
  .lo-statement button::after{content:'';position:absolute;inset:-12px;}
  .lo-statement-count{${css.meta}margin-bottom:10px !important;}
  .lo-statement-text{${css.display3}color:${ink};margin-bottom:28px !important;}
  .lo-spectrum{width:100%;max-width:320px;padding:0 11px;box-sizing:border-box;}
  .lo-checkin-q{${css.display4}color:${ink};margin-bottom:12px !important;}

  /* Entrance: final state by default; .m-armed (JS) rewinds, .m-play plays once. */
  .m-armed:not(.m-play) .lo-in{opacity:0;transform:translateY(10px);}
  .m-play .lo-in{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}

  @media(max-width:640px){
    .lo-wrap{padding:0 16px;}
    .lo-section{padding:72px 0;}
  }
  ${faqCSS}
  ${finalCSS}
  .final-card .lo-btn{margin:0;}
`
