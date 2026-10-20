'use client'

/**
 * Landing, step 2: where people feel stuck. A toggle (At work / In
 * relationships / With yourself), three one-line quotes per tab with a small
 * blob each, then one shared bridge line and the primary button. Each tab
 * has its own hue from the brand palette (CURATED_HUES), used for all three
 * of its blobs; the seed, and so the shape, changes per card.
 *
 * Motion: entrances play once on entering view (lib/design/motion); a tab
 * change fades the cards in over --dur-ui. Reduced motion: no transition.
 * The bridge line is where the next section's thread (Solution) starts.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { blobGradientStops, buildPointMotionProfile, CURATED_HUES, generateAnimatedBlobPath, hashSeed } from '@/lib/blobs'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'
import { ctaFor, useVisitor } from './visitor'

const ink = '#262420'
const soft = '#56534D'

export const problemsCSS = `
  .pv{padding:120px 24px 0;}
  .pv-wrap{max-width:1040px;margin:0 auto;}
  .pv h2{font-family:var(--font-display);font-weight:400;font-size:clamp(34px,4.2vw,52px);line-height:1.08;letter-spacing:-0.025em;margin:0;color:${ink};text-wrap:balance;}
  .pv-intro{${css.body}font-size:18px;color:${soft};margin:20px auto 0;max-width:580px;text-wrap:balance;}
  .m-armed:not(.m-play) .pv-in{opacity:0;transform:translateY(12px);}
  .m-play .pv-in{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}

  .p2-head{text-align:center;max-width:860px;margin:0 auto;}
  .p2-tabs-wrap{display:flex;justify-content:center;margin:36px 0 56px;}
  .p2-tabs{display:inline-flex;position:relative;padding:4px;border-radius:999px;background:rgba(38,36,32,0.06);max-width:100%;overflow-x:auto;scrollbar-width:none;}
  .p2-tabs::-webkit-scrollbar{display:none;}
  .p2-tab{${css.ui}position:relative;z-index:1;flex-shrink:0;min-height:44px;padding:0 18px;border:none;background:transparent;border-radius:999px;color:${soft};cursor:pointer;white-space:nowrap;
    transition:color var(--dur-ui) var(--ease);}
  .p2-tab[aria-selected="true"]{color:${ink};}
  .p2-tab:focus-visible{outline:2px solid ${ink};outline-offset:-2px;}
  .p2-pill{position:absolute;top:4px;bottom:4px;border-radius:999px;background:#FFFFFF;box-shadow:0 1px 3px rgba(38,36,32,0.14);
    transition:left var(--dur-ui) var(--ease),width var(--dur-ui) var(--ease);}

  .p2-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;}
  .p2-cell{padding:8px 24px;text-align:center;}
  .p2-blob{display:block;width:56px;height:56px;margin:0 auto 20px;transition:transform var(--dur-ui) var(--ease);}
  .p2-cell:hover .p2-blob{transform:scale(1.1) rotate(-8deg);}
  .p2-cell p{${css.display3}color:${ink};margin:0;text-wrap:balance;}
  .p2-grid.swap{animation:p2-fade var(--dur-ui) var(--ease) both;}
  @keyframes p2-fade{from{opacity:0;}to{opacity:1;}}

  .p2-foot{text-align:center;max-width:640px;margin:64px auto 0;}
  .p2-bridge{${css.body}font-size:18px;color:${soft};margin:0 auto;max-width:600px;text-wrap:balance;}
  .p2-cta{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:32px;}
  .p2-time{${css.meta}margin:0;}

  @media(max-width:860px){
    .p2-grid{grid-template-columns:minmax(0,1fr);gap:8px;}
    .p2-cell{padding:20px 8px;}
  }
  @media(max-width:640px){
    .pv{padding:56px 16px 0;}
    .p2-grid{gap:4px;}
    .p2-cell{display:flex;align-items:center;gap:16px;padding:14px 4px;text-align:left;}
    .p2-blob{width:40px;height:40px;margin:0;flex-shrink:0;}
    .p2-foot{margin-top:40px;}
    .pv-intro,.p2-bridge{font-size:16px;}
    .p2-tabs-wrap{margin:28px 0 36px;}
    .p2-tab{padding:0 12px;}
  }
  @media(prefers-reduced-motion:reduce){ .p2-grid.swap{animation:none;} .p2-pill,.p2-blob{transition:none;} }
`

// A small blob with the report's own soft gradient and a light blur.
function MiniBlob({ hue, seed, className, blur = 1.6 }: { hue: number; seed: string; className: string; blur?: number }) {
  const d = useMemo(() => generateAnimatedBlobPath(22, 22, 16, buildPointMotionProfile(hashSeed(seed), 8), 0.3, 0), [seed])
  const id = `pv-${seed.replace(/\W/g, '')}`
  return (
    <svg className={className} viewBox="0 0 44 44" aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${id}-g`} cx="45%" cy="40%" r="70%">
          {blobGradientStops(hue, true).map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />)}
        </radialGradient>
        <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={blur} /></filter>
      </defs>
      <path d={d} fill={`url(#${id}-g)`} filter={`url(#${id}-f)`} />
    </svg>
  )
}

// One hue per tab (CURATED_HUES = [8, 35, 145, 175, 205, 235, 290, 335]):
// amber for work, rose for relationships, periwinkle for yourself.
const AREAS = [
  {
    key: 'work',
    label: 'At work',
    hue: CURATED_HUES[1],
    quotes: [
      'I know I could do more. I can’t say what I’m actually good at.',
      'I start strong, then it fades.',
      'I’m not sure this is the right kind of work for me.',
    ],
  },
  {
    key: 'relationships',
    label: 'In relationships',
    hue: CURATED_HUES[7],
    quotes: [
      'I react the same way every time and don’t know why.',
      'I need more closeness, or more space, than the people around me.',
      'I go along with things to keep the peace.',
    ],
  },
  {
    key: 'yourself',
    label: 'With yourself',
    hue: CURATED_HUES[5],
    quotes: [
      'Even on quiet evenings, part of me is on alert.',
      'I can’t tell what makes me different from anyone else.',
      'I’ve read and journaled a lot. I still can’t say what’s going on.',
    ],
  },
]

// The same time the hero and the FAQ give for the 120 statements.
const TIME_COPY = 'About 15 minutes'

const arrow = <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function Problems() {
  const ref = useEnterOnce<HTMLDivElement>()
  const id = useId()
  const cta = ctaFor(useVisitor().startedUnfinished)
  const [i, setI] = useState(0)
  const [swap, setSwap] = useState(0)
  const tabsRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState({ left: 4, width: 0 })
  useEffect(() => {
    const place = () => {
      const tab = tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[i]
      if (tab) setPill({ left: tab.offsetLeft, width: tab.offsetWidth })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [i])
  const pick = (n: number) => {
    if (n === i) return
    setI(n)
    setSwap((v) => v + 1)
    tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[n]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
  const onKey = (e: React.KeyboardEvent) => {
    const last = AREAS.length - 1
    const n = e.key === 'ArrowRight' ? (i + 1) % AREAS.length
      : e.key === 'ArrowLeft' ? (i + last) % AREAS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null
    if (n === null) return
    e.preventDefault()
    pick(n)
    tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[n]?.focus()
  }
  const area = AREAS[i]
  return (
    <section className="pv">
      <style dangerouslySetInnerHTML={{ __html: problemsCSS }} />
      <div ref={ref} className="pv-wrap">
        <div className="p2-head">
          <h2 className="pv-in">Stuck, and not sure why?</h2>
          <p className="pv-intro pv-in" style={{ ['--d' as string]: '100ms' }}>It’s hard to change what you can’t see clearly.</p>
        </div>
        <div className="p2-tabs-wrap pv-in" style={{ ['--d' as string]: '200ms' }}>
          <div ref={tabsRef} className="p2-tabs" role="tablist" aria-label="Where you feel stuck" onKeyDown={onKey}>
            <span className="p2-pill" style={{ left: pill.left, width: pill.width }} aria-hidden="true" />
            {AREAS.map((a, n) => (
              <button
                key={a.key}
                type="button"
                role="tab"
                id={`${id}-tab-${a.key}`}
                aria-selected={n === i}
                aria-controls={`${id}-panel-${a.key}`}
                tabIndex={n === i ? 0 : -1}
                className="p2-tab"
                onClick={() => pick(n)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div id={`${id}-panel-${area.key}`} role="tabpanel" aria-labelledby={`${id}-tab-${area.key}`}>
          <div key={swap} className={`p2-grid${swap ? ' swap' : ''}`}>
            {area.quotes.map((q, n) => (
              <div key={q} className="p2-cell pv-in" style={{ ['--d' as string]: `${300 + n * 90}ms` }}>
                <MiniBlob hue={area.hue} seed={`${area.key}-${n}`} className="p2-blob" blur={3.6} />
                <p>&ldquo;{q}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
        <div className="p2-foot pv-in">
          <p className="p2-bridge">
            Bearing starts with 120 questions about how you tend to think, feel and act. You get a profile of 30 traits,
            then a way to work on the ones that matter to you.
          </p>
          <div className="p2-cta">
            <Link href={cta.href} className="v3-btn">{cta.label} {arrow}</Link>
            <p className="p2-time">{TIME_COPY}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
