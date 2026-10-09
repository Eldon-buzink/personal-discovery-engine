'use client'

// Shared presentational pieces of the report experience — the blob engine
// (also used by TraitCarousel), the orbit cluster, the unlocked-content block, and the tag
// pill. Pulled out of app/report/page.tsx so app/report/sample/page.tsx (the
// static example report linked from the landing page's "See an example
// report" CTA) can reuse the exact same visuals with hardcoded content,
// without either duplicating ~400 lines of blob math or exporting arbitrary
// named exports from a page.tsx file (Next.js's App Router only allows a
// fixed set of exports — default, metadata, generateStaticParams, etc. —
// from a page module, and rejects anything else at build time).

import { useEffect, useId, useMemo, useRef } from 'react'
import type { PatternContent } from '@/lib/known/types'

// ── Design tokens ─────────────────────────────────────────────────────────────

const gray = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal = '#262420'
const line = '#E5E1D5'

const sans = 'var(--font-inter), system-ui, sans-serif'
const serif = 'var(--font-newsreader), serif'

// ── Shared types ──────────────────────────────────────────────────────────────

export interface FacetEntry {
  facet: string
  traitWord: string
  hueOffset: number
  content: PatternContent | null
}

export interface OrbitCondition { traitWord: string; hue: number }

// ── Hue helpers ───────────────────────────────────────────────────────────────

const curatedHues = [
  { hue: 8 }, { hue: 35 }, { hue: 145 }, { hue: 175 },
  { hue: 205 }, { hue: 235 }, { hue: 290 }, { hue: 335 },
]

export function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function userCuratedHue(seedStr: string, offset: number): number {
  const key = seedStr + '-' + offset
  const base = hashSeed(key)
  const bucket = base % curatedHues.length
  const jitter = (hashSeed(key + 'jitter') % 21) - 10
  return (curatedHues[bucket].hue + jitter + 360) % 360
}

// ── Blob engine ───────────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface MotionPoint { phase: number; freq: number; ampScale: number }

export function buildPointMotionProfile(seed: number, points: number): MotionPoint[] {
  const rand = seededRandom(seed)
  const profile: MotionPoint[] = []
  for (let i = 0; i < points; i++) {
    profile.push({ phase: rand() * Math.PI * 2, freq: 0.4 + rand() * 0.5, ampScale: 0.7 + rand() * 0.6 })
  }
  return profile
}

interface Pt { x: number; y: number }

