'use client'

// Shared presentational pieces of the report experience — the interactive
// trait-cluster, the orbit cluster, the unlocked-content block, and the tag
// pill. Pulled out of app/report/page.tsx so app/report/sample/page.tsx (the
// static example report linked from the landing page's "See an example
// report" CTA) can reuse the exact same visuals with hardcoded content,
// without either duplicating ~400 lines of blob math or exporting arbitrary
// named exports from a page.tsx file (Next.js's App Router only allows a
// fixed set of exports — default, metadata, generateStaticParams, etc. —
// from a page module, and rejects anything else at build time).

import { useEffect, useId, useMemo, useRef, useState } from 'react'
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

function hashSeed(str: string): number {
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

interface MotionPoint { phase: number; freq: number; ampScale: number }

function buildPointMotionProfile(seed: number, points: number): MotionPoint[] {
  const rand = seededRandom(seed)
  const profile: MotionPoint[] = []
  for (let i = 0; i < points; i++) {
    profile.push({ phase: rand() * Math.PI * 2, freq: 0.4 + rand() * 0.5, ampScale: 0.7 + rand() * 0.6 })
  }
  return profile
}

interface Pt { x: number; y: number }

function generateAnimatedBlobPath(
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

// ── Interactive blob cluster ───────────────────────────────────────────────────

// Satellite offsets must clear the active blob (radius 82) plus their own
// radius (58), i.e. stay above ~140 units from the active center — below
// that, satellites crowd into the active blob's edge and labels become
// illegible. dy is left as originally tuned (same-side top/bottom satellite
// spacing was already close to its own minimum); only dx was pulled in, for
// a visibly tighter cluster with ~148-158 unit active-to-satellite distance
// (previously ~160-170).
const CLUSTER_OFFSETS = [
  { dx:    0, dy:   0 },
  { dx: -140, dy: -60 },
  { dx:  135, dy: -60 },
  { dx: -144, dy:  65 },
  { dx:  140, dy:  65 },
]

// CLUSTER_OFFSETS only has 5 fixed slots (1 center + 4 satellites), sized
// and hand-placed for exactly that count. A paid user who keeps going past
// the free 5-trait cap can reveal more than that, and the old modulo-based
// slot assignment silently wrapped around and reused a slot — concretely, a
// 6th trait landed on the exact same {dx:0,dy:0} slot as the active center,
// rendering its label on top of the center label (looked like text
// "ghosting" — confirmed by reproducing it with 6 real traits). For counts
// beyond CLUSTER_OFFSETS.length, satellites go on a ring instead, evenly
// spaced so there's always a unique position per trait, sized so neither
// the active-to-satellite nor the satellite-to-satellite distance ever
// drops below the clearances the 5-slot layout was already tuned for.
function ringRadiusFor(satelliteCount: number): number {
  const minActiveClearance = 148 // matches CLUSTER_OFFSETS' own (tightened) active-to-satellite spacing
  const minAdjacentChord = 130   // satellite radius 58 + 58 + margin
  if (satelliteCount <= 1) return minActiveClearance
  return Math.max(minActiveClearance, minAdjacentChord / (2 * Math.sin(Math.PI / satelliteCount)))
}

function ringSatelliteOffset(rank: number, satelliteCount: number): { dx: number; dy: number } {
  const radius = ringRadiusFor(satelliteCount)
  const angle = (rank / satelliteCount) * Math.PI * 2 - Math.PI / 2
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius }
}

export function InteractiveCluster({
  facets,
  activeIdx,
  onSelect,
}: {
  facets: FacetEntry[]
  activeIdx: number
  onSelect: (i: number) => void
}) {
  const uid = useId().replace(/:/g, '')
  const fid = `ccf-${uid}`

  const startRef = useRef<number | null>(null)
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  const cxBase = 250

  // Label font-size is a fixed px value (below), but the SVG next to it
  // scales via viewBox — width="100%" against a fixed "0 0 500 …" viewBox
  // means blob geometry automatically shrinks on a narrow viewport while
  // label text didn't, so on mobile the (unscaled) labels ate up a growing
  // share of the (shrinking) space between blobs. Only matters once there
  // are enough traits that spacing is already tight — the ≤5-slot layout
  // stays comfortable at any width the product ships at, and this is
  // deliberately left untouched there rather than shrinking text that
  // doesn't need it. containerWidth defaults to 500 (scale 1) until
  // measured, so there's no first-paint flash at the wrong size.
  const [containerWidth, setContainerWidth] = useState(500)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setContainerWidth(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // The 5-slot layout's fixed 130/270 box only ever needed to fit dy up to
  // ±65. The ring layout's vertical reach grows with satellite count, and
  // without the box growing to match, the SVG's own layout height stays at
  // the old 270 while content visually overflows it (via overflow:visible)
  // — which doesn't clip, but does mean sibling elements below (the pill
  // row) don't get pushed down, so the overflowing labels visually collide
  // with them instead. Growing cyBase/viewH together keeps the box exactly
  // as tall as whatever's actually being drawn.
  const { cyBase, viewH } = useMemo(() => {
    if (facets.length <= CLUSTER_OFFSETS.length) return { cyBase: 130, viewH: 270 }
    const halfExtent = ringRadiusFor(facets.length - 1) + 58 /* satellite blob radius */ + 24 /* label clearance */
    return { cyBase: halfExtent, viewH: halfExtent * 2 }
  }, [facets.length])

  const renderItems = useMemo(() => {
    // No render-time cap here anymore — the real enforcement moved to
    // triggerReveal (assessment/page.tsx), before the Haiku call. For a free/
    // unpaid user `facets` can never exceed REVEAL_CAP now (generation stops
    // there), so this naturally reflects that; for a paid user it correctly
    // shows however many traits they actually have, uncapped.
    const count = facets.length
    const order = Array.from({ length: count }, (_, i) => i)
      .sort((a, b) => (a === activeIdx ? 1 : 0) - (b === activeIdx ? 1 : 0))
    return order.map((i) => {
      const f = facets[i]
      const isActive = i === activeIdx
      const hue = userCuratedHue(`ring1-pattern-${f.traitWord.toLowerCase()}`, f.hueOffset)
      const off = isActive
        ? CLUSTER_OFFSETS[0]
        : count <= CLUSTER_OFFSETS.length
        ? CLUSTER_OFFSETS[(i + (i > activeIdx ? 0 : 1)) % CLUSTER_OFFSETS.length]
        : ringSatelliteOffset(i < activeIdx ? i : i - 1, count - 1)
      const cx = cxBase + off.dx
      const cy = cyBase + off.dy
      const radius = isActive ? 82 : 58
      const profile = buildPointMotionProfile(hashSeed(f.traitWord + '-shape'), 9)
      return { facetIdx: i, isActive, hue, cx, cy, radius, profile, word: f.traitWord }
    })
  }, [facets, activeIdx, cxBase, cyBase])

  const isRingLayout = facets.length > CLUSTER_OFFSETS.length
  // Capped at 1, not just containerWidth/500 — the ≤5-slot layout's fixed
  // 22px/12px sizes were tuned against the report column's normal desktop
  // width (~500-520px, i.e. scale ≈1 already), so this should only ever
  // shrink text on a narrower-than-desktop viewport, never grow it past the
  // originally tuned size on a wider one.
  const labelScale = isRingLayout ? Math.min(1, containerWidth / 500) : 1

  // Gated on the same wrapRef the ResizeObserver above already tracks — the
  // rAF loop keeps ticking regardless (cheap), but the per-blob Catmull-Rom
  // path recompute + `d` write only happens while the cluster is actually in
  // view, matching the visibility gating landing-page blobs get via
  // lib/blobs.ts's useBlobAnimation.
  const isVisibleRef = useRef(true)
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
          pathRefs.current[b.facetIdx]?.setAttribute(
            'd',
            generateAnimatedBlobPath(b.cx, b.cy, b.radius, b.profile, 0.3, t),
          )
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [renderItems])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 500 ${viewH}`}
        width="100%"
        height={viewH}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="11" />
          </filter>
          {renderItems.map((b) => (
            <radialGradient key={b.facetIdx} id={`ccg-${uid}-${b.facetIdx}`} cx="45%" cy="40%" r="70%">
              {b.isActive ? (
                <>
                  <stop offset="0%"   stopColor={`hsl(${b.hue},80%,62%)`} stopOpacity="1"    />
                  <stop offset="45%"  stopColor={`hsl(${b.hue},78%,60%)`} stopOpacity="0.88" />
                  <stop offset="75%"  stopColor={`hsl(${b.hue},70%,68%)`} stopOpacity="0.4"  />
                  <stop offset="100%" stopColor={`hsl(${b.hue},60%,80%)`} stopOpacity="0"    />
                </>
              ) : (
                <>
                  <stop offset="0%"   stopColor={`hsl(${b.hue},60%,76%)`} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={`hsl(${b.hue},55%,85%)`} stopOpacity="0"   />
                </>
              )}
            </radialGradient>
          ))}
        </defs>
        {renderItems.map((b) => (
          <path
            key={b.facetIdx}
            ref={(el) => { pathRefs.current[b.facetIdx] = el }}
            d={generateAnimatedBlobPath(b.cx, b.cy, b.radius, b.profile, 0.3, 0)}
            fill={`url(#ccg-${uid}-${b.facetIdx})`}
            filter={`url(#${fid})`}
            style={{ cursor: b.isActive ? 'default' : 'pointer', pointerEvents: b.isActive ? 'none' : 'all' }}
            onClick={() => onSelect(b.facetIdx)}
          />
        ))}
      </svg>
      {renderItems.map((b) => (
        <div
          key={b.facetIdx}
          style={{
            position: 'absolute',
            left: `${(b.cx / 500) * 100}%`,
            top: `${(b.cy / viewH) * 100}%`,
            transform: 'translate(-50%,-50%)',
            fontFamily: serif,
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: (b.isActive ? 22 : 12) * labelScale,
            color: b.isActive ? `hsl(${b.hue},45%,24%)` : charcoalSoft,
            zIndex: 5,
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          {b.word}
        </div>
      ))}
    </div>
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

  // Same visibility-gating pattern as InteractiveCluster above.
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
