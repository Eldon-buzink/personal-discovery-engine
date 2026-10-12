'use client'

/**
 * Quarterly review — Quarterly.dc.html in the mockup; moved here from
 * /practice/quarterly (which now redirects) so the three review pages sit
 * together. Not anchored to the calendar quarter: each active trait has its
 * own 90-day window from when ITS current activation period started
 * (lib/known/quarterlyReview.ts), so each row reads its own window and says
 * how far it is from a full 90 days. The page-level framing ("Your first 90
 * days" / "Last 90 days") follows whichever trait started earliest, since
 * "Still feels right?" is a whole-practice decision either way.
 *
 * The headline is data-driven (a plain count, or "Nothing logged yet"), not
 * a fixed phrase that can contradict what's actually true.
 */

import Link from 'next/link'
import { format } from 'date-fns'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { checkInOptionWord } from '@/lib/known/checkInOptions'
import { computeFacetMilestone } from '@/lib/known/quarterlyReview'
import { computePeriodWindow } from '@/lib/known/periodWindow'
import { COMPARISON_MIN_CHECKINS, MILESTONE_WINDOW_DAYS } from '@/lib/known/practiceConfig'
import { formatTraitRemaining, remainingFor, traitReviewInput } from '@/lib/known/reviewProgress'
import { useActiveTraitCheckIns } from '@/lib/known/useActiveTraitCheckIns'
import ReviewHeader from '@/components/known/ReviewHeader'
import { NoActiveTraits, ReviewLoading } from '@/components/known/ReviewStates'

export default function QuarterlyReviewPage() {
  const { traits, failed } = useActiveTraitCheckIns()
  if (!traits) return <ReviewLoading failed={failed} />

  const rows = traits.map((t) => {
    const milestone = computeFacetMilestone(t.checkIns, t.periodStartedAt)
    let statusText = 'too early to say'
    if (milestone.checkInCount >= COMPARISON_MIN_CHECKINS) {
      if (milestone.lean.type === 'option') statusText = `leaning toward "${checkInOptionWord(t.facetId, milestone.lean.value)}"`
      else if (milestone.lean.type === 'tie') statusText = 'an even split, no clear lean'
    }
    const remaining = remainingFor('quarterly', traitReviewInput(t.checkIns, t.periodStartedAt))
    return { ...t, checkInCount: milestone.checkInCount, statusText, remaining }
  })

  const totalCount = rows.reduce((sum, r) => sum + r.checkInCount, 0)
  const earliestStart = rows.length > 0 ? rows.reduce((min, r) => (r.periodStartedAt < min ? r.periodStartedAt : min), rows[0].periodStartedAt) : null
  const pageWindow = earliestStart ? computePeriodWindow(earliestStart, MILESTONE_WINDOW_DAYS) : null

  const title = pageWindow ? (pageWindow.isFirstWindow ? 'Your first 90 days' : 'The last 90 days') : 'Your 90 days'
  const dateRange = pageWindow ? `${format(pageWindow.start, 'MMM d')} – ${format(pageWindow.end, 'MMM d')}` : null
  const headline = totalCount === 0 ? 'Nothing logged yet.' : `${totalCount} check-in${totalCount === 1 ? '' : 's'} across your active trait${rows.length === 1 ? '' : 's'}.`

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      <div className="w-full max-w-md" style={{ padding: '40px 28px 32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ReviewHeader cadence="quarterly" title={title} dateRange={dateRange} />

        {rows.length === 0 ? (
          <NoActiveTraits />
        ) : (
          <>
            <p className="font-serif text-charcoal" style={{ fontSize: 17, lineHeight: 1.4 }}>
              {headline}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rows.map((r) => (
                <Link
                  key={r.activationId}
                  href={`/practice/${r.activationId}`}
                  style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #DAD3C3', background: '#FFFFFF', display: 'block' }}
                >
                  <div className="font-sans font-medium text-charcoal" style={{ fontSize: 14, marginBottom: 2 }}>
                    {facetDisplayLabel(r.facetId)}
                  </div>
                  <div className="font-sans text-muted" style={{ fontSize: 12 }}>
                    {r.checkInCount} check-in{r.checkInCount === 1 ? '' : 's'} · {r.statusText}
                  </div>
                  {r.remaining > 0 && (
                    <div className="font-sans text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {formatTraitRemaining('quarterly', r.remaining)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}

        <p className="font-serif text-charcoal-soft" style={{ fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '4px 0' }}>
          No score. No verdict. Just what you noticed.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          <p className="font-serif text-charcoal" style={{ fontSize: 17, lineHeight: 1.4 }}>
            Still feels right?
          </p>
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.55 }}>
            A good moment to check whether these are still the traits worth your attention.
          </p>
          <div className="flex" style={{ gap: 10, paddingTop: 4 }}>
            <Link
              href="/practice"
              className="font-sans font-medium"
              style={{ flex: 1, textAlign: 'center', padding: 13, borderRadius: 10, background: '#262420', color: '#F7F4ED', fontSize: 14 }}
            >
              Keep going
            </Link>
            <Link
              href="/practice/manage"
              className="font-sans text-charcoal-soft"
              style={{ flex: 1, textAlign: 'center', padding: 13, borderRadius: 10, border: '1px solid #DAD3C3', fontSize: 14 }}
            >
              Make changes
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
