'use client'

// Design comparison only — four candidate layouts for "Who you are" with 30
// traits, on sample scores. Not linked from anywhere; not for merging.

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FacetEntry,
  InteractiveCluster,
  buildPointMotionProfile,
  generateAnimatedBlobPath,
  hashSeed,
  userCuratedHue,
} from '@/components/known/ReportVisuals'
import { DOMAIN_FACETS } from '@/lib/known/ring1-questions'
import { FACET_DESCRIPTIONS, getTraitWord } from '@/lib/known/scoring'

const cream = '#F7F4ED'
const gray = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal = '#262420'
const line = '#E5E1D5'
const coral = '#D85A30'
const sans = 'var(--font-inter), system-ui, sans-serif'
const serif = 'var(--font-newsreader), serif'

// Working labels for the five domains. New copy — placeholders for this mock.
const DOMAIN_LABEL: Record<string, string> = {
  Neuroticism: 'Emotional range',
  Extraversion: 'Social energy',
  Openness: 'Openness',
  Agreeableness: 'How you relate',
  Conscientiousness: 'How you work',
}

// Sample scores (1–5), deterministic per facet.
function sampleScore(facet: string): number {
  return 1.4 + (hashSeed(facet + '-sample') % 330) / 100
}

interface Trait extends FacetEntry { domain: string; score: number; hue: number }

const TRAITS: Trait[] = (() => {
  const all = Object.entries(DOMAIN_FACETS).flatMap(([domain, facets]) => facets.map((facet) => ({ domain, facet })))
  // reveal order: shuffled, so hues/hueOffset look like a real session
  const revealed = [...all].sort((a, b) => hashSeed(a.facet + 'r') - hashSeed(b.facet + 'r'))
  return all.map(({ domain, facet }) => {
    const score = sampleScore(facet)
    const traitWord = getTraitWord(facet, score)
    const hueOffset = revealed.findIndex((r) => r.facet === facet)
    return { facet, traitWord, hueOffset, content: null, domain, score, hue: userCuratedHue(`ring1-pattern-${traitWord.toLowerCase()}`, hueOffset) }
  })
})()

const pronounced = (t: Trait) => Math.abs(t.score - 3)
const TOP5 = [...TRAITS].sort((a, b) => pronounced(b) - pronounced(a)).slice(0, 5)
const BY_DOMAIN = Object.keys(DOMAIN_FACETS).map((d) => ({ domain: d, traits: TRAITS.filter((t) => t.domain === d) }))

// ── Shared bits ───────────────────────────────────────────────────────────────

function Detail({ t }: { t: Trait | null }) {
  if (!t) return null
  return (
    <div style={{ textAlign: 'center', marginTop: 22 }}>
      <p style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, color: charcoal, margin: '0 0 6px' }}>{t.traitWord}</p>
      <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
        {FACET_DESCRIPTIONS[t.facet]}
      </p>
      <p style={{ fontFamily: sans, fontSize: 11.5, color: gray, marginTop: 8 }}>(the full trait detail would follow here)</p>
    </div>
  )
}

function DomainLabel({ domain }: { domain: string }) {
  return (
    <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, margin: '0 0 6px' }}>
      {DOMAIN_LABEL[domain]}
    </p>
  )
}

function StaticBlob({ t, size, strong }: { t: Trait; size: number; strong?: boolean }) {
  const id = `sb-${t.facet.replace(/\W/g, '')}-${size}-${strong ? 1 : 0}`
  const d = useMemo(() => generateAnimatedBlobPath(30, 30, 19, buildPointMotionProfile(hashSeed(t.traitWord + '-shape'), 9), 0.18, 0), [t.traitWord])
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <defs>
        <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
        <radialGradient id={`${id}-g`} cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor={`hsl(${t.hue},75%,63%)`} stopOpacity={strong ? 0.95 : 0.75} />
          <stop offset="100%" stopColor={`hsl(${t.hue},55%,84%)`} stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <path d={d} fill={`url(#${id}-g)`} filter={`url(#${id}-f)`} />
    </svg>
  )
}

function OptionFrame({ letter, title, pitch, wide, children }: { letter: string; title: string; pitch: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section style={{ borderTop: `1px solid ${line}`, padding: '48px 0 56px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto 28px', padding: '0 22px' }}>
        <p style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, color: coral, letterSpacing: '0.06em', margin: '0 0 6px' }}>OPTION {letter}</p>
        <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, color: charcoal, margin: '0 0 8px' }}>{title}</h2>
        <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, lineHeight: 1.6, margin: 0 }}>{pitch}</p>
      </div>
      <div style={{ maxWidth: wide ? 1100 : 560, margin: '0 auto', padding: '0 22px' }}>
        <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, textAlign: 'center', margin: '0 0 6px' }}>
          Who you are
        </p>
        {children}
      </div>
    </section>
  )
}

