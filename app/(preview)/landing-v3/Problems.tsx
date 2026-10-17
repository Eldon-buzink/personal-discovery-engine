'use client'

/**
 * Landing v3, step 2: the problems section, three designs (/landing-v3/p1,
 * /p2, /p3), each with its own copy. The problems come from the product:
 * everyday moments the check-in questions and trait words already describe
 * (lib/known/checkInOptions.ts, TRAIT_WORDS in lib/known/scoring.ts).
 * Micro animations play once on entering view (lib/design/motion), or on
 * a tab change; reduced motion shows the final state.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { format, subDays } from 'date-fns'
import { RecentNotes } from '@/components/known/practice/PatternReportParts'
import { blobGradientStops, buildPointMotionProfile, CURATED_HUES, generateAnimatedBlobPath, hashSeed } from '@/lib/blobs'
import { prefersReducedMotion, useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'

const ink = '#262420'
const soft = '#56534D'
const line = 'rgba(38,36,32,0.12)'

export const problemsCSS = `
  .pv{padding:120px 24px;border-top:1px solid ${line};}
  .pv-wrap{max-width:1040px;margin:0 auto;}
  .pv h2{${css.display2}margin:0;color:${ink};}
  .pv-intro{${css.body}color:${soft};margin:16px 0 0;max-width:560px;}
  .pv-bridge{${css.display4}color:${ink};margin:56px 0 0;max-width:600px;}
  .m-armed:not(.m-play) .pv-in{opacity:0;transform:translateY(12px);}
  .m-play .pv-in{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}
  @media(max-width:640px){ .pv{padding:80px 16px;} .pv-bridge{margin-top:40px;} }

  /* ── 1. Moments with a name ── */
  .p1-head{text-align:center;max-width:640px;margin:0 auto 48px;}
  .p1-head .pv-intro{margin-left:auto;margin-right:auto;}
  .p1-list{list-style:none;margin:0 auto;padding:0;max-width:820px;}
  .p1-row{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:32px;align-items:center;padding:26px 0;border-top:1px solid ${line};}
  .p1-row:last-child{border-bottom:1px solid ${line};}
  .p1-moment{${css.display3}color:${ink};margin:0;}
  .p1-name{display:flex;align-items:center;gap:12px;justify-content:flex-end;}
  .p1-blob{width:44px;height:44px;flex-shrink:0;transition:transform var(--dur-ui) var(--ease);}
  .p1-row:hover .p1-blob{transform:scale(1.12) rotate(-6deg);}
  .p1-word{${css.traitWord}font-size:20px;line-height:1.2;color:${ink};}
  .m-armed:not(.m-play) .p1-blob{transform:scale(0.4);opacity:0;}
  .m-armed:not(.m-play) .p1-word{opacity:0;transform:translateX(-6px);}
  .m-play .p1-blob,.m-play .p1-word{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}
  .p1-foot{text-align:center;}
  .p1-foot .pv-bridge{margin-left:auto;margin-right:auto;}
  .p1-hint{${css.meta}margin:10px 0 0;}
  @media(max-width:640px){
    .p1-row{grid-template-columns:1fr;gap:12px;padding:22px 0;}
    .p1-name{justify-content:flex-start;}
  }

  /* ── 2. Where it shows up ── */
  .p2{position:relative;overflow:hidden;}
  .p2-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:72px;align-items:start;}
  .p2-tabs{display:inline-flex;position:relative;margin-top:32px;padding:4px;border-radius:999px;background:rgba(38,36,32,0.06);}
  .p2-tab{${css.ui}position:relative;z-index:1;min-height:44px;padding:0 18px;border:none;background:transparent;border-radius:999px;color:${soft};cursor:pointer;
    transition:color var(--dur-ui) var(--ease);}
  .p2-tab[aria-selected="true"]{color:${ink};}
  .p2-tab:focus-visible{outline:2px solid ${ink};outline-offset:2px;}
  .p2-pill{position:absolute;top:4px;bottom:4px;border-radius:999px;background:#FFFFFF;box-shadow:0 1px 3px rgba(38,36,32,0.14);
    transition:left var(--dur-ui) var(--ease),width var(--dur-ui) var(--ease);}
  .p2-panel{position:relative;min-height:340px;}
  .p2-glow{position:absolute;right:-60px;top:-40px;width:340px;height:340px;pointer-events:none;opacity:0.55;filter:blur(30px);transition:color var(--dur-enter) var(--ease);}
  .p2-items{position:relative;list-style:none;margin:0;padding:0;}
  .p2-item{${css.display3}color:${ink};padding:22px 0;border-top:1px solid ${line};}
  .p2-item:last-child{border-bottom:1px solid ${line};}
  .p2-items.swap .p2-item{animation:p2-in var(--dur-enter) var(--ease) both;animation-delay:var(--d,0ms);}
  @keyframes p2-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
  @media(max-width:860px){ .p2-grid{grid-template-columns:1fr;gap:36px;} .p2-panel{min-height:0;} }
  @media(max-width:420px){ .p2-tab{padding:0 12px;} }
  @media(prefers-reduced-motion:reduce){ .p2-items.swap .p2-item{animation:none;} }

  /* ── 3. End of the day ── */
  .p3-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:72px;align-items:start;}
  .p3-question{${css.meta}margin:32px 0 0;display:flex;align-items:center;gap:8px;}
  .p3-dot{width:8px;height:8px;border-radius:50%;background:#D85A30;}
  .p3-notes{max-width:460px;}
  @media(max-width:860px){ .p3-grid{grid-template-columns:1fr;gap:36px;} }
`

// ─── Design 1: Moments with a name ──────────────────────────────────────────

// Each everyday moment next to the pattern it can point to, with that
// pattern's real trait word.
const MOMENTS = [
  { moment: 'You replay a conversation hours after it ended.', word: 'Self-monitoring', hue: CURATED_HUES[5] },
  { moment: 'You plan the week on Sunday and lose the thread by Wednesday.', word: 'Fluid', hue: CURATED_HUES[0] },
  { moment: 'A small comment stays with you all evening.', word: 'Sensitive', hue: CURATED_HUES[7] },
  { moment: 'You say yes, then spend the week wishing you had said no.', word: 'Harmonious', hue: CURATED_HUES[3] },
  { moment: 'You think it through for so long that the moment passes.', word: 'Careful', hue: CURATED_HUES[1] },
]

// A small trait blob with the report's own soft gradient and a light blur.
function MiniBlob({ hue, seed }: { hue: number; seed: string }) {
  const d = useMemo(() => generateAnimatedBlobPath(22, 22, 16, buildPointMotionProfile(hashSeed(seed), 8), 0.3, 0), [seed])
  const id = `p1-${seed.replace(/\W/g, '')}`
  return (
    <svg className="p1-blob" viewBox="0 0 44 44" aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${id}-g`} cx="45%" cy="40%" r="70%">
          {blobGradientStops(hue, true).map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />)}
        </radialGradient>
        <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
      </defs>
      <path d={d} fill={`url(#${id}-g)`} filter={`url(#${id}-f)`} />
    </svg>
  )
}