export function generateAnimatedBlobPath(
  cx: number, cy: number, baseRadius: number,
  profile: MotionPoint[], irregularity: number, t: number,
): string {
  const n = profile.length
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = i * (Math.PI * 2) / n
    const p = profile[i]
    const r = baseRadius * (1 + Math.sin(t * p.freq + p.phase) * irregularity * p.ampScale)
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  function ctb(p0: Pt, p1: Pt, p2: Pt, p3: Pt) {
    return {
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      end: p2,
    }
  }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `
  for (let i = 0; i < n; i++) {
    const seg = ctb(pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n])
    d += `C ${seg.c1.x.toFixed(1)} ${seg.c1.y.toFixed(1)}, ${seg.c2.x.toFixed(1)} ${seg.c2.y.toFixed(1)}, ${seg.end.x.toFixed(1)} ${seg.end.y.toFixed(1)} `
  }
  return d + 'Z'
}

// ── Primitives ────────────────────────────────────────────────────────────────

export function TagPill({ label, hue = 8 }: { label: string; hue?: number }) {
  return (
    <span style={{
      fontFamily: sans,
      fontSize: 12.5,
      padding: '5px 12px',
      borderRadius: 14,
      border: `1px solid hsl(${hue},40%,75%)`,
      color: charcoalSoft,
      background: 'white',
      whiteSpace: 'nowrap' as const,
    }}>
      {label}
    </span>
  )
}

// ── Orbit cluster (Where you thrive) ──────────────────────────────────────────

const ORBIT_R = 92
const OCX = 250
const OCY = 125

export function OrbitCluster({
  conditions,
  primaryTraitWord,
  primaryHue,
  activeIdx,
  onSelect,
}: {
  conditions: OrbitCondition[]
  primaryTraitWord: string
  primaryHue: number
  activeIdx: number
  onSelect: (i: number) => void
}) {
  const uid = useId().replace(/:/g, '')
  const fid = `ocf-${uid}`
  const startRef = useRef<number | null>(null)
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const isVisibleRef = useRef(true)
  const count = conditions.length

  const renderItems = useMemo(() => {
    if (count === 0) {
      return [{ idx: 0, isActive: true, weak: true, hue: primaryHue, cx: OCX, cy: OCY, radius: 72, profile: buildPointMotionProfile(hashSeed(primaryTraitWord + '-env-weak'), 8), word: primaryTraitWord }]
    }
    if (count === 1) {
      return [{ idx: 0, isActive: true, weak: false, hue: conditions[0].hue, cx: OCX, cy: OCY, radius: 82, profile: buildPointMotionProfile(hashSeed(conditions[0].traitWord + '-env-shape'), 8), word: conditions[0].traitWord }]
    }
    return conditions.map((c, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2
      const cx = OCX + Math.cos(angle) * ORBIT_R
      const cy = OCY + Math.sin(angle) * ORBIT_R
      const isActive = i === activeIdx
      return { idx: i, isActive, weak: false, hue: c.hue, cx, cy, radius: isActive ? 54 : 36, profile: buildPointMotionProfile(hashSeed(c.traitWord + '-env-shape'), 8), word: c.traitWord }
    })
  }, [conditions, activeIdx, primaryTraitWord, primaryHue, count])

  // Only animates while the cluster is in view.
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    isVisibleRef.current = false
    const observer = new IntersectionObserver(
      ([entry]) => { isVisibleRef.current = entry.isIntersecting },
      { rootMargin: '200px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let raf: number
    function tick(now: number) {
      if (startRef.current === null) startRef.current = now
      const t = (now - startRef.current) / 1000
      if (isVisibleRef.current) {
        renderItems.forEach((b) => {
          pathRefs.current[b.idx]?.setAttribute('d', generateAnimatedBlobPath(b.cx, b.cy, b.radius, b.profile, 0.28, t))
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [renderItems])

  const isOrbit = count >= 2

  return (
    <div style={{ position: 'relative', height: 260 }} ref={wrapRef}>
      {/* Orbit ring — multi-condition only */}
      {isOrbit && (
        <div style={{
          position: 'absolute', left: '50%', top: OCY,
          width: ORBIT_R * 2, height: ORBIT_R * 2, borderRadius: '50%',
          border: `1px dashed ${line}`, transform: 'translate(-50%, -50%)', pointerEvents: 'none',
        }} />
      )}

      {/* "You" dot — orbit center for multi, inside blob for single/none */}
      <div style={{
        position: 'absolute', left: '50%', top: OCY,
        transform: 'translate(-50%, -50%)',
        zIndex: 10, pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: isOrbit ? 30 : 24, height: isOrbit ? 30 : 24, borderRadius: '50%',
          background: charcoal, border: `${isOrbit ? 4 : 3}px solid #F7F4ED`, boxShadow: `0 0 0 1px ${line}`,
        }} />
        <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, color: charcoalSoft, marginTop: 6 }}>You</span>
      </div>

      {/* Blobs */}
      <svg viewBox="0 0 500 260" width="100%" height={260} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', display: 'block' }}>
        <defs>
          <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          {renderItems.map((b) => (
            <radialGradient key={b.idx} id={`ocg-${uid}-${b.idx}`} cx="45%" cy="40%" r="70%">
              {b.isActive && !b.weak ? (
                <>
                  <stop offset="0%"   stopColor={`hsl(${b.hue},80%,62%)`} stopOpacity="1"    />
                  <stop offset="50%"  stopColor={`hsl(${b.hue},78%,60%)`} stopOpacity="0.85" />
                  <stop offset="80%"  stopColor={`hsl(${b.hue},65%,70%)`} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={`hsl(${b.hue},55%,82%)`} stopOpacity="0"    />
                </>
              ) : (
                <>
                  <stop offset="0%"   stopColor={`hsl(${b.hue},${b.weak ? 50 : 55}%,${b.weak ? 76 : 78}%)`} stopOpacity={b.weak ? '0.5' : '0.55'} />
                  <stop offset="100%" stopColor={`hsl(${b.hue},50%,86%)`} stopOpacity="0" />
                </>
              )}
            </radialGradient>
          ))}
        </defs>
        {renderItems.map((b) => (
          <path
            key={b.idx}
            ref={(el) => { pathRefs.current[b.idx] = el }}
            d={generateAnimatedBlobPath(b.cx, b.cy, b.radius, b.profile, 0.28, 0)}
            fill={`url(#ocg-${uid}-${b.idx})`}
            filter={`url(#${fid})`}
            style={{
              opacity: b.weak ? 0.6 : 1,
              cursor: isOrbit && !b.isActive ? 'pointer' : 'default',
              pointerEvents: isOrbit && !b.isActive ? 'all' : 'none',
            }}
            onClick={() => isOrbit && onSelect(b.idx)}
          />
        ))}
      </svg>

      {/* Labels */}
      {renderItems.map((b) => {
        const topPct = isOrbit
          ? (b.cy / 260) * 100
          : ((b.cy + b.radius + 14) / 260) * 100
        return (
          <div
            key={b.idx}
            style={{
              position: 'absolute',
              left: `${(b.cx / 500) * 100}%`,
              top: `${topPct}%`,
              transform: isOrbit ? 'translate(-50%, -50%)' : 'translate(-50%, 0)',
              fontFamily: serif, fontStyle: 'italic', fontWeight: 500,
              fontSize: isOrbit ? (b.isActive ? 14 : 10.5) : 13,
              color: b.weak ? gray : `hsl(${b.hue},50%,26%)`,
              zIndex: 5, pointerEvents: 'none', textAlign: 'center',
            }}
          >
            {b.word}
          </div>
        )
      })}

      {/* Tagline for no-strong-conditions */}
      {count === 0 && (
        <p style={{
          position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
          fontFamily: serif, fontStyle: 'italic', fontSize: 12.5, color: gray,
          textAlign: 'center', width: 260, margin: 0, pointerEvents: 'none',
        }}>
          A subtle lean — not a strong signal either way
        </p>
      )}
    </div>
  )
}

