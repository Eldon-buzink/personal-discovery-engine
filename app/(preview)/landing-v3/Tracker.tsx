'use client'

/**
 * Landing v3, step 4: the trait tracker. Three steps side by side, like the
 * problems section, each a short text over the real screen it describes,
 * straight on the page (no toggle, no card around them):
 *   1. Choose: Manage your practice's rows (ManageRow), switches that work,
 *      with the app's own four-pattern limit and message.
 *   2. Check in: the evening question with its answers (CheckInAnswerRows).
 *   3. Weekly read: three check-ins in a week and the read the app gives
 *      for them (WeeklyReadExample, the app's WeekCallout).
 * Then a short close with what Bearing wants for the user.
 */

import { useMemo, useState, type ReactNode } from 'react'
import ManageRow from '@/components/known/practice/ManageRow'
import CheckInAnswerRows from '@/components/known/practice/CheckInAnswerRows'
import { landingPracticeFixture } from '@/app/(site)/landing/landingPracticeFixture'
import { buildJourneyExample } from '@/lib/known/journeyExample'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { ACTIVE_FACET_CAP, WEEKLY_CHECKIN_FLOOR } from '@/lib/known/practiceConfig'
import type { CheckInOptionId } from '@/lib/known/checkInOptions'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'
import WeeklyReadExample from './WeeklyReadExample'

const ink = '#262420'
const soft = '#56534D'

export const trackerCSS = `
  .tr{padding:136px 24px 136px;text-align:center;}
  .tr-wrap{max-width:1120px;margin:0 auto;}
  .tr h2{font-family:var(--font-display);font-weight:400;font-size:clamp(34px,4.2vw,52px);line-height:1.08;letter-spacing:-0.025em;margin:0;color:${ink};text-wrap:balance;}
  .tr-intro{${css.body}font-size:18px;color:${soft};max-width:620px;margin:20px auto 0;text-wrap:balance;}

  /* Three columns; each step's text and screen share rows (subgrid), so
     the three screens start on one line whatever the text length. */
  .tr-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:auto auto;column-gap:48px;margin-top:80px;}
  .tr-step{display:grid;grid-row:span 2;grid-template-rows:subgrid;row-gap:28px;}
  .tr-num{${css.meta}display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:1px solid rgba(38,36,32,0.25);color:${ink};margin-bottom:16px;}
  .tr-text h3{${css.display3}color:${ink};margin:0 0 10px;text-wrap:balance;}
  .tr-text p{${css.body}color:${soft};margin:0 auto;max-width:320px;text-wrap:balance;}
  .tr-ui{width:100%;max-width:400px;margin:0 auto;text-align:left;}
  .tr-manage{position:relative;}
  .tr-list{display:flex;flex-direction:column;gap:8px;}
  /* Under the list, out of the flow, so nothing jumps. */
  .tr-msg{${css.meta}position:absolute;left:0;right:0;top:calc(100% + 10px);color:#8a5a3d;background:#FBEEE8;padding:10px 14px;border-radius:10px;margin:0;}
  .tr-msg-in{animation:tr-fade var(--dur-ui) var(--ease) both;}
  @keyframes tr-fade{from{opacity:0;}to{opacity:1;}}
  .tr-q{${css.display4}color:${ink};margin:0 0 12px;}
  .tr-saved{${css.meta}color:#3D6B5C;display:flex;align-items:center;gap:6px;margin-top:14px;min-height:20px;}
  .tr-saved[hidden]{display:flex;visibility:hidden;}

  .tr-close{max-width:680px;margin:136px auto 0;}
  .tr-close p:first-child{font-family:var(--font-display);font-weight:400;font-size:clamp(26px,3vw,36px);line-height:1.2;letter-spacing:-0.02em;color:${ink};margin:0;text-wrap:balance;}
  .tr-close p + p{${css.body}font-size:18px;color:${soft};margin:20px auto 0;max-width:560px;text-wrap:balance;}

  /* Entrances, once each as it comes into view. */
  .m-armed:not(.m-play) .tr-in{opacity:0;transform:translateY(14px);}
  .m-play .tr-in{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}

  @media(max-width:900px){
    .tr-steps{grid-template-columns:minmax(0,1fr);grid-template-rows:none;row-gap:80px;margin-top:64px;}
    .tr-step{grid-row:auto;grid-template-rows:auto auto;}
  }
  @media(max-width:640px){
    .tr{padding:88px 16px 96px;}
    .tr-intro,.tr-close p + p{font-size:16px;}
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

function Step({ n, title, text, children, delay }: { n: number; title: string; text: string; children: ReactNode; delay: number }) {
  return (
    <div className="tr-step">
      <div className="tr-text tr-in" style={{ ['--d' as string]: `${delay}ms` }}>
        <span className="tr-num" aria-hidden="true">{n}</span>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <div className="tr-ui tr-in" style={{ ['--d' as string]: `${delay + 120}ms` }}>{children}</div>
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
  const stepsRef = useEnterOnce<HTMLDivElement>()
  const closeRef = useEnterOnce<HTMLDivElement>()
  const ex = useMemo(() => buildJourneyExample(FIXTURE), [])
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

        <div ref={stepsRef} className="tr-steps">
          <Step n={1} delay={0} title="Choose what matters to you." text={`Pick up to ${ACTIVE_FACET_CAP} patterns from your report. Switch them on or off whenever you like. Try it.`}>
            <ManageExample />
          </Step>

          <Step n={2} delay={120} title="Check in at the end of the day." text="One question about how the pattern showed up today, while you still remember.">
            <p className="tr-q">{ex.checkIn.question}</p>
            <CheckInAnswerRows options={ex.checkIn.options} selected={answer} onSelect={(o) => { setAnswer(o); setTried(true) }} />
            <p className="tr-saved" hidden={!tried} aria-live="polite">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {tried ? 'That’s the whole check-in.' : ''}
            </p>
          </Step>

          <Step n={3} delay={240} title="Get your weekly read." text={`After ${WEEKLY_CHECKIN_FLOOR} check-ins in a week, you get a short read of how that week went.`}>
            <WeeklyReadExample />
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
