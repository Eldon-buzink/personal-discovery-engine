'use client'

/**
 * Report — the weekly + monthly cadence for one pattern, on a single page.
 * Used to be two separate routes (/weekly, /recap); merged after review
 * feedback that splitting a "this week" card and a "this month" card into
 * two destinations, each linked separately from facet detail, was more
 * navigation than the content warranted — a reader wants both numbers in
 * one glance, not a click to pick which timescale first. Quarterly review
 * stays its own page (app/(app)/practice/quarterly) since it's practice-
 * wide across every active pattern, not scoped to one facet the way these
 * two are.
 *
 * Same observational voice as quarterly review — one "No score. No
 * verdict." line for the whole page, not repeated per section.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startOfMonth, format, addDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { checkInOptionWord } from '@/lib/known/checkInOptions'
import { directionalAccent, directionalSoft } from '@/lib/known/practiceTokens'
import { computeWeeklyInsight, type WeeklyInsightResult } from '@/lib/known/weeklyInsight'
import { computeMonthlyRecap, type MonthlyRecapResult } from '@/lib/known/monthlyRecap'
import { detectLeanNarrative } from '@/lib/known/narrativeSynthesis'
import { WEEKLY_CHECKIN_FLOOR } from '@/lib/known/practiceConfig'

interface ReportState {
  facetId: string
  weekly: WeeklyInsightResult
  monthly: MonthlyRecapResult
}

function formatWeekHeadline(facetId: string, weekly: WeeklyInsightResult): string {
  const { summary } = weekly
  if (summary.checkInCount === 0) return 'No check-ins logged this week yet.'
  if (!summary.qualifies) return `${summary.checkInCount} of ${WEEKLY_CHECKIN_FLOOR} check-ins this week.`
  if (summary.lean.type === 'option') return `${summary.checkInCount} check-ins this week, leaning toward "${checkInOptionWord(facetId, summary.lean.value)}."`
  if (summary.lean.type === 'tie') return `${summary.checkInCount} check-ins this week, evenly split — no clear lean.`
  return `${summary.checkInCount} check-ins this week.`
}

function formatMonthHeadline(facetId: string, recap: MonthlyRecapResult): { primary: string; secondary: string | null } {
  const plain = { primary: `${recap.checkInCount} check-in${recap.checkInCount === 1 ? '' : 's'} this month.`, secondary: null }
  if (recap.checkInCount === 0) return plain

  const leanSequence = recap.weeks
    .filter((w) => w.qualifies && w.lean.type === 'option')
    .map((w) => (w.lean as { type: 'option'; value: string }).value)
  const narrative = detectLeanNarrative(leanSequence)
  const secondary = `Based on ${recap.checkInCount} check-in${recap.checkInCount === 1 ? '' : 's'} this month.`

  if (narrative.type === 'steady') return { primary: `A steady lean toward "${checkInOptionWord(facetId, narrative.option)}," most weeks this month.`, secondary }
  if (narrative.type === 'shift') {
    return { primary: `A shift from "${checkInOptionWord(facetId, narrative.from)}" toward "${checkInOptionWord(facetId, narrative.to)}," this month.`, secondary }
  }
  return plain
}

export default function PatternReportPage({ params }: { params: { activationId: string } }) {
  const router = useRouter()
  const { activationId } = params

  const [isLoading, setIsLoading] = useState(true)
  const [state, setState] = useState<ReportState | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

      const [activationRes, checkInsRes] = await Promise.all([
        supabase
          .from('facet_activations')
          .select('facet_id, facet_activation_periods(started_at, ended_at)')
          .eq('id', activationId)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('check_ins').select('check_in_date, response_option').eq('facet_activation_id', activationId),
      ])

      if (activationRes.error || !activationRes.data) {
        console.error('[PatternReport] load error:', activationRes.error?.message ?? 'activation not found')
        router.push('/practice')
        return
      }

      const { facet_id, facet_activation_periods: periods } = activationRes.data
      const openPeriod = (periods as { started_at: string; ended_at: string | null }[]).find((p) => p.ended_at === null)

      if (!openPeriod) {
        router.push(`/practice/${activationId}`)
        return
      }

      const checkIns = checkInsRes.data ?? []
      const weekly = computeWeeklyInsight(checkIns, openPeriod.started_at)
      const monthly = computeMonthlyRecap(checkIns, openPeriod.started_at, startOfMonth(new Date()))
      setState({ facetId: facet_id, weekly, monthly })
      setIsLoading(false)
    }

    load()
  }, [activationId, router])

  if (isLoading || !state) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-sans text-sm text-muted">Loading…</p>
      </div>
    )
  }

  const { weekly, monthly } = state
  const label = facetDisplayLabel(state.facetId)
  const weekLabel = `${format(weekly.weekStart, 'MMM d')} – ${format(addDays(weekly.weekStart, 6), 'MMM d')}`
  const monthName = format(monthly.monthStart, 'MMMM')
  const monthHeadline = formatMonthHeadline(state.facetId, monthly)

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      <div className="w-full max-w-md" style={{ padding: '48px 28px 40px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
          Your report
        </p>
        <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 26, lineHeight: 1.3, marginBottom: 8 }}>
          {label}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 8 }}>
          <div>
            <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 11, letterSpacing: '0.03em', marginBottom: 10 }}>
              This week · {weekLabel}
            </p>
            <div style={{ padding: 18, borderRadius: 14, background: directionalSoft, border: `1.5px solid ${directionalAccent}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p className="font-serif font-medium text-charcoal" style={{ fontSize: 17, lineHeight: 1.4 }}>
                {formatWeekHeadline(state.facetId, weekly)}
              </p>
              {!weekly.summary.qualifies && weekly.summary.checkInCount > 0 && (
                <p className="font-sans text-muted" style={{ fontSize: 13 }}>
                  {WEEKLY_CHECKIN_FLOOR - weekly.summary.checkInCount} more this week for a weekly read.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 11, letterSpacing: '0.03em', marginBottom: 10 }}>
              {monthName}
            </p>
            <div style={{ padding: 18, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E1D5', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <p className="font-serif font-medium text-charcoal" style={{ fontSize: 17, lineHeight: 1.4 }}>
                {monthHeadline.primary}
              </p>
              {monthHeadline.secondary && (
                <p className="font-sans text-muted" style={{ fontSize: 13 }}>
                  {monthHeadline.secondary}
                </p>
              )}
            </div>
            <div className="flex" style={{ gap: 6 }}>
              {monthly.weeks.map((w, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, padding: '8px 6px', borderRadius: 9, textAlign: 'center',
                    border: w.qualifies ? '1px solid #DAD3C3' : '1px dashed #DAD3C3',
                    background: w.qualifies ? '#FFFFFF' : 'transparent',
                  }}
                >
                  <div className="font-sans text-muted" style={{ fontSize: 10, marginBottom: 3 }}>
                    Wk {i + 1}
                  </div>
                  <div
                    className="font-sans"
                    style={{
                      fontSize: 11, lineHeight: 1.25,
                      color: w.qualifies ? '#262420' : '#ADA695',
                      fontStyle: w.qualifies ? 'normal' : 'italic',
                    }}
                  >
                    {w.qualifies
                      ? w.lean.type === 'option'
                        ? checkInOptionWord(state.facetId, w.lean.value)
                        : w.lean.type === 'tie'
                          ? 'Split'
                          : ''
                      : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="font-serif text-charcoal-soft" style={{ fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '28px 0 4px' }}>
          No score. No verdict. Just what you noticed.
        </p>

        <Link href={`/practice/${activationId}`} className="font-sans text-muted" style={{ display: 'block', textAlign: 'center', padding: 8, fontSize: 13 }}>
          Back to your pattern
        </Link>
      </div>
    </div>
  )
}
