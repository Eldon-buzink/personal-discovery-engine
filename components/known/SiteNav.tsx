'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// SiteNav mounts on every page, including static blog/marketing pages that
// never open the paywall — PaywallModal pulls in the Stripe Elements SDK
// (@stripe/react-stripe-js), which a static top-level import bundled into
// every page's JS regardless of whether the modal is ever opened. Dynamic
// import + only rendering it once paywallOpen is true (below) means that
// code is fetched the first time it's actually needed, not on every page
// load. ssr:false since it's a client-only modal (Stripe Elements requires
// the browser).
const PaywallModal = dynamic(() => import('./PaywallModal'), { ssr: false })

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

// Signed in: the user's own places first, Blog kept.
const NAV_LINKS_SIGNED_IN = [
  { label: 'Report',   href: '/report'   },
  { label: 'Practice', href: '/practice' },
  { label: 'Blog',     href: '/blog'     },
]

// In the account menu (signed in only). Managing the practice lives on the
// practice page itself (Edit on the Active list).
const ACCOUNT_LINKS: { label: string; href: string }[] = []

function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(href + '/')
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SiteNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
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
    // Dynamic import, not a static one: SiteNav mounts on every page
    // including static blog/marketing pages that never touch Supabase
    // otherwise — a top-level import bundled the full client SDK into
    // those pages' critical-path JS just for this one getSession() call.
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsAuthenticated(!!session)
        setUserId(session?.user.id ?? null)
      })
    })
  }, [pathname])

  // Close menus on route change
  useEffect(() => { setMenuOpen(false); setAccountOpen(false) }, [pathname])

  // Account menu: close on outside click or Escape
  useEffect(() => {
    if (!accountOpen) return
    const onDown = (e: MouseEvent) => { if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAccountOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [accountOpen])

  async function signOut() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    setIsAuthenticated(false)
    setUserId(null)
    setAccountOpen(false)
    setMenuOpen(false)
    router.push('/')
  }

  const links = isAuthenticated ? NAV_LINKS_SIGNED_IN : NAV_LINKS
  const cta = CTA_MAP[ctaState]
  // Signed in, "View your report" duplicates the Report link.
  const showCta = !(isAuthenticated && ctaState === 'report')

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .sn-links { display: flex; align-items: center; gap: 28px; }
        .sn-cta-wrap { display: flex; }
        .sn-hamburger { display: none; }
        .sn-mobile { display: none; }
        .sn-link { opacity: 0.6; transition: opacity 0.15s; }
        .sn-link:hover { opacity: 1; }
        .sn-link-active { opacity: 1; font-weight: 500; }
        .sn-menu-item:hover { background: rgba(28,28,26,0.05); }
        .sn-account button:focus-visible, .sn-menu-item:focus-visible { outline: 2px solid #D85A30; outline-offset: 2px; }
        @media (max-width: 768px) {
          .sn-links { display: none !important; }
          .sn-cta-wrap { display: none !important; }
          .sn-account { display: none !important; }
          .sn-hamburger { display: flex !important; }
          .sn-mobile { display: flex; }
        }
      ` }} />

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
          {links.map(l => (
            <Link
              key={l.href} href={l.href}
              aria-current={isActivePath(pathname, l.href) ? 'page' : undefined}
              className={`sn-link${isActivePath(pathname, l.href) ? ' sn-link-active' : ''}`}
              style={{ fontFamily: sans, fontSize: 14, color: charcoal, textDecoration: 'none' }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {showCta && <div className="sn-cta-wrap">
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
          </div>}

          {isAuthenticated && (
            <div ref={accountRef} className="sn-account" style={{ position: 'relative' }}>
              <button
                onClick={() => setAccountOpen(v => !v)}
                aria-label="Account"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: `1px solid ${c12}`, background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: charcoal,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="8.5" r="3.5" />
                  <path d="M5 19.5c1.4-3.2 4-4.8 7-4.8s5.6 1.6 7 4.8" />
                </svg>
              </button>
              {accountOpen && (
                <div role="menu" style={{
                  position: 'absolute', right: 0, top: 44, minWidth: 190, background: cream,
                  border: `1px solid ${c12}`, borderRadius: 12, padding: 6, boxShadow: '0 12px 30px rgba(28,28,26,0.10)',
                }}>
                  {ACCOUNT_LINKS.map(l => (
                    <Link key={l.href} href={l.href} role="menuitem" className="sn-menu-item"
                      style={{ display: 'block', fontFamily: sans, fontSize: 14, color: charcoal, textDecoration: 'none', padding: '9px 12px', borderRadius: 8 }}>
                      {l.label}
                    </Link>
                  ))}
                  <button role="menuitem" onClick={signOut} className="sn-menu-item"
                    style={{ display: 'block', width: '100%', textAlign: 'left', fontFamily: sans, fontSize: 14, color: charcoal, background: 'none', border: 'none', padding: '9px 12px', borderRadius: 8, cursor: 'pointer' }}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            className="sn-hamburger"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: charcoal,
              width: 44, height: 44, boxSizing: 'border-box', alignItems: 'center', justifyContent: 'center',
            }}
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
          {[...links, ...(isAuthenticated ? ACCOUNT_LINKS : [])].map(l => (
            <Link
              key={l.href} href={l.href}
              onClick={() => setMenuOpen(false)}
              aria-current={isActivePath(pathname, l.href) ? 'page' : undefined}
              style={{
                fontFamily: sans, fontSize: 16, color: charcoal, textDecoration: 'none',
                padding: '14px 0', borderBottom: `1px solid ${c12}`, display: 'block',
                opacity: isActivePath(pathname, l.href) ? 1 : 0.75, fontWeight: isActivePath(pathname, l.href) ? 500 : 400,
              }}
            >
              {l.label}
            </Link>
          ))}
          {isAuthenticated && (
            <button onClick={signOut} style={{
              fontFamily: sans, fontSize: 16, color: charcoal, textAlign: 'left', background: 'none', border: 'none',
              padding: '14px 0', borderBottom: `1px solid ${c12}`, display: 'block', width: '100%', opacity: 0.75, cursor: 'pointer',
            }}>
              Sign out
            </button>
          )}
          {showCta && <div style={{ paddingTop: 20 }}>
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
          </div>}
        </div>
      )}

      {paywallOpen && (
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
      )}
    </>
  )
}
