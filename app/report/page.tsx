'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { computeFacetScore, getTraitWord } from '@/lib/known/scoring'
import type { PatternContent, PatternContentEntry } from '@/lib/known/types'
import { generatePatternCopy } from '@/app/actions/generatePatternCopy'
import { suggestNextBranch, suggestQualifyingBranches } from '@/lib/known/branchSuggestion'
import type { Branch, BranchSuggestion, QualifyingBranch } from '@/lib/known/branchSuggestion'
import { fetchIsPaid, isRevealCapped } from '@/lib/known/paywall'
import { createClient } from '@/lib/supabase/client'
import PaywallModal, { POST_AUTH_REOPEN_KEY } from '@/components/known/PaywallModal'
import AnimatedBlob from '@/components/known/AnimatedBlob'
import RelationshipsVisual from '@/components/known/RelationshipsVisual'
import EnergyFieldVisual from '@/components/known/EnergyFieldVisual'
import type { EnergyFieldItem } from '@/components/known/EnergyFieldVisual'
import WorkingStyleVisual from '@/components/known/WorkingStyleVisual'
import type { WorkingStyleAxisItem } from '@/components/known/WorkingStyleVisual'
import DirectionAccordion from '@/components/known/DirectionAccordion'
import type { DirectionAccordionItem } from '@/components/known/DirectionAccordion'
import type { WorkingStyleAxis } from '@/lib/known/workingStyleScoring'
import SiteNav, { NAV_H } from '@/components/known/SiteNav'
import SiteFooter from '@/components/known/SiteFooter'

// ── Local types ────────────────────────────────────────────────────────────────

interface SessionResponse { questionId: number; value: number; answeredAt: string }
interface PatternRecord { facet: string; traitWord: string; answeredAt: string }
interface StoredSession {
  questionOrder?: number[]
  responses?: SessionResponse[]
  patternShown?: PatternRecord
  revealedFacets?: string[]
  patternContents?: PatternContentEntry[]
  branchResponses?: { environment?: { answers: unknown[]; completed?: boolean } }
}

