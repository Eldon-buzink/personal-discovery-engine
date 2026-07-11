'use client'

import { useEffect, useId, useMemo, useRef } from 'react'

// ── Blob engine (self-contained, matches report page implementation) ───────────

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
    phase: rand() * Math.PI * 2,
    freq: 0.4 + rand() * 0.5,
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
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
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

// ── Component ─────────────────────────────────────────────────────────────────

// Visual constants matching reference/known-branch-flows.html initRelBlob()
const CX1 = 130  // "You" circle centre x
const CY  = 115  // shared y axis
const R1  = 28   // "You" radius
const R2  = 32   // partner radius
// Partner cx range: 200 (partnerDistance=0, ~10px edge gap) → 310 (partnerDistance=1, ~120px edge gap)
const CX2_MIN = 200
const CX2_RANGE = 110

export default function RelationshipsVisual({
  traitWord,
  partnerDistance,
  hue,
}: {
  traitWord: string
  partnerDistance: number   // 0–1 from scoreRelationships; drives the gap
  hue: number               // for partner circle colour
}) {
  const uid  = useId().replace(/:/g, '')
  const cx2  = Math.round(CX2_MIN + partnerDistance * CX2_RANGE)

  const youProfile   = useMemo(() => buildPointMotionProfile(hashSeed('you-ambient-rel'),   7), [])
  const otherProfile = useMemo(() => buildPointMotionProfile(hashSeed('other-ambient-rel'), 7), [])

  const youRef   = useRef<SVGPathElement | null>(null)
  const otherRef = useRef<SVGPathElement | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    let raf: number
    function tick(now: number) {
      if (startRef.current === null) startRef.current = now
      const t = (now - startRef.current) / 1000
      youRef.current?.setAttribute('d',
        generateAnimatedBlobPath(CX1, CY, 62, youProfile,   0.28, t))
      otherRef.current?.setAttribute('d',
        generateAnimatedBlobPath(cx2, CY, 62, otherProfile, 0.28, t + 1.2))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cx2, youProfile, otherProfile])

  // Line endpoints sit 5px inside each circle edge — circles drawn on top hide the overlap
  const lineX1 = CX1 + 5
  const lineX2 = cx2  - 5

  const sans  = 'var(--font-inter), system-ui, sans-serif'
  const serif = 'var(--font-newsreader), serif'

  return (
    <svg
      viewBox="0 0 400 210"
      width="100%"
      height={210}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        {/* Ambient-glow blur filter */}
        <filter id={`raf-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        {/* "You" warm glow — matches reference hsl(30,…) */}
        <radialGradient id={`ryg-${uid}`}>
          <stop offset="0%"   stopColor="hsl(30,35%,45%)"         stopOpacity="0.75" />
          <stop offset="55%"  stopColor="hsl(30,30%,50%)"         stopOpacity="0.40" />
          <stop offset="100%" stopColor="hsl(30,25%,55%)"         stopOpacity="0"    />
        </radialGradient>
        {/* Partner glow — curated hue */}
        <radialGradient id={`rog-${uid}`}>
          <stop offset="0%"   stopColor={`hsl(${hue},78%,62%)`}   stopOpacity="0.80" />
          <stop offset="55%"  stopColor={`hsl(${hue},70%,68%)`}   stopOpacity="0.45" />
          <stop offset="100%" stopColor={`hsl(${hue},60%,75%)`}   stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* Ambient glow blobs — animated, behind everything */}
      <path ref={youRef}   fill={`url(#ryg-${uid})`} filter={`url(#raf-${uid})`} />
      <path ref={otherRef} fill={`url(#rog-${uid})`} filter={`url(#raf-${uid})`} />

      {/* Dotted connector line */}
      {lineX2 > lineX1 && (
        <line
          x1={lineX1} y1={CY} x2={lineX2} y2={CY}
          stroke="hsl(330,40%,70%)" strokeWidth="1.5" strokeDasharray="3,5"
        />
      )}

      {/* Trait word — Newsreader italic, above the circles */}
      <text
        x="200" y="55" textAnchor="middle"
        style={{
          fontFamily: serif, fontStyle: 'italic', fontWeight: 600, fontSize: '18px',
          fill: `hsl(${hue},45%,28%)`,
        }}
      >
        {traitWord}
      </text>

      {/* "You" — solid charcoal circle */}
      <circle cx={CX1} cy={CY} r={R1} fill="#262420" />
      <text
        x={CX1} y={CY + 5} textAnchor="middle"
        style={{ fontFamily: sans, fontSize: '12px', fill: '#F7F4ED' }}
      >
        You
      </text>

      {/* Partner — dashed hue-coloured circle */}
      <circle
        cx={cx2} cy={CY} r={R2}
        fill={`hsl(${hue},50%,90%)`}
        stroke={`hsl(${hue},55%,55%)`}
        strokeWidth="1.5" strokeDasharray="2,3"
      />
      <text
        x={cx2} y={CY - 4} textAnchor="middle"
        style={{ fontFamily: sans, fontSize: '10.5px', fill: `hsl(${hue},55%,30%)` }}
      >
        Someone
      </text>
      <text
        x={cx2} y={CY + 10} textAnchor="middle"
        style={{ fontFamily: sans, fontSize: '10.5px', fill: `hsl(${hue},55%,30%)` }}
      >
        close
      </text>
    </svg>
  )
}
