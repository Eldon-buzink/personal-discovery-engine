'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PaywallModal from './PaywallModal'

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

function readSessionInfo(): { ctaState: CtaState; traitCount: number } {
  try {
    const raw = localStorage.getItem('known_session')
    if (!raw) return { ctaState: 'start', traitCount: 0 }
    const s = JSON.parse(raw) as Record<string, unknown>
    const patternContents = Array.isArray(s.patternContents) ? (s.patternContents as Array<{ branch?: string }>) : []
    const hasResponses = Array.isArray(s.responses) && (s.responses as unknown[]).length > 0
    const hasPatterns  = patternContents.length > 0
    const hasBranches  = patternContents.some(e => e.branch && e.branch !== 'ring1')
    const traitCount   = patternContents.filter(e => !e.branch || e.branch === 'ring1').length

    let ctaState: CtaState = 'report'
    if (!hasResponses) ctaState = 'start'
    else if (!hasPatterns) ctaState = 'continue'
    else if (!hasBranches) ctaState = 'unlock'

    return { ctaState, traitCount }
  } catch {
    return { ctaState: 'start', traitCount: 0 }
  }
}

// 'unlock' has no href — it opens PaywallModal instead of navigating (was a
// direct Link to /pricing, bypassing every other unlock entry point's gating).
const CTA_MAP: Record<CtaState, { label: string; href: string | null }> = {
  start:    { label: 'Start the assessment',   href: '/onboarding' },
  continue: { label: 'Continue →',             href: '/assessment' },
  unlock:   { label: 'Unlock your branches',   href: null          },
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
  const [traitCount, setTraitCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)

  useEffect(() => {
    const info = readSessionInfo()
    setCtaState(info.ctaState)
    setTraitCount(info.traitCount)
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
      setUserId(session?.user.id ?? null)
    })
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
            Bearing
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
            {cta.href ? (
              <Link href={cta.href} style={{ textDecoration: 'none' }}>
                <button style={{
                  background: charcoal, color: cream, border: 'none', borderRadius: 100,
                  padding: '9px 20px', fontFamily: sans, fontSize: 13.5, fontWeight: 500,
                  cursor: 'pointer', letterSpacing: '0.01em', whiteSpace: 'nowrap',
                }}>
                  {cta.label}
                </button>
              </Link>
            ) : (
              <button
                onClick={() => setPaywallOpen(true)}
                style={{
                  background: charcoal, color: cream, border: 'none', borderRadius: 100,
                  padding: '9px 20px', fontFamily: sans, fontSize: 13.5, fontWeight: 500,
                  cursor: 'pointer', letterSpacing: '0.01em', whiteSpace: 'nowrap',
                }}
              >
                {cta.label}
              </button>
            )}
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
            {cta.href ? (
              <Link href={cta.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', background: charcoal, color: cream,
                  border: 'none', borderRadius: 100,
                  padding: '14px 20px', fontFamily: sans, fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }}>
                  {cta.label}
                </button>
              </Link>
            ) : (
              <button
                onClick={() => { setMenuOpen(false); setPaywallOpen(true) }}
                style={{
                  width: '100%', background: charcoal, color: cream,
                  border: 'none', borderRadius: 100,
                  padding: '14px 20px', fontFamily: sans, fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }}
              >
                {cta.label}
              </button>
            )}
          </div>
        </div>
      )}

      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        isAuthenticated={isAuthenticated}
        userId={userId}
        traitCount={traitCount}
        onAuthenticated={(uid) => {
          setIsAuthenticated(true)
          setUserId(uid)
        }}
        onPaymentConfirmed={() => setPaywallOpen(false)}
      />
    </>
  )
}
