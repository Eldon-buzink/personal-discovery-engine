'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// ── Design tokens (match landing page) ────────────────────────────────────────
const cream    = '#F5F2EB'
const charcoal = '#1C1C1A'
const c12      = 'rgba(28,28,26,0.12)'
const sans     = 'var(--font-inter), system-ui, sans-serif'
const serif    = 'var(--font-newsreader), Georgia, serif'

export const NAV_H = 56   // exported so pages can offset their paddingTop

// ── Session state → CTA ───────────────────────────────────────────────────────
// Three states from localStorage (no Supabase needed here — all data is local).

type CtaState = 'start' | 'continue' | 'unlock' | 'report'

function readCtaState(): CtaState {
  try {
    const raw = localStorage.getItem('known_session')
    if (!raw) return 'start'
    const s = JSON.parse(raw) as Record<string, unknown>
    const hasResponses = Array.isArray(s.responses) && (s.responses as unknown[]).length > 0
    const hasPatterns  = Array.isArray(s.patternContents) && (s.patternContents as unknown[]).length > 0
    const hasBranches  = Array.isArray(s.patternContents) && (s.patternContents as Array<{ branch?: string }>).some(
      e => e.branch && e.branch !== 'ring1'
    )
    if (!hasResponses) return 'start'
    if (!hasPatterns)  return 'continue'
    if (!hasBranches)  return 'unlock'
    return 'report'
  } catch {
    return 'start'
  }
}

const CTA_MAP: Record<CtaState, { label: string; href: string }> = {
  start:    { label: 'Start the assessment',   href: '/onboarding' },
  continue: { label: 'Continue →',             href: '/assessment' },
  unlock:   { label: 'Unlock your branches',   href: '/pricing'    },
  report:   { label: 'View your report',        href: '/report'     },
}

const NAV_LINKS = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog',    href: '/blog'    },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function SiteNav() {
  const pathname = usePathname()
  const [ctaState, setCtaState] = useState<CtaState>('start')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setCtaState(readCtaState())
  }, [pathname])

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const cta = CTA_MAP[ctaState]

  return (
    <>
      <style>{`
        .sn-links { display: flex; align-items: center; gap: 28px; }
        .sn-cta-wrap { display: flex; }
        .sn-hamburger { display: none; }
        .sn-mobile { display: none; }
        .sn-link { opacity: 0.6; transition: opacity 0.15s; }
        .sn-link:hover { opacity: 1; }
        .sn-link-active { opacity: 1; font-weight: 500; }
        @media (max-width: 768px) {
          .sn-links { display: none !important; }
          .sn-cta-wrap { display: none !important; }
          .sn-hamburger { display: flex !important; }
          .sn-mobile { display: flex; }
        }
      `}</style>

      {/* ── Fixed nav bar ──────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: NAV_H,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 36px',
        background: 'rgba(245,242,235,0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${c12}`,
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 400, letterSpacing: '-0.02em', color: charcoal }}>
            Known
          </span>
        </Link>

        {/* Desktop: links centred via absolute */}
        <div className="sn-links" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {NAV_LINKS.map(l => (
            <Link
              key={l.href} href={l.href}
              className={`sn-link${pathname === l.href ? ' sn-link-active' : ''}`}
              style={{ fontFamily: sans, fontSize: 14, color: charcoal, textDecoration: 'none' }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sn-cta-wrap">
            <Link href={cta.href} style={{ textDecoration: 'none' }}>
              <button style={{
                background: charcoal, color: cream, border: 'none', borderRadius: 100,
                padding: '9px 20px', fontFamily: sans, fontSize: 13.5, fontWeight: 500,
                cursor: 'pointer', letterSpacing: '0.01em', whiteSpace: 'nowrap',
              }}>
                {cta.label}
              </button>
            </Link>
          </div>

          <button
            className="sn-hamburger"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: charcoal }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {menuOpen ? (
                <>
                  <line x1="4" y1="4" x2="18" y2="18" />
                  <line x1="18" y1="4" x2="4" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3"  y1="7"  x2="19" y2="7"  />
                  <line x1="3"  y1="12" x2="19" y2="12" />
                  <line x1="3"  y1="17" x2="19" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Mobile dropdown ─────────────────────────────────────────────────── */}
      {menuOpen && (
        <div className="sn-mobile" style={{
          position: 'fixed', top: NAV_H, left: 0, right: 0, zIndex: 199,
          background: cream,
          borderBottom: `1px solid ${c12}`,
          padding: '4px 36px 24px',
          flexDirection: 'column',
        }}>
          {NAV_LINKS.map(l => (
            <Link
              key={l.href} href={l.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: sans, fontSize: 16, color: charcoal, textDecoration: 'none',
                padding: '14px 0', borderBottom: `1px solid ${c12}`, display: 'block', opacity: 0.75,
              }}
            >
              {l.label}
            </Link>
          ))}
          <div style={{ paddingTop: 20 }}>
            <Link href={cta.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
              <button style={{
                width: '100%', background: charcoal, color: cream,
                border: 'none', borderRadius: 100,
                padding: '14px 20px', fontFamily: sans, fontSize: 15, fontWeight: 500, cursor: 'pointer',
              }}>
                {cta.label}
              </button>
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