export function Problems1() {
  const ref = useEnterOnce<HTMLUListElement>()
  return (
    <section className="pv">
      <div className="pv-wrap">
        <div className="p1-head">
          <h2>Some days your own reactions surprise you.</h2>
          <p className="pv-intro">Everyone has patterns. Most of the time we only notice them afterwards, and we rarely know what to call them.</p>
        </div>
        <ul ref={ref} className="p1-list">
          {MOMENTS.map((m, i) => (
            <li key={m.word} className="p1-row">
              <p className="p1-moment pv-in" style={{ ['--d' as string]: `${i * 110}ms` }}>{m.moment}</p>
              <div className="p1-name" aria-label={`A pattern this can point to: ${m.word}`}>
                <span className="p1-blob-wrap" style={{ ['--d' as string]: `${i * 110 + 260}ms` }}><MiniBlob hue={m.hue} seed={m.word} /></span>
                <span className="p1-word" style={{ ['--d' as string]: `${i * 110 + 340}ms` }}>{m.word}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="p1-foot">
          <p className="pv-bridge">Each of these is a pattern with a name. Bearing shows you which ones are yours.</p>
          <p className="p1-hint">The words are examples from Bearing’s 30 patterns.</p>
        </div>
      </div>
    </section>
  )
}

// ─── Design 2: Where it shows up ────────────────────────────────────────────

const AREAS = [
  {
    key: 'work', label: 'At work', hue: CURATED_HUES[5],
    items: [
      'You rewrite the same email three times before you send it.',
      'You take on one more thing, then stay late to make it fit.',
      'One piece of feedback stays with you for days.',
    ],
  },
  {
    key: 'people', label: 'With people', hue: CURATED_HUES[7],
    items: [
      'You agree to plans you would rather skip.',
      'A short reply makes you wonder what you did wrong.',
      'You hold back in a group, then think of the right thing to say on the way home.',
    ],
  },
  {
    key: 'self', label: 'On your own', hue: CURATED_HUES[3],
    items: [
      'You start strong on Monday and drift by Thursday.',
      'You can’t switch off, even when the work is done.',
      'You know what you want to change, but not where to start.',
    ],
  },
]

export function Problems2() {
  const ref = useEnterOnce<HTMLDivElement>()
  const id = useId()
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
  const pick = (n: number) => { if (n === i) return; setI(n); setSwap((s) => s + 1) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const n = (i + (e.key === 'ArrowRight' ? 1 : AREAS.length - 1)) % AREAS.length
    pick(n)
    tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[n]?.focus()
  }
  const area = AREAS[i]
  const glow = useMemo(() => generateAnimatedBlobPath(170, 170, 130, buildPointMotionProfile(hashSeed('p2-glow'), 9), 0.3, 0), [])
  return (
    <section className="pv p2">
      <div ref={ref} className="pv-wrap p2-grid">
        <div>
          <h2 className="pv-in">Where does it show up for you?</h2>
          <p className="pv-intro pv-in" style={{ ['--d' as string]: '100ms' }}>The same few patterns tend to come back in very different places. Pick one and see if it sounds familiar.</p>
          <div ref={tabsRef} className="p2-tabs pv-in" style={{ ['--d' as string]: '200ms' }} role="tablist" aria-label="Where it shows up" onKeyDown={onKey}>
            <span className="p2-pill" style={{ left: pill.left, width: pill.width }} aria-hidden="true" />
            {AREAS.map((a, n) => (
              <button key={a.key} type="button" role="tab" id={`${id}-tab-${a.key}`} aria-selected={n === i} aria-controls={`${id}-panel`} tabIndex={n === i ? 0 : -1} className="p2-tab" onClick={() => pick(n)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p2-panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${area.key}`}>
          <svg className="p2-glow" viewBox="0 0 340 340" aria-hidden="true" style={{ color: `hsl(${area.hue},65%,72%)` }}>
            <path d={glow} fill="currentColor" />
          </svg>
          <ul key={swap} className={`p2-items${swap ? ' swap' : ''}`}>
            {area.items.map((t, n) => (
              <li key={t} className="p2-item pv-in" style={{ ['--d' as string]: `${300 + n * 90}ms` }}>{t}</li>
            ))}
          </ul>
          <p className="pv-bridge">Bearing helps you see the pattern behind moments like these, wherever they happen.</p>
        </div>
      </div>
    </section>
  )
}

// ─── Design 3: End of the day ───────────────────────────────────────────────

// The problems in the person's own words, as end-of-day notes in the
// practice's real "What you wrote" component. The newest note types itself
// out once when the section comes into view.
const NOTES = [
  'Wanted to speak up in the meeting. Didn’t. Annoyed with myself all afternoon.',
  'Third evening in a row I said I would go for a run.',
  'On edge all day and I couldn’t say why.',
  'Said yes to helping again. There goes the weekend.',
]

export function Problems3() {
  const ref = useEnterOnce<HTMLDivElement>()
  const notesRef = useRef<HTMLDivElement>(null)
  const [typed, setTyped] = useState<number | null>(null) // characters of the newest note shown; null = all
  useEffect(() => {
    const el = notesRef.current
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return
    setTyped(0)
    let timer: number | undefined
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      let n = 0
      timer = window.setInterval(() => {
        n += 1
        setTyped(n)
        if (n >= NOTES[0].length) { window.clearInterval(timer); setTyped(null) }
      }, 28)
    }, { threshold: 0.5 })
    io.observe(el)
    return () => { io.disconnect(); if (timer) window.clearInterval(timer) }
  }, [])
  const today = new Date()
  const notes = NOTES.map((note, n) => ({
    date: format(subDays(today, n + 1), 'yyyy-MM-dd'),
    note: n === 0 && typed !== null ? NOTES[0].slice(0, typed) || ' ' : note,
  }))
  return (
    <section className="pv">
      <div ref={ref} className="pv-wrap p3-grid">
        <div>
          <h2 className="pv-in">At the end of the day, what would you write?</h2>
          <p className="pv-intro pv-in" style={{ ['--d' as string]: '100ms' }}>Moments like these come back again and again. On their own they seem random. Written down, side by side, they start to look like a pattern.</p>
          <p className="p3-question pv-in" style={{ ['--d' as string]: '200ms' }}><span className="p3-dot" aria-hidden="true" />The kind of note people leave after an evening check-in</p>
          <p className="pv-bridge pv-in" style={{ ['--d' as string]: '300ms' }}>Bearing helps you see that pattern, and then work with it.</p>
        </div>
        <div ref={notesRef} className="p3-notes pv-in" style={{ ['--d' as string]: '200ms' }} aria-label="Example notes">
          <RecentNotes notes={notes} />
        </div>
      </div>
    </section>
  )
}