const wordBtn: CSSProperties = { background: 'none', border: 0, padding: '2px 0', cursor: 'pointer', fontFamily: serif, fontStyle: 'italic', fontSize: 16 }

// ── A. Top five cluster + all traits as words ────────────────────────────────

function OptionA() {
  const [clusterIdx, setClusterIdx] = useState(0)
  const [selected, setSelected] = useState<Trait>(TOP5[0])
  function pick(t: Trait) {
    setSelected(t)
    const i = TOP5.indexOf(t)
    if (i >= 0) setClusterIdx(i)
  }
  return (
    <>
      <InteractiveCluster facets={TOP5} activeIdx={clusterIdx} onSelect={(i) => pick(TOP5[i])} />
      <Detail t={selected} />
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${line}` }}>
        <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, textAlign: 'center', margin: '0 0 18px' }}>
          All 30 traits
        </p>
        {BY_DOMAIN.map(({ domain, traits }) => (
          <div key={domain} style={{ marginBottom: 14, textAlign: 'center' }}>
            <DomainLabel domain={domain} />
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px 6px', alignItems: 'baseline' }}>
              {traits.map((t, i) => (
                <span key={t.facet} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                  <button
                    onClick={() => pick(t)}
                    style={{
                      ...wordBtn,
                      color: TOP5.includes(t) ? charcoal : charcoalSoft,
                      fontWeight: TOP5.includes(t) ? 600 : 400,
                      textDecoration: selected === t ? `underline ${coral} 2px` : 'none',
                      textUnderlineOffset: 4,
                    }}
                  >
                    {t.traitWord}
                  </button>
                  {i < traits.length - 1 && <span style={{ color: line }}>·</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── A+. Filter: top five or one domain → pills → cluster ───────────────────

const filterCSS = `
  .opt-filter{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 2px 4px;margin:0 -22px;padding-left:22px;padding-right:22px;}
  .opt-filter::-webkit-scrollbar{display:none;}
  .opt-chip{flex:0 0 auto;border:1px solid ${line};background:transparent;border-radius:999px;padding:7px 14px;
    font-family:${sans};font-size:13px;color:${charcoalSoft};cursor:pointer;white-space:nowrap;transition:background .15s ease,color .15s ease;}
  .opt-chip:hover{border-color:#CFCABD;}
  .opt-chip[aria-pressed="true"]{background:${charcoal};border-color:${charcoal};color:${cream};}
  .opt-chip:focus-visible,.opt-pill:focus-visible{outline:2px solid ${coral};outline-offset:2px;}
  @media(min-width:600px){.opt-filter{justify-content:center;flex-wrap:wrap;margin:0;padding-left:2px;padding-right:2px;}}
`

const GROUPS: { key: string; label: string; traits: Trait[] }[] = [
  { key: 'top', label: 'Top 5', traits: TOP5 },
  ...BY_DOMAIN.map(({ domain, traits }) => ({
    key: domain,
    label: DOMAIN_LABEL[domain],
    traits: [...traits].sort((a, b) => pronounced(b) - pronounced(a)),
  })),
]

function OptionFiltered() {
  const [groupKey, setGroupKey] = useState('top')
  const [activeIdx, setActiveIdx] = useState(0)
  const group = GROUPS.find((g) => g.key === groupKey)!
  const selected = group.traits[Math.min(activeIdx, group.traits.length - 1)]
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: filterCSS }} />
      <InteractiveCluster key={groupKey} facets={group.traits} activeIdx={activeIdx} onSelect={setActiveIdx} />
      <div className="opt-filter" style={{ marginTop: 8 }} role="group" aria-label="Show traits">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            className="opt-chip"
            aria-pressed={g.key === groupKey}
            onClick={() => { setGroupKey(g.key); setActiveIdx(0) }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <Detail t={selected} />
    </>
  )
}

// ── F. Horizontal trait carousel ─────────────────────────────────────────────

const ALL_RANKED = [...TRAITS].sort((a, b) => pronounced(b) - pronounced(a))
const SLIDE_W = 132
const CBLOB = 240

function CarouselBlob({ t, active }: { t: Trait; active: boolean }) {
  const id = `cb-${t.facet.replace(/\W/g, '')}`
  const pathRef = useRef<SVGPathElement>(null)
  const profile = useMemo(() => buildPointMotionProfile(hashSeed(t.traitWord + '-shape'), 9), [t.traitWord])
  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf: number
    let start: number | null = null
    const tick = (now: number) => {
      if (start === null) start = now
      pathRef.current?.setAttribute('d', generateAnimatedBlobPath(120, 120, 82, profile, 0.3, (now - start) / 1000))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, profile])
  return (
    <svg viewBox="0 0 240 240" width={CBLOB} height={CBLOB} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <defs>
        <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="11" /></filter>
        <radialGradient id={`${id}-g`} cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor={`hsl(${t.hue},80%,62%)`} stopOpacity="1" />
          <stop offset="45%" stopColor={`hsl(${t.hue},78%,60%)`} stopOpacity="0.88" />
          <stop offset="75%" stopColor={`hsl(${t.hue},70%,68%)`} stopOpacity="0.4" />
          <stop offset="100%" stopColor={`hsl(${t.hue},60%,80%)`} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path ref={pathRef} d={generateAnimatedBlobPath(120, 120, 82, profile, 0.3, 0)} fill={`url(#${id}-g)`} filter={`url(#${id}-f)`} />
    </svg>
  )
}

const carouselCSS = `
  .opt-car{position:relative;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;height:280px;align-items:center;
    padding:0 calc(50% + 22px - ${SLIDE_W / 2}px);margin:0 -22px;cursor:grab;outline:none;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 22%,#000 78%,transparent 100%);
            mask-image:linear-gradient(90deg,transparent 0,#000 22%,#000 78%,transparent 100%);}
  .opt-car::-webkit-scrollbar{display:none;}
  .opt-car.dragging{cursor:grabbing;scroll-snap-type:none;}
  .opt-slide{flex:0 0 ${SLIDE_W}px;height:100%;scroll-snap-align:center;position:relative;border:0;background:none;padding:0;cursor:pointer;}
  .opt-slide-inner{position:absolute;left:50%;top:50%;width:${CBLOB}px;height:${CBLOB}px;margin:-${CBLOB / 2}px 0 0 -${CBLOB / 2}px;
    display:flex;align-items:center;justify-content:center;will-change:transform,opacity;}
  .opt-slide-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    font-family:${serif};font-style:italic;font-weight:500;font-size:22px;pointer-events:none;}
  .opt-arrow{width:36px;height:36px;border-radius:50%;border:1px solid ${line};background:${cream};color:${charcoalSoft};
    cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;}
  .opt-arrow:disabled{opacity:.35;cursor:default;}
  .opt-arrow:focus-visible,.opt-car:focus-visible{outline:2px solid ${coral};outline-offset:2px;}
`

function OptionCarousel() {
  const scroller = useRef<HTMLDivElement>(null)
  const inners = useRef<(HTMLDivElement | null)[]>([])
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const justDragged = useRef(false)

  // Scale and fade each blob by its distance from the centre: the middle one
  // full size, direct neighbours about half, further ones fading out.
  const paint = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let bestD = Infinity
    inners.current.forEach((inner, i) => {
      const slide = inner?.parentElement
      if (!inner || !slide) return
      const d = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - mid) / SLIDE_W
      if (d < bestD) { bestD = d; best = i }
      const scale = d <= 1 ? 1 - 0.52 * d : Math.max(0.3, 0.48 - 0.18 * (d - 1))
      inner.style.transform = `scale(${scale})`
      inner.style.opacity = String(d <= 1 ? 1 - 0.25 * d : Math.max(0, 0.75 - 0.45 * (d - 1)))
      inner.style.zIndex = String(100 - Math.round(d * 10))
    })
    activeRef.current = best
    setActive(best)
  }, [])

  useEffect(() => { paint() }, [paint])

  function goTo(i: number) {
    const el = scroller.current
    const slide = inners.current[i]?.parentElement
    if (!el || !slide) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' })
  }

  // Mouse drag (touch and trackpads scroll natively).
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse' || !scroller.current) return
    drag.current = { x: e.clientX, left: scroller.current.scrollLeft, moved: false }
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    const el = scroller.current
    if (!d || !el) return
    if (Math.abs(e.clientX - d.x) > 4) { d.moved = true; el.classList.add('dragging') }
    el.scrollLeft = d.left - (e.clientX - d.x)
  }
  function onPointerUp() {
    const el = scroller.current
    if (!drag.current || !el) return
    const moved = drag.current.moved
    drag.current = null
    el.classList.remove('dragging')
    if (moved) {
      justDragged.current = true
      setTimeout(() => { justDragged.current = false }, 0)
      requestAnimationFrame(() => goTo(activeRef.current))
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: carouselCSS }} />
      <div
        ref={scroller}
        className="opt-car"
        tabIndex={0}
        role="group"
        aria-label="Your traits"
        onScroll={paint}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.min(ALL_RANKED.length - 1, active + 1)) }
          if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.max(0, active - 1)) }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {ALL_RANKED.map((t, i) => (
          <button
            key={t.facet}
            className="opt-slide"
            tabIndex={-1}
            aria-label={t.traitWord}
            onClick={() => { if (!justDragged.current) goTo(i) }}
          >
            <div ref={(el) => { inners.current[i] = el }} className="opt-slide-inner">
              <CarouselBlob t={t} active={i === active} />
              <span className="opt-slide-label" style={{ color: `hsl(${t.hue},45%,24%)` }}>{t.traitWord}</span>
            </div>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 4 }}>
        <button className="opt-arrow" aria-label="Previous trait" disabled={active === 0} onClick={() => goTo(active - 1)}>←</button>
        <span style={{ fontFamily: sans, fontSize: 12, color: gray, minWidth: 56, textAlign: 'center' }}>{active + 1} of {ALL_RANKED.length}</span>
        <button className="opt-arrow" aria-label="Next trait" disabled={active === ALL_RANKED.length - 1} onClick={() => goTo(active + 1)}>→</button>
      </div>
      <Detail t={ALL_RANKED[active]} />
    </>
  )
}

