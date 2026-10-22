'use client'

// Report lab: ReportCluster, the blob composition for one filter (at most 6
// blobs). Modelled on the old InteractiveCluster (one blob in the centre,
// the rest around it); that component isn't changed or imported.
//
// - The selected trait is the centre blob. The others sit on fixed places
//   around it, sized by how pronounced they are (equal strength = equal
//   size). Tapping one swaps it with the centre; every other trait keeps
//   its place.
// - Each blob is a static path at the origin inside a <g> that moves and
//   scales with a CSS transition (one curve, 600ms), so a swap or a filter
//   change morphs without any loop. Only the centre path is animated, on
//   the shared blob clock. One blur filter for all blobs.
// - Names fade out while blobs move and back in once they've arrived, so
//   two labels never slide across each other (doubled text).
// - The blobs are drawn only; the buttons (names, focus, hit areas of at
//   least 44px) are HTML on top.

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { blobGradientStops, buildPointMotionProfile, generateAnimatedBlobPath, hashSeed, useBlobAnimation } from '@/lib/blobs'
import { EASE, DUR_ENTER, DUR_UI, prefersReducedMotion } from '@/lib/design/motion'
import { type } from '@/lib/design/type'
import type { FilterTrait } from '@/lib/lab/filterLab'

const VB_W = 500
const VB_H = 330
const BASE_R = 60
const BLUR = 10
const CX = 250
const CY = 160
const CENTRE_R = 92
const RING_X = 172
const RING_Y = 126

// Where the places around the centre start: top for an odd count, the
// upper corners for four; then clockwise.
const START: Record<number, number> = { 1: -90, 2: -90, 3: -90, 4: -45, 5: -90 }

function satelliteRange(count: number): [number, number] {
  return count <= 4 ? [22, 36] : [18, 30]
}

interface Placed { t: FilterTrait; x: number; y: number; r: number; centre: boolean }

/** `traits[0]` is the centre; the rest go around it in the order given. */
function layout(traits: FilterTrait[]): Placed[] {
  const [centre, ...rest] = traits
  if (!centre) return []
  const [rMin, rMax] = satelliteRange(rest.length)
  const start = ((START[rest.length] ?? -90) * Math.PI) / 180
  return [
    { t: centre, x: CX, y: CY, r: CENTRE_R, centre: true },
    ...rest.map((t, i) => {
      const a = start + (i / rest.length) * Math.PI * 2
      return { t, x: CX + Math.cos(a) * RING_X, y: CY + Math.sin(a) * RING_Y, r: rMin + (rMax - rMin) * Math.sqrt(t.strength / 2), centre: false }
    }),
  ]
}

export function ReportCluster({ traits, hueOf, onSelect }: {
  /** In place order: the first is the selected (centre) trait. */
  traits: FilterTrait[]
  hueOf: (t: FilterTrait) => number
  onSelect: (facet: string) => void
}) {
  const uid = useId().replace(/:/g, '')
  const wrapRef = useRef<HTMLDivElement>(null)
  const centreRef = useRef<SVGPathElement | null>(null)
  const [w, setW] = useState(VB_W)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((e) => { const cw = e[0]?.contentRect.width; if (cw) setW(cw) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const s = w / VB_W

  const placed = useMemo(() => layout(traits), [traits])
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
  const centre = placed[0]
  useBlobAnimation((t) => {
    if (!centre || !centreRef.current) return
    centreRef.current.setAttribute('d', generateAnimatedBlobPath(0, 0, BASE_R, profiles.get(centre.t.facet)!, 0.3, t))
  }, [centre?.t.facet, profiles], wrapRef, { respectReducedMotion: true })

  const hues = Array.from(new Set(traits.map(hueOf)))
  const move: CSSProperties = { transition: `transform ${DUR_ENTER}ms ${EASE}` }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: VB_H * s }}>
      <style dangerouslySetInnerHTML={{ __html: RC_CSS }} />
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height={VB_H * s} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
        <defs>
          <filter id={`rc-f-${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={BLUR} /></filter>
          {hues.map((h) => (
            <radialGradient key={h} id={`rc-g-${uid}-${h}`} cx="45%" cy="40%" r="70%">
              {blobGradientStops(h, true).map((st, i) => <stop key={i} offset={st.offset} stopColor={st.color} stopOpacity={st.opacity} />)}
            </radialGradient>
          ))}
        </defs>
        {placed.map((p) => (
          <g key={p.t.facet} className="rc-move" style={{ ...move, transform: `translate(${p.x}px, ${p.y}px) scale(${p.r / BASE_R})` }}>
            <path
              ref={p.centre ? (el) => { centreRef.current = el } : undefined}
              d={generateAnimatedBlobPath(0, 0, BASE_R, profiles.get(p.t.facet)!, 0.3, 0)}
              fill={`url(#rc-g-${uid}-${hueOf(p.t)})`}
              filter={`url(#rc-f-${uid})`}
            />
          </g>
        ))}
      </svg>
      {placed.map((p) => {
        const size = Math.max(44, p.r * 2 * s)
        return (
          <button
            key={p.t.facet}
            type="button"
            className={`rc-btn${p.centre ? ' rc-centre' : ''}`}
            aria-label={p.t.word}
            aria-pressed={p.centre}
            onClick={() => { if (!p.centre) onSelect(p.t.facet) }}
            style={{ left: p.x * s, top: p.y * s, width: size, height: size }}
          >
            <span
              className="rc-label"
              data-moving={moving ? '1' : undefined}
              style={p.centre
                ? { ...type.traitWord, fontSize: 30, color: `hsl(${hueOf(p.t)},45%,24%)` }
                : { ...type.meta, color: '#56534D', top: '100%', transform: 'translate(-50%, 2px)' }}
            >
              {p.t.word}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const RC_CSS = `
  .rc-btn{position:absolute;transform:translate(-50%,-50%);border:0;background:none;padding:0;border-radius:999px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;
    transition:left ${DUR_ENTER}ms ${EASE},top ${DUR_ENTER}ms ${EASE},width ${DUR_ENTER}ms ${EASE},height ${DUR_ENTER}ms ${EASE};}
  .rc-btn:focus-visible{outline:2px solid #D85A30;outline-offset:2px;}
  .rc-centre{cursor:default;}
  .rc-label{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);white-space:nowrap;pointer-events:none;line-height:1.2;transition:opacity ${DUR_UI}ms ${EASE};}
  .rc-label[data-moving]{opacity:0;transition:none;}
  @media (prefers-reduced-motion: reduce){.rc-btn,.rc-move,.rc-label{transition:none !important;}}
`
