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
import { buildPointMotionProfile, generateAnimatedBlobPath, hashSeed, useBlobAnimation } from '@/lib/blobs'
import { blobStops, colourKey, hslCss, inkFor, toHsl, type Colour } from '@/lib/lab/colours'
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

// Overview (nothing selected): every blob the same size, on fixed places,
// none of them in the middle, so nothing reads as ranked or chosen.
const OVERVIEW_SLOTS: Record<number, [number, number][]> = {
  1: [[250, 160]],
  2: [[180, 160], [320, 160]],
  3: [[250, 95], [170, 225], [330, 225]],
  4: [[175, 95], [325, 95], [175, 225], [325, 225]],
  5: [[250, 80], [110, 105], [390, 105], [180, 235], [320, 235]],
  6: [[250, 78], [110, 98], [390, 98], [250, 248], [110, 228], [390, 228]],
}
const OVERVIEW_R = 46

function overviewLayout(traits: FilterTrait[]): Placed[] {
  const slots = OVERVIEW_SLOTS[Math.min(6, Math.max(1, traits.length))]
  return traits.slice(0, 6).map((t, i) => ({ t, x: slots[i][0], y: slots[i][1], r: OVERVIEW_R, centre: false }))
}

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

// How the blobs around the centre differ from it (lab options):
// - breathe: each slowly grows and shrinks a little (about 6%, a 5 s cycle,
//   staggered), on the shared blob clock; no extra loop. Still under reduced motion.
// - soft: lighter (60% opacity), so the centre is the only solid blob.
// - ring: a thin ring in the trait's colour, a cue that it can be tapped.
// - drift: the outer blobs slowly change shape too, gentler than the centre.
// Options combine with '+', e.g. 'breathe+soft'.
export type SatelliteStyle = string

// Readability of names on blobs: 'light' draws every blob at 70% so dark
// text sits on a paler tint. No glow on the text.
export type Readability = 'none' | 'light'

export function ReportCluster({ traits, hueOf, onSelect, opacityOf, overview, registerButton, satellites = 'none', labelsInside = false, readability = 'none' }: {
  readability?: Readability
  satellites?: SatelliteStyle
  /** Outer names centred on their blob (like the centre) instead of under it. */
  labelsInside?: boolean
  /** Nothing selected: equal blobs, names on them, no centre. */
  overview?: boolean
  registerButton?: (facet: string, el: HTMLButtonElement | null) => void
  /** Optional intensity per trait (0 … 1), applied to the blob only. */
  opacityOf?: (t: FilterTrait) => number
  /** In place order: the first is the selected (centre) trait. */
  traits: FilterTrait[]
  /** A full colour (hue, saturation, lightness) or a plain hue (today's 80% / 62%). */
  hueOf: (t: FilterTrait) => Colour
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

  const placed = useMemo(() => (overview ? overviewLayout(traits) : layout(traits)), [traits, overview])
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
  const centre = placed.find((p) => p.centre)
  const breathRefs = useRef<Record<string, SVGGElement | null>>({})
  const has = (k: string) => !overview && satellites.split('+').includes(k)
  const breathing = has('breathe')
  const drifting = has('drift')
  const satRefs = useRef<Record<string, SVGPathElement | null>>({})
  useBlobAnimation((t) => {
    if (centre && centreRef.current) centreRef.current.setAttribute('d', generateAnimatedBlobPath(0, 0, BASE_R, profiles.get(centre.t.facet)!, 0.3, t))
    if (!breathing && !drifting) return
    placed.forEach((p, i) => {
      if (p.centre) return
      if (breathing) breathRefs.current[p.t.facet]?.setAttribute('transform', `scale(${(1 + 0.16 * Math.sin((t / 4) * Math.PI * 2 + i * 1.3)).toFixed(4)})`)
      if (drifting) satRefs.current[p.t.facet]?.setAttribute('d', generateAnimatedBlobPath(0, 0, BASE_R, profiles.get(p.t.facet)!, 0.4, t * 1.4 + i))
    })
  }, [centre?.t.facet, profiles, breathing, drifting, placed], wrapRef, { respectReducedMotion: true })

  const colours = Array.from(new Map(traits.map((t) => [colourKey(hueOf(t)), hueOf(t)] as [string, Colour])).entries())
  const move: CSSProperties = { transition: `transform ${DUR_ENTER}ms ${EASE}` }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: VB_H * s }}>
      <style dangerouslySetInnerHTML={{ __html: RC_CSS }} />
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height={VB_H * s} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
        <defs>
          <filter id={`rc-f-${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={BLUR} /></filter>
          {colours.map(([key, h]) => (
            <radialGradient key={key} id={`rc-g-${uid}-${key}`} cx="45%" cy="40%" r="70%">
              {blobStops(h).map((st, i) => <stop key={i} offset={st.offset} stopColor={st.color} stopOpacity={st.opacity} />)}
            </radialGradient>
          ))}
        </defs>
        {placed.map((p) => (
          <g key={p.t.facet} className="rc-move" style={{ ...move, transform: `translate(${p.x}px, ${p.y}px) scale(${p.r / BASE_R})` }}>
            <g ref={(el) => { breathRefs.current[p.t.facet] = el }}>
              <path
                ref={p.centre ? (el) => { centreRef.current = el } : (el) => { satRefs.current[p.t.facet] = el }}
                d={generateAnimatedBlobPath(0, 0, BASE_R, profiles.get(p.t.facet)!, 0.3, 0)}
                fill={`url(#rc-g-${uid}-${colourKey(hueOf(p.t))})`}
                filter={`url(#rc-f-${uid})`}
                opacity={(readability === 'light' ? 0.7 : 1) * (!p.centre && has('soft') ? 0.6 : opacityOf && !overview ? opacityOf(p.t) : 1)}
                style={{ transition: `opacity ${DUR_ENTER}ms ${EASE}` }}
              />
              {!p.centre && has('ring') && (
                <circle r={BASE_R * 1.05} fill="none" stroke={hslCss(toHsl(hueOf(p.t)), 0, -18)} strokeOpacity={0.55} strokeWidth={2.2 * (BASE_R / p.r)} />
              )}
            </g>
          </g>
        ))}
      </svg>
      {placed.map((p) => {
        const size = Math.max(44, p.r * 2 * s)
        return (
          <button
            key={p.t.facet}
            ref={(el) => registerButton?.(p.t.facet, el)}
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
                ? { ...type.traitWord, fontSize: 30, color: readability === 'none' ? inkFor(hueOf(p.t)) : '#262420' }
                : overview
                  ? { ...type.traitWord, fontSize: 17, color: '#262420' }
                  : labelsInside
                    ? { ...type.traitWord, fontSize: 13, color: '#262420' }
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
