'use client'

// Report lab: ReportCluster, the blob composition for one filter (at most 6
// blobs). Modelled on the landing's BentoCluster and the old
// InteractiveCluster; neither is changed or imported.
//
// - Overview: fixed slots for 5 or 6 blobs, size from strength only, so
//   tied traits are drawn at exactly the same size. No slot is larger than
//   another; the strongest goes top middle.
// - Zoomed: the chosen trait becomes the hero; the others become small
//   satellites around it (style "satellites") or a row of dots beneath it
//   (style "dots").
// - Each blob is a static path at the origin inside a <g> that moves and
//   scales with a CSS transition (one curve, 600ms), so a filter change or a
//   zoom morphs without any loop. Only the zoomed hero's path is animated,
//   on the shared blob clock. One blur filter for all blobs.
// - The blobs themselves are drawn only; the buttons (names, focus, hit
//   areas of at least 44px) are HTML on top.

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { blobGradientStops, buildPointMotionProfile, generateAnimatedBlobPath, hashSeed, useBlobAnimation } from '@/lib/blobs'
import { EASE, DUR_ENTER, DUR_UI, prefersReducedMotion } from '@/lib/design/motion'
import { type } from '@/lib/design/type'
import type { FilterTrait } from '@/lib/lab/filterLab'

export const VB_W = 500
export const VB_H = 350
const BASE_R = 60
const BLUR = 10

const SLOTS: Record<number, [number, number][]> = {
  1: [[250, 175]],
  2: [[180, 175], [320, 175]],
  3: [[250, 110], [175, 240], [325, 240]],
  4: [[180, 110], [320, 110], [180, 240], [320, 240]],
  5: [[250, 98], [110, 118], [390, 118], [180, 246], [320, 246]],
  6: [[250, 94], [110, 112], [390, 112], [250, 258], [110, 240], [390, 240]],
}

/** Overview radius: from strength only (0 … 2), so equal strength = equal size. */
export function radiusFor(strength: number): number {
  return 30 + 28 * Math.sqrt(strength / 2)
}

export type ZoomStyle = 'satellites' | 'dots'

interface Placed { t: FilterTrait; x: number; y: number; r: number; role: 'overview' | 'hero' | 'satellite' | 'dot' }

function layout(traits: FilterTrait[], zoom: string | null, style: ZoomStyle): Placed[] {
  const slots = SLOTS[Math.min(6, Math.max(1, traits.length))]
  const overview = traits.map((t, i) => ({ t, x: slots[i][0], y: slots[i][1], r: radiusFor(t.strength), role: 'overview' as const }))
  if (!zoom || !traits.some((t) => t.facet === zoom)) return overview
  const others = overview.filter((p) => p.t.facet !== zoom)
  const hero = overview.find((p) => p.t.facet === zoom)!
  if (style === 'dots') {
    const gap = 64
    const x0 = VB_W / 2 - ((others.length - 1) * gap) / 2
    return [
      { ...hero, x: 250, y: 148, r: 104, role: 'hero' },
      ...others.map((p, i) => ({ ...p, x: x0 + i * gap, y: 318, r: 12, role: 'dot' as const })),
    ]
  }
  // Satellites keep their order around the centre: sorted by the angle of
  // their overview slot, then spaced evenly on an ellipse.
  const cx = 250, cy = 165
  const sorted = [...others].sort((a, b) => Math.atan2(a.y - 175, a.x - 250) - Math.atan2(b.y - 175, b.x - 250))
  const start = Math.atan2(sorted[0].y - 175, sorted[0].x - 250)
  return [
    { ...hero, x: cx, y: cy, r: 92, role: 'hero' },
    ...sorted.map((p, i) => {
      const a = start + (i / sorted.length) * Math.PI * 2
      return { ...p, x: cx + Math.cos(a) * 172, y: cy + Math.sin(a) * 128, r: 20, role: 'satellite' as const }
    }),
  ]
}

export interface Connector { a: string; b: string; label: string; open: boolean; onToggle: () => void }

