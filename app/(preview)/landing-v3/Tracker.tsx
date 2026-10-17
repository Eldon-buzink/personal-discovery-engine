'use client'

/**
 * Landing v3, step 4: the trait tracker. Three steps down the page, each a
 * short text next to the real screen it describes, straight on the page
 * (no toggle, no card around them, so it reads apart from the solution's
 * example report):
 *   1. Choose: Manage your practice's rows (ManageRow), switches that work,
 *      with the app's own four-pattern limit and message.
 *   2. Check in: the evening question with its answers (CheckInAnswerRows).
 *   3. See what changes: the pattern's review page as the app renders it
 *      (PatternReportBody), over the landing example's four weeks.
 * Then a short close with what Bearing wants for the user.
 *
 * Every string on the screens comes from the app's own functions over the
 * landing fixture (buildJourneyExample, computeRecentWeeksReport,
 * formatDistribution, formatStartVsNow, selectRecentNotes).
 */

import { useMemo, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import ManageRow from '@/components/known/practice/ManageRow'
import CheckInAnswerRows from '@/components/known/practice/CheckInAnswerRows'
import { PatternReportBody } from '@/components/known/practice/PatternReportParts'
import { landingPracticeFixture, materializeFixture } from '@/app/(site)/landing/landingPracticeFixture'
import { buildJourneyExample } from '@/lib/known/journeyExample'
import { computeRecentWeeksReport } from '@/lib/known/recentWeeksReport'
import { computeDistribution } from '@/lib/known/weekSummary'
import { formatDistribution } from '@/lib/known/reportCopy'
import { compareStartToNowFromOptions, formatStartVsNow } from '@/lib/known/startVsNow'
import { selectRecentNotes } from '@/lib/known/checkInNotes'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { ACTIVE_FACET_CAP } from '@/lib/known/practiceConfig'
import type { CheckInOptionId } from '@/lib/known/checkInOptions'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'

const ink = '#262420'
const soft = '#56534D'

export const trackerCSS = `
  .tr{padding:136px 24px 136px;text-align:center;}
  .tr-wrap{max-width:1040px;margin:0 auto;}
  .tr h2{font-family:var(--font-display);font-weight:400;font-size:clamp(34px,4.2vw,52px);line-height:1.08;letter-spacing:-0.025em;margin:0;color:${ink};text-wrap:balance;}
  .tr-intro{${css.body}font-size:18px;color:${soft};max-width:620px;margin:20px auto 0;text-wrap:balance;}

  .tr-steps{display:flex;flex-direction:column;gap:120px;margin-top:96px;}
  .tr-step{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,400px);gap:80px;align-items:center;text-align:left;}
  .tr-step:nth-child(even) .tr-text{order:2;}
  .tr-text{max-width:420px;}
  .tr-num{${css.meta}display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:1px solid rgba(38,36,32,0.25);color:${ink};margin-bottom:20px;}
  .tr-text h3{font-family:var(--font-display);font-weight:400;font-size:clamp(26px,2.6vw,32px);line-height:1.15;letter-spacing:-0.015em;color:${ink};margin:0 0 12px;text-wrap:balance;}
  .tr-text p{${css.body}color:${soft};margin:0;}
  .tr-text p + p{margin-top:12px;}
  .tr-ui{width:100%;}
  .tr-list{display:flex;flex-direction:column;gap:8px;}
  /* Under the list, out of the flow, so the row doesn't jump. */
  .tr-manage{position:relative;}
  .tr-msg{${css.meta}position:absolute;left:0;right:0;top:calc(100% + 10px);color:#8a5a3d;background:#FBEEE8;padding:10px 14px;border-radius:10px;margin:0;}
  .tr-msg-in{animation:tr-fade var(--dur-ui) var(--ease) both;}
  @keyframes tr-fade{from{opacity:0;}to{opacity:1;}}
  .tr-q{${css.display4}color:${ink};margin:0 0 12px;}
  .tr-saved{${css.meta}color:#3D6B5C;display:flex;align-items:center;gap:6px;margin-top:14px;min-height:20px;}
  .tr-saved[hidden]{display:flex;visibility:hidden;}

  .tr-close{max-width:680px;margin:144px auto 0;}
  .tr-close p:first-child{font-family:var(--font-display);font-weight:400;font-size:clamp(26px,3vw,36px);line-height:1.2;letter-spacing:-0.02em;color:${ink};margin:0;text-wrap:balance;}
  .tr-close p + p{${css.body}font-size:18px;color:${soft};margin:20px auto 0;max-width:560px;text-wrap:balance;}

  /* Entrances, once each as it comes into view; the week chips fill in. */
  .m-armed:not(.m-play) .tr-in{opacity:0;transform:translateY(14px);}
  .m-play .tr-in{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}
  .m-armed:not(.m-play) .tr-chip{opacity:0;}
  .m-play .tr-chip{transition:opacity var(--dur-ui) var(--ease) calc(500ms + var(--i) * 100ms);}

  @media(max-width:860px){
    .tr-step{grid-template-columns:1fr;gap:32px;text-align:center;justify-items:center;}
    .tr-step:nth-child(even) .tr-text{order:0;}
    .tr-ui{max-width:400px;text-align:left;}
  }
  @media(max-width:640px){
    .tr{padding:88px 16px 96px;}
    .tr-intro,.tr-close p + p{font-size:16px;}
    .tr-steps{gap:80px;margin-top:64px;}
    .tr-close{margin-top:96px;}
  }
  @media(prefers-reduced-motion:reduce){ .tr-msg-in{animation:none;} }
`

const FIXTURE = { ...landingPracticeFixture, directional: false }

// Manage example: the patterns this person's report revealed, sorted as the
// app sorts them; three are on.
const MANAGE_START = [
  { facetId: 'Anxiety', active: true },
  { facetId: 'Cautiousness', active: false },
  { facetId: 'Orderliness', active: true },
  { facetId: 'Self-Discipline', active: true },
  { facetId: 'Self-Efficacy', active: false },
].sort((a, b) => facetDisplayLabel(a.facetId).localeCompare(facetDisplayLabel(b.facetId)))

// The app's own message (app/(app)/practice/manage/page.tsx).
const CAP_MESSAGE = "You're at your check-in limit. Turn one off first to make room for this one."

function Step({ n, title, children, ui }: { n: number; title: string; children: ReactNode; ui: ReactNode }) {
  const ref = useEnterOnce<HTMLDivElement>()
  return (
    <div ref={ref} className="tr-step">
      <div className="tr-text tr-in">
        <span className="tr-num" aria-hidden="true">{n}</span>
        <h3>{title}</h3>
        {children}
      </div>
      <div className="tr-ui tr-in" style={{ ['--d' as string]: '120ms' }}>{ui}</div>
    </div>
  )
}

function ManageExample() {
  const [rows, setRows] = useState(MANAGE_START)
  const [message, setMessage] = useState<string | null>(null)
  const toggle = (facetId: string) => {
    const row = rows.find((r) => r.facetId === facetId)!
    if (!row.active && rows.filter((r) => r.active).length >= ACTIVE_FACET_CAP) {
      setMessage(CAP_MESSAGE)
      return
    }
    setMessage(null)
    setRows(rows.map((r) => (r.facetId === facetId ? { ...r, active: !r.active } : r)))
  }
  return (
    <div className="tr-manage">
      <div className="tr-list">
        {rows.map((r) => (
          <ManageRow key={r.facetId} label={facetDisplayLabel(r.facetId)} sourceLabel="Base assessment" directional={false} active={r.active} onToggle={() => toggle(r.facetId)} />
        ))}
      </div>
      {message && <p className="tr-msg tr-msg-in" role="status">{message}</p>}
    </div>
  )
}

export default function Tracker() {
  const headRef = useEnterOnce<HTMLDivElement>()
  const closeRef = useEnterOnce<HTMLDivElement>()
  const ex = useMemo(() => buildJourneyExample(FIXTURE), [])
  // The review page's numbers, worked out the way the page works them out.
  const review = useMemo(() => {
    const m = materializeFixture(FIXTURE)
    const recent = computeRecentWeeksReport(m.after, m.periodStartedAt, m.now)
    return {
      recent,
      windowLabel: recent.window.isFirstWindow ? 'Your first 4 weeks' : 'Last 4 weeks',
      windowDateRange: `${format(recent.window.start, 'MMM d')} – ${format(recent.window.end, 'MMM d')}`,
      distribution: formatDistribution(FIXTURE.facetId, computeDistribution(recent.checkIns)),
      comparison: formatStartVsNow(compareStartToNowFromOptions(FIXTURE.startBand, recent.checkIns.map((c) => c.response_option)), FIXTURE.facetId),
      notes: selectRecentNotes(m.after).slice(0, 2),
    }
  }, [])
  // The check-in answers can be tried; the example's own answer is picked.
  const [answer, setAnswer] = useState<CheckInOptionId | null>(ex.checkIn.selected)
  const [tried, setTried] = useState(false)

  return (
    <section className="tr">
      <style dangerouslySetInnerHTML={{ __html: trackerCSS }} />
      <div className="tr-wrap">
        <div ref={headRef}>
          <h2 className="tr-in">Then notice them, one evening at a time.</h2>
          <p className="tr-intro tr-in" style={{ ['--d' as string]: '100ms' }}>
            Your report shows how you tend to be. The practice shows when it happens, in your own days.
          </p>
        </div>

        <div className="tr-steps">
          <Step n={1} title="Choose what matters to you." ui={<ManageExample />}>
            <p>Pick up to {ACTIVE_FACET_CAP} patterns from your report, the ones you want to work on now.</p>
            <p>Switch them on or off whenever you like. Try it.</p>
          </Step>

          <Step n={2} title="Check in at the end of the day." ui={
            <div>
              <p className="tr-q">{ex.checkIn.question}</p>
              <CheckInAnswerRows options={ex.checkIn.options} selected={answer} onSelect={(o) => { setAnswer(o); setTried(true) }} />
              <p className="tr-saved" hidden={!tried} aria-live="polite">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {tried ? 'That’s the whole check-in.' : ''}
              </p>
            </div>
          }>
            <p>One question about how the pattern showed up today, while you still remember. Add a short note if you like.</p>
            <p>That’s it. It fits into any evening.</p>
          </Step>

          <Step n={3} title="See what changes." ui={
            <PatternReportBody
              titleAs="p"
              facetId={FIXTURE.facetId}
              label={facetDisplayLabel(FIXTURE.facetId)}
              weekly={ex.recap.weekly}
              windowLabel={review.windowLabel}
              windowDateRange={review.windowDateRange}
              distributionLine={review.distribution}
              checkInCount={review.recent.checkInCount}
              comparisonLine={review.comparison}
              weeks={review.recent.weeks}
              notes={review.notes}
              chipClassName="tr-chip"
            />
          }>
            <p>Each pattern gets its own review. After three check-ins in a week, you get a short read of that week.</p>
            <p>Over four weeks you see where you lean, how that compares to your report, and what you wrote along the way.</p>
          </Step>
        </div>

        <div ref={closeRef} className="tr-close">
          <p className="tr-in">We want you to see your patterns while they happen, so you get to choose what comes next.</p>
          <p className="tr-in" style={{ ['--d' as string]: '100ms' }}>
            Bit by bit, the worry that won’t settle and the plan you drop halfway turn into things you understand, and can work with.
          </p>
        </div>
      </div>
    </section>
  )
}
