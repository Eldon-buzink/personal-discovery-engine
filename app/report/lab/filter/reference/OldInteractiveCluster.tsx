'use client'

// Report lab, reference only: InteractiveCluster as it was at commit a138942
// (removed from main in fded921), copied verbatim so the old A+ mock can be
// rendered next to the new variants. Not used anywhere else.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { buildPointMotionProfile, generateAnimatedBlobPath, hashSeed, userCuratedHue, type FacetEntry } from '@/components/known/ReportVisuals'

const charcoalSoft = '#56534D'
const serif = 'var(--font-newsreader), serif'

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

