'use client'

/**
 * "Your practice" phone frames for the landing page: Practice home,
 * the daily check-in, and the report (4-week recap), in that order.
 *
 * Why not the real components: the three practice screens
 * (app/(app)/practice/page.tsx, [activationId]/checkin/page.tsx,
 * [activationId]/report/page.tsx) load from Supabase inside the page
 * component itself, so there's no presentational piece to mount with
 * fixture data. Instead this mirrors their markup (same classes, sizes,
 * colors) and gets every string from the same lib/known functions the
 * pages call, run over landingPracticeFixture. If one of those pages
 * changes layout, update the matching screen below.
 *
 * Deliberately left out of the home card: the directional card's
 * "Unlock the full assessment (€49)…" line. The landing page keeps any
 * free/paid statement out of "Your practice" until the owner decides.
 *
 * Animation (once, when scrolled into view, ~7s, then holds): the check-in
 * button is pressed, an option is picked and saved, then the report fills
 * in. With prefers-reduced-motion, or before JS runs, everything renders in
 * its final state. No counters ticking up, no celebration.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, format } from 'date-fns'
import { facetDisplayLabel, MINI_ASSESSMENT_BAND_COPY, type MiniAssessmentFacet } from '@/lib/known/miniAssessmentScoring'
import { directionalAccent, directionalSoft } from '@/lib/known/practiceTokens'
import { getCheckInPrompt, checkInOptionWord } from '@/lib/known/checkInOptions'
import { practicePurposeCopy } from '@/lib/known/practicePurpose'
import { computeWeeklyInsight } from '@/lib/known/weeklyInsight'
import { computeRecentWeeksReport } from '@/lib/known/recentWeeksReport'
import { computeTrend } from '@/lib/known/trend'
import { computeStage, formatStageCompact } from '@/lib/known/practiceStage'
import { computeDistribution, parseCheckInDate } from '@/lib/known/weekSummary'
import { compareStartToNowFromOptions, formatStartVsNow } from '@/lib/known/startVsNow'
import { selectRecentNotes } from '@/lib/known/checkInNotes'
import { formatWeekHeadline, formatDistribution } from '@/lib/known/reportCopy'
import { landingPracticeFixture, materializeFixture } from './landingPracticeFixture'

// Phone screens are laid out at a real phone width and scaled down, so
// type sizes match the app exactly instead of being re-guessed small.
const SCREEN_W = 360
const SCREEN_H = 760
const FRAME_W = 264
const SCALE = FRAME_W / SCREEN_W
const FRAME_H = Math.round(SCREEN_H * SCALE)


const css = `
  .pp-row{display:flex;justify-content:center;gap:28px;}
  .pp-col{flex:0 0 auto;width:${FRAME_W}px;}
  .pp-frame{position:relative;width:${FRAME_W}px;height:${FRAME_H}px;border-radius:34px;overflow:hidden;background:#F7F4ED;
    border:1px solid rgba(38,36,32,0.14);box-shadow:0 18px 40px -24px rgba(38,36,32,0.35),0 0 0 6px #EFEAE0;}
  .pp-screen{position:absolute;top:0;left:0;width:${SCREEN_W}px;height:${SCREEN_H}px;transform:scale(${SCALE});transform-origin:top left;overflow:hidden;}
  .pp-caption{margin-top:16px;font-size:13px;color:#57534A;text-align:center;}
  .pp-caption b{font-weight:500;color:#262420;}
  .pp-example{position:absolute;top:14px;right:14px;z-index:2;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;
    background:rgba(38,36,32,0.72);color:#F7F4ED;border-radius:999px;padding:3px 9px;}

  /* Final state is the default. .pp-armed (set by JS only when motion is
     allowed) rewinds it; .pp-playing then animates back to it. */
  /* Option border/background live here, not inline, so the selected
     state below can override them. */
  .pp-opt{border:1.5px solid #DAD3C3;background:#FFFFFF;}
  .pp-opt.pp-sel{border-color:${directionalAccent};background:${directionalSoft};}
  .pp-armed .pp-opt.pp-sel{border-color:#DAD3C3;background:#FFFFFF;}
  .pp-armed.pp-playing .pp-opt.pp-sel{border-color:${directionalAccent};background:${directionalSoft};transition:border-color .3s ease 1.9s,background .3s ease 1.9s;}

  .pp-armed .pp-save{opacity:0.5;}
  .pp-armed.pp-playing .pp-save{opacity:1;transition:opacity .3s ease 2.3s;animation:ppPress .35s ease 2.9s both;}
  .pp-armed.pp-playing .pp-checkin-btn{animation:ppPress .35s ease .6s both;}

  .pp-fill{opacity:1;transform:none;}
  .pp-armed .pp-fill{opacity:0;transform:translateY(6px);}
  .pp-armed.pp-playing .pp-fill{opacity:1;transform:none;transition:opacity .5s ease var(--d,3.6s),transform .5s ease var(--d,3.6s);}

  @keyframes ppPress{0%{transform:scale(1)}45%{transform:scale(0.96)}100%{transform:scale(1)}}

  @media(max-width:900px){
    /* Phone width: a horizontal swipe row inside the section (the page
       itself never scrolls sideways). */
    .pp-row{justify-content:flex-start;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 20px 8px;margin:0 -20px;
      -webkit-overflow-scrolling:touch;scrollbar-width:none;}
    .pp-row::-webkit-scrollbar{display:none;}
    .pp-col{scroll-snap-align:center;}
  }
`

function Eyebrow({ children, size = 11 }: { children: React.ReactNode; size?: number }) {
  return (
    <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: size, letterSpacing: size === 11 ? '0.03em' : '0.04em', marginBottom: 10 }}>
      {children}
    </p>
  )
}

// The daily check-in screen (mirrors [activationId]/checkin/page.tsx), with
// the fixture's answer selected. Used in the phone row above (animated via
// the pp-* classes) and, with `standalone`, as a static crop elsewhere on the
// landing page — standalone uses its own class and inline styles so the
// phone row's CSS (scale, rewind-for-animation) never applies to it.
export function CheckInScreen({ standalone = false }: { standalone?: boolean }) {
  const fx = landingPracticeFixture
  const prompt = getCheckInPrompt(fx.facetId)
  const label = facetDisplayLabel(fx.facetId)
  const optionStyle = (selected: boolean): React.CSSProperties =>
    standalone
      ? { padding: '16px 18px', borderRadius: 12, border: `1.5px solid ${selected ? directionalAccent : '#DAD3C3'}`, background: selected ? directionalSoft : '#FFFFFF' }
      : { padding: '16px 18px', borderRadius: 12 }
  return (
    <div className={standalone ? 'bg-cream' : 'pp-screen bg-cream'} style={{ display: 'flex', flexDirection: 'column', ...(standalone ? { width: SCREEN_W } : {}) }}>
      <div style={{ padding: '40px 24px 0', display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
        <span className="font-sans text-muted" style={{ fontSize: 13 }}>← Your practice</span>
        <div className="flex items-center gap-2">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: directionalAccent }} />
          <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
            Today&apos;s check-in
          </p>
        </div>
        <div>
          <h3 className="font-serif font-medium text-charcoal" style={{ fontSize: 28, lineHeight: 1.25, marginBottom: 12 }}>{label}</h3>
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 15, lineHeight: 1.55 }}>{prompt.question}</p>
          <p className="font-sans text-muted" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 10 }}>
            This becomes part of your report — not a score, just a record of what you noticed.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          {prompt.options.map((o) => (
            <div
              key={o.id}
              className={standalone ? 'font-sans text-charcoal' : `font-sans text-charcoal pp-opt${o.id === fx.today.option ? ' pp-sel' : ''}`}
              style={optionStyle(o.id === fx.today.option)}
            >
              <span style={{ fontSize: 15, lineHeight: 1.4 }}>{o.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '16px 24px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          className={standalone ? 'font-sans font-medium' : 'font-sans font-medium pp-save'}
          style={{ textAlign: 'center', padding: 15, borderRadius: 10, background: '#262420', color: '#F7F4ED', fontSize: 15 }}
        >
          Save check-in
        </div>
        <span className="font-sans text-muted" style={{ display: 'block', textAlign: 'center', padding: 8, fontSize: 13 }}>Skip today</span>
      </div>
    </div>
  )
}

export default function PracticePhoneScreens() {
  const fx = landingPracticeFixture
  const data = useMemo(() => {
    const m = materializeFixture(fx)
    const prompt = getCheckInPrompt(fx.facetId)
    // Screen 1 is "before today's check-in"; screen 3 is right after it.
    const weeklyBefore = computeWeeklyInsight(m.before, m.periodStartedAt, m.now)
    const stage = computeStage(
      computeTrend(m.before, m.periodStartedAt, m.now).qualifyingWeekCount,
      computeRecentWeeksReport(m.before, m.periodStartedAt, m.now).checkInCount,
    )
    const weekly = computeWeeklyInsight(m.after, m.periodStartedAt, m.now)
    const recent = computeRecentWeeksReport(m.after, m.periodStartedAt, m.now)
    const comparison = compareStartToNowFromOptions(fx.startBand, recent.checkIns.map((c) => c.response_option))
    return {
      prompt,
      weeklyBefore,
      stageLine: formatStageCompact(stage),
      bandCopy: MINI_ASSESSMENT_BAND_COPY[fx.facetId as MiniAssessmentFacet][fx.startBand],
      weekHeadline: formatWeekHeadline(fx.facetId, weekly),
      weekLabel: `${format(weekly.weekStart, 'MMM d')} – ${format(addDays(weekly.weekStart, 6), 'MMM d')}`,
      windowLabel: recent.window.isFirstWindow ? 'Your first 4 weeks' : 'Last 4 weeks',
      windowDateRange: `${format(recent.window.start, 'MMM d')} – ${format(recent.window.end, 'MMM d')}`,
      distributionLine: formatDistribution(fx.facetId, computeDistribution(recent.checkIns)),
      recent,
      comparisonLine: formatStartVsNow(comparison, fx.facetId),
      notes: selectRecentNotes(m.after),
    }
  }, [fx])

  const rootRef = useRef<HTMLDivElement>(null)
  const [armed, setArmed] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const el = rootRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setArmed(true)
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        // Next frame, so the rewound state paints before transitions start.
        requestAnimationFrame(() => setPlaying(true))
        io.disconnect()
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const label = facetDisplayLabel(fx.facetId)
  const rootClass = ['pp-root', armed && 'pp-armed', playing && 'pp-playing'].filter(Boolean).join(' ')

  return (
    <div ref={rootRef} className={rootClass}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="pp-row">
        {/* ── 1. Practice home (mirrors app/(app)/practice/page.tsx) ── */}
        <div className="pp-col">
          <div className="pp-frame" aria-hidden="true">
            <span className="pp-example">Example</span>
            <div className="pp-screen bg-cream" style={{ padding: '44px 24px' }}>
              <div style={{ marginBottom: 24 }}>
                <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 12, letterSpacing: '0.04em', marginBottom: 4 }}>
                  Your practice
                </p>
                <h3 className="font-serif font-medium text-charcoal" style={{ fontSize: 26, lineHeight: 1.3 }}>
                  What you&apos;re noticing
                </h3>
              </div>
              <Eyebrow>Active</Eyebrow>
              <div
                style={{
                  padding: 18, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 10,
                  border: fx.directional ? `1.5px solid ${directionalAccent}` : '1px solid #E5E1D5',
                  background: fx.directional ? directionalSoft : '#FFFFFF',
                }}
              >
                {fx.directional && (
                  <p className="font-sans font-semibold uppercase" style={{ fontSize: 11, letterSpacing: '0.04em', color: directionalAccent }}>
                    Directional · from mini-assessment
                  </p>
                )}
                <span className="font-serif font-medium text-charcoal" style={{ fontSize: 18 }}>{label}</span>
                <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.5 }}>{data.bandCopy}</p>
                <p className="font-sans text-muted" style={{ fontSize: 12 }}>{data.stageLine}</p>
                <div
                  className="font-sans font-medium pp-checkin-btn"
                  style={{ display: 'block', textAlign: 'center', padding: 11, borderRadius: 8, background: '#262420', color: '#F7F4ED', fontSize: 14 }}
                >
                  Check in today
                </div>
                {data.weeklyBefore.summary.qualifies && (
                  <span className="font-sans" style={{ fontSize: 12, color: directionalAccent, textDecoration: 'underline', textAlign: 'center' }}>
                    Your weekly read is ready
                  </span>
                )}
              </div>
              <div style={{ marginTop: 32, textAlign: 'center' }}>
                <span className="font-sans" style={{ fontSize: 12.5, color: '#8a8375', textDecoration: 'underline' }}>
                  This quarter&apos;s review
                </span>
              </div>
            </div>
          </div>
          <p className="pp-caption"><b>Practice home</b></p>
        </div>

        {/* ── 2. Daily check-in (mirrors [activationId]/checkin/page.tsx) ── */}
        <div className="pp-col">
          <div className="pp-frame" aria-hidden="true">
            <span className="pp-example">Example</span>
            <CheckInScreen />
          </div>
          <p className="pp-caption"><b>Daily check-in</b></p>
        </div>

        {/* ── 3. Report / recap (mirrors [activationId]/report/page.tsx) ── */}
        <div className="pp-col">
          <div className="pp-frame" aria-hidden="true">
            <span className="pp-example">Example</span>
            <div className="pp-screen bg-cream" style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 13, letterSpacing: '0.04em' }}>Your report</p>
              <h3 className="font-serif font-medium text-charcoal" style={{ fontSize: 26, lineHeight: 1.3, marginBottom: 4 }}>{label}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 4 }}>
                <div className="pp-fill" style={{ ['--d' as string]: '3.5s' }}>
                  <Eyebrow>This week · {data.weekLabel}</Eyebrow>
                  <div style={{ padding: 16, borderRadius: 14, background: directionalSoft, border: `1.5px solid ${directionalAccent}` }}>
                    <p className="font-serif font-medium text-charcoal" style={{ fontSize: 17, lineHeight: 1.4 }}>{data.weekHeadline}</p>
                  </div>
                </div>
                <div>
                  <div className="pp-fill" style={{ ['--d' as string]: '4.2s' }}>
                    <Eyebrow>{data.windowLabel} · {data.windowDateRange}</Eyebrow>
                    <div style={{ padding: 16, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E1D5', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      <p className="font-serif font-medium text-charcoal" style={{ fontSize: 17, lineHeight: 1.4 }}>{data.distributionLine}</p>
                      <p className="font-sans text-muted" style={{ fontSize: 13 }}>Based on {data.recent.checkInCount} check-ins.</p>
                      <p className="font-sans text-muted" style={{ fontSize: 13, lineHeight: 1.5, paddingTop: 4, borderTop: '1px solid #E5E1D5' }}>
                        {data.comparisonLine}
                      </p>
                    </div>
                  </div>
                  <div className="flex" style={{ gap: 6 }}>
                    {data.recent.weeks.map((w, i) => (
                      <div
                        key={i}
                        className="pp-fill"
                        style={{
                          ['--d' as string]: `${4.9 + i * 0.3}s`,
                          flex: 1, padding: '8px 6px', borderRadius: 9, textAlign: 'center',
                          border: w.qualifies ? '1px solid #DAD3C3' : '1px dashed #DAD3C3',
                          background: w.qualifies ? '#FFFFFF' : 'transparent',
                        }}
                      >
                        <div className="font-sans text-muted" style={{ fontSize: 10, marginBottom: 3 }}>Wk {i + 1}</div>
                        <div className="font-sans" style={{ fontSize: 11, lineHeight: 1.25, color: w.qualifies ? '#262420' : '#ADA695', fontStyle: w.qualifies ? 'normal' : 'italic' }}>
                          {w.qualifies
                            ? w.lean.type === 'option' ? checkInOptionWord(fx.facetId, w.lean.value) : w.lean.type === 'tie' ? 'Split' : ''
                            : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {data.notes.length > 0 && (
                  <div className="pp-fill" style={{ ['--d' as string]: '6.2s' }}>
                    <Eyebrow>What you wrote</Eyebrow>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.notes.map((n) => (
                        <div key={n.date} style={{ padding: '10px 12px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E5E1D5' }}>
                          <p className="font-sans text-muted" style={{ fontSize: 11, marginBottom: 3 }}>{format(parseCheckInDate(n.date), 'MMM d')}</p>
                          <p className="font-sans text-charcoal-soft" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{n.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="font-serif text-charcoal-soft" style={{ fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '18px 0 0' }}>
                No score. No verdict. Just what you noticed.
              </p>
            </div>
          </div>
          <p className="pp-caption"><b>Recap</b></p>
        </div>
      </div>
      {/* Screen-reader summary, since the frames themselves are decorative. */}
      <p className="sr-only">
        Example screens: Practice home with {label} active; the daily check-in asking &ldquo;{data.prompt.question}&rdquo;;
        and a report showing {data.distributionLine} across {data.recent.checkInCount} check-ins. {practicePurposeCopy(fx.directional)}
      </p>
    </div>
  )
}