interface FacetEntry {
  facet: string
  traitWord: string
  hueOffset: number
  content: PatternContent | null
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const gray = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal = '#262420'
const cream = '#F7F4ED'
const line = '#E5E1D5'

const sans = 'var(--font-inter), system-ui, sans-serif'
const serif = 'var(--font-newsreader), serif'

// ── Responsive CSS ────────────────────────────────────────────────────────────
// "Go deeper"/"Worth trying" side-by-side on narrow screens squeezes each
// card too narrow to read comfortably; the sticky bar's fixed height doesn't
// leave room for leftText to wrap on narrow screens, so the button gets
// pushed out of the bar. Both stack vertically below 560px.
const reportCSS = `
  .report-cards-row{display:flex;gap:12px;}
  .report-sticky-bar{
    position:fixed;bottom:0;left:0;right:0;min-height:64px;background:${cream};
    border-top:1px solid ${line};z-index:100;display:flex;align-items:center;
    justify-content:space-between;padding:14px 28px;gap:16px;
  }
  @media(max-width:560px){
    .report-cards-row{flex-direction:column;}
    .report-sticky-bar{flex-direction:column;align-items:flex-start;padding:16px 20px;gap:10px;}
    .report-sticky-bar .rsb-cta{width:100%;}
    .report-sticky-bar .rsb-cta button{width:100%;}
  }
`

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

function userCuratedHue(seedStr: string, offset: number): number {
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

function TagPill({ label, hue = 8 }: { label: string; hue?: number }) {
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

function InteractiveCluster({
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

  useEffect(() => {
    let raf: number
    function tick(now: number) {
      if (startRef.current === null) startRef.current = now
      const t = (now - startRef.current) / 1000
      renderItems.forEach((b) => {
        pathRefs.current[b.facetIdx]?.setAttribute(
          'd',
          generateAnimatedBlobPath(b.cx, b.cy, b.radius, b.profile, 0.3, t),
        )
      })
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

interface OrbitCondition { traitWord: string; hue: number }

function OrbitCluster({
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

  useEffect(() => {
    let raf: number
    function tick(now: number) {
      if (startRef.current === null) startRef.current = now
      const t = (now - startRef.current) / 1000
      renderItems.forEach((b) => {
        pathRefs.current[b.idx]?.setAttribute('d', generateAnimatedBlobPath(b.cx, b.cy, b.radius, b.profile, 0.28, t))
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [renderItems])

  const isOrbit = count >= 2

  return (
    <div style={{ position: 'relative', height: 260 }}>
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

function UnlockedContent({
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

// ── Loading / empty states ────────────────────────────────────────────────────

function PatternLoadingState({ traitWord, isLoading }: { traitWord: string; isLoading: boolean }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 28 }}>
      <h2 style={{ fontFamily: serif, fontSize: 25, fontWeight: 600, color: charcoal, margin: '0 0 12px' }}>
        {traitWord}
      </h2>
      <p style={{ fontFamily: sans, fontSize: 13.5, color: gray, lineHeight: 1.6 }}>
        {isLoading ? 'Loading your pattern…' : 'Still loading your pattern. Try refreshing in a moment.'}
      </p>
    </div>
  )
}

// ── Empty report state ───────────────────────────────────────────────────────
// Shown pre-first-reveal (zero interaction, or partial Ring 1 progress that
// hasn't produced a completed facet yet — `isUnlocked` doesn't distinguish the
// two, see report/page.tsx isUnlocked derivation). Deliberately not LockedCard:
// no dashed border, no padlock — there's nothing "locked" yet, just nothing there.
// Blobs use a fixed seed, not a user-derived one — there's no real data to seed from.

const EMPTY_STATE_SEED = 'known-empty-report'

function EmptyReportState() {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 2 }}>
        <AnimatedBlob seed={EMPTY_STATE_SEED} hueOffset={0} size={104} baseRadius={37} />
        <AnimatedBlob seed={EMPTY_STATE_SEED} hueOffset={1} size={148} baseRadius={52} />
        <AnimatedBlob seed={EMPTY_STATE_SEED} hueOffset={2} size={104} baseRadius={37} />
      </div>

      <h2 style={{
        fontFamily: serif, fontStyle: 'italic', fontWeight: 600, fontSize: 23,
        color: charcoal, lineHeight: 1.35, margin: '20px 0 10px',
      }}>
        This is where your patterns will live.
      </h2>

      <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 26px' }}>
        Nothing&apos;s surfaced yet — it only takes a handful of honest answers to see the first one.
      </p>

      <Link href="/assessment">
        <button style={{
          background: charcoal, color: cream, borderRadius: 9999, border: 'none',
          padding: '14px 28px', fontFamily: sans, fontSize: 14.5, fontWeight: 500, cursor: 'pointer',
        }}>
          Start the assessment
        </button>
      </Link>
    </div>
  )
}

// ── Section dividers ──────────────────────────────────────────────────────────

function SectionDivider({ marker, body }: { marker: string; body: string }) {
  return (
    <div style={{ borderTop: `1px solid ${line}`, padding: '44px 0 28px', marginTop: 40, textAlign: 'center' }}>
      <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: gray, fontWeight: 600, margin: '0 0 10px' }}>
        {marker}
      </p>
      <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 15, color: charcoalSoft, maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
        {body}
      </p>
    </div>
  )
}

function WhatsnextDivider() {
  return (
    <SectionDivider
      marker="What's next"
      body="Your patterns suggest somewhere worth exploring next."
    />
  )
}

// ── What's next cards ─────────────────────────────────────────────────────────

function Ring1CompleteCard() {
  return (
    <div style={{ background: charcoal, borderRadius: 14, padding: '20px 22px', textAlign: 'center' }}>
      <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: cream, margin: 0, lineHeight: 1.3 }}>
        Fully mapped.
      </p>
      <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: 'rgba(247,244,237,0.8)', marginTop: 8 }}>
        {"You've answered all 120 questions. Your full pattern is mapped."}
      </p>
    </div>
  )
}

function ContinueRing1Card({ totalAnswered, onContinue }: { totalAnswered: number; onContinue: () => void }) {
  return (
    <div style={{ background: charcoal, borderRadius: 14, padding: '20px 22px', textAlign: 'center' }}>
      <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: cream, margin: 0, lineHeight: 1.3 }}>
        Keep discovering
      </p>
      <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: 'rgba(247,244,237,0.8)', marginTop: 8 }}>
        {"You've answered"} {totalAnswered} of 120 questions. More patterns may still surface.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <button onClick={onContinue} style={{ background: 'white', color: charcoal, borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: sans }}>
          Continue →
        </button>
      </div>
    </div>
  )
}

// One card, always — not one design for a single suggestion and a different
// layout for multiple. With multiple qualifying branches, the hero copy stays
// scoped to the top-ranked one only; the rest get named in a trailing
// reference line, not their own copy block.
function BranchSuggestionCard({
  branchLabel,
  reason,
  extraBranchLabels,
  isPaid,
  onSelect,
}: {
  branchLabel: string
  reason: string
  extraBranchLabels?: string[]
  isPaid: boolean
  onSelect: () => void
}) {
  const hasExtra = !!extraBranchLabels && extraBranchLabels.length > 0
  const ctaLabel = isPaid
    ? `Start ${branchLabel} →`
    : hasExtra
    ? `Unlock ${branchLabel} and ${extraBranchLabels!.length} more →`
    : `Unlock ${branchLabel} →`

  return (
    <div style={{
      padding: 2,
      borderRadius: 16,
      background: 'linear-gradient(135deg, hsl(175,65%,55%), hsl(205,65%,60%), hsl(235,60%,65%), hsl(290,55%,60%), hsl(8,65%,60%), hsl(35,70%,58%))',
      backgroundSize: '300% 300%',
      animation: 'gradientRotate 4s ease infinite',
      boxShadow: '0 0 20px 2px hsla(175,65%,55%,0.25), 0 0 40px 4px hsla(205,65%,60%,0.15)',
    }}>
      <div style={{ background: 'white', borderRadius: 14, padding: '20px 22px', textAlign: 'center' }}>
        <p style={{ fontFamily: sans, fontSize: 11, textTransform: 'uppercase', color: gray, fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.05em' }}>
          {branchLabel}
        </p>
        <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: charcoal, margin: 0, lineHeight: 1.3 }}>
          There might be something here
        </p>
        <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, lineHeight: 1.6, marginTop: 8 }}>
          {reason}
        </p>
        {hasExtra && (
          <p style={{ fontFamily: sans, fontSize: 12, color: gray, marginTop: 10 }}>
            {isPaid ? 'Also available' : 'Also unlocks'}: {extraBranchLabels!.join(', ')}.
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button onClick={onSelect} style={{ background: charcoal, color: cream, borderRadius: 8, padding: '10px 18px', fontSize: 13, fontFamily: sans, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sticky bottom bar ─────────────────────────────────────────────────────────

function StickyBar({ leftText, rightLabel, onSelect }: { leftText: string; rightLabel: string; onSelect: () => void }) {
  return (
    <div className="report-sticky-bar">
      <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 16, color: charcoalSoft, margin: 0, flex: 1, minWidth: 0 }}>
        {leftText}
      </p>
      <div
        className="rsb-cta"
        onClick={onSelect}
        style={{
          flexShrink: 0,
          padding: 2,
          borderRadius: 100,
          background: 'linear-gradient(135deg, hsl(175,65%,55%), hsl(205,65%,60%), hsl(235,60%,65%), hsl(290,55%,60%), hsl(8,65%,60%), hsl(35,70%,58%))',
          backgroundSize: '300% 300%',
          animation: 'gradientRotate 4s ease infinite',
          boxShadow: '0 0 20px 2px hsla(175,65%,55%,0.25), 0 0 40px 4px hsla(205,65%,60%,0.15)',
          cursor: 'pointer',
        }}
      >
        <button style={{
          fontFamily: sans, fontSize: 13, fontWeight: 500, color: charcoal,
          padding: '10px 20px', border: 'none', borderRadius: 100,
          background: cream, cursor: 'pointer',
        }}>
          {rightLabel}
        </button>
      </div>
    </div>
  )
}

// ── Branch routing ───────────────────────────────────────────────────────────

const BRANCH_DISPLAY_NAMES: Record<Branch, string> = {
  environment:   'Your environment',
  relationships: 'How I connect',
  energy:        'Your energy',
  working_style: 'Your working style',
  direction:     'Your direction',
}

const BRANCH_ROUTES: Record<Branch, string> = {
  environment:   '/assessment/environment',
  relationships: '/assessment/relationships',
  energy:        '/assessment/energy',
  working_style: '/assessment/working-style',
  direction:     '/assessment/direction',
}

// ── Section ordering ─────────────────────────────────────────────────────────
// Environment/Relationships/Energy sections render in completedAt order, not a
// fixed sequence — Ring 1 ("Who you are") is always first regardless, since it's
// foundational rather than one of the optional branches.

type OptionalBranchKey = 'environment' | 'relationships' | 'energy' | 'working_style' | 'direction'
type SectionKey = 'ring1' | OptionalBranchKey

const SECTION_LABEL: Record<SectionKey, string> = {
  ring1:         'Who you are',
  environment:   'Where you thrive',
  relationships: 'How I connect',
  energy:        'Your energy',
  working_style: 'How I work',
  direction:     'Where this might lead',
}

// Every transition a user could actually hit. Ring 1 is always first, so ring1→X
// covers every possible "first completed branch"; the remaining 20 cover every
// ordered pair among the 5 optional branches — with 5 optional branches, at most
// 4 such transitions can ever occur in one report, so this is exhaustive.
const TRANSITION_BODY: Record<string, string> = {
  'ring1→environment':         "That's what's true on your own. The next part is about what's true around you.",
  'ring1→relationships':       "That's what's true on your own. This part is about what happens when someone else is in the room.",
  'ring1→energy':              "That's what's true on your own. This part is about what actually fuels you day to day.",
  'ring1→working_style':       "That's what's true on your own. This part is about how you actually work, not how you'd describe it.",
  'ring1→direction':           "That's what's true on your own. This part is about where those patterns might actually lead.",
  'environment→relationships': 'Conditions are one thing. This part is about what happens when someone else is in the room.',
  'environment→energy':        'Conditions are one thing. This part is about what actually fuels you day to day.',
  'environment→working_style': "Conditions are one thing. This part is about how you actually work, not how you'd describe it.",
  'environment→direction':     'Conditions are one thing. This part is about where those patterns might actually lead.',
  'relationships→environment': "That's what happens with people. This part is about what's true around you when no one else is in the room.",
  'relationships→energy':      "How you show up in relationships is shaped, in part, by what fuels you — and what doesn't.",
  'relationships→working_style': "That's what happens with people. This part is about how you actually work, not how you'd describe it.",
  'relationships→direction':   "That's what happens with people. This part is about where those patterns might actually lead.",
  'energy→environment':        'What fuels you is one layer. This part is about the conditions that bring out your best work.',
  'energy→relationships':      'What fuels you is one layer. This part is about what happens when someone else is in the room.',
  'energy→working_style':      "What fuels you is one layer. This part is about how you actually work, not how you'd describe it.",
  'energy→direction':          'What fuels you is one layer. This part is about where those patterns might actually lead.',
  'working_style→environment': "That's how you operate day to day. This part is about what's true around you when no one else is in the room.",
  'working_style→relationships': "That's how you operate day to day. This part is about what happens when someone else is in the room.",
  'working_style→energy':      "That's how you operate day to day. This part is about what actually fuels you day to day.",
  'working_style→direction':   "That's how you operate day to day. This part is about where those patterns might actually lead.",
  'direction→environment':     'Those are directions worth considering. This part is about what\'s true around you when no one else is in the room.',
  'direction→relationships':   'Those are directions worth considering. This part is about what happens when someone else is in the room.',
  'direction→energy':          'Those are directions worth considering. This part is about what actually fuels you day to day.',
  'direction→working_style':   "Those are directions worth considering. This part is about how you actually work, not how you'd describe it.",
}

function SectionTransition({ from, to }: { from: SectionKey; to: SectionKey }) {
  return (
    <SectionDivider
      marker={`${SECTION_LABEL[from]} → ${SECTION_LABEL[to]}`}
      body={TRANSITION_BODY[`${from}→${to}`] ?? ''}
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const router = useRouter()
  const [facets, setFacets] = useState<FacetEntry[]>([])
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [ring1Complete, setRing1Complete] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  // Paywall — see lib/known/paywall.ts. isPaid is read from Supabase
  // (public.users, written only by the Stripe webhook).
  const [isPaid, setIsPaidState] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallInitialView, setPaywallInitialView] = useState<'payment' | 'checkout'>('payment')
  // Set from ?session_id= when the page loads back from a Stripe redirect
  // (iDEAL/Bancontact bank auth) — see PaywallModal's resumeSessionId doc
  // comment. Checked in the same effect/tick as userId below, not a separate
  // mount effect, so PaywallModal never receives resumeSessionId ahead of
  // the userId it needs for its confirm/poll cycle.
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
      const uid = session?.user.id ?? null
      setUserId(uid)
      fetchIsPaid(uid).then(setIsPaidState)

      // Just came back from PaywallModal's login-step magic link specifically
      // to pay — reopen straight into checkout instead of making them click
      // "Unlock" again from scratch.
      if (session && localStorage.getItem(POST_AUTH_REOPEN_KEY) === '1') {
        localStorage.removeItem(POST_AUTH_REOPEN_KEY)
        setPaywallInitialView('checkout')
        setPaywallOpen(true)
      }

      // Just came back from authenticating an iDEAL/Bancontact payment with
      // their bank. Cleaned from the URL immediately so a refresh doesn't
      // re-trigger it.
      const sessionId = new URLSearchParams(window.location.search).get('session_id')
      if (sessionId) {
        window.history.replaceState(null, '', window.location.pathname)
        setResumeSessionId(sessionId)
        setPaywallOpen(true)
      }
    })
  }, [])
  const [envEntry, setEnvEntry] = useState<PatternContentEntry | null>(null)
  const [activeEnvIdx, setActiveEnvIdx] = useState(0)
  const [relEntry, setRelEntry] = useState<PatternContentEntry | null>(null)
  const [energyEntry, setEnergyEntry] = useState<PatternContentEntry | null>(null)
  const [wsEntry, setWsEntry] = useState<PatternContentEntry | null>(null)
  const [dirEntry, setDirEntry] = useState<PatternContentEntry | null>(null)
  const [ring1Entries, setRing1Entries] = useState<PatternContentEntry[]>([])

  const [entryCream, setEntryCream] = useState(0)

  useLayoutEffect(() => {
    if (sessionStorage.getItem('known_from') !== 'pattern') return
    sessionStorage.removeItem('known_from')
    setEntryCream(1)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { setEntryCream(0) })
    })
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('known_session')
    if (!raw) return

    let session: StoredSession
    try { session = JSON.parse(raw) } catch { return }

    const responses = Array.isArray(session.responses) ? session.responses : []
    const answeredMap = new Map<number, number>(responses.map((r) => [r.questionId, r.value]))
    const total = responses.length
    setTotalAnswered(total)
    setRing1Complete(total >= 120)

    const pcArray = Array.isArray(session.patternContents) ? session.patternContents : []
    const envPc    = pcArray.find(e => e.branch === 'environment')    ?? null
    const relPc    = pcArray.find(e => e.branch === 'relationships')   ?? null
    const energyPc = pcArray.find(e => e.branch === 'energy')          ?? null
    const wsPc     = pcArray.find(e => e.branch === 'working_style')   ?? null
    const dirPc    = pcArray.find(e => e.branch === 'direction')       ?? null
    const ring1Pcs = pcArray.filter(e => !['environment', 'relationships', 'energy', 'working_style', 'direction'].includes(e.branch ?? ''))
    setEnvEntry(envPc)
    setRelEntry(relPc)
    setEnergyEntry(energyPc)
    setWsEntry(wsPc)
    setDirEntry(dirPc)
    setRing1Entries(ring1Pcs)

    let facetNames: string[] = []
    if (ring1Pcs.length > 0) {
      facetNames = ring1Pcs.map((e) => e.facet)
    } else if (Array.isArray(session.revealedFacets) && session.revealedFacets.length > 0) {
      facetNames = session.revealedFacets
    } else if (session.patternShown) {
      facetNames = [session.patternShown.facet]
    }

    if (facetNames.length === 0) return

    const pcByFacet = new Map(ring1Pcs.map((e) => [e.facet, e]))

    const initial: FacetEntry[] = facetNames.map((facet, idx) => {
      const pc = pcByFacet.get(facet)
      const score = computeFacetScore(facet, answeredMap) ?? 3.0
      const traitWord =
        pc?.traitWord ||
        (session.patternShown?.facet === facet ? session.patternShown!.traitWord : getTraitWord(facet, score))
      return { facet, traitWord, hueOffset: idx, content: pc?.content ?? null }
    })
    setFacets(initial)
  }, [])

  // Generate content for any ring-1 facets that arrived with null content
  // (dev-shortcut path, or user left assessment before AI finished).
  const contentFetchRef = useRef(new Set<string>())
  useEffect(() => {
    const needsContent = facets.filter(f => f.content === null && !contentFetchRef.current.has(f.facet))
    if (needsContent.length === 0) return

    const raw = localStorage.getItem('known_session')
    if (!raw) return
    let session: StoredSession
    try { session = JSON.parse(raw) } catch { return }

    const responses = Array.isArray(session.responses) ? session.responses : []
    const answeredMap = new Map<number, number>(responses.map((r) => [r.questionId, r.value]))
    const assessmentId = localStorage.getItem('known_pending_session_id')

    for (const entry of needsContent) {
      contentFetchRef.current.add(entry.facet)
      const score = computeFacetScore(entry.facet, answeredMap) ?? 3.0
      const dir: 'high' | 'mid' | 'low' = score >= 3.5 ? 'high' : score >= 2.5 ? 'mid' : 'low'

      generatePatternCopy(entry.facet, entry.traitWord, dir, assessmentId)
        .then((content) => {
          setFacets((prev) => prev.map((f) => f.facet === entry.facet ? { ...f, content } : f))
          // Persist so future page loads don't regenerate
          const s: StoredSession = JSON.parse(localStorage.getItem('known_session') ?? '{}')
          const pcs = Array.isArray(s.patternContents) ? s.patternContents : []
          const newEntry: PatternContentEntry = { facet: entry.facet, traitWord: entry.traitWord, scoreDirection: dir, content }
          localStorage.setItem('known_session', JSON.stringify({
            ...s,
            patternContents: [
              ...pcs.filter((e) => !(e.facet === entry.facet && !e.branch)),
              newEntry,
            ],
          }))
        })
        .catch(() => {})
    }
  }, [facets])

  const isUnlocked = facets.length > 0
  const safeIdx = Math.min(activeIdx, Math.max(0, facets.length - 1))
  const activeFacet = facets[safeIdx] ?? null
  const hasContent = facets[0]?.content != null
  const activeHue = activeFacet
    ? userCuratedHue(`ring1-pattern-${activeFacet.traitWord.toLowerCase()}`, activeFacet.hueOffset)
    : 8

  const completedBranches: Branch[] = [
    ...(envEntry    ? ['environment'   as Branch] : []),
    ...(relEntry    ? ['relationships' as Branch] : []),
    ...(energyEntry ? ['energy'        as Branch] : []),
    ...(wsEntry     ? ['working_style' as Branch] : []),
    ...(dirEntry    ? ['direction'     as Branch] : []),
  ]
  const ring1ForEngine = ring1Entries.map(e => ({
    facet: e.facet,
    traitWord: e.traitWord,
    scoreDirection: e.scoreDirection,
    branch: 'ring1' as const,
    content: e.content,
  }))
  const suggestion: BranchSuggestion | null = isUnlocked
    ? suggestNextBranch(ring1ForEngine, completedBranches)
    : null

  // All uncompleted branches clearing the confidence bar, ranked — not just the
  // single top pick. Falls back to the single `suggestion` above when nothing
  // qualifies yet (early on, with too little Ring 1 signal), so there's still
  // always something to point at rather than nothing.
  const qualifyingBranches: QualifyingBranch[] = isUnlocked
    ? suggestQualifyingBranches(ring1ForEngine, completedBranches)
    : []

  const isLocked = isRevealCapped(ring1Entries.length, isPaid)

  // Any branch-start or continue-Ring-1 CTA on this page routes through here.
  // Below the lock, it's a normal navigation; at/past it, PaywallModal opens —
  // it decides internally whether to show its login step first.
  function handleGatedNav(href: string) {
    // TEMPORARY — diagnosing a production report of the sticky bar bypassing
    // the paywall for an authenticated, unpaid user. Remove once resolved.
    console.log('[handleGatedNav] href:', href, 'isLocked:', isLocked, 'isPaid:', isPaid, 'isAuthenticated:', isAuthenticated, 'userId:', userId, 'ring1Entries.length:', ring1Entries.length)
    if (!isLocked) {
      router.push(href)
      return
    }
    setPaywallOpen(true)
  }

  // Optional branches, ordered by when the user actually completed them — not a
  // fixed Environment→Relationships→Energy sequence. Missing completedAt (shouldn't
  // happen for new entries, but guards old/dev-shortcut data) sorts first rather
  // than crashing.
  const orderedOptionalBranches: { key: OptionalBranchKey; entry: PatternContentEntry }[] = [
    ...(envEntry    ? [{ key: 'environment'   as const, entry: envEntry }]    : []),
    ...(relEntry    ? [{ key: 'relationships' as const, entry: relEntry }]    : []),
    ...(energyEntry ? [{ key: 'energy'        as const, entry: energyEntry }] : []),
    ...(wsEntry     ? [{ key: 'working_style' as const, entry: wsEntry }]     : []),
    ...(dirEntry    ? [{ key: 'direction'     as const, entry: dirEntry }]    : []),
  ].sort((a, b) => (a.entry.completedAt ?? '').localeCompare(b.entry.completedAt ?? ''))

  const sections: SectionKey[] = ['ring1', ...orderedOptionalBranches.map(b => b.key)]

  const nextBranchLabel = suggestion ? BRANCH_DISPLAY_NAMES[suggestion.branch] : undefined
  const nextBranchHref  = suggestion ? BRANCH_ROUTES[suggestion.branch]        : undefined

  const stickyBar: { leftText: string; rightLabel: string; onSelect: () => void } | null =
    !isUnlocked || suggestion === null
      ? null
      : ring1Complete
      ? { leftText: suggestion.reason, rightLabel: `${isPaid ? 'Start' : 'Unlock'} ${nextBranchLabel!} →`, onSelect: () => handleGatedNav(nextBranchHref!) }
      : suggestion.isTargeted
      ? { leftText: suggestion.reason, rightLabel: `${isPaid ? 'Start' : 'Unlock'} ${nextBranchLabel!} →`, onSelect: () => handleGatedNav(nextBranchHref!) }
      : { leftText: "There's more underneath this.", rightLabel: 'Keep discovering →', onSelect: () => handleGatedNav('/assessment') }

  // ── Optional-branch section content ──────────────────────────────────────────
  // Each is only ever called for a branch that's actually in orderedOptionalBranches
  // (i.e. already completed), so there's no "locked" fallback to render here.

  function renderEnvironmentSection() {
    if (!envEntry) return null
    const envHue = userCuratedHue(`env-pattern-${envEntry.traitWord.toLowerCase().replace(/\s+/g, '-')}`, 0)
    // Derive orbit conditions from stored strongConditions; fall back to single-item
    // for older entries that don't have strongConditions stored
    const envConditions: OrbitCondition[] = envEntry.strongConditions?.map(sc => ({
      traitWord: sc.traitWord,
      hue: userCuratedHue(`env-pattern-${sc.traitWord.toLowerCase().replace(/\s+/g, '-')}`, 0),
    })) ?? [{ traitWord: envEntry.traitWord, hue: envHue }]

    return (
      <section style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
          Where you thrive
        </p>
        <OrbitCluster
          conditions={envConditions}
          primaryTraitWord={envEntry.traitWord}
          primaryHue={envHue}
          activeIdx={activeEnvIdx}
          onSelect={setActiveEnvIdx}
        />
        <div style={{ marginTop: 20 }}>
          {envEntry.content ? (
            <UnlockedContent
              traitWord={envEntry.traitWord}
              content={envEntry.content}
              hue={envHue}
              subtitle="Your environment pattern"
              source="From your environment branch"
            />
          ) : (
            <PatternLoadingState traitWord={envEntry.traitWord} isLoading={true} />
          )}
        </div>
      </section>
    )
  }

  function renderRelationshipsSection() {
    if (!relEntry) return null
    const relHue = userCuratedHue(`rel-pattern-${relEntry.traitWord.toLowerCase()}`, 0)

    return (
      <section style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
          How I connect
        </p>
        <div style={{ width: '100%', maxWidth: 400, margin: '8px auto 0' }}>
          <RelationshipsVisual
            traitWord={relEntry.traitWord}
            partnerDistance={relEntry.dimensionScores?.partnerDistance ?? 0.5}
            hue={relHue}
          />
        </div>
        <div style={{ marginTop: 20 }}>
          {relEntry.content ? (
            <UnlockedContent
              traitWord={relEntry.traitWord}
              content={relEntry.content}
              hue={relHue}
              subtitle="Your relationships pattern"
              source="From your relationships branch"
            />
          ) : (
            <PatternLoadingState traitWord={relEntry.traitWord} isLoading={true} />
          )}
        </div>
      </section>
    )
  }

  function renderEnergySection() {
    if (!energyEntry) return null
    const fuels  = energyEntry.strongConditions?.filter(c => c.label === 'fuel')  ?? []
    const drains = energyEntry.strongConditions?.filter(c => c.label === 'drain') ?? []
    // Order matches EnergyFieldVisual's fixed layout: top fuel, second fuel, top drain, second drain.
    const fieldItems: EnergyFieldItem[] = [
      { label: fuels[0]?.traitWord  ?? '', side: 'fuel',  score: fuels[0]?.score  ?? 3, quote: fuels[0]?.quote  ?? '', evidence: fuels[0]?.evidence  ?? '' },
      { label: fuels[1]?.traitWord  ?? '', side: 'fuel',  score: fuels[1]?.score  ?? 3, quote: fuels[1]?.quote  ?? '', evidence: fuels[1]?.evidence  ?? '' },
      { label: drains[0]?.traitWord ?? '', side: 'drain', score: drains[0]?.score ?? 3, quote: drains[0]?.quote ?? '', evidence: drains[0]?.evidence ?? '' },
      { label: drains[1]?.traitWord ?? '', side: 'drain', score: drains[1]?.score ?? 3, quote: drains[1]?.quote ?? '', evidence: drains[1]?.evidence ?? '' },
    ]

    return (
      <section style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
          Your energy
        </p>
        {energyEntry.content ? (
          <>
            <div style={{ marginTop: 8 }}>
              <EnergyFieldVisual items={fieldItems} />
            </div>
            <div style={{ marginTop: 28 }}>
              <UnlockedContent
                traitWord={energyEntry.traitWord}
                content={energyEntry.content}
                hue={145}
                subtitle="Your energy pattern"
                source="From your energy branch"
                hideQuote
              />
            </div>
          </>
        ) : (
          <PatternLoadingState traitWord={energyEntry.traitWord} isLoading={true} />
        )}
      </section>
    )
  }

  function renderWorkingStyleSection() {
    if (!wsEntry) return null
    const axisItems: WorkingStyleAxisItem[] = (wsEntry.strongConditions ?? []).map((c) => ({
      axis:     c.label as WorkingStyleAxis,
      position: c.score,
      quote:    c.quote    ?? '',
      evidence: c.evidence ?? '',
    }))

    return (
      <section style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
          How I work
        </p>
        {wsEntry.content ? (
          <>
            <div style={{ marginTop: 8 }}>
              <WorkingStyleVisual items={axisItems} />
            </div>
            <div style={{ marginTop: 28 }}>
              <UnlockedContent
                traitWord={wsEntry.traitWord}
                content={wsEntry.content}
                hue={235}
                subtitle="Your working style pattern"
                source="From your working style branch"
                hideQuote
              />
            </div>
          </>
        ) : (
          <PatternLoadingState traitWord={wsEntry.traitWord} isLoading={true} />
        )}
      </section>
    )
  }

  function renderDirectionSection() {
    if (!dirEntry) return null
    const items: DirectionAccordionItem[] = (dirEntry.strongConditions ?? []).map((c, i) => ({
      tier:    i === 0 ? 'Closest match' : 'Worth exploring',
      word:    c.word ?? c.traitWord,
      summary: c.quote ?? '',
      body:    c.evidence ?? '',
    }))

    return (
      <section style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
          Where this might lead
        </p>
        {dirEntry.content ? (
          <div style={{ marginTop: 20 }}>
            <DirectionAccordion items={items} />
          </div>
        ) : (
          <PatternLoadingState traitWord={dirEntry.traitWord} isLoading={true} />
        )}
      </section>
    )
  }

  const SECTION_RENDERERS: Record<OptionalBranchKey, () => JSX.Element | null> = {
    environment:   renderEnvironmentSection,
    relationships: renderRelationshipsSection,
    energy:        renderEnergySection,
    working_style: renderWorkingStyleSection,
    direction:     renderDirectionSection,
  }

  return (
    <>
      {/* Entry cream overlay for transition 3 */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: '#F5F2EB',
        opacity: entryCream,
        pointerEvents: 'none',
        transition: entryCream === 1 ? 'none' : 'opacity 0.6s ease',
      }} />

      <style>{reportCSS}</style>
      <SiteNav />
      {stickyBar && <StickyBar {...stickyBar} />}

      <div style={{ background: cream, minHeight: '100vh', paddingTop: NAV_H }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 22px 64px' }}>

          {/* ── Intro ─────────────────────────────────────── */}
          <div style={{ padding: '36px 0 30px', textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 12 }}>
              Your report
            </p>
            <h1 style={{ fontFamily: serif, fontSize: 27, fontWeight: 500, lineHeight: 1.3, color: charcoal, margin: '0 0 12px' }}>
              Everything found so far.
            </h1>
            <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
              All patterns surface here as you explore.
            </p>
          </div>

          {/* ── Branch 1: Who you are (always first) ─────────── */}
          <section style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
              {isUnlocked ? 'Who you are' : 'Your report'}
            </p>

            {isUnlocked ? (
              <>
                <InteractiveCluster facets={facets} activeIdx={safeIdx} onSelect={setActiveIdx} />

                <div style={{ marginTop: 28 }}>
                  {activeFacet?.content ? (
                    <UnlockedContent
                      traitWord={activeFacet.traitWord}
                      content={activeFacet.content}
                      hue={activeHue}
                    />
                  ) : (
                    <PatternLoadingState
                      traitWord={activeFacet?.traitWord ?? ''}
                      isLoading={true}
                    />
                  )}
                </div>
              </>
            ) : (
              <EmptyReportState />
            )}
          </section>

          {/* ── Optional branches, in the order the user actually completed them ── */}
          {isUnlocked && orderedOptionalBranches.map((b, i) => (
            <Fragment key={b.key}>
              <SectionTransition from={sections[i]} to={sections[i + 1]} />
              {SECTION_RENDERERS[b.key]()}
            </Fragment>
          ))}

          {/* ── What's next: trails whichever section was completed most recently ── */}
          {hasContent && (
            <>
              <WhatsnextDivider />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ring1Complete ? (
                  <Ring1CompleteCard />
                ) : (
                  <ContinueRing1Card totalAnswered={totalAnswered} onContinue={() => handleGatedNav('/assessment')} />
                )}

                {qualifyingBranches.length > 0 ? (
                  <BranchSuggestionCard
                    branchLabel={BRANCH_DISPLAY_NAMES[qualifyingBranches[0].branch]}
                    reason={qualifyingBranches[0].reason}
                    extraBranchLabels={qualifyingBranches.slice(1).map((b) => BRANCH_DISPLAY_NAMES[b.branch])}
                    isPaid={isPaid}
                    onSelect={() => handleGatedNav(BRANCH_ROUTES[qualifyingBranches[0].branch])}
                  />
                ) : (
                  suggestion && nextBranchLabel && nextBranchHref && (suggestion.isTargeted || ring1Complete) && (
                    <BranchSuggestionCard
                      branchLabel={nextBranchLabel}
                      onSelect={() => handleGatedNav(nextBranchHref)}
                      reason={suggestion.reason}
                      isPaid={isPaid}
                    />
                  )
                )}
              </div>
            </>
          )}

          {/* ── Report footer note ─────────────────────── */}
          <div style={{ marginTop: 64, paddingTop: 28, borderTop: `1px solid ${line}`, textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 11.5, color: gray }}>
              A living report — it grows as you keep exploring.
            </p>
          </div>

        </div>
      </div>
      <SiteFooter />

      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => { setPaywallOpen(false); setResumeSessionId(null) }}
        isAuthenticated={isAuthenticated}
        userId={userId}
        traitCount={ring1Entries.length}
        initialView={paywallInitialView}
        resumeSessionId={resumeSessionId}
        onAuthenticated={(uid) => {
          setIsAuthenticated(true)
          setUserId(uid)
        }}
        onPaymentConfirmed={() => {
          fetchIsPaid(userId).then(setIsPaidState)
          setPaywallOpen(false)
          setResumeSessionId(null)
        }}
      />

    </>
  )
}
