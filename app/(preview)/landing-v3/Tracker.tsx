'use client'

/**
 * Landing v3, step 4: the trait tracker. What the practice is and why the
 * evening check-in helps, shown with the practice's real components over
 * the landing example (Self-Discipline, four weeks of check-ins):
 * PracticeHomeCard, CheckInAnswerRows (tappable), WeekCallout, WeeksStrip,
 * WindowCard and RecentNotes. Every string comes from the app's own
 * functions (buildJourneyExample, computeRecentWeeksReport,
 * formatDistribution, formatStartVsNow).
 *
 * Same toggle as the problems section; same card as the solution.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import PracticeHomeCard from '@/components/known/practice/PracticeHomeCard'
import CheckInAnswerRows from '@/components/known/practice/CheckInAnswerRows'
import { RecentNotes, WeekCallout, WeeksStrip, WindowCard } from '@/components/known/practice/PatternReportParts'
import { landingPracticeFixture, materializeFixture } from '@/app/(site)/landing/landingPracticeFixture'
import { buildJourneyExample } from '@/lib/known/journeyExample'
import { computeRecentWeeksReport } from '@/lib/known/recentWeeksReport'
import { computeDistribution } from '@/lib/known/weekSummary'
import { formatDistribution } from '@/lib/known/reportCopy'
import { compareStartToNowFromOptions, formatStartVsNow } from '@/lib/known/startVsNow'
import type { CheckInOptionId } from '@/lib/known/checkInOptions'
import { blobGradientStops, buildPointMotionProfile, CURATED_HUES, generateAnimatedBlobPath, hashSeed } from '@/lib/blobs'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'

const ink = '#262420'
const soft = '#56534D'

export const trackerCSS = `
  .tr{padding:136px 24px 128px;text-align:center;}
  .tr-wrap{max-width:1040px;margin:0 auto;}
  .tr h2{font-family:var(--font-display);font-weight:400;font-size:clamp(34px,4.2vw,52px);line-height:1.08;letter-spacing:-0.025em;margin:0;color:${ink};text-wrap:balance;}
  .tr-intro{${css.body}font-size:18px;color:${soft};max-width:620px;margin:20px auto 0;text-wrap:balance;}
  .tr-tabs-wrap{display:flex;justify-content:center;margin:40px 0 0;}
  .tr-tabs{display:inline-flex;position:relative;padding:4px;border-radius:999px;background:rgba(38,36,32,0.06);}
  .tr-tab{${css.ui}position:relative;z-index:1;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border:none;background:transparent;border-radius:999px;color:${soft};cursor:pointer;white-space:nowrap;transition:color var(--dur-ui) var(--ease);}
  .tr-tab[aria-selected="true"]{color:${ink};}
  .tr-tab:focus-visible{outline:2px solid ${ink};outline-offset:-2px;}
  .tr-num{${css.meta}display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;border:1px solid rgba(38,36,32,0.25);color:inherit;}
  .tr-pill{position:absolute;top:4px;bottom:4px;border-radius:999px;background:#FFFFFF;box-shadow:0 1px 3px rgba(38,36,32,0.14);transition:left var(--dur-ui) var(--ease),width var(--dur-ui) var(--ease);}
  .tr-card{max-width:560px;margin:32px auto 0;padding:32px 32px 34px;border-radius:28px;background:#FFFFFF;border:1px solid rgba(38,36,32,0.07);
    box-shadow:0 1px 2px rgba(38,36,32,0.05),0 30px 60px -30px rgba(38,36,32,0.28);text-align:left;min-height:520px;
    display:flex;flex-direction:column;justify-content:center;}
  .tr-panel{width:100%;}
  .tr-caption{${css.display4}color:${ink};text-align:center;margin:0 0 6px;}
  .tr-sub{${css.body}color:${soft};text-align:center;margin:0 auto 24px;max-width:420px;}
  .tr-q{${css.display4}color:${ink};margin:0 0 12px;}
  .tr-stack{display:flex;flex-direction:column;gap:16px;}
  .tr-panel.swap{animation:tr-in var(--dur-enter) var(--ease) both;}
  @keyframes tr-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
  .tr-saved{${css.meta}color:#3D6B5C;display:flex;align-items:center;gap:6px;justify-content:center;margin-top:16px;min-height:20px;}
  .tr-saved[hidden]{display:flex;visibility:hidden;}
  /* The week chips fill in one by one on the third step. */
  .tr-panel.swap .tr-chip,.tr-panel.swap .tr-chip > *{animation:tr-chip var(--dur-ui) var(--ease) both;animation-delay:calc(300ms + var(--i) * 100ms);}
  @keyframes tr-chip{from{opacity:0;}to{opacity:1;}}

  .tr-why{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:48px;margin-top:80px;}
  .tr-why h3{${css.display3}color:${ink};margin:0 0 10px;text-wrap:balance;}
  .tr-why p{${css.body}color:${soft};margin:0;}
  .tr-blob{display:block;width:64px;height:64px;margin:0 auto 18px;transition:transform var(--dur-ui) var(--ease);}
  .tr-why > div:hover .tr-blob{transform:scale(1.1) rotate(-8deg);}

  .m-armed:not(.m-play) .tr-in{opacity:0;transform:translateY(14px);}
  .m-play .tr-in{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}
  @media(max-width:860px){ .tr-why{grid-template-columns:1fr;gap:36px;} }
  @media(max-width:640px){
    .tr{padding:88px 16px 88px;}
    .tr-intro{font-size:16px;}
    .tr-tabs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;width:100%;border-radius:22px;}
    .tr-pill{display:none;}
    .tr-tab{flex-direction:column;gap:4px;padding:8px 4px;min-height:64px;white-space:normal;line-height:1.25;transition:color var(--dur-ui) var(--ease),background-color var(--dur-ui) var(--ease);}
    .tr-tab[aria-selected="true"]{background:#FFFFFF;box-shadow:0 1px 3px rgba(38,36,32,0.14);}
    .tr-card{padding:22px 16px 26px;border-radius:22px;min-height:0;}
    .tr-why{margin-top:56px;}
  }
  @media(prefers-reduced-motion:reduce){ .tr-panel.swap,.tr-panel.swap .tr-chip,.tr-panel.swap .tr-chip > *{animation:none;} }
