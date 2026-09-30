'use client'

/**
 * Monthly recap — Recap.dc.html in the mockup, current calendar month only
 * (no month picker in this pass). Deliberately skips the mockup's
 * synthesized "shift" narrative headline and its AI-written "Optional — for
 * next check-in" suggestion card — neither is part of what was asked for
 * here, and the first is explicitly deferred content (§3.1). Headline and
 * closing line are both plain, count-grounded interim copy.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startOfMonth, format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { checkInOptionWord } from '@/lib/known/checkInOptions'
import { directionalAccent, directionalSoft } from '@/lib/known/practiceTokens'
import { computeMonthlyRecap, type MonthlyRecapResult } from '@/lib/known/monthlyRecap'
import { detectLeanNarrative } from '@/lib/known/narrativeSynthesis'

interface RecapState {
  facetId: string
  recap: MonthlyRecapResult
}

// Headline copy — tries the shift/steady narrative first (built off this
// month's already-computed weekly leans), falls back to the plain count
// when the data doesn't cleanly support one (see narrativeSynthesis.ts).
function formatHeadline(facetId: string, recap: MonthlyRecapResult): { primary: string; secondary: string | null } {
  const plain = { primary: `${recap.checkInCount} check-in${recap.checkInCount === 1 ? '' : 's'} this month.`, secondary: null }
  if (recap.checkInCount === 0) return plain

  const leanSequence = recap.weeks
    .filter((w) => w.qualifies && w.lean.type === 'option')
    .map((w) => (w.lean as { type: 'option'; value: string }).value)

  const narrative = detectLeanNarrative(leanSequence)
  const secondary = `Based on ${recap.checkInCount} check-in${recap.checkInCount === 1 ? '' : 's'} this month.`

  if (narrative.type === 'steady') {
    return { primary: `A steady lean toward "${checkInOptionWord(facetId, narrative.option)}," most weeks this month.`, secondary }
  }
  if (narrative.type === 'shift') {
    return {
      primary: `A shift from "${checkInOptionWord(facetId, narrative.from)}" toward "${checkInOptionWord(facetId, narrative.to)}," this month.`,
      secondary,
    }
  }
  return plain
}

export default function MonthlyRecapPage({ params }: { params: { activationId: string } }) {
  const router = useRouter()
  const { activationId } = params

  const [isLoading, setIsLoading] = useState(true)
  const [state, setState] = useState<RecapState | null>(null)

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
        console.error('[MonthlyRecap] load error:', activationRes.error?.message ?? 'activation not found')
        router.push('/practice')
        return
      }

      const { facet_id, facet_activation_periods: periods } = activationRes.data
      const openPeriod = (periods as { started_at: string; ended_at: string | null }[]).find((p) => p.ended_at === null)

      if (!openPeriod) {
        router.push(`/practice/${activationId}`)
        return
      }

      const recap = computeMonthlyRecap(checkInsRes.data ?? [], openPeriod.started_at, startOfMonth(new Date()))
      setState({ facetId: facet_id, recap })
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

  const { recap } = state
  const monthName = format(recap.monthStart, 'MMMM')
  const label = facetDisplayLabel(state.facetId)
  const headline = formatHeadline(state.facetId, recap)

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div style={{ padding: '48px 28px 0 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
          {monthName} recap
        </p>
        <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 26, lineHeight: 1.3 }}>
          {label}
        </h1>
        <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.5 }}>
          What your daily check-ins added up to this month.
        </p>
      </div>

      <div style={{ padding: '24px 28px 0 28px', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ padding: 20, borderRadius: 14, background: directionalSoft, border: `1.5px solid ${directionalAccent}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p className="font-serif font-medium text-charcoal" style={{ fontSize: 19, lineHeight: 1.4 }}>
            {headline.primary}
          </p>
          {headline.secondary && (
            <p className="font-sans text-muted" style={{ fontSize: 13 }}>
              {headline.secondary}
            </p>
          )}
        </div>

        <div className="flex" style={{ gap: 8 }}>
          {recap.weeks.map((w, i) => (
            <div
              key={i}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 10, textAlign: 'center',
                border: w.qualifies ? '1px solid #DAD3C3' : '1px dashed #DAD3C3',
                background: w.qualifies ? '#FFFFFF' : 'transparent',
              }}
            >
              <div className="font-sans text-muted" style={{ fontSize: 11, marginBottom: 4 }}>
                Week {i + 1}
              </div>
              <div
                className="font-sans"
                style={{
                  fontSize: 12, lineHeight: 1.3,
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
                  : 'Not enough check-ins'}
              </div>
            </div>
          ))}
        </div>

        <p className="font-serif text-charcoal-soft" style={{ fontStyle: 'italic', fontSize: 14, textAlign: 'center', padding: '4px 0' }}>
          No score. No verdict. Just what you noticed.
        </p>

        <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.6, textAlign: 'center', padding: '2px 4px 4px' }}>
          {recap.checkInCount === 0
            ? "No check-ins logged this month yet."
            : `${recap.checkInCount} time${recap.checkInCount === 1 ? '' : 's'} this month, you stopped to check in.`}
        </p>
      </div>

      <div style={{ padding: '16px 28px 32px 28px' }}>
        <Link href={`/practice/${activationId}`} className="font-sans text-muted" style={{ display: 'block', textAlign: 'center', padding: 8, fontSize: 13 }}>
          Back to your pattern
        </Link>
      </div>
    </div>
  )
}
