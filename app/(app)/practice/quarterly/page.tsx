'use client'

/**
 * Quarterly review — Quarterly.dc.html in the mockup. Practice-wide, not
 * per-facet (the mockup itself lists multiple patterns together, and the
 * "Still feels right?" decision point is about the whole practice, not one
 * facet). Deliberately skips the mockup's synthesized cross-pattern
 * narrative ("Reading into silence moved from assuming the worst...") — a
 * separate future content decision (§3.1), same interim-copy rule as
 * monthly recap and the facet-detail trend line. The per-facet "leaning
 * toward X" / "too early to say" read reuses the SAME computeTrend() the
 * facet-detail screen uses (5-week lookback), rather than inventing a
 * separate quarter-scaled qualification window the handover never
 * specified.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startOfQuarter, addMonths, format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { checkInOptionWord } from '@/lib/known/checkInOptions'
import { directionalAccent, directionalSoft } from '@/lib/known/practiceTokens'
import { countCheckInsInQuarter, dominantLeanForMonth, quarterMonthStarts } from '@/lib/known/quarterlyReview'
import { detectLeanNarrative } from '@/lib/known/narrativeSynthesis'
import { computeTrend } from '@/lib/known/trend'
import { isActive, type ActivationRow } from '@/lib/known/practiceData'

interface FacetQuarterRow {
  facetId: string
  checkInCount: number
  statusText: string
}

export default function QuarterlyReviewPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [rows, setRows] = useState<FacetQuarterRow[]>([])
  const [totalCount, setTotalCount] = useState(0)

  const quarterStart = startOfQuarter(new Date())
  const monthNames = [0, 1, 2].map((i) => format(addMonths(quarterStart, i), 'MMMM'))
  const quarterNumber = Math.floor(quarterStart.getMonth() / 3) + 1

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

      const { data: activations, error } = await supabase
        .from('facet_activations')
        .select('id, facet_id, facet_activation_periods(started_at, ended_at)')
        .eq('user_id', user.id)

      if (error) {
        console.error('[Quarterly] load error:', error.message)
        setIsLoading(false)
        return
      }

      const active = ((activations ?? []) as ActivationRow[]).filter(isActive)

      const computed = await Promise.all(
        active.map(async (a) => {
          const openPeriod = a.facet_activation_periods.find((p) => p.ended_at === null)!
          const { data: checkIns } = await supabase
            .from('check_ins')
            .select('check_in_date, response_option')
            .eq('facet_activation_id', a.id)

          const rows = checkIns ?? []
          const checkInCount = countCheckInsInQuarter(rows, openPeriod.started_at, quarterStart)

          // Try the 3-month shift/steady narrative first (coarser, more
          // robust than week-by-week over a whole quarter — see
          // quarterlyReview.ts). Only falls through to the existing
          // single-read (computeTrend, same as facet detail) when the
          // 3-point sequence doesn't cleanly support a story.
          const monthlyLeans = quarterMonthStarts(quarterStart)
            .map((m) => dominantLeanForMonth(rows, openPeriod.started_at, m))
            .filter((l): l is { type: 'option'; value: string } => l.type === 'option')
            .map((l) => l.value)
          const narrative = detectLeanNarrative(monthlyLeans)

          let statusText = 'too early to say'
          if (narrative.type === 'steady') {
            statusText = `a steady lean toward "${checkInOptionWord(a.facet_id, narrative.option)}"`
          } else if (narrative.type === 'shift') {
            statusText = `a shift from "${checkInOptionWord(a.facet_id, narrative.from)}" toward "${checkInOptionWord(a.facet_id, narrative.to)}"`
          } else {
            const trend = computeTrend(rows, openPeriod.started_at)
            if (trend.isTrendQualified && trend.mostRecentObservation) {
              const lean = trend.mostRecentObservation.lean
              statusText =
                lean.type === 'option'
                  ? `leaning toward "${checkInOptionWord(a.facet_id, lean.value)}"`
                  : lean.type === 'tie'
                    ? 'an even split, no clear lean'
                    : 'too early to say'
            }
          }

          return { facetId: a.facet_id, checkInCount, statusText }
        })
      )

      setRows(computed)
      setTotalCount(computed.reduce((sum, r) => sum + r.checkInCount, 0))
      setIsLoading(false)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-sans text-sm text-muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      {/* Centers the whole screen in the same max-w-md column every other
          practice screen uses — see the check-in page's identical comment
          for why. No-op below 448px. */}
      <div className="w-full max-w-md flex flex-col" style={{ minHeight: '100vh' }}>
      <div style={{ padding: '48px 28px 0 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
          Q{quarterNumber} review
        </p>
        <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 25, lineHeight: 1.3 }}>
          Three months of showing up
        </h1>
      </div>

      <div style={{ padding: '22px 28px 0 28px', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ padding: 18, borderRadius: 14, background: directionalSoft, border: `1.5px solid ${directionalAccent}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 13 }}>
            Across {monthNames[0]}, {monthNames[1]}, {monthNames[2]}
          </p>
          <p className="font-serif text-charcoal" style={{ fontSize: 17, lineHeight: 1.5 }}>
            {totalCount === 0
              ? 'No check-ins logged this quarter yet.'
              : `${totalCount} check-in${totalCount === 1 ? '' : 's'} across your active pattern${rows.length === 1 ? '' : 's'} this quarter.`}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 12, letterSpacing: '0.03em' }}>
            Your patterns this quarter
          </p>
          {rows.length === 0 ? (
            <p className="font-sans text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
              Nothing active right now.
            </p>
          ) : (
            rows.map((r) => (
              <div key={r.facetId} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #DAD3C3', background: '#FFFFFF' }}>
                <div className="font-sans font-medium text-charcoal" style={{ fontSize: 14, marginBottom: 2 }}>
                  {facetDisplayLabel(r.facetId)}
                </div>
                <div className="font-sans text-muted" style={{ fontSize: 12 }}>
                  {r.checkInCount} check-in{r.checkInCount === 1 ? '' : 's'} · {r.statusText}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          <p className="font-serif text-charcoal" style={{ fontSize: 17, lineHeight: 1.4 }}>
            Still feels right?
          </p>
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.55 }}>
            A good moment to check whether these are still the patterns worth your attention.
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

      <div style={{ padding: '16px 28px 32px 28px' }}>
        <Link href="/practice" className="font-sans text-muted" style={{ display: 'block', textAlign: 'center', padding: 8, fontSize: 13 }}>
          Back to your practice
        </Link>
      </div>
      </div>
    </div>
  )
}
