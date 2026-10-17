'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { css } from '@/lib/design/type'

// Navigation for the landing v3 preview, after mrdoge.ai: no bar at the top
// of the page (it sits on the hero), then a floating, rounded, frosted bar
// once the page scrolls. Links are quiet (70% ink) with a soft pill on
// hover; one small primary button. On a phone: logo, button and a menu
// button that opens the links in a panel under the bar.
//
// The state flips once past 8px of scroll (a class change with a 200ms
// transition); nothing is tied to the scroll position itself.

const LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
]

export const v3NavCSS = `
  .v3-nav{position:fixed;top:0;left:0;right:0;z-index:200;padding:12px 16px;pointer-events:none;}
  .v3-nav-inner{pointer-events:auto;max-width:1200px;margin:0 auto;height:60px;padding:0 10px 0 20px;display:flex;align-items:center;justify-content:space-between;
    border-radius:16px;border:1px solid transparent;background:transparent;
    transition:background-color var(--dur-ui) var(--ease),border-color var(--dur-ui) var(--ease),box-shadow var(--dur-ui) var(--ease);}
  .v3-nav[data-scrolled="true"] .v3-nav-inner,.v3-nav[data-open="true"] .v3-nav-inner{background:rgba(247,244,237,0.74);border-color:rgba(38,36,32,0.08);
    -webkit-backdrop-filter:blur(24px) saturate(1.4);backdrop-filter:blur(24px) saturate(1.4);box-shadow:0 8px 40px -12px rgba(38,36,32,0.28);}
  .v3-logo{font-family:var(--font-display);font-size:22px;letter-spacing:-0.02em;color:#262420;}
  .v3-links{display:flex;align-items:center;gap:4px;}
  .v3-link{${css.ui}font-weight:400;color:rgba(38,36,32,0.7);padding:8px 12px;border-radius:999px;
    transition:color var(--dur-ui) var(--ease),background-color var(--dur-ui) var(--ease);}
  .v3-link:hover{color:#262420;background:rgba(38,36,32,0.05);}
  .v3-cta{${css.ui}display:inline-flex;align-items:center;height:40px;padding:0 16px;margin-left:8px;border-radius:999px;background:#262420;color:#F7F4ED;
    box-shadow:0 1px 3px rgba(38,36,32,0.18);transition:transform var(--dur-ui) var(--ease);}
  .v3-cta:active{transform:scale(0.97);}
  .v3-link:focus-visible,.v3-cta:focus-visible,.v3-menu-btn:focus-visible,.v3-logo:focus-visible{outline:2px solid #262420;outline-offset:2px;}
  .v3-menu-btn{display:none;width:44px;height:44px;border:none;background:transparent;border-radius:12px;align-items:center;justify-content:center;color:#262420;cursor:pointer;}
  .v3-panel{pointer-events:auto;max-width:1200px;margin:8px auto 0;padding:8px;border-radius:16px;background:rgba(247,244,237,0.96);
    border:1px solid rgba(38,36,32,0.08);box-shadow:0 8px 40px -12px rgba(38,36,32,0.28);}
  .v3-panel a{${css.body}display:flex;align-items:center;min-height:48px;padding:0 12px;border-radius:10px;color:#262420;}
  .v3-panel a:hover{background:rgba(38,36,32,0.05);}
  @media(max-width:760px){
    .v3-links .v3-link{display:none;}
    .v3-menu-btn{display:inline-flex;}
    .v3-links .v3-cta{display:none;}
    .v3-panel .v3-cta{display:flex;justify-content:center;height:48px;margin:8px 0 4px;color:#F7F4ED;}
    .v3-panel .v3-cta:hover{background:#262420;}
    .v3-nav-inner{padding:0 4px 0 16px;}
  }
`

export default function V3Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className="v3-nav" data-scrolled={scrolled} data-open={open}>
      <div className="v3-nav-inner">
        <Link href="/" className="v3-logo">Bearing</Link>
        <nav className="v3-links" aria-label="Main">
          {LINKS.map((l) => <Link key={l.href} href={l.href} className="v3-link">{l.label}</Link>)}
          <Link href="/onboarding" className="v3-cta">Start the assessment</Link>
          <button type="button" className="v3-menu-btn" aria-expanded={open} aria-controls="v3-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              {open
                ? <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
            </svg>
          </button>
        </nav>
      </div>
      {open && (
        <div id="v3-menu" className="v3-panel">
          {LINKS.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>)}
          <Link href="/onboarding" className="v3-cta" onClick={() => setOpen(false)}>Start the assessment</Link>
        </div>
      )}
    </header>
  )
}
