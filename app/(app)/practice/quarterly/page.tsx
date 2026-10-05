'use client'

/**
 * Milestone review — Quarterly.dc.html in the mockup, kept at the
 * /practice/quarterly route (the link from Practice home and any
 * bookmarks already point here) but no longer anchored to the calendar
 * quarter. Rework Part 4: each active facet has its own 90-day window
 * anchored to when ITS current activation period started
 * (lib/known/quarterlyReview.ts) — there's no single shared "quarter"
 * once activation dates differ per facet, so each row reads its own
 * window; the page-level framing ("Your first 90 days" / "Last 90 days")
 * follows whichever active facet started earliest, since "Still feels
 * right?" is a whole-practice decision point either way.
 *
 * Also fixes a real bug: the title used to always read "Three months of
 * showing up" regardless of data — including with zero check-ins logged.
 * The headline is data-driven now (a plain count, or "Nothing logged
 * yet"), not a fixed phrase that can contradict what's actually true.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { checkInOptionWord } from '@/lib/known/checkInOptions'
import { computeFacetMilestone } from '@/lib/known/quarterlyReview'
import { computePeriodWindow, type PeriodWindow } from '@/lib/known/periodWindow'
import { isActive, type ActivationRow } from '@/lib/known/practiceData'
import { COMPARISON_MIN_CHECKINS, MILESTONE_WINDOW_DAYS } from '@/lib/known/practiceConfig'

interface FacetMilestoneRow {
  facetId: string
  checkInCount: number
  statusText: string
}

export default function MilestoneReviewPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [rows, setRows] = useState<FacetMilestoneRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  // The earliest-started active facet's own window — used only for the
  // page-level "Your first 90 days" vs "Last 90 days" framing, since the
  // decision point below is about the whole practice, not one facet.
  const [pageWindow, setPageWindow] = useState<PeriodWindow | null>(null)

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
        console.error('[Milestone] load error:', error.message)
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

          const milestone = computeFacetMilestone(checkIns ?? [], openPeriod.started_at)

          let statusText = 'too early to say'
          if (milestone.checkInCount >= COMPARISON_MIN_CHECKINS) {
            if (milestone.lean.type === 'option') statusText = `leaning toward "${checkInOptionWord(a.facet_id, milestone.lean.value)}"`
            else if (milestone.lean.type === 'tie') statusText = 'an even split, no clear lean'
          }

          return { facetId: a.facet_id, checkInCount: milestone.checkInCount, statusText, periodStartedAt: openPeriod.started_at }
        })
      )

      setRows(computed.map(({ facetId, checkInCount, statusText }) => ({ facetId, checkInCount, statusText })))
      setTotalCount(computed.reduce((sum, r) => sum + r.checkInCount, 0))

      if (computed.length > 0) {
        const earliestStart = computed.reduce((min, r) => (r.periodStartedAt < min ? r.periodStartedAt : min), computed[0].periodStartedAt)
        setPageWindow(computePeriodWindow(earliestStart, MILESTONE_WINDOW_DAYS))
      }

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

  const windowEyebrow = pageWindow ? (pageWindow.isFirstWindow ? 'Your first 90 days' : 'Last 90 days') : 'Your practice'
  const windowDateRange = pageWindow ? `${format(pageWindow.start, 'MMM d')} – ${format(pageWindow.end, 'MMM d')}` : null
  const headline = totalCount === 0 ? 'Nothing logged yet.' : `${totalCount} check-in${totalCount === 1 ? '' : 's'} across your active pattern${rows.length === 1 ? '' : 's'}.`

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      {/* Centers the whole screen in the same max-w-md column every other
          practice screen uses — see the check-in page's identical comment
          for why. No-op below 448px. */}
      <div className="w-full max-w-md flex flex-col" style={{ minHeight: '100vh' }}>
      <div style={{ padding: '48px 28px 0 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
          {windowEyebrow}
        </p>
        <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 25, lineHeight: 1.3 }}>
          {headline}
        </h1>
      </div>

      <div style={{ padding: '22px 28px 32px 28px', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {windowDateRange && (
          <p className="font-sans text-muted" style={{ fontSize: 13 }}>
            {windowDateRange}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 12, letterSpacing: '0.03em' }}>
            Your patterns
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

        <p className="font-serif text-charcoal-soft" style={{ fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '4px 0' }}>
          No score. No verdict. Just what you noticed.
        </p>

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
      </div>
    </div>
  )
}
