'use client'

// "Who you are": the user's traits as a horizontal strip, strongest first.
// The selected trait is the large blob in the middle; its neighbours shrink
// and fade by distance. Sizes and colour intensity follow the scroll
// position continuously, so swiping, dragging and jumping all morph rather
// than snap. Native CSS scroll-snap; no gesture library.
//
// Only the selected blob animates. Every other blob is a static path, and
// all of them share one blur filter and per-trait gradients from a single
// <defs> block.

import { ReactNode, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildPointMotionProfile, generateAnimatedBlobPath, hashSeed } from '@/components/known/ReportVisuals'
import { DOMAIN_LABELS } from '@/lib/known/traitOrder'

const gray = '#8C8A83'
const charcoalSoft = '#56534D'
const cream = '#F7F4ED'
const line = '#E5E1D5'
const coral = '#D85A30'
const sans = 'var(--font-inter), system-ui, sans-serif'
const serif = 'var(--font-newsreader), serif'

export interface CarouselTrait {
  key: string
  traitWord: string
  hue: number
  /** Big Five domain, or null when the trait isn't a Ring 1 facet. */
  domain: string | null
}

const ORDINALS = [
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth',
  'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third',
  'twenty-fourth', 'twenty-fifth', 'twenty-sixth', 'twenty-seventh', 'twenty-eighth',
  'twenty-ninth', 'thirtieth',
]

/** "This trait is part of Openness", or null when the trait has no domain. */
export function domainNote(domain: string | null): string | null {
  return domain ? `This trait is part of ${DOMAIN_LABELS[domain] ?? domain}` : null
}

/** Subtitle under a Ring 1 trait name, by the order it was revealed in. */
export function patternSubtitle(hueOffset: number): string {
  const word = ORDINALS[hueOffset]
  return word ? `Your ${word} pattern` : 'Another pattern'
}

const VIEW = 240
const R = 82
const IRREGULARITY = 0.3
const SMOOTH_MAX_STEPS = 3

// Scale and opacity by distance from the centre, in slides. Rest positions:
// 1 (selected), 0.48 (neighbour), 0.3 (next neighbour); further ones fade out.
function scaleAt(d: number): number {
  if (d <= 1) return 1 - 0.52 * d
  if (d <= 2) return 0.48 - 0.18 * (d - 1)
  return 0.3
}
function opacityAt(d: number): number {
  if (d <= 1) return 1 - 0.2 * d
  if (d <= 2) return 0.8 - 0.4 * (d - 1)
  return Math.max(0, 0.4 - 0.4 * (d - 2))
}

