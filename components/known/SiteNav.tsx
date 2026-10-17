'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { css } from '@/lib/design/type'

// SiteNav mounts on every page, including static blog/marketing pages that
// never open the paywall — PaywallModal pulls in the Stripe Elements SDK
// (@stripe/react-stripe-js), which a static top-level import bundled into
// every page's JS regardless of whether the modal is ever opened. Dynamic
// import + only rendering it once paywallOpen is true (below) means that
// code is fetched the first time it's actually needed, not on every page
// load. ssr:false since it's a client-only modal (Stripe Elements requires
// the browser).
const PaywallModal = dynamic(() => import('./PaywallModal'), { ssr: false })

// The one navigation for the whole product (landing, marketing pages, the
// report, the practice). After mrdoge.ai: no bar while the page is at the
// top, then a floating, rounded, frosted bar once it scrolls (a class flip
// past 8px with a 200ms transition; nothing follows the scroll position).
// Quiet links with a soft pill on hover, one small primary button. On a
// phone: logo and a menu button that opens everything in a panel.

// Space the nav takes at the top: 12px above the 60px bar, 12px below.
export const NAV_H = 84 // exported so pages can offset their paddingTop

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
  start:    { label: 'Start the assessment',     href: '/onboarding' },
  continue: { label: 'Continue your assessment', href: '/assessment' },
  unlock:   { label: 'Unlock your branches',     href: null          },
  report:   { label: 'View your report',         href: '/report'     },
}

const NAV_LINKS = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Pricing',      href: '/pricing'      },
  { label: 'Blog',         href: '/blog'         },
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

const ink = '#262420'
const navCSS = `
  .sn{position:fixed;top:0;left:0;right:0;z-index:200;padding:12px 16px;pointer-events:none;}
  .sn-inner{pointer-events:auto;position:relative;max-width:1200px;margin:0 auto;height:60px;padding:0 10px 0 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;
    border-radius:16px;border:1px solid transparent;background:transparent;
    transition:background-color var(--dur-ui) var(--ease),border-color var(--dur-ui) var(--ease),box-shadow var(--dur-ui) var(--ease);}
  .sn[data-scrolled="true"] .sn-inner,.sn[data-open="true"] .sn-inner{background:rgba(247,244,237,0.74);border-color:rgba(38,36,32,0.08);
    -webkit-backdrop-filter:blur(24px) saturate(1.4);backdrop-filter:blur(24px) saturate(1.4);box-shadow:0 8px 40px -12px rgba(38,36,32,0.28);}
  .sn-logo{font-family:var(--font-display);font-size:22px;font-weight:400;letter-spacing:-0.02em;color:${ink};text-decoration:none;flex-shrink:0;}
  .sn-right{display:flex;align-items:center;gap:4px;}
  .sn-link{${css.ui}font-weight:400;color:rgba(38,36,32,0.7);padding:8px 12px;border-radius:999px;text-decoration:none;
    transition:color var(--dur-ui) var(--ease),background-color var(--dur-ui) var(--ease);}
  .sn-link:hover{color:${ink};background:rgba(38,36,32,0.05);}
  .sn-link[aria-current="page"]{color:${ink};font-weight:500;}
  .sn-cta{${css.ui}display:inline-flex;align-items:center;height:40px;padding:0 16px;margin-left:8px;border:none;border-radius:999px;background:${ink};color:#F7F4ED;
    white-space:nowrap;text-decoration:none;cursor:pointer;box-shadow:0 1px 3px rgba(38,36,32,0.18);transition:transform var(--dur-ui) var(--ease);}
  .sn-cta:active{transform:scale(0.97);}
  .sn-account{position:relative;margin-left:4px;}
  .sn-avatar{width:40px;height:40px;border-radius:50%;border:1px solid rgba(38,36,32,0.12);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:${ink};
    transition:background-color var(--dur-ui) var(--ease);}
  .sn-avatar:hover{background:rgba(38,36,32,0.05);}
  .sn-menu{position:absolute;right:0;top:48px;min-width:190px;padding:8px;border-radius:16px;background:rgba(247,244,237,0.96);
    border:1px solid rgba(38,36,32,0.08);box-shadow:0 8px 40px -12px rgba(38,36,32,0.28);}
  .sn-item{${css.ui}font-weight:400;display:flex;align-items:center;width:100%;min-height:40px;padding:0 12px;border:none;border-radius:10px;background:none;color:${ink};text-align:left;text-decoration:none;cursor:pointer;}
  .sn-item:hover{background:rgba(38,36,32,0.05);}
  .sn-menu-btn{display:none;width:44px;height:44px;border:none;background:transparent;border-radius:12px;align-items:center;justify-content:center;color:${ink};cursor:pointer;}
  /* Open menu: solid bar and panel, so the page doesn't show through. */
  .sn[data-open="true"] .sn-inner{background:#F7F4ED;}
  .sn-panel{pointer-events:auto;max-width:1200px;margin:8px auto 0;padding:8px;border-radius:16px;background:#F7F4ED;
    border:1px solid rgba(38,36,32,0.08);box-shadow:0 8px 40px -12px rgba(38,36,32,0.28);}
  .sn-panel .sn-item{${css.body}min-height:48px;}
  .sn-panel .sn-item[aria-current="page"]{font-weight:500;}
  .sn-panel .sn-cta{display:flex;justify-content:center;width:100%;height:48px;margin:8px 0 4px;}
  .sn-logo:focus-visible,.sn-link:focus-visible,.sn-cta:focus-visible,.sn-avatar:focus-visible,.sn-item:focus-visible,.sn-menu-btn:focus-visible{outline:2px solid ${ink};outline-offset:2px;}
  @media(max-width:760px){
    .sn-right .sn-link,.sn-right .sn-cta,.sn-account{display:none;}
    .sn-menu-btn{display:inline-flex;}
    .sn-inner{padding:0 4px 0 16px;}
  }
  @media(prefers-reduced-motion:reduce){ .sn-inner,.sn-cta,.sn-link{transition:none;} }
`

