'use client'

/**
 * How it works: the journey, in the landing page's style. Three steps, each
 * a short text next to the real piece of the product it describes:
 *   1. Answer: one statement with the assessment's own answer scale (DotScale).
 *   2. Read: the example report (ExampleReport, as on the home page).
 *   3. Notice: the evening check-in (CheckInAnswerRows) and the weekly read
 *      (WeeklyReadExample), over the landing's practice example.
 * The method itself ("The details") follows on the page, server-rendered.
 */

import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import { DotScale } from '@/components/known/QuestionCard'
import CheckInAnswerRows from '@/components/known/practice/CheckInAnswerRows'
import { ExampleReport } from '@/app/(home)/_landing/Solution'
import WeeklyReadExample from '@/app/(home)/_landing/WeeklyReadExample'
import { landingPracticeFixture } from '@/app/(site)/landing/landingPracticeFixture'
import { buildJourneyExample } from '@/lib/known/journeyExample'
import { ACTIVE_FACET_CAP, WEEKLY_CHECKIN_FLOOR } from '@/lib/known/practiceConfig'
import { REVEAL_CAP } from '@/lib/known/paywall'
import type { CheckInOptionId } from '@/lib/known/checkInOptions'
import { useEnterOnce } from '@/lib/design/motion'
import { css } from '@/lib/design/type'

const ink = '#262420'
const soft = '#56534D'

const journeyCSS = `
  .hj{padding:140px 24px 24px;}
  .hj-wrap{max-width:1080px;margin:0 auto;}
  .hj-hero{text-align:center;max-width:720px;margin:0 auto;}
  .hj h1{font-family:var(--font-display);font-weight:400;font-size:clamp(40px,5vw,64px);line-height:1.06;letter-spacing:-0.03em;margin:0;color:${ink};text-wrap:balance;}
  .hj-intro{${css.body}font-size:18px;color:${soft};max-width:560px;margin:20px auto 0;text-wrap:balance;}
  .hj-btn{${css.ui}display:inline-flex;align-items:center;gap:10px;height:52px;padding:0 26px;margin-top:32px;border-radius:999px;background:${ink};color:#F7F4ED;text-decoration:none;
    box-shadow:0 1px 2px rgba(38,36,32,0.2),0 8px 24px -10px rgba(38,36,32,0.45);}
  .hj-btn svg{transition:transform var(--dur-ui) var(--ease);}
  .hj-btn:hover svg{transform:translateX(3px);}

  .hj-steps{display:flex;flex-direction:column;gap:128px;margin-top:120px;}
  .hj-step{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:72px;align-items:center;}
  .hj-step:nth-child(even) .hj-text{order:2;}
  .hj-num{${css.meta}display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:1px solid rgba(38,36,32,0.25);color:${ink};margin-bottom:18px;}
  .hj-text h2{font-family:var(--font-display);font-weight:400;font-size:clamp(30px,3.2vw,40px);line-height:1.12;letter-spacing:-0.02em;margin:0 0 14px;color:${ink};text-wrap:balance;}
  .hj-text p{${css.body}color:${soft};margin:0 0 12px;}
  .hj-facts{list-style:none;margin:18px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;}
  .hj-facts li{${css.meta}color:#46433d;display:flex;align-items:center;gap:8px;}
  .hj-facts svg{color:#3D6B5C;flex-shrink:0;}
  .hj-link{${css.ui}display:inline-flex;align-items:center;gap:8px;min-height:44px;margin-top:10px;color:${ink};text-decoration:underline;text-underline-offset:4px;text-decoration-color:rgba(38,36,32,0.35);}
  .hj-card{background:#FFFFFF;border:1px solid rgba(38,36,32,0.07);border-radius:28px;padding:32px;
    box-shadow:0 1px 2px rgba(38,36,32,0.05),0 30px 60px -30px rgba(38,36,32,0.28);}
  .hj-card .tc-arrow{background:#FFFFFF;}
  .hj-label{${css.meta}text-align:center;margin:0 0 6px;}
  .hj-q{font-family:var(--font-display);font-weight:400;font-size:24px;line-height:1.35;color:${ink};text-align:center;margin:8px 0 40px;text-wrap:balance;}
  .hj-note{${css.meta}color:#3D6B5C;text-align:center;min-height:20px;margin:24px 0 0;}
  .hj-q2{${css.display4}color:${ink};margin:0 0 12px;}
  .hj-divider{height:1px;background:rgba(38,36,32,0.08);margin:28px 0;}

  .m-armed:not(.m-play) .hj-in{opacity:0;transform:translateY(14px);}
  .m-play .hj-in{transition:opacity var(--dur-enter) var(--ease) var(--d,0ms),transform var(--dur-enter) var(--ease) var(--d,0ms);}

  @media(max-width:900px){
    .hj-step{grid-template-columns:minmax(0,1fr);gap:36px;}
    .hj-step:nth-child(even) .hj-text{order:0;}
    .hj-steps{gap:96px;margin-top:88px;}
  }
  @media(max-width:640px){
    .hj{padding:112px 16px 16px;}
    .hj-intro{font-size:16px;}
    .hj-card{padding:22px 16px;border-radius:22px;}
  }
`

