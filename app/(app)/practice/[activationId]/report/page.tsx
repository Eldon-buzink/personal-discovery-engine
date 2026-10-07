'use client'

/**
 * Report — this week, a recent-weeks window, and what the check-ins
 * actually show, for one pattern, on a single page. Used to be two
 * separate routes (/weekly, /recap); merged after review feedback that
 * splitting a "this week" card and a "this month" card into two
 * destinations was more navigation than the content warranted.
 * Milestone review stays its own page (app/(app)/practice/quarterly)
 * since it's practice-wide across every active pattern, not scoped to one
 * facet the way this page is.
 *
 * Rework Part 4: the recent-weeks window is anchored to when THIS facet's
 * current activation period started (lib/known/recentWeeksReport.ts), not
 * the calendar month — "Your first 4 weeks" until that window closes, then
 * a rolling "Last 4 weeks".
 *
 * Rework Part 3: this page used to try a synthesized "shift" narrative
 * headline over the window's weekly leans, falling back to a bare check-in
 * count whenever the data didn't cleanly support one — which in practice
 * was most of the time, so the "fallback" was usually the real headline.
 * Replaced with the actual distribution (every option's count, not just
 * the winner) plus, when a starting result exists and there's enough data,
 * a plain start-vs-now comparison. Also the first place check-in notes are
 * shown anywhere — they've always been saved, never displayed until now.
 *
 * Same observational voice throughout — one "No score. No verdict." line
 * for the whole page, not repeated per section.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, addDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { checkInOptionWord } from '@/lib/known/checkInOptions'
import { directionalAccent, directionalSoft } from '@/lib/known/practiceTokens'
import { computeWeeklyInsight, type WeeklyInsightResult } from '@/lib/known/weeklyInsight'
import { computeRecentWeeksReport, type RecentWeeksReportResult } from '@/lib/known/recentWeeksReport'
import { scopeToCurrentPeriod, computeDistribution, parseCheckInDate } from '@/lib/known/weekSummary'
import { compareStartToNowFromOptions, formatStartVsNow, type BandId } from '@/lib/known/startVsNow'
import { selectRecentNotes, type CheckInNote } from '@/lib/known/checkInNotes'
import { fetchClaimedMiniAssessmentResult } from '@/lib/known/miniAssessmentResult'
import { fetchBaseAssessmentBand } from '@/lib/known/baseAssessmentResult'
import { WEEKLY_CHECKIN_FLOOR } from '@/lib/known/practiceConfig'
import { formatWeekHeadline, formatDistribution } from '@/lib/known/reportCopy'

interface ReportState {
  facetId: string
  weekly: WeeklyInsightResult
  recent: RecentWeeksReportResult
  startBand: BandId | null
  notes: CheckInNote[]
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
          .select('facet_id, directional, facet_activation_periods(started_at, ended_at)')
          .eq('id', activationId)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('check_ins').select('check_in_date, response_option, note').eq('facet_activation_id', activationId),
      ])

      if (activationRes.error || !activationRes.data) {
        console.error('[PatternReport] load error:', activationRes.error?.message ?? 'activation not found')
        router.push('/practice')
        return
      }

      const { facet_id, directional, facet_activation_periods: periods } = activationRes.data
      const openPeriod = (periods as { started_at: string; ended_at: string | null }[]).find((p) => p.ended_at === null)

      if (!openPeriod) {
        router.push(`/practice/${activationId}`)
        return
      }

      const checkIns = checkInsRes.data ?? []
      const weekly = computeWeeklyInsight(checkIns, openPeriod.started_at)
      const recent = computeRecentWeeksReport(checkIns, openPeriod.started_at)
      // Notes are scoped to the whole current period, not just the 4-week
      // window — a thoughtful note from five weeks ago shouldn't disappear
      // from "What you wrote" just because the window moved past it.
      const notes = selectRecentNotes(scopeToCurrentPeriod(checkIns, openPeriod.started_at))

      const startBand = directional
        ? ((await fetchClaimedMiniAssessmentResult(supabase, user.id, facet_id))?.band ?? null)
        : await fetchBaseAssessmentBand(supabase, user.id, facet_id)

      setState({ facetId: facet_id, weekly, recent, startBand, notes })
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

  const { weekly, recent, startBand, notes } = state
  const label = facetDisplayLabel(state.facetId)
  const weekLabel = `${format(weekly.weekStart, 'MMM d')} – ${format(addDays(weekly.weekStart, 6), 'MMM d')}`
  // "Your first 4 weeks" while still inside that first window since
  // activation; once it closes, a plain rolling "Last 4 weeks" — anchored
  // to when THIS facet's period started, not the calendar month (rework
  // Part 4 — this used to be a hardcoded calendar-month name, which meant
  // activating on the 28th produced a near-empty "October").
  const windowLabel = recent.window.isFirstWindow ? 'Your first 4 weeks' : 'Last 4 weeks'
  const windowDateRange = `${format(recent.window.start, 'MMM d')} – ${format(recent.window.end, 'MMM d')}`
  const distributionLine = formatDistribution(state.facetId, computeDistribution(recent.checkIns))
  const comparison = startBand
    ? compareStartToNowFromOptions(startBand, recent.checkIns.map((c) => c.response_option))
    : null

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
              {windowLabel} · {windowDateRange}
            </p>
            <div style={{ padding: 18, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E1D5', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {distributionLine ? (
                <>
                  <p className="font-serif font-medium text-charcoal" style={{ fontSize: 17, lineHeight: 1.4 }}>
                    {distributionLine}
                  </p>
                  <p className="font-sans text-muted" style={{ fontSize: 13 }}>
                    Based on {recent.checkInCount} check-in{recent.checkInCount === 1 ? '' : 's'}.
                  </p>
                </>
              ) : (
                <p className="font-serif font-medium text-charcoal" style={{ fontSize: 17, lineHeight: 1.4 }}>
                  No check-ins logged in this window yet.
                </p>
              )}
              {comparison && (
                <p
                  className="font-sans text-muted"
                  style={{ fontSize: 13, lineHeight: 1.5, paddingTop: 4, borderTop: '1px solid #E5E1D5' }}
                >
                  {formatStartVsNow(comparison, state.facetId)}
                </p>
              )}
            </div>
            <div className="flex" style={{ gap: 6 }}>
              {recent.weeks.map((w, i) => (
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

          {/* "What you wrote" (Part 3c) — check-in notes have always been
              saved, never shown anywhere until now. Exactly as typed, no
              editing or summarizing; hidden entirely when there's nothing
              to show. */}
          {notes.length > 0 && (
            <div>
              <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 11, letterSpacing: '0.03em', marginBottom: 10 }}>
                What you wrote
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notes.map((n) => (
                  <div key={n.date} style={{ padding: '12px 14px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E5E1D5' }}>
                    <p className="font-sans text-muted" style={{ fontSize: 11, marginBottom: 4 }}>
                      {format(parseCheckInDate(n.date), 'MMM d')}
                    </p>
                    <p className="font-sans text-charcoal-soft" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                      {n.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
