'use client'

// "Who you are" once a user has more traits than InteractiveCluster's five
// hand-placed slots: the selected trait as one large hero blob, the rest as a
// palette of small static blobs grouped by Big Five domain. Replaces the ring
// layout, which grew to ~1366 units across for 30 traits and spilled far
// outside the report column.
//
// Only the hero animates. Palette blobs are static paths (t = 0) that all
// share one filter def. Mobile (≤640px) swaps the single hero for a native
// scroll-snap carousel with the neighbouring traits peeking in at the edges.

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DOMAIN_FACETS } from '@/lib/known/ring1-questions'
import {
  FacetEntry,
  buildPointMotionProfile,
  generateAnimatedBlobPath,
  hashSeed,
  userCuratedHue,
} from '@/components/known/ReportVisuals'

const gray = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal = '#262420'

const sans = 'var(--font-inter), system-ui, sans-serif'
const serif = 'var(--font-newsreader), serif'

const MOBILE_QUERY = '(max-width: 640px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const ORDINALS = [
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth',
  'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third',
  'twenty-fourth', 'twenty-fifth', 'twenty-sixth', 'twenty-seventh', 'twenty-eighth',
  'twenty-ninth', 'thirtieth',
]

// Subtitle under a Ring 1 trait name, by the order it was revealed in.
export function patternSubtitle(hueOffset: number): string {
  const word = ORDINALS[hueOffset]
  return word ? `Your ${word} pattern` : 'Another pattern'
}