const tick = <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
const arrow = <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>

function Step({ n, title, children, visual }: { n: number; title: string; children: ReactNode; visual: ReactNode }) {
  const ref = useEnterOnce<HTMLDivElement>()
  return (
    <div ref={ref} className="hj-step">
      <div className="hj-text hj-in">
        <span className="hj-num" aria-hidden="true">{n}</span>
        <h2>{title}</h2>
        {children}
      </div>
      <div className="hj-in" style={{ ['--d' as string]: '120ms' }}>{visual}</div>
    </div>
  )
}

function Facts({ items }: { items: string[] }) {
  return <ul className="hj-facts">{items.map((i) => <li key={i}>{tick}{i}</li>)}</ul>
}

const FIXTURE = { ...landingPracticeFixture, directional: false }

export default function HowItWorksJourney() {
  const heroRef = useEnterOnce<HTMLDivElement>()
  const [answer, setAnswer] = useState('')
  const ex = useMemo(() => buildJourneyExample(FIXTURE), [])
  const [checkIn, setCheckIn] = useState<CheckInOptionId | null>(ex.checkIn.selected)

  return (
    <section className="hj">
      <style dangerouslySetInnerHTML={{ __html: journeyCSS }} />
      <div className="hj-wrap">
        <div ref={heroRef} className="hj-hero">
          <h1 className="hj-in">How Bearing works.</h1>
          <p className="hj-intro hj-in" style={{ ['--d' as string]: '100ms' }}>
            Three steps. You answer, you read what your answers show, and then you notice it in your own days.
          </p>
          <div className="hj-in" style={{ ['--d' as string]: '200ms' }}>
            <Link href="/onboarding" className="hj-btn">Start the assessment {arrow}</Link>
          </div>
        </div>

        <div className="hj-steps">
          <Step
            n={1}
            title="Answer 120 short statements."
            visual={
              <div className="hj-card">
                <p className="hj-label">12 of 120</p>
                <p className="hj-q">Pay my bills on time.</p>
                <DotScale value={answer} onChange={setAnswer} labels={['Very Inaccurate', 'Very Accurate']} />
                <p className="hj-note" aria-live="polite">{answer ? 'That’s it. The next one comes straight away.' : 'Try it: pick a dot.'}</p>
              </div>
            }
          >
            <p>
              Each one is a short statement about how you tend to be. You say how well it fits you, from very inaccurate
              to very accurate. There are no right answers.
            </p>
            <Facts items={['About 15 minutes', 'Stop any time with Finish later', 'Your first traits appear while you answer']} />
          </Step>

          <Step
            n={2}
            title="Read your report."
            visual={
              <div className="hj-card">
                <p className="hj-label">Example report</p>
                <ExampleReport />
              </div>
            }
          >
            <p>
              Each of your 30 patterns gets its own word, shows how strongly you lean, and explains how it tends to show
              up in your days. You can see which of your answers each one is based on.
            </p>
            <Facts items={[`Your first ${REVEAL_CAP} patterns are free`, 'A one-time €49 unlocks all 30, plus five deeper assessments']} />
            <Link href="/report/sample" className="hj-link">See the full sample report {arrow}</Link>
          </Step>

          <Step
            n={3}
            title="Notice it in your days."
            visual={
              <div className="hj-card">
                <p className="hj-q2">{ex.checkIn.question}</p>
                <CheckInAnswerRows options={ex.checkIn.options} selected={checkIn} onSelect={setCheckIn} />
                <div className="hj-divider" aria-hidden="true" />
                <WeeklyReadExample />
              </div>
            }
          >
            <p>
              Choose up to {ACTIVE_FACET_CAP} patterns to follow. Each evening there is one question about how a pattern
              showed up that day. After {WEEKLY_CHECKIN_FLOOR} check-ins in a week, you get a short read of that week, and
              over a few weeks you see how your days compare to your report.
            </p>
            <Facts items={['One question an evening', 'A short read each week', 'Change what you follow any time']} />
          </Step>
        </div>
      </div>
    </section>
  )
}
