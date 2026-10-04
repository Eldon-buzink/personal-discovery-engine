'use client'

/**
 * Weekly insight — the first rung of the weekly/monthly/quarterly cadence
 * (see lib/known/weeklyInsight.ts for why this page exists now). Scoped to
 * the current ISO week, same "in-progress" live-aggregation pattern monthly
 * recap already uses for the current month — this isn't a locked report
 * that unlocks once and freezes, it's just today's live read of this
 * week's check-ins so far.
 *
 * Deliberately the smallest of the three cadence pages: one count, one
 * plurality lean (or the honest "not enough yet" state below the floor),
 * same observational voice as monthly recap and quarterly review.
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
import { WEEKLY_CHECKIN_FLOOR } from '@/lib/known/practiceConfig'

interface WeeklyState {
  facetId: string
  insight: WeeklyInsightResult
}

function formatHeadline(facetId: string, insight: WeeklyInsightResult): string {
  const { summary } = insight
  if (summary.checkInCount === 0) return "No check-ins logged this week yet."
  if (!summary.qualifies) {
    return `${summary.checkInCount} of ${WEEKLY_CHECKIN_FLOOR} check-ins this week.`
  }
  if (summary.lean.type === 'option') {
    return `${summary.checkInCount} check-ins this week, leaning toward "${checkInOptionWord(facetId, summary.lean.value)}."`
  }
  if (summary.lean.type === 'tie') {
    return `${summary.checkInCount} check-ins this week, evenly split — no clear lean.`
  }
  return `${summary.checkInCount} check-ins this week.`
}

export default function WeeklyInsightPage({ params }: { params: { activationId: string } }) {
  const router = useRouter()
  const { activationId } = params

  const [isLoading, setIsLoading] = useState(true)
  const [state, setState] = useState<WeeklyState | null>(null)

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
        console.error('[WeeklyInsight] load error:', activationRes.error?.message ?? 'activation not found')
        router.push('/practice')
        return
      }

      const { facet_id, facet_activation_periods: periods } = activationRes.data
      const openPeriod = (periods as { started_at: string; ended_at: string | null }[]).find((p) => p.ended_at === null)

      if (!openPeriod) {
        router.push(`/practice/${activationId}`)
        return
      }

      const insight = computeWeeklyInsight(checkInsRes.data ?? [], openPeriod.started_at)
      setState({ facetId: facet_id, insight })
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

  const { insight } = state
  const label = facetDisplayLabel(state.facetId)
  const weekLabel = `${format(insight.weekStart, 'MMM d')} – ${format(addDays(insight.weekStart, 6), 'MMM d')}`

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      {/* Centers the whole screen in the same max-w-md column every other
          practice screen uses — see the check-in page's identical comment
          for why. No-op below 448px. */}
      <div className="w-full max-w-md flex flex-col" style={{ minHeight: '100vh' }}>
      <div style={{ padding: '48px 28px 0 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
          This week · {weekLabel}
        </p>
        <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 26, lineHeight: 1.3 }}>
          {label}
        </h1>
        <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.5 }}>
          What your check-ins this week are showing so far.
        </p>
      </div>

      <div style={{ padding: '24px 28px 32px 28px', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ padding: 20, borderRadius: 14, background: directionalSoft, border: `1.5px solid ${directionalAccent}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p className="font-serif font-medium text-charcoal" style={{ fontSize: 19, lineHeight: 1.4 }}>
            {formatHeadline(state.facetId, insight)}
          </p>
          {!insight.summary.qualifies && insight.summary.checkInCount > 0 && (
            <p className="font-sans text-muted" style={{ fontSize: 13 }}>
              {WEEKLY_CHECKIN_FLOOR - insight.summary.checkInCount} more this week for a weekly read.
            </p>
          )}
        </div>

        <p className="font-serif text-charcoal-soft" style={{ fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '4px 0' }}>
          No score. No verdict. Just what you noticed.
        </p>
      </div>

      <div style={{ padding: '16px 28px 32px 28px' }}>
        <Link href={`/practice/${activationId}`} className="font-sans text-muted" style={{ display: 'block', textAlign: 'center', padding: 8, fontSize: 13 }}>
          Back to your pattern
        </Link>
      </div>
      </div>
    </div>
  )
}
