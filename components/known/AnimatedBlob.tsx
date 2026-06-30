'use client'

import { useEffect, useId, useMemo, useRef } from 'react'

// ── Blob engine (ported exactly from prototype JS) ────────────────────────────

function seededRandom(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const curatedHues = [
  { name: 'Coral', hue: 8 },
  { name: 'Amber', hue: 35 },
  { name: 'Moss', hue: 145 },
  { name: 'Teal', hue: 175 },
  { name: 'Sky', hue: 205 },
  { name: 'Periwinkle', hue: 235 },
  { name: 'Plum', hue: 290 },
  { name: 'Rose', hue: 335 },
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

interface MotionPoint {
  phase: number
  freq: number
  ampScale: number
}

function buildPointMotionProfile(seed: number, points: number): MotionPoint[] {
  const rand = seededRandom(seed)
  const profile: MotionPoint[] = []
  for (let i = 0; i < points; i++) {
    profile.push({
      phase: rand() * Math.PI * 2,
      freq: 0.4 + rand() * 0.5,
      ampScale: 0.7 + rand() * 0.6,
    })
  }
  return profile
}

interface Pt {
  x: number
  y: number
}

function generateAnimatedBlobPath(
  cx: number,
  cy: number,
  baseRadius: number,
  profile: MotionPoint[],
  irregularity: number,
  t: number
): string {
  const points = profile.length
  const angleStep = (Math.PI * 2) / points
  const pts: Pt[] = []

  for (let i = 0; i < points; i++) {
    const angle = i * angleStep
    const p = profile[i]
    const wobble = Math.sin(t * p.freq + p.phase) * irregularity * p.ampScale
    const r = baseRadius * (1 + wobble)
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r })
  }

  function catmullToBezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt) {
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    return { c1, c2, end: p2 }
  }

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % points]
    const p3 = pts[(i + 2) % points]
    const seg = catmullToBezier(p0, p1, p2, p3)
    d += `C ${seg.c1.x.toFixed(1)} ${seg.c1.y.toFixed(1)}, ${seg.c2.x.toFixed(1)} ${seg.c2.y.toFixed(1)}, ${seg.end.x.toFixed(1)} ${seg.end.y.toFixed(1)} `
  }
  d += 'Z'
  return d
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface AnimatedBlobProps {
  seed: string
  hueOffset?: number
  size?: number
  baseRadius?: number
  irregularity?: number
  points?: number
  word?: string
}

export default function AnimatedBlob({
  seed,
  hueOffset = 0,
  size = 220,
  baseRadius = 78,
  irregularity = 0.3,
  points = 9,
  word,
}: AnimatedBlobProps) {
  const pathRef = useRef<SVGPathElement>(null)
  const rafRef = useRef<number | null>(null)

  // useId gives stable, SSR-safe unique IDs for SVG gradient and filter references
  const uid = useId()
  const gradientId = `blob-g-${uid.replace(/:/g, '')}`
  const filterId  = `blob-f-${uid.replace(/:/g, '')}`

  const hue = useMemo(() => userCuratedHue(seed, hueOffset), [seed, hueOffset])

  const profile = useMemo(
    () => buildPointMotionProfile(hashSeed(seed + String(hueOffset)), points),
    [seed, hueOffset, points]
  )

  const cx = size / 2
  const cy = size / 2

  useEffect(() => {
    const start = performance.now()

    function animate(now: number) {
      const t = (now - start) / 1000
      pathRef.current?.setAttribute(
        'd',
        generateAnimatedBlobPath(cx, cy, baseRadius, profile, irregularity, t)
      )
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [cx, cy, baseRadius, profile, irregularity])

  // Initial path rendered on first paint (t=0) before RAF fires
  const initialD = generateAnimatedBlobPath(cx, cy, baseRadius, profile, irregularity, 0)
  const wordColor = `hsl(${hue}, 45%, 24%)`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={`hsl(${hue}, 80%, 62%)`} stopOpacity="1"    />
          <stop offset="45%"  stopColor={`hsl(${hue}, 78%, 60%)`} stopOpacity="0.88" />
          <stop offset="75%"  stopColor={`hsl(${hue}, 70%, 68%)`} stopOpacity="0.4"  />
          <stop offset="100%" stopColor={`hsl(${hue}, 60%, 80%)`} stopOpacity="0"    />
        </radialGradient>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <path ref={pathRef} d={initialD} fill={`url(#${gradientId})`} filter={`url(#${filterId})`} />

      {word && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={wordColor}
          style={{
            fontFamily: 'var(--font-newsreader), serif',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: '16px',
            pointerEvents: 'none',
          }}
        >
          {word}
        </text>
      )}
    </svg>
  )
}
