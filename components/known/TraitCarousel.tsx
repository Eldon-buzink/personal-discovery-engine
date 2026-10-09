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
const charcoal = '#262420'
const cream = '#F7F4ED'
const line = '#E5E1D5'
const coral = '#D85A30'
const sans = 'var(--font-inter), system-ui, sans-serif'
const serif = 'var(--font-newsreader), serif'

export interface CarouselTrait {
  key: string
  traitWord: string
  hue: number
  /** 0 … 2, see traitStrength(). Drives scrubber tick height. */
  strength: number
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

/** Subtitle under a Ring 1 trait name, by the order it was revealed in. */
export function patternSubtitle(hueOffset: number): string {
  const word = ORDINALS[hueOffset]
  return word ? `Your ${word} pattern` : 'Another pattern'
}

const VIEW = 240
const R = 82
const IRREGULARITY = 0.3
const MOST_PRONOUNCED = 5
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
  .tc{--slide:132px;--blob:240px;--strip:262px;}
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
  .tc-scrub{display:flex;align-items:flex-start;justify-content:center;gap:10px;margin:14px auto 0;max-width:420px;}
  .tc-scrub-group{display:flex;flex-direction:column;align-items:stretch;}
  .tc-ticks{display:flex;align-items:flex-end;height:30px;}
  .tc-tick{flex:0 0 auto;width:11px;height:30px;border:0;background:none;padding:0;cursor:pointer;
    display:flex;align-items:flex-end;justify-content:center;border-radius:3px;}
  .tc-tick span{display:block;width:3px;border-radius:2px;background:#CFCABD;transition:background .15s ease;}
  .tc-tick:hover span{background:${gray};}
  .tc-tick[aria-current="true"] span{background:${coral};}
  @media(max-width:560px){.tc-scrub{gap:8px;}.tc-tick{width:9px;}}
  .tc-top-label{margin-top:6px;border:0;border-top:1px solid #CFCABD;background:none;padding:5px 0 0;cursor:pointer;
    font-family:${sans};font-size:11px;color:${gray};white-space:nowrap;}
  .tc-top-label:hover{color:${charcoal};}
  .tc-arrow:focus-visible,.tc-tick:focus-visible,.tc-top-label:focus-visible,.tc-rel:focus-visible{outline:2px solid ${coral};outline-offset:2px;}
  .tc-related{margin-top:30px;text-align:center;}
  .tc-related-row{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 14px;margin-top:10px;}
  .tc-rel{display:flex;flex-direction:column;align-items:center;gap:2px;border:0;background:none;padding:4px;cursor:pointer;border-radius:10px;}
  .tc-rel svg{width:44px;height:44px;overflow:visible;transition:transform .2s ease;}
  .tc-rel:hover svg{transform:scale(1.08);}
  .tc-rel span{font-family:${serif};font-style:italic;font-size:13.5px;color:${charcoalSoft};}
  @media(prefers-reduced-motion:reduce){.tc-strip,.tc-rel svg,.tc-tick span{transition:none;}}
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
  /** The selected trait's detail; rendered between the controls and the related row. */
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
    () => profiles.map((p) => generateAnimatedBlobPath(30, 30, 20, p, IRREGULARITY, 0)),
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
  // ticks, related blobs), so the slides it passes don't become the selection.
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

  const active = traits[activeIdx]
  if (!active) return null
  const related = active.domain
    ? traits.map((t, i) => ({ t, i })).filter(({ t, i }) => i !== activeIdx && t.domain === active.domain)
    : []
  const showScrubber = count > MOST_PRONOUNCED
  const tick = (i: number) => (
    <button
      key={traits[i].key}
      type="button"
      className="tc-tick"
      aria-label={traits[i].traitWord}
      aria-current={i === activeIdx}
      onClick={() => select(i)}
    >
      <span style={{ height: 6 + traits[i].strength * 9 }} />
    </button>
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

      {count > 1 && (
        <div className="tc-controls">
          <button type="button" className="tc-arrow" aria-label="Previous trait" disabled={activeIdx === 0} onClick={() => select(activeIdx - 1)}>←</button>
          <p className="tc-count" aria-live="polite">{activeIdx + 1} of {count}</p>
          <button type="button" className="tc-arrow" aria-label="Next trait" disabled={activeIdx === count - 1} onClick={() => select(activeIdx + 1)}>→</button>
        </div>
      )}

      {showScrubber && (
        <div className="tc-scrub">
          <div className="tc-scrub-group">
            <div className="tc-ticks">{traits.slice(0, MOST_PRONOUNCED).map((_, i) => tick(i))}</div>
            <button type="button" className="tc-top-label" onClick={() => select(0)}>Most pronounced</button>
          </div>
          <div className="tc-ticks">{traits.slice(MOST_PRONOUNCED).map((_, j) => tick(j + MOST_PRONOUNCED))}</div>
        </div>
      )}

      {children}

      {related.length > 0 && active.domain && (
        <div className="tc-related">
          <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, margin: 0 }}>
            Also in {DOMAIN_LABELS[active.domain] ?? active.domain}
          </p>
          <div className="tc-related-row">
            {related.map(({ t, i }) => (
              <button key={t.key} type="button" className="tc-rel" onClick={() => select(i)}>
                <svg viewBox="0 0 60 60" aria-hidden="true">
                  <path d={smallPaths[i]} fill={`url(#tc-s-${uid}-${i})`} opacity={0.7} filter={`url(#tc-blur-sm-${uid})`} />
                </svg>
                <span>{t.traitWord}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