export function ReportCluster({
  traits, hueOf, zoom, zoomStyle, onSelect, registerButton, connector, labelPx,
}: {
  traits: FilterTrait[]
  hueOf: (t: FilterTrait) => number
  zoom: string | null
  zoomStyle: ZoomStyle
  onSelect: (facet: string) => void
  registerButton?: (facet: string, el: HTMLButtonElement | null) => void
  connector?: Connector
  /** Overview label size in px (trait-word token, scaled down to fit 6). */
  labelPx: number
}) {
  const uid = useId().replace(/:/g, '')
  const wrapRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<SVGPathElement | null>(null)
  const [w, setW] = useState(VB_W)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((e) => { const cw = e[0]?.contentRect.width; if (cw) setW(cw) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const s = w / VB_W

  const placed = useMemo(() => layout(traits, zoom, zoomStyle), [traits, zoom, zoomStyle])
  // Names hide while blobs move and come back once they've arrived, so two
  // labels never slide across each other (that reads as doubled text).
  const [moving, setMoving] = useState(false)
  const firstLayout = useRef(true)
  useEffect(() => {
    if (firstLayout.current) { firstLayout.current = false; return }
    if (prefersReducedMotion()) return
    setMoving(true)
    const id = window.setTimeout(() => setMoving(false), DUR_ENTER * 0.7)
    return () => window.clearTimeout(id)
  }, [placed])
  const profiles = useMemo(() => new Map(traits.map((t) => [t.facet, buildPointMotionProfile(hashSeed(`${t.word}-shape`), 9)])), [traits])
  const hero = placed.find((p) => p.role === 'hero')

  // Only the zoomed hero drifts; everything else is a static path.
  useBlobAnimation((t) => {
    if (!hero || !heroRef.current) return
    heroRef.current.setAttribute('d', generateAnimatedBlobPath(0, 0, BASE_R, profiles.get(hero.t.facet)!, 0.3, t))
  }, [hero?.t.facet, profiles], wrapRef, { respectReducedMotion: true })

  const hues = Array.from(new Set(traits.map(hueOf)))
  const move: CSSProperties = { transition: `transform ${DUR_ENTER}ms ${EASE}` }
  // The connector must not touch a third blob (that would suggest a link the
  // data doesn't have): when one sits on the straight line, bow it below.
  const ca = connector?.a, cb = connector?.b
  const path = useMemo(() => {
    const p0 = placed.find((p) => p.t.facet === ca), p2 = placed.find((p) => p.t.facet === cb)
    if (zoom || !p0 || !p2) return null
    const blocked = placed.some((o) => {
      if (o === p0 || o === p2) return false
      const dx = p2.x - p0.x, dy = p2.y - p0.y
      const u = Math.max(0, Math.min(1, ((o.x - p0.x) * dx + (o.y - p0.y) * dy) / (dx * dx + dy * dy)))
      return Math.hypot(p0.x + u * dx - o.x, p0.y + u * dy - o.y) < o.r + 14
    })
    const c = { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 + (blocked ? 100 : 0) }
    return { d: `M ${p0.x} ${p0.y} Q ${c.x} ${c.y} ${p2.x} ${p2.y}`, mid: { x: (p0.x + 2 * c.x + p2.x) / 4, y: (p0.y + 2 * c.y + p2.y) / 4 } }
  }, [ca, cb, zoom, placed])

  return (
    <div ref={wrapRef} className="rc" style={{ position: 'relative', width: '100%', height: VB_H * s }}>
      <style dangerouslySetInnerHTML={{ __html: RC_CSS }} />
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height={VB_H * s} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
        <defs>
          <filter id={`rc-f-${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={BLUR} /></filter>
          {hues.map((h) => (
            <radialGradient key={h} id={`rc-g-${uid}-${h}-1`} cx="45%" cy="40%" r="70%">
              {blobGradientStops(h, true).map((st, i) => <stop key={i} offset={st.offset} stopColor={st.color} stopOpacity={st.opacity} />)}
            </radialGradient>
          ))}
        </defs>
        {path && (
          <path d={path.d} fill="none" stroke="#262420" strokeOpacity={connector!.open ? 0.45 : 0.22} strokeWidth={1.2} />
        )}
        {placed.map((p) => (
          <g key={p.t.facet} className="rc-move" style={{ ...move, transform: `translate(${p.x}px, ${p.y}px) scale(${p.r / BASE_R})` }}>
            <path
              ref={p.role === 'hero' ? (el) => { heroRef.current = el } : undefined}
              d={generateAnimatedBlobPath(0, 0, BASE_R, profiles.get(p.t.facet)!, 0.3, 0)}
              fill={`url(#rc-g-${uid}-${hueOf(p.t)}-1)`}
              filter={`url(#rc-f-${uid})`}
              opacity={p.role === 'overview' ? 0.55 + 0.45 * (p.t.strength / 2) : 1}
            />
          </g>
        ))}
      </svg>
      {placed.map((p) => {
        const size = Math.max(44, p.r * 2 * s)
        const isHero = p.role === 'hero'
        return (
          <button
            key={p.t.facet}
            ref={(el) => registerButton?.(p.t.facet, el)}
            type="button"
            className={`rc-btn rc-${p.role}`}
            aria-label={p.t.word}
            aria-current={isHero ? 'true' : undefined}
            title={p.role === 'dot' ? p.t.word : undefined}
            onClick={() => { if (!isHero) onSelect(p.t.facet) }}
            style={{ left: p.x * s, top: p.y * s, width: size, height: size }}
          >
            {p.role !== 'dot' && (
              <span
                className="rc-label"
                data-moving={moving ? '1' : undefined}
                style={isHero
                  ? { ...type.traitWord, fontSize: 30, color: `hsl(${hueOf(p.t)},45%,24%)` }
                  : p.role === 'satellite'
                    ? { ...type.meta, color: '#56534D', top: '100%', transform: 'translate(-50%, 2px)' }
                    : { ...type.traitWord, fontSize: labelPx, color: '#262420' }}
              >
                {p.t.word}
              </span>
            )}
          </button>
        )
      })}
      {path && (
        <button
          type="button"
          className="rc-btn rc-conn"
          aria-label={connector!.label}
          aria-expanded={connector!.open}
          onClick={connector!.onToggle}
          style={{ left: path.mid.x * s, top: path.mid.y * s, width: 44, height: 44 }}
        >
          <span aria-hidden="true" className="rc-conn-dot" />
        </button>
      )}
    </div>
  )
}

const RC_CSS = `
  .rc-btn{position:absolute;transform:translate(-50%,-50%);border:0;background:none;padding:0;border-radius:999px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;
    transition:left ${DUR_ENTER}ms ${EASE},top ${DUR_ENTER}ms ${EASE},width ${DUR_ENTER}ms ${EASE},height ${DUR_ENTER}ms ${EASE};}
  .rc-btn:focus-visible{outline:2px solid #D85A30;outline-offset:2px;}
  .rc-hero{cursor:default;}
  .rc-label{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);white-space:nowrap;pointer-events:none;line-height:1.2;transition:opacity ${DUR_UI}ms ${EASE};}
  .rc-label[data-moving]{opacity:0;transition:none;}
  .rc-conn-dot{width:10px;height:10px;border-radius:999px;background:#F7F4ED;border:1.5px solid rgba(38,36,32,0.5);}
  @media (prefers-reduced-motion: reduce){.rc-btn,.rc-move,.rc-label{transition:none !important;}}
`
