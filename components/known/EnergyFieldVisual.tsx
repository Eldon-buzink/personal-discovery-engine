'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

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

// ── Hue helper (matches report page's userCuratedHue — stable per label, not per session) ──

const curatedHues = [
  { hue: 8 }, { hue: 35 }, { hue: 145 }, { hue: 175 },
  { hue: 205 }, { hue: 235 }, { hue: 290 }, { hue: 335 },
]

function userCuratedHue(seedStr: string, offset: number): number {
  const key = seedStr + '-' + offset
  const base = hashSeed(key)
  const bucket = base % curatedHues.length
  const jitter = (hashSeed(key + 'jitter') % 21) - 10
  return (curatedHues[bucket].hue + jitter + 360) % 360
}

// ── Layout — matches reference/known-full-flow.html setupEnergyBlobs() ────────
// viewBox 0 0 400 230. Divider at x=200. Fuels left (FUELS YOU), drains right (DRAINS YOU).
// Fixed positions, order: [topFuel, secondFuel, topDrain, secondDrain].

const POSITIONS = [
  { x: 100, y: 80 },
  { x: 128, y: 155 },
  { x: 292, y: 75 },
  { x: 300, y: 155 },
]

const gray         = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal     = '#262420'
const line         = '#E5E1D5'
const sans         = 'var(--font-inter), system-ui, sans-serif'
const serif        = 'var(--font-newsreader), serif'

export interface EnergyFieldItem {
  label:    string
  side:     'fuel' | 'drain'
  score:    number // 1-5
  quote:    string
  evidence: string
}

export default function EnergyFieldVisual({ items }: { items: EnergyFieldItem[] }) {
  const uid = useId().replace(/:/g, '')
  const [activeIdx, setActiveIdx] = useState(0)

  const active = items[activeIdx]
  const activeHue = useMemo(
    () => userCuratedHue(`energy-item-${active.label.toLowerCase().replace(/\s+/g, '-')}`, 0),
    [active.label]
  )

  const blobs = useMemo(() => items.map((item, i) => {
    const hue = userCuratedHue(`energy-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`, 0)
    const weight = Math.min(1, Math.max(0, (item.score - 1) / 4))
    const isActive = i === activeIdx
    const radius = isActive ? 40 + weight * 12 : 26 + weight * 12
    const profile = buildPointMotionProfile(hashSeed(item.label + '-shape'), 8)
    return { ...POSITIONS[i], hue, radius, isActive, profile, label: item.label }
  }), [items, activeIdx])

  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    let raf: number
    function tick(now: number) {
      if (startRef.current === null) startRef.current = now
      const t = (now - startRef.current) / 1000
      blobs.forEach((b, i) => {
        pathRefs.current[i]?.setAttribute('d', generateAnimatedBlobPath(b.x, b.y, b.radius, b.profile, 0.3, t))
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [blobs])

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 400, margin: '0 auto' }}>
        <svg viewBox="0 0 400 230" width="100%" style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <filter id={`efb-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            {blobs.map((b, i) => (
              <radialGradient key={i} id={`efg-${uid}-${i}`} cx="45%" cy="40%" r="70%">
                {b.isActive ? (
                  <>
                    <stop offset="0%"   stopColor={`hsl(${b.hue},78%,60%)`} stopOpacity="1"    />
                    <stop offset="50%"  stopColor={`hsl(${b.hue},75%,60%)`} stopOpacity="0.85" />
                    <stop offset="80%"  stopColor={`hsl(${b.hue},65%,70%)`} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={`hsl(${b.hue},55%,82%)`} stopOpacity="0"    />
                  </>
                ) : (
                  <>
                    <stop offset="0%"   stopColor={`hsl(${b.hue},55%,78%)`} stopOpacity="0.55" />
                    <stop offset="100%" stopColor={`hsl(${b.hue},50%,86%)`} stopOpacity="0"    />
                  </>
                )}
              </radialGradient>
            ))}
          </defs>

          {/* Divider */}
          <line x1="200" y1="20" x2="200" y2="210" stroke={line} strokeWidth="1" />
          <text x="110" y="22" textAnchor="middle" style={{ fontFamily: sans, fontSize: '10.5px', letterSpacing: '0.5px', fill: gray }}>FUELS YOU</text>
          <text x="290" y="22" textAnchor="middle" style={{ fontFamily: sans, fontSize: '10.5px', letterSpacing: '0.5px', fill: gray }}>DRAINS YOU</text>

          {blobs.map((b, i) => (
            <path
              key={i}
              ref={(el) => { pathRefs.current[i] = el }}
              fill={`url(#efg-${uid}-${i})`}
              filter={`url(#efb-${uid})`}
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveIdx(i)}
            />
          ))}
        </svg>

        {blobs.map((b, i) => (
          <div
            key={i}
            onClick={() => setActiveIdx(i)}
            style={{
              position: 'absolute',
              left: `${(b.x / 400) * 100}%`,
              top: `${(b.y / 230) * 100}%`,
              transform: 'translate(-50%, -50%)',
              fontFamily: serif, fontStyle: 'italic', fontWeight: 500,
              fontSize: b.isActive ? 13 : 10,
              color: b.isActive ? `hsl(${b.hue},50%,26%)` : charcoalSoft,
              textAlign: 'center', width: 90,
              cursor: 'pointer', pointerEvents: 'auto',
            }}
          >
            {b.label}
          </div>
        ))}
      </div>

      {/* Detail panel — swaps with the active blob, matches fillEnergyDetail() */}
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <h3 style={{ fontFamily: serif, fontSize: 21, fontWeight: 600, color: charcoal, margin: '0 0 6px' }}>
          {active.label}
        </h3>
        <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 16, lineHeight: 1.55, color: `hsl(${activeHue},45%,26%)`, maxWidth: 400, margin: '0 auto 6px' }}>
          &ldquo;{active.quote}&rdquo;
        </p>
        <p style={{ fontFamily: sans, fontSize: 12, color: gray, margin: '0 0 20px' }}>
          From your energy branch
        </p>
        <div style={{ margin: '0 0 4px' }}>
          <p style={{
            fontFamily: sans, fontSize: 13, fontWeight: 600, margin: '0 0 8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', background: `hsl(${activeHue},58%,42%)` }} />
            Where this shows up
          </p>
          <p style={{ fontFamily: sans, fontSize: 14.5, lineHeight: 1.7, color: charcoalSoft, maxWidth: 420, margin: '0 auto' }}>
            {active.evidence}
          </p>
        </div>
      </div>
    </div>
  )
}
