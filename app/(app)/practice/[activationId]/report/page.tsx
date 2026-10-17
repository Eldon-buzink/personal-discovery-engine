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
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { computeWeeklyInsight, type WeeklyInsightResult } from '@/lib/known/weeklyInsight'
import { computeRecentWeeksReport, type RecentWeeksReportResult } from '@/lib/known/recentWeeksReport'
import { scopeToCurrentPeriod, computeDistribution } from '@/lib/known/weekSummary'
import { compareStartToNowFromOptions, formatStartVsNow, type BandId } from '@/lib/known/startVsNow'
import { selectRecentNotes, type CheckInNote } from '@/lib/known/checkInNotes'
import { fetchClaimedMiniAssessmentResult } from '@/lib/known/miniAssessmentResult'
import { fetchBaseAssessmentBand } from '@/lib/known/baseAssessmentResult'
import { formatDistribution } from '@/lib/known/reportCopy'
import { PatternReportBody } from '@/components/known/practice/PatternReportParts'

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
        <p className="font-sans text-meta text-muted">Loading…</p>
      </div>
    )
  }

  const { weekly, recent, startBand, notes } = state
  const label = facetDisplayLabel(state.facetId)
  // "Your first 4 weeks" while still inside that first window since
  // activation; once it closes, a plain rolling "Last 4 weeks", anchored to
  // when THIS facet's period started, not the calendar month.
  const windowLabel = recent.window.isFirstWindow ? 'Your first 4 weeks' : 'Last 4 weeks'
  const windowDateRange = `${format(recent.window.start, 'MMM d')} – ${format(recent.window.end, 'MMM d')}`
  const distributionLine = formatDistribution(state.facetId, computeDistribution(recent.checkIns))
  const comparison = startBand
    ? compareStartToNowFromOptions(startBand, recent.checkIns.map((c) => c.response_option))
    : null

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      <div className="w-full max-w-md" style={{ padding: '48px 28px 40px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PatternReportBody
          facetId={state.facetId}
          label={label}
          weekly={weekly}
          windowLabel={windowLabel}
          windowDateRange={windowDateRange}
          distributionLine={distributionLine}
          checkInCount={recent.checkInCount}
          comparisonLine={comparison ? formatStartVsNow(comparison, state.facetId) : null}
          weeks={recent.weeks}
          notes={notes}
        />

        <Link href={`/practice/${activationId}`} className="font-sans text-meta text-muted" style={{ display: 'block', textAlign: 'center', padding: 8 }}>
          Back to your pattern
        </Link>
      </div>
    </div>
  )
}
