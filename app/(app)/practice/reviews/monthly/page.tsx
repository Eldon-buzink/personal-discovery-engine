'use client'

/**
 * Monthly review — every active trait's 4-week window on one page. Carries
 * over what each trait's own report used to show for that window (the
 * distribution, start-vs-now comparison, week tiles and recent notes); the
 * per-trait report route now redirects here, anchored to its trait.
 *
 * Each trait keeps its own window anchored to when its current period
 * started ("Your first 4 weeks" / "Last 4 weeks", rework Part 4), so the
 * dates sit on each trait rather than on the page.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { checkInOptionWord } from '@/lib/known/checkInOptions'
import { computeRecentWeeksReport } from '@/lib/known/recentWeeksReport'
import { scopeToCurrentPeriod, computeDistribution, parseCheckInDate } from '@/lib/known/weekSummary'
import { compareStartToNowFromOptions, formatStartVsNow, type BandId } from '@/lib/known/startVsNow'
import { selectRecentNotes } from '@/lib/known/checkInNotes'
import { fetchClaimedMiniAssessmentResult } from '@/lib/known/miniAssessmentResult'
import { fetchBaseAssessmentBand } from '@/lib/known/baseAssessmentResult'
import { formatDistribution } from '@/lib/known/reportCopy'
import { formatTraitRemaining, remainingFor, traitReviewInput } from '@/lib/known/reviewProgress'
import { useActiveTraitCheckIns } from '@/lib/known/useActiveTraitCheckIns'
import ReviewHeader from '@/components/known/ReviewHeader'
import { NoActiveTraits, ReviewLoading, ReviewFooter } from '@/components/known/ReviewStates'

export default function MonthlyReviewPage() {
  const { traits, extraData: startBands, failed } = useActiveTraitCheckIns(async (supabase, userId, loaded) => {
    const bands = new Map<string, BandId | null>()
    await Promise.all(
      loaded.map(async (t) => {
        const band = t.directional
          ? ((await fetchClaimedMiniAssessmentResult(supabase, userId, t.facetId))?.band ?? null)
          : await fetchBaseAssessmentBand(supabase, userId, t.facetId)
        bands.set(t.activationId, band)
      })
    )
    return bands
  })
  // Links to one trait land on #<activationId>; the sections only exist
  // once the data is in, so the browser's own anchor jump misses them.
  useEffect(() => {
    if (traits && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [traits])

  if (!traits) return <ReviewLoading failed={failed} />

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      <div className="w-full max-w-md" style={{ padding: '40px 28px 40px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <ReviewHeader cadence="monthly" title="The last four weeks" />

        {traits.length === 0 ? (
          <NoActiveTraits />
        ) : (
          traits.map((t) => {
            const recent = computeRecentWeeksReport(t.checkIns, t.periodStartedAt)
            const remaining = remainingFor('monthly', traitReviewInput(t.checkIns, t.periodStartedAt))
            const windowLabel = recent.window.isFirstWindow ? 'Your first 4 weeks' : 'Last 4 weeks'
            const windowDateRange = `${format(recent.window.start, 'MMM d')} – ${format(recent.window.end, 'MMM d')}`
            const distributionLine = formatDistribution(t.facetId, computeDistribution(recent.checkIns))
            const startBand = startBands?.get(t.activationId) ?? null
            const comparison = startBand ? compareStartToNowFromOptions(startBand, recent.checkIns.map((c) => c.response_option)) : null
            // Notes cover the whole current period, not just the window — a
            // note from five weeks ago shouldn't vanish because the window
            // moved past it.
            const notes = selectRecentNotes(scopeToCurrentPeriod(t.checkIns, t.periodStartedAt))

            return (
              <section key={t.activationId} id={t.activationId} style={{ display: 'flex', flexDirection: 'column', gap: 10, scrollMarginTop: 80 }}>
                <div>
                  <Link href={`/practice/${t.activationId}`} className="font-serif font-medium text-charcoal" style={{ fontSize: 19 }}>
                    {facetDisplayLabel(t.facetId)}
                  </Link>
                  <p className="font-sans text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {windowLabel} · {windowDateRange}
                  </p>
                </div>

                <div style={{ padding: 18, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E1D5', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p className="font-serif font-medium text-charcoal" style={{ fontSize: 17, lineHeight: 1.4 }}>
                    {distributionLine ?? 'No check-ins logged in this window yet.'}
                  </p>
                  {distributionLine && (
                    <p className="font-sans text-muted" style={{ fontSize: 13 }}>
                      Based on {recent.checkInCount} check-in{recent.checkInCount === 1 ? '' : 's'}.
                      {remaining > 0 && ` ${formatTraitRemaining('monthly', remaining)}.`}
                    </p>
                  )}
                  {comparison && (
                    <p className="font-sans text-muted" style={{ fontSize: 13, lineHeight: 1.5, paddingTop: 4, borderTop: '1px solid #E5E1D5' }}>
                      {formatStartVsNow(comparison, t.facetId)}
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
                        style={{ fontSize: 11, lineHeight: 1.25, color: w.qualifies ? '#262420' : '#ADA695', fontStyle: w.qualifies ? 'normal' : 'italic' }}
                      >
                        {w.qualifies
                          ? w.lean.type === 'option'
                            ? checkInOptionWord(t.facetId, w.lean.value)
                            : w.lean.type === 'tie'
                              ? 'Split'
                              : ''
                          : '—'}
                      </div>
                    </div>
                  ))}
                </div>

                {notes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 11, letterSpacing: '0.03em' }}>
                      What you wrote
                    </p>
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
                )}
              </section>
            )
          })
        )}

        <ReviewFooter />
      </div>
    </div>
  )
}