function traitHue(f: FacetEntry): number {
  return userCuratedHue(`ring1-pattern-${f.traitWord.toLowerCase()}`, f.hueOffset)
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const onChange = () => setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

// ── Hero blob ─────────────────────────────────────────────────────────────────

const HERO_VIEW = 240
const HERO_R = 82

function HeroBlob({ facet, hue, animate, size }: { facet: FacetEntry; hue: number; animate: boolean; size: number }) {
  const uid = useId().replace(/:/g, '')
  const pathRef = useRef<SVGPathElement>(null)
  const profile = useMemo(() => buildPointMotionProfile(hashSeed(facet.traitWord + '-shape'), 9), [facet.traitWord])
  const c = HERO_VIEW / 2

  useEffect(() => {
    if (!animate) return
    let raf: number
    let start: number | null = null
    function tick(now: number) {
      if (start === null) start = now
      pathRef.current?.setAttribute('d', generateAnimatedBlobPath(c, c, HERO_R, profile, 0.3, (now - start) / 1000))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animate, profile, c])

  return (
    <svg viewBox={`0 0 ${HERO_VIEW} ${HERO_VIEW}`} width={size} height={size} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <defs>
        <filter id={`tph-f-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
        <radialGradient id={`tph-g-${uid}`} cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor={`hsl(${hue},80%,62%)`} stopOpacity="1" />
          <stop offset="45%" stopColor={`hsl(${hue},78%,60%)`} stopOpacity="0.88" />
          <stop offset="75%" stopColor={`hsl(${hue},70%,68%)`} stopOpacity="0.4" />
          <stop offset="100%" stopColor={`hsl(${hue},60%,80%)`} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        ref={pathRef}
        d={generateAnimatedBlobPath(c, c, HERO_R, profile, 0.3, 0)}
        fill={`url(#tph-g-${uid})`}
        filter={`url(#tph-f-${uid})`}
      />
    </svg>
  )
}

function HeroText({ facet, align }: { facet: FacetEntry; align: 'left' | 'center' }) {
  return (
    <>
      <h2 style={{ fontFamily: serif, fontSize: 25, fontWeight: 600, color: charcoal, margin: '0 0 6px', textAlign: align }}>
        {facet.traitWord}
      </h2>
      <p style={{ fontFamily: sans, fontSize: 13, color: gray, margin: '0 0 14px', textAlign: align }}>
        {patternSubtitle(facet.hueOffset)}
      </p>
      {facet.content && (
        <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: charcoalSoft, margin: 0, textAlign: align }}>
          {facet.content.trait_quote}
        </p>
      )}
    </>
  )
}

// ── Palette ───────────────────────────────────────────────────────────────────

const CELL_VIEW = 60
const CELL_R = 21
// Lower than the hero's 0.3: at 44-48px the full wobble reads as spiky
// arrow shapes rather than colour chips.
const CELL_IRREGULARITY = 0.16

const paletteCSS = `
  .tp-hero{display:flex;align-items:center;gap:28px;text-align:left;margin-top:8px;}
  .tp-hero-blob{flex:0 0 auto;}
  .tp-hero-text{flex:1;min-width:0;}
  .tp-palette{display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:30px;}
  .tp-row{display:flex;justify-content:center;gap:6px;}
  .tp-cell{position:relative;width:48px;height:48px;padding:0;border:0;border-radius:50%;
    background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;
    -webkit-tap-highlight-color:transparent;}
  .tp-cell svg{transition:transform .25s ease;}
  .tp-cell:hover svg{transform:scale(1.12);}
  .tp-cell[aria-pressed="true"]{box-shadow:inset 0 0 0 1.5px ${charcoal};}
  .tp-cell[aria-pressed="true"] svg{transform:scale(1.18);}
  .tp-cell:focus{outline:none;}
  .tp-cell:focus-visible{outline:2px solid #D85A30;outline-offset:2px;}
  .tp-label{position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);
    white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s ease;
    font-family:${serif};font-style:italic;font-size:13px;color:${charcoal};
    background:#F7F4ED;border:1px solid #E5E1D5;border-radius:8px;padding:3px 8px;z-index:20;}
  .tp-cell:hover .tp-label,.tp-cell:focus-visible .tp-label{opacity:1;}
  .tp-palette:has(:focus-visible) .tp-cell:hover:not(:focus-visible) .tp-label{opacity:0;}
  .tp-count{font-family:${sans};font-size:12px;color:${gray};text-align:center;margin:10px 0 0;}
  .tp-carousel{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;
    padding:4px 15%;margin:0 -22px;scroll-padding:0 15%;}
  .tp-carousel::-webkit-scrollbar{display:none;}
  .tp-slide{flex:0 0 70%;scroll-snap-align:center;display:flex;flex-direction:column;align-items:center;
    transition:opacity .3s ease;}
  @media(max-width:640px){
    .tp-row{gap:4px;}
    .tp-cell{width:44px;height:44px;}
  }
  @media(prefers-reduced-motion:reduce){
    .tp-cell svg,.tp-slide,.tp-label{transition:none;}
  }
`

export function TraitHeroPalette({
  facets,
  activeIdx,
  onSelect,
}: {
  facets: FacetEntry[]
  activeIdx: number
  onSelect: (i: number) => void
}) {
  const uid = useId().replace(/:/g, '')
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)

  // Palette order: one row per Big Five domain (DOMAIN_FACETS order), facets
  // within a domain in source order. Anything unmapped goes in a last row.
  const rows = useMemo(() => {
    const byFacet = new Map(facets.map((f, i) => [f.facet, i]))
    const used = new Set<number>()
    const out: number[][] = []
    for (const domainFacets of Object.values(DOMAIN_FACETS)) {
      const row = domainFacets.map((f) => byFacet.get(f)).filter((i): i is number => i !== undefined)
      row.forEach((i) => used.add(i))
      if (row.length) out.push(row)
    }
    const rest = facets.map((_, i) => i).filter((i) => !used.has(i))
    if (rest.length) out.push(rest)
    return out
  }, [facets])
  const order = useMemo(() => rows.flat(), [rows])
  const position = Math.max(0, order.indexOf(activeIdx))

  const hues = useMemo(() => facets.map(traitHue), [facets])
  const cellPaths = useMemo(
    () => facets.map((f) => generateAnimatedBlobPath(
      CELL_VIEW / 2, CELL_VIEW / 2, CELL_R, buildPointMotionProfile(hashSeed(f.traitWord + '-shape'), 9), CELL_IRREGULARITY, 0,
    )),
    [facets],
  )

  // ── Roving focus + arrow keys ──────────────────────────────────────────────
  const cellRefs = useRef(new Map<number, HTMLButtonElement>())
  const [focusIdx, setFocusIdx] = useState(activeIdx)
  useEffect(() => { setFocusIdx(activeIdx) }, [activeIdx])

  function moveFocus(to: number) {
    setFocusIdx(to)
    cellRefs.current.get(to)?.focus()
  }

  function onCellKeyDown(e: React.KeyboardEvent, idx: number) {
    const r = rows.findIndex((row) => row.includes(idx))
    const c = rows[r].indexOf(idx)
    const flat = order.indexOf(idx)
    let to: number | null = null
    if (e.key === 'ArrowRight') to = order[Math.min(order.length - 1, flat + 1)]
    else if (e.key === 'ArrowLeft') to = order[Math.max(0, flat - 1)]
    else if (e.key === 'ArrowDown' && r < rows.length - 1) to = rows[r + 1][Math.min(c, rows[r + 1].length - 1)]
    else if (e.key === 'ArrowUp' && r > 0) to = rows[r - 1][Math.min(c, rows[r - 1].length - 1)]
    else if (e.key === 'Home') to = order[0]
    else if (e.key === 'End') to = order[order.length - 1]
    if (to === null) return
    e.preventDefault()
    moveFocus(to)
  }

  // ── Desktop swap animation (FLIP) ──────────────────────────────────────────
  // The chosen palette blob grows into the hero slot, and the old hero shrinks
  // back into its palette cell. Rects are captured before the state change and
  // played back right after layout.
  const heroBlobRef = useRef<HTMLDivElement>(null)
  const pendingSwap = useRef<{ from: DOMRect; prevIdx: number; hero: DOMRect } | null>(null)

  const select = useCallback((idx: number) => {
    if (idx === activeIdx) return
    const cell = cellRefs.current.get(idx)
    const hero = heroBlobRef.current
    if (!isMobile && !reducedMotion && cell && hero) {
      pendingSwap.current = { from: cell.getBoundingClientRect(), prevIdx: activeIdx, hero: hero.getBoundingClientRect() }
    }
    onSelect(idx)
  }, [activeIdx, isMobile, reducedMotion, onSelect])

  useLayoutEffect(() => {
    const swap = pendingSwap.current
    pendingSwap.current = null
    const hero = heroBlobRef.current
    if (!swap || !hero) return
    const centre = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    const heroNow = hero.getBoundingClientRect()
    const a = centre(swap.from)
    const b = centre(heroNow)
    const grow = swap.from.width / heroNow.width
    hero.animate(
      [
        { transform: `translate(${a.x - b.x}px, ${a.y - b.y}px) scale(${grow})`, opacity: 0.5 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      ],
      { duration: 480, easing: 'cubic-bezier(.2,.7,.2,1)' },
    )
    const prevSvg = cellRefs.current.get(swap.prevIdx)?.querySelector('svg')
    if (prevSvg) {
      const cellRect = prevSvg.getBoundingClientRect()
      const c = centre(cellRect)
      const h = centre(swap.hero)
      const shrink = swap.hero.width / cellRect.width
      prevSvg.animate(
        [
          { transform: `translate(${h.x - c.x}px, ${h.y - c.y}px) scale(${shrink})`, opacity: 0.35 },
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        ],
        { duration: 480, easing: 'cubic-bezier(.2,.7,.2,1)' },
      )
    }
  }, [activeIdx])

  // ── Mobile carousel ────────────────────────────────────────────────────────
  const scrollerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef(new Map<number, HTMLDivElement>())
  // Set while the carousel scrolls itself to a palette pick, so the slides it
  // passes on the way don't each become the selection.
  const scrollTarget = useRef<number | null>(null)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const nearestSlide = useCallback((): number | null => {
    const el = scrollerRef.current
    if (!el) return null
    const mid = el.scrollLeft + el.clientWidth / 2
    let best: number | null = null
    let bestDist = Infinity
    slideRefs.current.forEach((slide, idx) => {
      const d = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - mid)
      if (d < bestDist) { bestDist = d; best = idx }
    })
    return best
  }, [])

  useEffect(() => {
    if (!isMobile) return
    const el = scrollerRef.current
    const slide = slideRefs.current.get(activeIdx)
    if (!el || !slide) return
    if (nearestSlide() === activeIdx) return
    scrollTarget.current = activeIdx
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => { scrollTarget.current = null }, 1200)
    el.scrollTo({
      left: slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }, [activeIdx, isMobile, reducedMotion, nearestSlide])

  function onCarouselScroll() {
    const idx = nearestSlide()
    if (idx === null) return
    if (scrollTarget.current !== null) {
      if (idx === scrollTarget.current) scrollTarget.current = null
      return
    }
    if (idx !== activeIdx) onSelect(idx)
  }

  const active = facets[activeIdx]
  if (!active) return null

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: paletteCSS }} />

      {/* Shared defs for every palette blob: one filter, one gradient per trait. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <filter id={`tp-f-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          {facets.map((f, i) => (
            <radialGradient key={f.facet} id={`tp-g-${uid}-${i}`} cx="45%" cy="40%" r="70%">
              <stop offset="0%" stopColor={`hsl(${hues[i]},72%,64%)`} stopOpacity="0.85" />
              <stop offset="70%" stopColor={`hsl(${hues[i]},65%,72%)`} stopOpacity="0.5" />
              <stop offset="100%" stopColor={`hsl(${hues[i]},55%,84%)`} stopOpacity="0.1" />
            </radialGradient>
          ))}
        </defs>
      </svg>

      {isMobile ? (
        <>
          <div ref={scrollerRef} className="tp-carousel" onScroll={onCarouselScroll}>
            {order.map((i) => {
              const f = facets[i]
              const isActive = i === activeIdx
              return (
                <div
                  key={f.facet}
                  ref={(el) => { if (el) slideRefs.current.set(i, el); else slideRefs.current.delete(i) }}
                  className="tp-slide"
                  aria-hidden={!isActive}
                >
                  {/* Neighbours peek in as blobs only; their text would just be clipped noise. */}
                  <div style={{ minHeight: 150, width: '100%', opacity: isActive ? 1 : 0, transition: 'opacity .3s ease' }}>
                    <HeroText facet={f} align="center" />
                  </div>
                  <div style={{ opacity: isActive ? 1 : 0.45, transition: 'opacity .3s ease' }}>
                    <HeroBlob facet={f} hue={hues[i]} animate={isActive && !reducedMotion} size={190} />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="tp-count" aria-live="polite">{position + 1} of {facets.length}</p>
        </>
      ) : (
        <div className="tp-hero">
          <div ref={heroBlobRef} className="tp-hero-blob">
            <HeroBlob key={active.facet} facet={active} hue={hues[activeIdx]} animate={!reducedMotion} size={220} />
          </div>
          <div className="tp-hero-text" aria-live="polite">
            <HeroText facet={active} align="left" />
            <p className="tp-count" style={{ textAlign: 'left', marginTop: 14 }}>{position + 1} of {facets.length}</p>
          </div>
        </div>
      )}

      <div className="tp-palette" role="group" aria-label="All traits">
        {rows.map((row, r) => (
          <div key={r} className="tp-row">
            {row.map((i) => {
              const f = facets[i]
              return (
                <button
                  key={f.facet}
                  ref={(el) => { if (el) cellRefs.current.set(i, el); else cellRefs.current.delete(i) }}
                  type="button"
                  className="tp-cell"
                  aria-label={f.traitWord}
                  aria-pressed={i === activeIdx}
                  tabIndex={i === focusIdx ? 0 : -1}
                  onFocus={() => setFocusIdx(i)}
                  onKeyDown={(e) => onCellKeyDown(e, i)}
                  onClick={() => select(i)}
                >
                  <svg viewBox={`0 0 ${CELL_VIEW} ${CELL_VIEW}`} width="100%" height="100%" aria-hidden="true" style={{ overflow: 'visible' }}>
                    <path d={cellPaths[i]} fill={`url(#tp-g-${uid}-${i})`} filter={`url(#tp-f-${uid})`} />
                  </svg>
                  <span className="tp-label" aria-hidden="true">{f.traitWord}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
