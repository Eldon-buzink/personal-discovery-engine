'use client'

import { useEffect, useId, useMemo, useRef } from 'react'

// ── Blob engine (matches report page / RelationshipsVisual) ───────────────────

function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function seededRandom(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface MotionPoint { phase: number; freq: number; ampScale: number }

function buildPointMotionProfile(seed: number, points: number): MotionPoint[] {
  const rand = seededRandom(seed)
  return Array.from({ length: points }, () => ({
    phase:    rand() * Math.PI * 2,
    freq:     0.4 + rand() * 0.5,
    ampScale: 0.7 + rand() * 0.6,
  }))
}

interface Pt { x: number; y: number }

function generateAnimatedBlobPath(
  cx: number, cy: number, baseRadius: number,
  profile: MotionPoint[], irregularity: number, t: number,
): string {
  const n = profile.length
  const pts: Pt[] = profile.map((p, i) => {
    const a = i * (Math.PI * 2) / n
    const r = baseRadius * (1 + Math.sin(t * p.freq + p.phase) * irregularity * p.ampScale)
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
  })
  function ctrl(p0: Pt, p1: Pt, p2: Pt, p3: Pt) {
    return {
      c1:  { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2:  { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      end: p2,
    }
  }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `
  for (let i = 0; i < n; i++) {
    const seg = ctrl(pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n])
    d += `C ${seg.c1.x.toFixed(1)} ${seg.c1.y.toFixed(1)}, ${seg.c2.x.toFixed(1)} ${seg.c2.y.toFixed(1)}, ${seg.end.x.toFixed(1)} ${seg.end.y.toFixed(1)} `
  }
  return d + 'Z'
}

// ── Layout: matches reference/known-branch-flows.html initEnBlob() ────────────
// Two blobs side by side: fuel (left) and drain (right).
// viewBox 0 0 280 210 — content (blobs + labels) occupies the same 0-170 region as
// before; the extra 40 units below is deliberate bottom padding so the pattern-detected
// screen's quote text doesn't sit flush against the labels (matches RelationshipsVisual,
// whose 210-tall viewBox leaves ~55px of blank space below its lowest element).
// Fuel: cx=72, cy=90, r=58. Drain: cx=208, cy=90, r=58.
// Labels BELOW each blob: primary label at y=150, sub ("fuel"/"drain") at y=163.

export default function EnergyVisual({
  topFuel,
  topDrain,
}: {
  topFuel:  { label: string; score: number }
  topDrain: { label: string; score: number }
}) {
  const uid = useId().replace(/:/g, '')

  const fuelProfile  = useMemo(() => buildPointMotionProfile(hashSeed('en-fuel-shape'),  9), [])
  const drainProfile = useMemo(() => buildPointMotionProfile(hashSeed('en-drain-shape'), 9), [])

  const fuelRef  = useRef<SVGPathElement | null>(null)
  const drainRef = useRef<SVGPathElement | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    let raf: number
    function tick(now: number) {
      if (startRef.current === null) startRef.current = now
      const t = (now - startRef.current) / 1000
      fuelRef.current?.setAttribute('d',  generateAnimatedBlobPath(72,  90, 58, fuelProfile,  0.28, t))
      drainRef.current?.setAttribute('d', generateAnimatedBlobPath(208, 90, 58, drainProfile, 0.28, t + 1.2))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fuelProfile, drainProfile])

  const sans = 'var(--font-inter), system-ui, sans-serif'

  const fuelLabel  = topFuel.label
  const drainLabel = topDrain.label

  return (
    <svg
      viewBox="0 0 280 210"
      width="100%"
      height={210}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <filter id={`ef-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        {/* Fuel: desaturated moss green — reads as growth/energy without stoplight green */}
        <radialGradient id={`efg-${uid}`} cx="45%" cy="40%" r="70%">
          <stop offset="0%"   stopColor="hsl(145,50%,46%)" stopOpacity="1"    />
          <stop offset="45%"  stopColor="hsl(145,46%,53%)" stopOpacity="0.88" />
          <stop offset="75%"  stopColor="hsl(145,40%,64%)" stopOpacity="0.4"  />
          <stop offset="100%" stopColor="hsl(145,34%,76%)" stopOpacity="0"    />
        </radialGradient>
        {/* Drain: desaturated coral red — reads as cost/friction without stoplight red */}
        <radialGradient id={`edg-${uid}`} cx="45%" cy="40%" r="70%">
          <stop offset="0%"   stopColor="hsl(8,55%,52%)"   stopOpacity="1"    />
          <stop offset="45%"  stopColor="hsl(8,50%,59%)"   stopOpacity="0.88" />
          <stop offset="75%"  stopColor="hsl(8,44%,70%)"   stopOpacity="0.4"  />
          <stop offset="100%" stopColor="hsl(8,36%,80%)"   stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* ── Fuel blob (left) ── */}
      <path ref={fuelRef}  fill={`url(#efg-${uid})`} filter={`url(#ef-${uid})`} />

      {/* ── Drain blob (right) ── */}
      <path ref={drainRef} fill={`url(#edg-${uid})`} filter={`url(#ef-${uid})`} />

      {/* ── Fuel label (below left blob) ── */}
      <text x="72" y="150" textAnchor="middle"
        style={{ fontFamily: sans, fontSize: '10.5px', fill: '#56534D', fontWeight: 500 }}>
        {fuelLabel}
      </text>
      <text x="72" y="163" textAnchor="middle"
        style={{ fontFamily: sans, fontSize: '9px', fill: '#8C8A83' }}>
        fuel
      </text>

      {/* ── Drain label (below right blob) ── */}
      <text x="208" y="150" textAnchor="middle"
        style={{ fontFamily: sans, fontSize: '10.5px', fill: '#56534D', fontWeight: 500 }}>
        {drainLabel}
      </text>
      <text x="208" y="163" textAnchor="middle"
        style={{ fontFamily: sans, fontSize: '9px', fill: '#8C8A83' }}>
        drain
      </text>
    </svg>
  )
}