`

const FIXTURE = { ...landingPracticeFixture, directional: false }

const STEPS = [
  { key: 'choose', label: 'Choose' },
  { key: 'checkin', label: 'Check in' },
  { key: 'change', label: 'See it change' },
]

const WHY = [
  { title: 'While it’s still fresh.', body: 'In the evening you still remember how the day really went. A week later, most of the details are gone.', hue: CURATED_HUES[5] },
  { title: 'Small enough to keep doing.', body: 'One question and, if you like, a short note. Small enough to fit into any evening.', hue: CURATED_HUES[3] },
  { title: 'Patterns show over weeks.', body: 'One day says little. A few weeks of answers show when a pattern turns up, and whether it is moving.', hue: CURATED_HUES[0] },
]

function Blob({ hue, seed }: { hue: number; seed: string }) {
  const d = useMemo(() => generateAnimatedBlobPath(22, 22, 16, buildPointMotionProfile(hashSeed(seed), 8), 0.3, 0), [seed])
  const id = `tr-${seed}`
  return (
    <svg className="tr-blob" viewBox="0 0 44 44" aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${id}-g`} cx="45%" cy="40%" r="70%">
          {blobGradientStops(hue, true).map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />)}
        </radialGradient>
        <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.6" /></filter>
      </defs>
      <path d={d} fill={`url(#${id}-g)`} filter={`url(#${id}-f)`} />
    </svg>
  )
}

