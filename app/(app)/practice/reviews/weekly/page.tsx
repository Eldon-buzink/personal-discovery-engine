'use client'

/**
 * Weekly review — this ISO week for every active trait on one page. Used to
 * be the top card of each trait's own report (/practice/[id]/report); one
 * page per cadence instead of one per trait, with the traits listed inside.
 */

import Link from 'next/link'
import { format, addDays, startOfISOWeek } from 'date-fns'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { computeWeeklyInsight } from '@/lib/known/weeklyInsight'
import { formatWeekHeadline } from '@/lib/known/reportCopy'
import { formatTraitRemaining, remainingFor, traitReviewInput } from '@/lib/known/reviewProgress'
import { useActiveTraitCheckIns } from '@/lib/known/useActiveTraitCheckIns'
import { directionalAccent, directionalSoft } from '@/lib/known/practiceTokens'
import ReviewHeader from '@/components/known/ReviewHeader'
import { NoActiveTraits, ReviewLoading, ReviewFooter } from '@/components/known/ReviewStates'

export default function WeeklyReviewPage() {
  const { traits, failed } = useActiveTraitCheckIns()
  if (!traits) return <ReviewLoading failed={failed} />

  const weekStart = startOfISOWeek(new Date())
  const dateRange = `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d')}`

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      <div className="w-full max-w-md" style={{ padding: '40px 28px 40px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <ReviewHeader cadence="weekly" title="This week" dateRange={dateRange} />

        {traits.length === 0 ? (
          <NoActiveTraits />
        ) : (
          <div className="flex flex-col gap-3">
            {traits.map((t) => {
              const weekly = computeWeeklyInsight(t.checkIns, t.periodStartedAt)
              const remaining = remainingFor('weekly', traitReviewInput(t.checkIns, t.periodStartedAt))
              const ready = remaining === 0
              return (
                <div
                  key={t.activationId}
                  style={{
                    padding: 18, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 6,
                    background: ready ? directionalSoft : '#FFFFFF',
                    border: ready ? `1.5px solid ${directionalAccent}` : '1px solid #E5E1D5',
                  }}
                >
                  <Link href={`/practice/${t.activationId}`} className="font-sans font-medium text-charcoal" style={{ fontSize: 14 }}>
                    {facetDisplayLabel(t.facetId)}
                  </Link>
                  <p className="font-serif font-medium text-charcoal" style={{ fontSize: 17, lineHeight: 1.4 }}>
                    {formatWeekHeadline(t.facetId, weekly)}
                  </p>
                  {!ready && (
                    <p className="font-sans text-muted" style={{ fontSize: 13 }}>
                      {formatTraitRemaining('weekly', remaining)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <ReviewFooter />
      </div>
    </div>
  )
}