const css = `
  .tc{--slide:132px;--blob:240px;--strip:240px;margin-top:10px;}
  @media(max-width:560px){.tc{--slide:104px;--blob:196px;--strip:212px;}}
  .tc-strip{position:relative;display:flex;align-items:center;height:var(--strip);overflow-x:auto;overflow-y:hidden;
    scroll-snap-type:x mandatory;scrollbar-width:none;margin:0 -22px;
    padding:0 calc(50% + 22px - var(--slide) / 2);cursor:grab;transition:opacity .16s ease;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 18%,#000 82%,transparent 100%);
            mask-image:linear-gradient(90deg,transparent 0,#000 18%,#000 82%,transparent 100%);}
  .tc-strip::-webkit-scrollbar{display:none;}
  .tc-strip.tc-dragging{cursor:grabbing;scroll-snap-type:none;}
  .tc-slide{position:relative;flex:0 0 var(--slide);height:100%;scroll-snap-align:center;
    border:0;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}
  .tc-slide:focus{outline:none;}
  .tc-slide:focus-visible .tc-ring{opacity:1;}
  .tc-inner{position:absolute;left:50%;top:50%;width:var(--blob);height:var(--blob);
    margin:calc(var(--blob) / -2) 0 0 calc(var(--blob) / -2);pointer-events:none;will-change:transform,opacity;}
  .tc-inner svg{display:block;width:100%;height:100%;overflow:visible;}
  .tc-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;
    font-family:${serif};font-style:italic;font-weight:500;font-size:22px;}
  @media(max-width:560px){.tc-label{font-size:20px;}}
  .tc-ring{position:absolute;inset:14%;border-radius:50%;border:2px solid ${coral};opacity:0;}
  .tc-controls{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:2px;}
  .tc-arrow{width:36px;height:36px;border-radius:50%;border:1px solid ${line};background:${cream};color:${charcoalSoft};
    cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;}
  .tc-arrow:disabled{opacity:.35;cursor:default;}
  .tc-count{font-family:${sans};font-size:12px;color:${gray};min-width:58px;text-align:center;margin:0;}
  .tc-arrow:focus-visible,.tc-rel:focus-visible{outline:2px solid ${coral};outline-offset:2px;}
  .tc{--rel:72px;}
  @media(max-width:560px){.tc{--rel:64px;}}
  .tc-stage{position:relative;}
  .tc-links{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:140;}
  .tc-links path{fill:none;stroke-width:1.5;stroke-linecap:round;opacity:.5;
    stroke-dasharray:1;stroke-dashoffset:1;animation:tc-draw .55s ease .12s forwards;}
  @keyframes tc-draw{to{stroke-dashoffset:0;}}
  .tc-rel-row{position:relative;z-index:150;display:flex;justify-content:center;gap:2px;height:var(--rel);pointer-events:none;
    animation:tc-fade .35s ease both;}
  .tc-rel-row.above{margin-bottom:calc(var(--rel) * -0.42);}
  .tc-rel-row.below{margin-top:calc(var(--rel) * -0.42);}
  @keyframes tc-fade{from{opacity:0;transform:scale(.92);}to{opacity:1;transform:none;}}
  .tc-rel{position:relative;width:var(--rel);height:var(--rel);border:0;background:none;padding:0;cursor:pointer;
    pointer-events:auto;border-radius:50%;-webkit-tap-highlight-color:transparent;}
  .tc-rel svg{display:block;width:100%;height:100%;overflow:visible;opacity:.5;transition:transform .2s ease,opacity .2s ease;}
  .tc-rel:hover svg,.tc-rel:focus-visible svg{transform:scale(1.08);opacity:.9;}
  .tc-rel .tc-rel-label{opacity:.75;transition:opacity .2s ease;}
  .tc-rel:hover .tc-rel-label,.tc-rel:focus-visible .tc-rel-label{opacity:1;}
  .tc-rel-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;
    font-family:${serif};font-style:italic;font-weight:500;font-size:11px;line-height:1.15;padding:0 2px;pointer-events:none;}
  @media(prefers-reduced-motion:reduce){.tc-strip,.tc-rel svg,.tc-rel .tc-rel-label{transition:none;}.tc-rel-row,.tc-links path{animation:none;stroke-dashoffset:0;}}
`

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export function TraitCarousel({
  traits,
  activeIdx,
  onSelect,
  children,
}: {
  traits: CarouselTrait[]
  activeIdx: number
  onSelect: (i: number) => void
  /** The selected trait's detail; rendered under the controls. */
  children?: ReactNode
}) {
  const uid = useId().replace(/:/g, '')
  const reducedMotion = useReducedMotion()
  const count = traits.length

  const profiles = useMemo(
    () => traits.map((t) => buildPointMotionProfile(hashSeed(t.traitWord + '-shape'), 9)),
    [traits],
  )
  const staticPaths = useMemo(
    () => profiles.map((p) => generateAnimatedBlobPath(VIEW / 2, VIEW / 2, R, p, IRREGULARITY, 0)),
    [profiles],
  )
  const smallPaths = useMemo(
    () => profiles.map((p) => generateAnimatedBlobPath(30, 30, 23, p, IRREGULARITY, 0)),
    [profiles],
  )

  const stripRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLButtonElement | null)[]>([])
  const innerRefs = useRef<(HTMLDivElement | null)[]>([])
  const strongRefs = useRef<(SVGPathElement | null)[]>([])
  const faintRefs = useRef<(SVGPathElement | null)[]>([])

  const activeRef = useRef(activeIdx)
  activeRef.current = activeIdx
  // Set while the strip moves itself to a selection made elsewhere (arrows,
  // related blobs), so the slides it passes don't become the selection.
  const targetRef = useRef<number | null>(null)
  const targetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Geometry ───────────────────────────────────────────────────────────────

  const slideCentre = (i: number) => {
    const s = slideRefs.current[i]
    return s ? s.offsetLeft + s.offsetWidth / 2 : 0
  }
  const nearest = useCallback((): number => {
    const el = stripRef.current
    if (!el || !count) return 0
    const w = slideRefs.current[0]?.offsetWidth || 1
    const first = slideCentre(0)
    const mid = el.scrollLeft + el.clientWidth / 2
    return Math.max(0, Math.min(count - 1, Math.round((mid - first) / w)))
  }, [count])
  const leftFor = (i: number) => {
    const el = stripRef.current
    const s = slideRefs.current[i]
    if (!el || !s) return 0
    return s.offsetLeft - (el.clientWidth - s.offsetWidth) / 2
  }

  // Sizes, fades and colour depth from the live scroll position. Under
  // reduced motion everything sits at its rest size (no grow/shrink).
  const paint = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    const w = slideRefs.current[0]?.offsetWidth || 1
    const mid = el.scrollLeft + el.clientWidth / 2
    for (let i = 0; i < count; i++) {
      const inner = innerRefs.current[i]
      if (!inner) continue
      let d = Math.abs(slideCentre(i) - mid) / w
      if (reducedMotion) d = Math.abs(i - activeRef.current)
      inner.style.transform = `scale(${scaleAt(d)})`
      inner.style.opacity = String(opacityAt(d))
      inner.style.zIndex = String(100 - Math.round(d * 10))
      const strong = strongRefs.current[i]
      if (strong) strong.style.opacity = String(Math.max(0, 1 - d))
    }
  }, [count, reducedMotion])

  useLayoutEffect(() => { paint() }, [paint, traits])
  useEffect(() => {
    window.addEventListener('resize', paint)
    return () => window.removeEventListener('resize', paint)
  }, [paint])

  // ── Selection made elsewhere → move the strip ──────────────────────────────

  const mounted = useRef(false)
  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const from = nearest()
    if (from === activeIdx) { paint(); return }
    const left = leftFor(activeIdx)
    const instant = !mounted.current || reducedMotion
    targetRef.current = activeIdx
    if (targetTimer.current) clearTimeout(targetTimer.current)
    targetTimer.current = setTimeout(() => { targetRef.current = null }, 1400)
    if (instant) {
      el.scrollTo({ left, behavior: 'auto' })
      paint()
    } else if (Math.abs(from - activeIdx) <= SMOOTH_MAX_STEPS) {
      el.scrollTo({ left, behavior: 'smooth' })
    } else {
      // Long jumps fade out, move, and fade back in instead of racing past
      // every blob in between.
      el.style.opacity = '0'
      setTimeout(() => {
        el.scrollTo({ left, behavior: 'auto' })
        paint()
        el.style.opacity = '1'
      }, 160)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx])
  useEffect(() => { mounted.current = true }, [])

  function onScroll() {
    paint()
    const idx = nearest()
    if (targetRef.current !== null) {
      if (idx === targetRef.current && Math.abs(stripRef.current!.scrollLeft - leftFor(idx)) < 2) targetRef.current = null
      return
    }
    if (idx !== activeRef.current) onSelect(idx)
  }

  // ── Hero animation: only the selected blob moves ───────────────────────────
  // Each blob keeps its own clock, so a blob that becomes the hero again picks
  // up exactly where it stopped — no shape snaps.
  const clocks = useRef<number[]>([])
  useEffect(() => {
    if (reducedMotion || !count) return
    const i = activeIdx
    const profile = profiles[i]
    let raf: number
    let last: number | null = null
    function tick(now: number) {
      if (last !== null) clocks.current[i] = (clocks.current[i] ?? 0) + (now - last) / 1000
      last = now
      const d = generateAnimatedBlobPath(VIEW / 2, VIEW / 2, R, profile, IRREGULARITY, clocks.current[i] ?? 0)
      strongRefs.current[i]?.setAttribute('d', d)
      faintRefs.current[i]?.setAttribute('d', d)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [activeIdx, profiles, reducedMotion, count])

  // ── Mouse drag (touch and trackpads scroll natively) ───────────────────────
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const justDragged = useRef(false)
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse' || !stripRef.current) return
    drag.current = { x: e.clientX, left: stripRef.current.scrollLeft, moved: false }
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    const el = stripRef.current
    if (!d || !el) return
    if (!d.moved && Math.abs(e.clientX - d.x) > 4) { d.moved = true; el.classList.add('tc-dragging') }
    if (d.moved) el.scrollLeft = d.left - (e.clientX - d.x)
  }
  function onPointerUp() {
    const d = drag.current
    const el = stripRef.current
    drag.current = null
    if (!d?.moved || !el) return
    el.classList.remove('tc-dragging')
    justDragged.current = true
    setTimeout(() => { justDragged.current = false }, 0)
    el.scrollTo({ left: leftFor(nearest()), behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────
  function select(i: number, focus = false) {
    const next = Math.max(0, Math.min(count - 1, i))
    onSelect(next)
    if (focus) slideRefs.current[next]?.focus({ preventScroll: true })
  }
  function onKeyDown(e: React.KeyboardEvent) {
    const keys: Record<string, number> = { ArrowRight: activeIdx + 1, ArrowLeft: activeIdx - 1, Home: 0, End: count - 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    select(keys[e.key], true)
  }

  // ── Lines from the selected blob to its related blobs ──────────────────────
  // Measured from layout offsets (not bounding boxes), so the rows' fade-in
  // scale doesn't skew them.
  const stageRef = useRef<HTMLDivElement>(null)
  const relBtnRefs = useRef(new Map<string, HTMLButtonElement>())
  const [links, setLinks] = useState<{ key: string; d: string }[]>([])
  const activeDomain = traits[activeIdx]?.domain ?? null
  const relatedKey = activeDomain
    ? traits.filter((t, i) => i !== activeIdx && t.domain === activeDomain).map((t) => t.key).join('|')
    : ''
  const measureLinks = useCallback(() => {
    const strip = stripRef.current
    const keys = relatedKey ? relatedKey.split('|') : []
    if (!strip || !keys.length) { setLinks([]); return }
    const hx = strip.offsetLeft + strip.offsetWidth / 2
    const hy = strip.offsetTop + strip.offsetHeight / 2
    const blob = (slideRefs.current[activeIdx]?.querySelector('.tc-inner') as HTMLElement | null)?.offsetWidth ?? VIEW
    const heroR = (blob * R) / VIEW
    const next: { key: string; d: string }[] = []
    for (const key of keys) {
      const btn = relBtnRefs.current.get(key)
      const row = btn?.parentElement
      if (!btn || !row) continue
      const cx = row.offsetLeft + btn.offsetLeft + btn.offsetWidth / 2
      const cy = row.offsetTop + btn.offsetTop + btn.offsetHeight / 2
      const dx = cx - hx
      const dy = cy - hy
      const len = Math.hypot(dx, dy)
      if (len < heroR) continue
      const ux = dx / len
      const uy = dy / len
      const relR = (btn.offsetWidth * 23) / 60
      const x1 = hx + ux * heroR
      const y1 = hy + uy * heroR
      const x2 = cx - ux * relR * 0.8
      const y2 = cy - uy * relR * 0.8
      // A slight outward bow so the lines read as organic, not a diagram.
      const bow = 10 * (dx >= 0 ? 1 : -1)
      const qx = (x1 + x2) / 2 - uy * bow
      const qy = (y1 + y2) / 2 + ux * bow
      next.push({ key, d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}` })
    }
    setLinks(next)
  }, [activeIdx, relatedKey])
  useLayoutEffect(() => { measureLinks() }, [measureLinks])
  useEffect(() => {
    window.addEventListener('resize', measureLinks)
    return () => window.removeEventListener('resize', measureLinks)
  }, [measureLinks])

  const active = traits[activeIdx]
  if (!active) return null
  const related = active.domain
    ? traits.map((t, i) => ({ t, i })).filter(({ t, i }) => i !== activeIdx && t.domain === active.domain)
    : []
  const above = related.slice(0, Math.ceil(related.length / 2))
  const below = related.slice(above.length)
  const relRow = (items: typeof related, where: 'above' | 'below') => (
    <div key={`${where}-${activeIdx}`} className={`tc-rel-row ${where}`}>
      {items.map(({ t, i }) => (
        <button
          key={t.key}
          ref={(el) => { if (el) relBtnRefs.current.set(t.key, el); else relBtnRefs.current.delete(t.key) }}
          type="button"
          className="tc-rel"
          aria-label={t.traitWord}
          onClick={() => select(i)}
        >
          <svg viewBox="0 0 60 60" aria-hidden="true">
            <path d={smallPaths[i]} fill={`url(#tc-s-${uid}-${i})`} filter={`url(#tc-blur-sm-${uid})`} />
          </svg>
          <span className="tc-label tc-rel-label" aria-hidden="true" style={{ color: `hsl(${t.hue},25%,30%)` }}>{t.traitWord}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="tc">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <filter id={`tc-blur-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="11" />
          </filter>
          <filter id={`tc-blur-sm-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          {traits.map((t, i) => (
            <g key={t.key}>
              <radialGradient id={`tc-s-${uid}-${i}`} cx="45%" cy="40%" r="70%">
                <stop offset="0%" stopColor={`hsl(${t.hue},80%,62%)`} stopOpacity="1" />
                <stop offset="45%" stopColor={`hsl(${t.hue},78%,60%)`} stopOpacity="0.88" />
                <stop offset="75%" stopColor={`hsl(${t.hue},70%,68%)`} stopOpacity="0.4" />
                <stop offset="100%" stopColor={`hsl(${t.hue},60%,80%)`} stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`tc-f-${uid}-${i}`} cx="45%" cy="40%" r="70%">
                <stop offset="0%" stopColor={`hsl(${t.hue},60%,76%)`} stopOpacity="0.6" />
                <stop offset="100%" stopColor={`hsl(${t.hue},55%,85%)`} stopOpacity="0" />
              </radialGradient>
            </g>
          ))}
        </defs>
      </svg>

      <div ref={stageRef} className="tc-stage">
      {links.length > 0 && (
        <svg key={`links-${activeIdx}`} className="tc-links" aria-hidden="true">
          {links.map((l) => <path key={l.key} d={l.d} pathLength={1} stroke={`hsl(${active.hue},55%,56%)`} />)}
        </svg>
      )}

      {above.length > 0 && relRow(above, 'above')}

      <div
        ref={stripRef}
        className="tc-strip"
        role="group"
        aria-label="Your traits"
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={count === 1 ? { cursor: 'default' } : undefined}
      >
        {traits.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => { slideRefs.current[i] = el }}
            type="button"
            className="tc-slide"
            aria-label={t.traitWord}
            aria-current={i === activeIdx}
            tabIndex={i === activeIdx ? 0 : -1}
            onClick={() => { if (!justDragged.current && i !== activeIdx) select(i) }}
          >
            <div ref={(el) => { innerRefs.current[i] = el }} className="tc-inner">
              <svg viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden="true">
                <path
                  ref={(el) => { faintRefs.current[i] = el }}
                  d={staticPaths[i]}
                  fill={`url(#tc-f-${uid}-${i})`}
                  filter={`url(#tc-blur-${uid})`}
                />
                <path
                  ref={(el) => { strongRefs.current[i] = el }}
                  d={staticPaths[i]}
                  fill={`url(#tc-s-${uid}-${i})`}
                  filter={`url(#tc-blur-${uid})`}
                />
              </svg>
              <span className="tc-label" aria-hidden="true" style={{ color: `hsl(${t.hue},45%,24%)` }}>{t.traitWord}</span>
              <span className="tc-ring" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>

      {below.length > 0 && relRow(below, 'below')}
      </div>

      {count > 1 && (
        <div className="tc-controls">
          <button type="button" className="tc-arrow" aria-label="Previous trait" disabled={activeIdx === 0} onClick={() => select(activeIdx - 1)}>←</button>
          <p className="tc-count" aria-live="polite">{activeIdx + 1} of {count}</p>
          <button type="button" className="tc-arrow" aria-label="Next trait" disabled={activeIdx === count - 1} onClick={() => select(activeIdx + 1)}>→</button>
        </div>
      )}

      {children}

    </div>
  )
}