export default function Tracker() {
  const ref = useEnterOnce<HTMLDivElement>()
  const id = useId()
  const [step, setStep] = useState(0)
  const [swap, setSwap] = useState(0)
  const ex = useMemo(() => buildJourneyExample(FIXTURE), [])
  const window4 = useMemo(() => {
    const m = materializeFixture(FIXTURE)
    const recent = computeRecentWeeksReport(m.after, m.periodStartedAt, m.now)
    return {
      count: recent.checkInCount,
      distribution: formatDistribution(FIXTURE.facetId, computeDistribution(recent.checkIns)),
      comparison: formatStartVsNow(compareStartToNowFromOptions(FIXTURE.startBand, recent.checkIns.map((c) => c.response_option)), FIXTURE.facetId),
    }
  }, [])
  // The check-in answers can be tried; the example's own answer is picked.
  const [answer, setAnswer] = useState<CheckInOptionId | null>(ex.checkIn.selected)
  const [tried, setTried] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState({ left: 4, width: 0 })
  useEffect(() => {
    const place = () => {
      const tab = tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[step]
      if (tab) setPill({ left: tab.offsetLeft, width: tab.offsetWidth })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [step])
  const pick = (n: number) => { if (n === step) return; setStep(n); setSwap((v) => v + 1) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const n = (step + (e.key === 'ArrowRight' ? 1 : STEPS.length - 1)) % STEPS.length
    pick(n)
    tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[n]?.focus()
  }

  return (
    <section className="tr">
      <style dangerouslySetInnerHTML={{ __html: trackerCSS }} />
      <div ref={ref} className="tr-wrap">
        <h2 className="tr-in">Then notice them, one evening at a time.</h2>
        <p className="tr-intro tr-in" style={{ ['--d' as string]: '100ms' }}>
          Your report shows how you tend to be. The practice shows when it happens. Choose the patterns that matter to you, answer one question each evening, and see over the weeks where they show up and how they move.
        </p>
        <div className="tr-tabs-wrap tr-in" style={{ ['--d' as string]: '200ms' }}>
          <div ref={tabsRef} className="tr-tabs" role="tablist" aria-label="How the practice works" onKeyDown={onKey}>
            <span className="tr-pill" style={{ left: pill.left, width: pill.width }} aria-hidden="true" />
            {STEPS.map((s, n) => (
              <button key={s.key} type="button" role="tab" id={`${id}-tab-${s.key}`} aria-selected={n === step} aria-controls={`${id}-panel`} tabIndex={n === step ? 0 : -1} className="tr-tab" onClick={() => pick(n)}>
                <span className="tr-num" aria-hidden="true">{n + 1}</span>{s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tr-card tr-in" style={{ ['--d' as string]: '300ms' }}>
          <div key={swap} id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${STEPS[step].key}`} className={`tr-panel${swap ? ' swap' : ''}`}>
            {step === 0 && (
              <>
                <p className="tr-caption">Choose what matters to you.</p>
                <p className="tr-sub">Up to four patterns from your report, the ones you want to work on now. Change them whenever you like.</p>
                <PracticeHomeCard facetId={ex.facetId} {...ex.home} showUnlockLine={false} />
              </>
            )}
            {step === 1 && (
              <>
                <p className="tr-caption">Check in at the end of the day.</p>
                <p className="tr-sub">One question about how the pattern showed up today. Try an answer.</p>
                <p className="tr-q">{ex.checkIn.question}</p>
                <CheckInAnswerRows options={ex.checkIn.options} selected={answer} onSelect={(o) => { setAnswer(o); setTried(true) }} />
                <p className="tr-saved" hidden={!tried} aria-live="polite">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {tried ? 'That’s the whole check-in. It goes into your weekly read.' : ''}
                </p>
              </>
            )}
            {step === 2 && (
              <>
                <p className="tr-caption">See it change over the weeks.</p>
                <p className="tr-sub">After three check-ins in a week you get a short read of that week. Over four weeks you see how your days compare to your report.</p>
                <div className="tr-stack">
                  <WeekCallout facetId={ex.facetId} weekly={ex.recap.weekly} />
                  <WeeksStrip facetId={ex.facetId} weeks={ex.recap.weeks} chipClassName="tr-chip" />
                  <WindowCard distributionLine={window4.distribution} checkInCount={window4.count} comparisonLine={window4.comparison} />
                  <RecentNotes notes={ex.recap.notes} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="tr-why">
          {WHY.map((w, n) => (
            <div key={w.title} className="tr-in" style={{ ['--d' as string]: `${n * 100}ms` }}>
              <Blob hue={w.hue} seed={`why-${n}`} />
              <h3>{w.title}</h3>
              <p>{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
