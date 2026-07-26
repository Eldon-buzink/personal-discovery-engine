// ─── Shared blob engine ─────────────────────────────────────────────────────
// Organic Catmull-Rom blob shapes, curated 8-hue palette, seeded per user.
// Ported from reference/bearing-landing-v6_2.html — math and output kept
// bit-for-bit identical to that mockup (same hashSeed, same curatedHues,
// same generateAnimatedBlobPath), just converted from raw DOM manipulation
// to idiomatic React: components render the SVG/label structure as JSX and
// use refs only for the per-frame `d` attribute update, the same pattern
// InteractiveCluster/OrbitCluster already use on the report page.
//
// This module is deliberately just the low-level math + a shared animation
// clock, not a full "cluster" component — each section (hero, bento, demo)
// has its own layout/positions, so composing JSX per-section stays clearer
// than one do-everything abstraction.
//
// Note: this mirrors (rather than replaces) the equivalent local functions
// still used by the landing page's untouched sections (FactsBlobs,
// ConnectVisual's non-blob circles, ReportCluster, CtaHalos) — those weren't
// in scope for this change, so they still have their own copies. Worth
// unifying under this module later if those sections ever get touched too.

'use client'

import { useEffect } from 'react'

export const USER_SEED = 'u_played-2826-deliberate-autonomous'

export function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 9973
  return h
}

export function seededRandom(s0: number): () => number {
  let seed = s0
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const CURATED_HUES = [8, 35, 145, 175, 205, 235, 290, 335]

export function userCuratedHue(seedStr: string, offset: number): number {
  const bucket = hashSeed(seedStr + offset) % CURATED_HUES.length
  const jitter = (hashSeed(seedStr + offset + 'jitter') % 21) - 10
  return (CURATED_HUES[bucket] + jitter + 360) % 360
}

export interface BlobMotionProfile { phase: number; freq: number; ampScale: number }

export function buildPointMotionProfile(seed: number, points: number): BlobMotionProfile[] {
  const rand = seededRandom(seed)
  const out: BlobMotionProfile[] = []
  for (let i = 0; i < points; i++)
    out.push({ phase: rand() * Math.PI * 2, freq: 0.4 + rand() * 0.5, ampScale: 0.7 + rand() * 0.6 })
  return out
}

export function generateAnimatedBlobPath(
  cx: number, cy: number, r: number, profile: BlobMotionProfile[], irregularity: number, t: number
): string {
  const n = profile.length
  const step = (Math.PI * 2) / n
  const pts = profile.map((p, i) => {
    const wobble = Math.sin(t * p.freq + p.phase) * irregularity * p.ampScale
    const rad = r * (1 + wobble)
    return { x: cx + Math.cos(i * step) * rad, y: cy + Math.sin(i * step) * rad }
  })
  const cb = (p0: {x:number;y:number}, p1: {x:number;y:number}, p2: {x:number;y:number}, p3: {x:number;y:number}) => ({
    c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
    c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
    end: p2,
  })
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `
  for (let i = 0; i < n; i++) {
    const seg = cb(pts[(i-1+n)%n], pts[i], pts[(i+1)%n], pts[(i+2)%n])
    d += `C ${seg.c1.x.toFixed(1)} ${seg.c1.y.toFixed(1)}, ${seg.c2.x.toFixed(1)} ${seg.c2.y.toFixed(1)}, ${seg.end.x.toFixed(1)} ${seg.end.y.toFixed(1)} `
  }
  return d + 'Z'
}

// Radial-gradient stops for a blob fill — same values makeBlobPath() in the
// mockup hard-codes into a DOM node, expressed instead as plain data so
// components can render them as JSX <stop> children.
export interface GradientStop { offset: string; color: string; opacity: number }

export function blobGradientStops(hue: number, active: boolean): GradientStop[] {
  return active
    ? [
        { offset: '0%',   color: `hsl(${hue},80%,62%)`, opacity: 1 },
        { offset: '45%',  color: `hsl(${hue},78%,60%)`, opacity: 0.88 },
        { offset: '75%',  color: `hsl(${hue},70%,68%)`, opacity: 0.4 },
        { offset: '100%', color: `hsl(${hue},60%,80%)`, opacity: 0 },
      ]
    : [
        { offset: '0%',   color: `hsl(${hue},60%,76%)`, opacity: 0.6 },
        { offset: '100%', color: `hsl(${hue},55%,85%)`, opacity: 0 },
      ]
}

// ─── Shared animation clock ─────────────────────────────────────────────────
// One requestAnimationFrame loop for every blob on the page, not one per
// component — matches the mockup's single masterTick driving allBlobTasks.
const _tasks: Array<(t: number) => void> = []
let _raf: number | null = null
let _t0: number | null = null

function registerBlobTask(fn: (t: number) => void): () => void {
  _tasks.push(fn)
  if (_raf === null && typeof requestAnimationFrame !== 'undefined') {
    const tick = (ts: number) => {
      if (_t0 === null) _t0 = ts
      const t = (ts - _t0) / 1000
      _tasks.forEach(f => f(t))
      _raf = requestAnimationFrame(tick)
    }
    _raf = requestAnimationFrame(tick)
  }
  return () => {
    const i = _tasks.indexOf(fn)
    if (i >= 0) _tasks.splice(i, 1)
  }
}

// Idiomatic-React entry point: components pass a per-frame callback and get
// automatic subscribe/unsubscribe tied to their own lifecycle.
export function useBlobAnimation(fn: (t: number) => void, deps: React.DependencyList) {
  useEffect(() => registerBlobTask(fn), deps) // eslint-disable-line react-hooks/exhaustive-deps
}
