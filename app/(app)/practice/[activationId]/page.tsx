'use client'

/**
 * Facet detail — covers both mockup variants (FacetDetailDirectional.dc.html
 * and the non-directional EvidenceTrail.dc.html/FacetDetailEmpty.dc.html) in
 * one component. The paywall badge (showsDirectionalBadge) still switches
 * the top unlock box on/off, but the check-in progress box below it no
 * longer branches on directional vs. not — check-ins are the user's own
 * real observations regardless of how the facet was activated, so a
 * directional facet earns the exact same trend/weekly/monthly treatment a
 * non-directional one does (review feedback: this used to stay a static
 * "too early, directional carries extra uncertainty" note forever, no
 * matter how many check-ins piled up). Only the mini-assessment score
 * itself — shown in its own block above, blob/spectrum/band-copy/insight
 * pulled from the same engine the mini-assessment result page uses — stays
 * labeled as a directional, lower-confidence read.
 *
 * Trend display matches EvidenceTrail.dc.html's actual locked behavior: BOTH
 * lines always show once there's at least 1 check-in against an open period
 * — the large prominent line is "Most recently, you noticed X" (needs only
 * the single latest check-in, not trend qualification), and the small muted
 * line underneath is what upgrades once there's enough data: "Not yet a
 * N-week trend" while unqualified, replaced by the real weekly plurality
 * observation once trend.isTrendQualified. Both are plain interim text
 * (§3.1's templated/LLM synthesis is a separate future content pass), and
 * the weekly line never fabricates a lean from a genuine tie (computeTrend's
 * WeekLean 'tie' case).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FACET_DESCRIPTIONS } from '@/lib/known/scoring'
import {
  facetDisplayLabel,
  MINI_ASSESSMENT_BAND_COPY,
  type MiniAssessmentFacet,
} from '@/lib/known/miniAssessmentScoring'
import { directionalAccent, directionalSoft } from '@/lib/known/practiceTokens'
import { showsDirectionalBadge } from '@/lib/known/practiceData'
import { computeTrend, isCurrentIsoWeek, type TrendResult } from '@/lib/known/trend'
import { TREND_MIN_QUALIFYING_WEEKS } from '@/lib/known/practiceConfig'
import { checkInOptionWord } from '@/lib/known/checkInOptions'
import { todayLocalDateString } from '@/lib/known/checkInDate'
import { fetchClaimedMiniAssessmentResult, type ClaimedMiniAssessmentResult } from '@/lib/known/miniAssessmentResult'
import { computeMiniAssessmentInsight, formatMiniAssessmentInsight } from '@/lib/known/miniAssessmentInsight'
import { computeWeeklyInsight, formatWeeklyProgress, type WeeklyInsightResult } from '@/lib/known/weeklyInsight'
import AnimatedBlob from '@/components/known/AnimatedBlob'
import BandSpectrum from '@/components/known/BandSpectrum'
import PaywallModal from '@/components/known/PaywallModal'

interface DetailState {
  facetId: string
  directional: boolean
  showBadge: boolean
  checkInCount: number
  checkedInToday: boolean
  trend: TrendResult | null // null when there's no open period to scope a trend to (e.g. a deactivated facet viewed directly)
  weekly: WeeklyInsightResult | null // null alongside trend, same reason
  // Only set for a directional (mini-assessment-sourced) facet, and only
  // when that original attempt was actually claimed onto this account — see
  // lib/known/miniAssessmentResult.ts. Kept even after the paywall badge
  // clears (showBadge goes false once the facet is revealed) since it's
  // still the honest record of how this pattern started.
  miniResult: ClaimedMiniAssessmentResult | null
}

// The small, muted, secondary line — upgrades from a static "still
// gathering" message to the real weekly plurality once trend-qualified.
function formatTrendStatus(facetId: string, trend: TrendResult): string {
  if (!trend.isTrendQualified) {
    return `Not yet a ${TREND_MIN_QUALIFYING_WEEKS}-week trend — still gathering the picture.`
  }
  const obs = trend.mostRecentObservation
  if (!obs) return `Not yet a ${TREND_MIN_QUALIFYING_WEEKS}-week trend — still gathering the picture.`
  const weekWord = isCurrentIsoWeek(obs.weekStart) ? 'this week' : 'that week'
  if (obs.lean.type === 'tie') {
    return `${obs.checkInCount} check-in${obs.checkInCount === 1 ? '' : 's'} ${weekWord} were evenly split — no clear lean.`
  }
  if (obs.lean.type === 'option') {
    return `${obs.topCount} out of ${obs.checkInCount} check-ins ${weekWord} leaned toward "${checkInOptionWord(facetId, obs.lean.value)}."`
  }
  return `Not yet a ${TREND_MIN_QUALIFYING_WEEKS}-week trend — still gathering the picture.`
}

// The large, prominent line — always there once at least 1 check-in exists,
// regardless of trend qualification. Just the single latest check-in's
// response, not a weekly aggregate.
function formatMostRecent(facetId: string, trend: TrendResult): string {
  const latest = trend.mostRecentCheckIn
  if (!latest) return ''
  return `Most recently, you noticed "${checkInOptionWord(facetId, latest.responseOption)}."`
}

export default function FacetDetailPage({ params }: { params: { activationId: string } }) {
  const router = useRouter()
  const { activationId } = params

  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)

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
      setUserId(user.id)

      const [activationRes, revealsRes, checkInsRes] = await Promise.all([
        supabase
          .from('facet_activations')
          .select('facet_id, directional, facet_activation_periods(started_at, ended_at)')
          .eq('id', activationId)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('user_facet_reveals').select('facet_id').eq('user_id', user.id),
        supabase.from('check_ins').select('check_in_date, response_option').eq('facet_activation_id', activationId),
      ])

      if (activationRes.error || !activationRes.data) {
        console.error('[FacetDetail] load error:', activationRes.error?.message ?? 'activation not found')
        router.push('/practice')
        return
      }

      const revealedFacetIds = new Set((revealsRes.data ?? []).map((r: { facet_id: string }) => r.facet_id))
      const { facet_id, directional, facet_activation_periods: periods } = activationRes.data
      const checkIns = checkInsRes.data ?? []
      const openPeriod = (periods as { started_at: string; ended_at: string | null }[]).find((p) => p.ended_at === null)
      const trend = openPeriod ? computeTrend(checkIns, openPeriod.started_at) : null
      const weekly = openPeriod ? computeWeeklyInsight(checkIns, openPeriod.started_at) : null

      const miniResult = directional ? await fetchClaimedMiniAssessmentResult(supabase, user.id, facet_id) : null

      setDetail({
        facetId: facet_id,
        directional,
        showBadge: showsDirectionalBadge({ directional, facet_id }, revealedFacetIds),
        checkInCount: checkIns.length,
        // Same bug class Practice home already fixed (Round 5): reuse the
        // check-ins this page already fetches rather than firing a second
        // query just for today's date.
        checkedInToday: checkIns.some((c) => c.check_in_date === todayLocalDateString()),
        trend,
        weekly,
        miniResult,
      })
      setIsLoading(false)
    }

    load()
  }, [activationId, router])

  if (isLoading || !detail) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-sans text-sm text-muted">Loading…</p>
      </div>
    )
  }

  const label = facetDisplayLabel(detail.facetId)
  const description = FACET_DESCRIPTIONS[detail.facetId] ?? ''

  // Result block only renders for a directional facet whose original
  // mini-assessment attempt was actually claimed onto this account — see
  // DetailState.miniResult. Same insight engine the result page uses,
  // recomputed from the responses/band read back from the DB rather than
  // the result page's own browser-local sessionStorage copy.
  const miniFacet = detail.miniResult ? (detail.facetId as MiniAssessmentFacet) : null
  const miniBand = detail.miniResult?.band ?? null
  const bandWord = miniFacet && miniBand ? checkInOptionWord(miniFacet, miniBand) : ''
  const bandCopy = miniFacet && miniBand ? MINI_ASSESSMENT_BAND_COPY[miniFacet][miniBand] : ''
  const insightText = detail.miniResult
    ? formatMiniAssessmentInsight(computeMiniAssessmentInsight(miniFacet as MiniAssessmentFacet, detail.miniResult.responses, detail.miniResult.band))
    : ''

  const weeklyProgress = detail.weekly ? formatWeeklyProgress(detail.weekly) : null

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      {/* Centers the whole screen in the same max-w-md column every other
          practice screen uses — see the check-in page's identical comment
          for why. No-op below 448px. The paywall modal stays outside this
          wrapper (see below) since it's a fixed-position overlay, not part
          of the column layout.
          Review feedback: this used to force minHeight:100vh on this
          wrapper with flexGrow:1 on the content below, so a short page
          (few check-ins, no mini-assessment block) stretched to fill the
          viewport and left a large dead gap before the bottom CTA. Natural
          flow — height follows content, CTA sits right after it — matches
          how the mini-assessment result page itself is laid out. */}
      <div className="w-full max-w-md flex flex-col">
      <div style={{ padding: '48px 28px 0 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <Link href="/practice" className="font-sans text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 14 }}>
            ← Your practice
          </Link>
          <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 12, letterSpacing: '0.04em', marginBottom: 6 }}>
            {detail.checkInCount === 0 ? 'Just added' : 'Your pattern so far'}
          </p>
          <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 27, lineHeight: 1.25 }}>
            {label}
          </h1>
        </div>

        {detail.showBadge && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 12, background: directionalAccent }}>
            <div className="flex items-center gap-2">
              <span className="font-sans font-semibold" style={{ fontSize: 13, color: '#F7F4ED' }}>
                Directional result
              </span>
            </div>
            <p className="font-sans" style={{ fontSize: 13, lineHeight: 1.55, color: directionalSoft }}>
              This pattern came from a 6-question mini-assessment, not the full 30-facet report. Everything below is a
              starting read, not a confident one.
            </p>
            <button
              onClick={() => setPaywallOpen(true)}
              className="font-sans font-medium"
              style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '9px 14px', borderRadius: 8, background: '#262420', color: '#F7F4ED', fontSize: 13, marginTop: 2 }}
            >
              Unlock the full assessment — €49
            </button>
          </div>
        )}

        {/* Mini-assessment result block — the "bring in the result page"
            review feedback. Only for a directional facet with a claimed
            attempt on file; stays visible after the badge above clears
            (paywall unlocked), since it's still the honest record of how
            this pattern started, just no longer the only read available. */}
        {miniFacet && miniBand && (
          <div className="flex flex-col items-center" style={{ textAlign: 'center' }}>
            {/* No separate "{band} {facet}" heading here (there used to be
                one) — the H1 above already names the facet, and the blob's
                own caption plus the spectrum's bold label both already say
                the band word. A third repetition of the same word in three
                lines was noise, not hierarchy. */}
            <div style={{ width: 120, height: 120, position: 'relative', marginBottom: 20 }}>
              <AnimatedBlob seed={`facet-detail-${activationId}`} word={bandWord} size={120} />
            </div>
            <div style={{ width: '100%', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <BandSpectrum facet={miniFacet} band={miniBand} />
            </div>
            <p className="font-serif italic text-charcoal-soft" style={{ fontSize: 15, lineHeight: 1.6, marginBottom: insightText ? 10 : 0 }}>
              {bandCopy}
            </p>
            {insightText && (
              <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.6 }}>
                {insightText}
              </p>
            )}
          </div>
        )}

        {!miniFacet && description && (
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 14, lineHeight: 1.6 }}>
            {description}
          </p>
        )}

        {detail.checkInCount === 0 ? (
          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: 8, padding: '22px 18px', borderRadius: 14,
              border: '1px dashed #DAD3C3', textAlign: 'center', alignItems: 'center',
            }}
          >
            <p className="font-serif text-charcoal-soft" style={{ fontSize: 16 }}>
              Nothing logged yet
            </p>
            <p className="font-sans text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
              Your first check-in starts building this.
            </p>
          </div>
        ) : !detail.trend ? (
          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: 8, padding: '22px 18px', borderRadius: 14,
              border: '1px dashed #DAD3C3', textAlign: 'center', alignItems: 'center',
            }}
          >
            <p className="font-serif text-charcoal-soft" style={{ fontSize: 16 }}>
              {detail.checkInCount} check-in{detail.checkInCount === 1 ? '' : 's'} logged
            </p>
            <p className="font-sans text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
              This pattern isn&apos;t currently active, so no trend is being tracked.
            </p>
          </div>
        ) : (
          // Has at least one check-in against an open period — always both
          // lines (the most-recent-observation line is the prominent
          // element, the trend-status/weekly-observation line is small and
          // muted below it), regardless of whether the original read was
          // directional. Check-ins are the user's own real observations
          // either way; only the mini-assessment score above carries extra
          // uncertainty, not this.
          //
          // Review feedback: this used to share the same orange accent
          // border/background as the paywall box above it, so the page had
          // two loud accent-colored blocks competing for attention. Neutral
          // styling here keeps the orange reserved for the one thing on the
          // page that's actually a call to action (the paywall unlock).
          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: 14, padding: 20, borderRadius: 14,
              background: '#FFFFFF', border: '1px solid #E5E1D5',
            }}
          >
            <div className="flex items-center justify-between">
              <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 12, letterSpacing: '0.03em' }}>
                Your progress
              </p>
              <p className="font-sans text-muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
                {detail.checkInCount} check-in{detail.checkInCount === 1 ? '' : 's'} logged
              </p>
            </div>
            <p className="font-serif font-medium text-charcoal" style={{ fontSize: 19, lineHeight: 1.45 }}>
              {formatMostRecent(detail.facetId, detail.trend)}
            </p>
            <p
              className="font-sans text-muted"
              style={{ fontSize: 12, lineHeight: 1.5, fontStyle: 'italic', paddingTop: 2, borderTop: '1px solid #E5E1D5' }}
            >
              {formatTrendStatus(detail.facetId, detail.trend)}
            </p>
            {weeklyProgress && (
              <p className="font-sans text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                {weeklyProgress}
              </p>
            )}
            <Link href={`/practice/${activationId}/report`} className="font-sans" style={{ fontSize: 12.5, color: directionalAccent, textDecoration: 'underline' }}>
              See your weekly &amp; monthly report
            </Link>
          </div>
        )}
      </div>

      <div style={{ padding: '28px 28px 32px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {detail.checkedInToday ? (
          // Matches Practice home's confirmed state (Round 5 feedback) —
          // this button used to stay a plain clickable CTA here even after
          // today's check-in was already saved, with nothing on this page
          // reflecting it.
          <div
            className="font-sans font-medium"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              textAlign: 'center', padding: 15, borderRadius: 10,
              border: '1px solid #DAD3C3', color: '#6b6659', fontSize: 15,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#6b6659" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Checked in today
          </div>
        ) : (
          <Link
            href={`/practice/${activationId}/checkin`}
            className="font-sans font-medium"
            style={{ display: 'block', textAlign: 'center', padding: 15, borderRadius: 10, background: '#262420', color: '#F7F4ED', fontSize: 15 }}
          >
            Check in today
          </Link>
        )}
      </div>
      </div>

      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        isAuthenticated={true}
        userId={userId}
        traitCount={1}
        onAuthenticated={() => {}}
        onPaymentConfirmed={() => setPaywallOpen(false)}
      />
    </div>
  )
}