// ── Unlocked content ─────────────────────────────────────────────────────────

export function UnlockedContent({
  traitWord, content, hue,
  subtitle = 'Your first pattern',
  source = 'From your assessment',
  hideQuote = false,
}: {
  traitWord: string
  content: PatternContent
  hue: number
  subtitle?: string
  source?: string
  // Skips title/subtitle/trait_quote/"Where this shows up"+where_it_shows_up — for
  // branches (currently: Energy) where that narrative is already shown per-item
  // elsewhere on the page, so trait_quote/where_it_shows_up would be a duplicate.
  // tags/go_deeper/worth_trying aren't duplicated anywhere, so they still render.
  hideQuote?: boolean
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      {!hideQuote && (
        <>
          <h2 style={{
            fontFamily: serif,
            fontSize: 25,
            fontWeight: 600,
            color: charcoal,
            margin: '0 0 6px',
            textAlign: 'center',
          }}>
            {traitWord}
          </h2>

          <p style={{ fontFamily: sans, fontSize: 13, color: gray, marginBottom: 22, textAlign: 'center' }}>
            {subtitle}
          </p>

          <div style={{ maxWidth: 420, margin: '0 auto 24px' }}>
            <p style={{
              fontFamily: serif,
              fontStyle: 'italic',
              fontSize: 17,
              lineHeight: 1.5,
              color: charcoalSoft,
              textAlign: 'center',
            }}>
              {content.trait_quote}
            </p>
          </div>

          <p style={{ fontFamily: sans, fontSize: 12, color: gray, margin: '0 0 24px', textAlign: 'center' }}>
            {source}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: `hsl(${hue},55%,50%)`, flexShrink: 0 }} />
            <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: charcoal, margin: 0 }}>
              Where this shows up
            </p>
          </div>

          <div style={{ maxWidth: 420, margin: '0 auto', marginBottom: 16 }}>
            <p style={{ fontFamily: sans, fontSize: 14.5, lineHeight: 1.7, color: charcoalSoft, textAlign: 'center' }}>
              {content.where_it_shows_up}
            </p>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 7, margin: '0 0 26px' }}>
        {content.tags.map((t) => <TagPill key={t} label={t} hue={hue} />)}
      </div>

      <div className="report-cards-row" style={{ maxWidth: 500, margin: '0 auto 8px' }}>
        <div style={{
          flex: 1, background: 'white', border: `1px solid ${line}`, borderRadius: 12, padding: 18,
          display: 'flex', flexDirection: 'column', textAlign: 'left',
        }}>
          <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 700, margin: '0 0 10px', textAlign: 'left' }}>
            Go deeper
          </p>
          <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: charcoal, margin: '0 0 14px', textAlign: 'left' }}>
            {content.go_deeper}
          </p>
        </div>

        <div style={{
          flex: 1, background: '#F3F1EB', border: `1px solid ${line}`, borderRadius: 12, padding: 18,
          display: 'flex', flexDirection: 'column', textAlign: 'left',
        }}>
          <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 700, margin: '0 0 10px', textAlign: 'left' }}>
            Worth trying
          </p>
          <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: charcoal, margin: 0, textAlign: 'left' }}>
            {content.worth_trying}
          </p>
        </div>
      </div>
    </div>
  )
}