// ── Component ─────────────────────────────────────────────────────────────────

export default function SiteNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const [ctaState, setCtaState] = useState<CtaState>('start')
  const [traitCount, setTraitCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
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

  // The frosted bar shows once the page has scrolled at all.
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

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

  const ctaButton = (onDone?: () => void) => cta.href ? (
    <Link href={cta.href} className="sn-cta" onClick={onDone}>{cta.label}</Link>
  ) : (
    <button type="button" className="sn-cta" onClick={() => { onDone?.(); setPaywallOpen(true) }}>{cta.label}</button>
  )

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: navCSS }} />

      <header className="sn" data-scrolled={scrolled} data-open={menuOpen}>
        <nav className="sn-inner" aria-label="Main">
          <Link href="/" className="sn-logo">Bearing</Link>

          <div className="sn-right">
            {links.map(l => (
              <Link key={l.href} href={l.href} className="sn-link" aria-current={isActivePath(pathname, l.href) ? 'page' : undefined}>
                {l.label}
              </Link>
            ))}

            {showCta && ctaButton()}

            {isAuthenticated && (
              <div ref={accountRef} className="sn-account">
                <button
                  type="button"
                  className="sn-avatar"
                  onClick={() => setAccountOpen(v => !v)}
                  aria-label="Account"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                    <circle cx="12" cy="8.5" r="3.5" />
                    <path d="M5 19.5c1.4-3.2 4-4.8 7-4.8s5.6 1.6 7 4.8" />
                  </svg>
                </button>
                {accountOpen && (
                  <div role="menu" className="sn-menu">
                    {ACCOUNT_LINKS.map(l => (
                      <Link key={l.href} href={l.href} role="menuitem" className="sn-item">{l.label}</Link>
                    ))}
                    <button type="button" role="menuitem" onClick={signOut} className="sn-item">Sign out</button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="sn-menu-btn"
              onClick={() => setMenuOpen(v => !v)}
              aria-expanded={menuOpen}
              aria-controls="sn-panel"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                {menuOpen
                  ? <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
              </svg>
            </button>
          </div>
        </nav>

        {/* ── Phone panel ─────────────────────────────────────────────────── */}
        {menuOpen && (
          <div id="sn-panel" className="sn-panel">
            {[...links, ...(isAuthenticated ? ACCOUNT_LINKS : [])].map(l => (
              <Link
                key={l.href} href={l.href} className="sn-item"
                onClick={() => setMenuOpen(false)}
                aria-current={isActivePath(pathname, l.href) ? 'page' : undefined}
              >
                {l.label}
              </Link>
            ))}
            {isAuthenticated && (
              <button type="button" onClick={signOut} className="sn-item">Sign out</button>
            )}
            {showCta && ctaButton(() => setMenuOpen(false))}
          </div>
        )}
      </header>

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
