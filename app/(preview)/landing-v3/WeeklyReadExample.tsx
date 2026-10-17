'use client'

/**
 * Landing v3, tracker step 3: one week with three check-ins, and the
 * weekly read the product gives for it. The days strip is landing-only;
 * the read is the app's own WeekCallout over computeWeeklyInsight, so the
 * headline is exactly what the app would say for these three answers.
 */

import { useMemo } from 'react'
import { addDays, format, startOfISOWeek } from 'date-fns'
import { WeekCallout } from '@/components/known/practice/PatternReportParts'
import { computeWeeklyInsight } from '@/lib/known/weeklyInsight'
import { css } from '@/lib/design/type'

const FACET = 'Self-Discipline'
// Monday, Wednesday and Thursday of this week.
const ANSWERS: { day: number; option: string }[] = [
  { day: 0, option: 'high' },
  { day: 2, option: 'mid' },
  { day: 3, option: 'high' },
]

export const weeklyReadCSS = `
  .wr-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin:0 0 16px;}
  .wr-day{display:flex;flex-direction:column;align-items:center;gap:6px;}
  .wr-day > span:first-child{${css.meta}}
  .wr-dot{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:1px dashed #DAD3C3;color:#FFFFFF;}
  .wr-dot.on{border:none;background:#262420;}
  /* The three check-ins land one by one, then the read. */
  .m-armed:not(.m-play) .wr-dot.on,.m-armed:not(.m-play) .wr-read{opacity:0;}
  .m-armed:not(.m-play) .wr-dot.on{transform:scale(0.6);}
  .m-play .wr-dot.on{transition:opacity var(--dur-ui) var(--ease),transform var(--dur-ui) var(--ease);transition-delay:calc(500ms + var(--i) * 160ms);}
  .m-play .wr-read{transition:opacity var(--dur-enter) var(--ease) 1100ms;}
`

const tick = <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function WeeklyReadExample() {
  const { weekStart, weekly } = useMemo(() => {
    const weekStart = startOfISOWeek(new Date())
    const checkIns = ANSWERS.map((a) => ({ check_in_date: format(addDays(weekStart, a.day), 'yyyy-MM-dd'), response_option: a.option }))
    return { weekStart, weekly: computeWeeklyInsight(checkIns, addDays(weekStart, -7).toISOString(), addDays(weekStart, 3)) }
  }, [])
  let n = 0
  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: weeklyReadCSS }} />
      <div className="wr-days" role="img" aria-label="Check-ins this week: Monday, Wednesday and Thursday">
        {Array.from({ length: 7 }, (_, d) => {
          const a = ANSWERS.find((x) => x.day === d)
          const i = a ? n++ : 0
          return (
            <div key={d} className="wr-day" aria-hidden="true">
              <span>{format(addDays(weekStart, d), 'EEEEE')}</span>
              <span className={`wr-dot${a ? ' on' : ''}`} style={{ ['--i' as string]: i }}>{a ? tick : null}</span>
            </div>
          )
        })}
      </div>
      <div className="wr-read">
        <WeekCallout facetId={FACET} weekly={weekly} />
      </div>
    </div>
  )
}