// ── B. One small cluster per domain ──────────────────────────────────────────

function OptionB() {
  const [active, setActive] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<Trait | null>(null)
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '8px 24px' }}>
        {BY_DOMAIN.map(({ domain, traits }) => {
          const ranked = [...traits].sort((a, b) => pronounced(b) - pronounced(a))
          return (
            <div key={domain} style={{ textAlign: 'center' }}>
              <DomainLabel domain={domain} />
              <InteractiveCluster
                facets={ranked}
                activeIdx={active[domain] ?? 0}
                onSelect={(i) => { setActive((a) => ({ ...a, [domain]: i })); setSelected(ranked[i]) }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ maxWidth: 516, margin: '0 auto' }}><Detail t={selected ?? TOP5[0]} /></div>
    </>
  )
}

// ── C. Blob pills that wrap like text ────────────────────────────────────────

const pillCSS = `
  .opt-pill{position:relative;isolation:isolate;border:0;background:none;cursor:pointer;
    padding:9px 16px;font-family:${serif};font-style:italic;font-size:15.5px;color:${charcoal};}
  .opt-pill::before{content:'';position:absolute;inset:1px -2px;z-index:-1;filter:blur(5px);
    background:radial-gradient(ellipse at 45% 40%, hsla(var(--h),75%,64%,.55), hsla(var(--h),60%,78%,.28) 60%, hsla(var(--h),55%,85%,0) 78%);
    border-radius:var(--r);transition:opacity .2s ease, transform .2s ease;opacity:.85;}
  .opt-pill:hover::before{transform:scale(1.06);opacity:1;}
  .opt-pill[aria-pressed="true"]{font-weight:600;}
  .opt-pill[aria-pressed="true"]::before{opacity:1;background:radial-gradient(ellipse at 45% 40%, hsla(var(--h),80%,62%,.85), hsla(var(--h),70%,70%,.4) 60%, hsla(var(--h),55%,85%,0) 80%);}
`

function OptionC() {
  const [selected, setSelected] = useState<Trait>(TOP5[0])
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pillCSS }} />
      {BY_DOMAIN.map(({ domain, traits }) => (
        <div key={domain} style={{ marginBottom: 16, textAlign: 'center' }}>
          <DomainLabel domain={domain} />
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
            {traits.map((t) => {
              const h = hashSeed(t.traitWord)
              const r = `${48 + (h % 14)}% ${52 - (h % 9)}% ${50 + (h % 11)}% ${46 + (h % 8)}% / ${55 + (h % 10)}% ${45 + (h % 12)}% ${58 - (h % 9)}% ${44 + (h % 10)}%`
              return (
                <button
                  key={t.facet}
                  className="opt-pill"
                  aria-pressed={selected === t}
                  onClick={() => setSelected(t)}
                  style={{ ['--h' as string]: String(t.hue), ['--r' as string]: r }}
                >
                  {t.traitWord}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <Detail t={selected} />
    </>
  )
}

// ── D. Spectrum lines ────────────────────────────────────────────────────────

function OptionD() {
  const [selected, setSelected] = useState<Trait>(TOP5[0])
  return (
    <>
      {BY_DOMAIN.map(({ domain, traits }) => {
        const sorted = [...traits].sort((a, b) => a.score - b.score)
        // Four label lanes (above/below the line, near/far); each label takes
        // the first lane with room, so close scores don't stack their words.
        const lanes: number[] = [-Infinity, -Infinity, -Infinity, -Infinity]
        const laneOf = sorted.map((t) => {
          let lane = lanes.findIndex((last) => t.score - last >= 0.8)
          if (lane < 0) lane = lanes.indexOf(Math.min(...lanes))
          lanes[lane] = t.score
          return lane
        })
        return (
          <div key={domain} style={{ marginBottom: 6 }}>
            <DomainLabel domain={domain} />
            <div style={{ position: 'relative', height: 140, margin: '0 18px' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 70, height: 1, background: line }} />
              <span style={{ position: 'absolute', left: -18, top: 64, fontFamily: sans, fontSize: 10, color: gray }}>low</span>
              <span style={{ position: 'absolute', right: -22, top: 64, fontFamily: sans, fontSize: 10, color: gray }}>high</span>
              {sorted.map((t, i) => {
                const left = `${((t.score - 1) / 4) * 100}%`
                const above = laneOf[i] % 2 === 0
                const far = laneOf[i] >= 2
                const isSel = selected === t
                return (
                  <button
                    key={t.facet}
                    onClick={() => setSelected(t)}
                    aria-label={t.traitWord}
                    style={{ position: 'absolute', left, top: 70, transform: 'translate(-50%,-50%)', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                  >
                    <StaticBlob t={t} size={isSel ? 40 : 30} strong={isSel} />
                    <span style={{
                      position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                      [above ? 'bottom' : 'top']: far ? 'calc(100% + 20px)' : '100%', whiteSpace: 'nowrap',
                      fontFamily: serif, fontStyle: 'italic', fontSize: 13, fontWeight: isSel ? 600 : 400,
                      color: isSel ? charcoal : charcoalSoft,
                    } as CSSProperties}>
                      {t.traitWord}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <Detail t={selected} />
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportOptionsPage() {
  return (
    <main style={{ background: cream, minHeight: '100vh', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 22px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 12 }}>
          Design options · sample data
        </p>
        <h1 style={{ fontFamily: serif, fontSize: 30, fontWeight: 500, color: charcoal, margin: '0 0 12px' }}>
          &ldquo;Who you are&rdquo; with 30 traits
        </h1>
        <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, lineHeight: 1.6, margin: 0 }}>
          Ways to show all 30 traits; the newest (F) is first. Trait words come from the real scoring code on sample scores; colours use the
          real per-trait hues. Domain names are working labels. Everything is clickable.
        </p>
      </div>

      <OptionFrame letter="F" title="Scroll through your traits"
        pitch="One trait large in the middle, its neighbours smaller on either side. Swipe, drag, use the arrows or the arrow keys to move through all 30, most pronounced first.">
        <OptionCarousel />
      </OptionFrame>

      <OptionFrame letter="A+" title="Top five or one domain, with a filter"
        pitch="Option A with a filter under the cluster: Top 5 (the most pronounced) or one domain at a time. Tap a blob to select a trait.">
        <OptionFiltered />
      </OptionFrame>

      <OptionFrame letter="A" title="Your top five, then all thirty as words"
        pitch="The existing cluster, kept to the five most pronounced traits (furthest from average). Below it, every trait as a tappable word, grouped by domain. Bold words are the five in the cluster.">
        <OptionA />
      </OptionFrame>

      <OptionFrame letter="B" title="One small cluster per domain" wide
        pitch="Five clusters in the current style, six traits each, the most pronounced in the centre. Very on-brand; it's long on a phone and runs 30 animated blobs at once.">
        <OptionB />
      </OptionFrame>

      <OptionFrame letter="C" title="Blob pills that wrap like text"
        pitch="Each trait is a soft tinted blob with its word inside, grouped by domain. Compact and readable at every width; less of a showpiece.">
        <OptionC />
      </OptionFrame>

      <OptionFrame letter="D" title="Spectrum lines"
        pitch="One line per domain, each trait placed from low to high by its score. Shows where you lean, which is new information on the page, so the copy around it needs care.">
        <OptionD />
      </OptionFrame>
    </main>
  )
}
