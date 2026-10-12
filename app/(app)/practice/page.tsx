'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FACET_DESCRIPTIONS, computeFacetScore } from '@/lib/known/scoring'
import { orderByStrength, traitStrength } from '@/lib/known/traitOrder'
import { facetDisplayLabel, MINI_ASSESSMENT_BAND_COPY, type MiniAssessmentBand, type MiniAssessmentFacet } from '@/lib/known/miniAssessmentScoring'
import { directionalAccent, directionalSoft } from '@/lib/known/practiceTokens'
import { activateFacet } from '@/lib/known/facetActivationClient'
import {
  fetchPracticeData,
  fetchTodayCheckedInActivationIds,
  fetchWeeklyInsights,
  fetchStages,
  activeActivations,
  candidateFacetIds,
  showsDirectionalBadge,
  type PracticeData,
} from '@/lib/known/practiceData'
import { formatWeeklyProgress, type WeeklyInsightResult } from '@/lib/known/weeklyInsight'
import { formatStageCompact, type StageResult } from '@/lib/known/practiceStage'
import { isLowEngagement } from '@/lib/known/engagement'
import { practicePurposeCopy } from '@/lib/known/practicePurpose'
import { REVIEW_CADENCES, REVIEW_COPY, computeReviewProgress, formatReviewProgress, type TraitReviewInput } from '@/lib/known/reviewProgress'

// Card copy for a directional active pattern used to be the same static
// FACET_DESCRIPTIONS line every user with that facet sees, regardless of
// their actual answers ("Your responses showed a clear signal..." — true
// for nobody in particular). Review feedback: show the real per-user band
// read instead, wherever a claimed mini-assessment attempt exists for it.
async function fetchDirectionalBandCopy(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  facetIds: string[]
): Promise<Map<string, string>> {
  if (facetIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('mini_assessment_results')
    .select('facet_id, band, created_at')
    .eq('claimed_by', userId)
    .in('facet_id', facetIds)
    .order('created_at', { ascending: false })

  if (error || !data) return new Map()

  const copyByFacet = new Map<string, string>()
  for (const row of data as { facet_id: string; band: MiniAssessmentBand }[]) {
    // Most-recent-first order, first write per facet wins — same
    // most-recent-attempt convention as fetchClaimedMiniAssessmentResult.
    if (copyByFacet.has(row.facet_id)) continue
    const bandCopy = MINI_ASSESSMENT_BAND_COPY[row.facet_id as MiniAssessmentFacet]?.[row.band]
    if (bandCopy) copyByFacet.set(row.facet_id, bandCopy)
  }
  return copyByFacet
}

// The user's own words for their traits ("Grounded" for Anxiety) and how
// clear-cut each one is, from the report saved in this browser. The practice
// tables only store facet ids, so on another device this is empty and the
// list falls back to facet names in their original order.
function readReportTraits(): { words: Map<string, string>; strength: Map<string, number> } {
  const words = new Map<string, string>()
  const strength = new Map<string, number>()
  try {
    const s = JSON.parse(localStorage.getItem('known_session') ?? '{}')
    const answers = new Map<number, number>(
      (Array.isArray(s.responses) ? s.responses : []).map((r: { questionId: number; value: number }) => [r.questionId, r.value]),
    )
    for (const e of Array.isArray(s.patternContents) ? s.patternContents : []) {
      if (e.branch || !e.facet || !e.traitWord) continue
      words.set(e.facet, e.traitWord)
      strength.set(e.facet, traitStrength(computeFacetScore(e.facet, answers)))
    }
  } catch {}
  return { words, strength }
}

// How many not-yet-active traits to list before "Show all".
const CANDIDATES_SHOWN = 5

const NOTICE_COPY: Record<string, string> = {
  'already-active': "This one's already active — no changes made.",
  'at-cap': "Your account's set up, but you're at your check-in limit — manage your practice to make room for this one.",
}

// Prefix for the per-activation, per-browser-session dismissal flag — not
// database state (no new table for this), just enough to stop the SAME
// nudge reappearing on every load within one sitting. It still resurfaces
// on a fresh visit if the facet is still disengaged, which is the point:
// this is a lazy, on-open check (handover §2.3), not a one-time dismissal.
const NUDGE_DISMISSED_KEY_PREFIX = 'known_nudge_dismissed_'

interface NudgeTarget {
  activationId: string
  facetId: string
}

export default function PracticeHomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [data, setData] = useState<PracticeData | null>(null)
  const [checkedInToday, setCheckedInToday] = useState<Set<string>>(new Set())
  const [directionalBandCopy, setDirectionalBandCopy] = useState<Map<string, string>>(new Map())
  const [weeklyInsights, setWeeklyInsights] = useState<Map<string, WeeklyInsightResult>>(new Map())
  const [stages, setStages] = useState<Map<string, StageResult>>(new Map())
  const [notice, setNotice] = useState<string | null>(null)
  const [activatingFacet, setActivatingFacet] = useState<string | null>(null)
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null)
  // Purpose line (rework Part 1) — shown once, right after a "+" activation
  // succeeds, naming which facet it's for. Client-side state only, not
  // persisted: gone on the next reload, same "said once, not nagged" rule
  // the rest of this page's copy already follows.
  const [justActivatedFacet, setJustActivatedFacet] = useState<string | null>(null)
  const [nudgeTarget, setNudgeTarget] = useState<NudgeTarget | null>(null)
  const [reportTraits, setReportTraits] = useState<ReturnType<typeof readReportTraits>>({ words: new Map(), strength: new Map() })
  const [showAllCandidates, setShowAllCandidates] = useState(false)
  useEffect(() => { setReportTraits(readReportTraits()) }, [])

  async function checkForNudge(supabase: ReturnType<typeof createClient>, practiceData: PracticeData) {
    const active = activeActivations(practiceData)
    for (const a of active) {
      if (sessionStorage.getItem(NUDGE_DISMISSED_KEY_PREFIX + a.id)) continue
      const openPeriod = a.facet_activation_periods.find((p) => p.ended_at === null)
      if (!openPeriod) continue

      const { data: checkIns } = await supabase.from('check_ins').select('check_in_date, response_option').eq('facet_activation_id', a.id)
      if (isLowEngagement(checkIns ?? [], openPeriod.started_at)) {
        setNudgeTarget({ activationId: a.id, facetId: a.facet_id })
        return
      }
    }
    setNudgeTarget(null)
  }

  // Returns whether the refresh actually succeeded — callers that reload
  // after a mutation (activating a candidate) need to know, since a mutation
  // can succeed in the database while this refetch fails on a transient
  // network error. Silently leaving the old `data` in place in that case
  // would show a stale card with no indication the click actually worked —
  // surfacing it explicitly beats a UI that quietly lies about its own state.
  async function load(supabase: ReturnType<typeof createClient>, uid: string): Promise<boolean> {
    try {
      const practiceData = await fetchPracticeData(supabase, uid)
      setData(practiceData)
      const todayIds = await fetchTodayCheckedInActivationIds(supabase, uid)
      setCheckedInToday(todayIds)
      const directionalFacetIds = activeActivations(practiceData).filter((a) => a.directional).map((a) => a.facet_id)
      setDirectionalBandCopy(await fetchDirectionalBandCopy(supabase, uid, directionalFacetIds))
      setWeeklyInsights(await fetchWeeklyInsights(supabase, uid, practiceData.activations))
      setStages(await fetchStages(supabase, uid, practiceData.activations))
      await checkForNudge(supabase, practiceData)
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('[PracticeHome] load error:', err)
      setIsLoading(false)
      return false
    }
  }

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const noticeKey = search.get('notice')
    if (noticeKey && NOTICE_COPY[noticeKey]) setNotice(NOTICE_COPY[noticeKey])

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/')
        return
      }
      setUserId(user.id)
      load(supabase, user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function handleActivateCandidate(facetId: string) {
    if (!userId) return
    setActivatingFacet(facetId)
    setCandidateMessage(null)

    const supabase = createClient()
    const result = await activateFacet(supabase, userId, facetId, 'base_assessment')

    if (result.ok) {
      const refreshed = await load(supabase, userId)
      if (!refreshed) setCandidateMessage('Added — but the page could not refresh. Reload to see it.')
      else setJustActivatedFacet(facetId)
    } else if (result.reason === 'cap') {
      setCandidateMessage("You're at your check-in limit — manage your practice to swap one out first.")
    } else {
      console.error('[PracticeHome] activate error:', result.message)
      setCandidateMessage('Something went wrong — try again in a moment.')
    }
    setActivatingFacet(null)
  }

  function handleKeepNudgedFacetActive() {
    if (nudgeTarget) sessionStorage.setItem(NUDGE_DISMISSED_KEY_PREFIX + nudgeTarget.activationId, '1')
    setNudgeTarget(null)
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-sans text-sm text-muted">Loading your practice…</p>
      </div>
    )
  }

  const active = activeActivations(data)
  const candidates = orderByStrength(candidateFacetIds(data), (f) => reportTraits.strength.get(f) ?? 0)
    .map((i) => candidateFacetIds(data)[i])
  const reviewInputs: TraitReviewInput[] = active.flatMap((a) => {
    const openPeriod = a.facet_activation_periods.find((p) => p.ended_at === null)
    if (!openPeriod) return []
    return [{
      checkInsThisWeek: weeklyInsights.get(a.id)?.summary.checkInCount ?? 0,
      checkInsInReportWindow: stages.get(a.id)?.reportWindowCheckInCount ?? 0,
      periodStartedAt: openPeriod.started_at,
    }]
  })
  const shownCandidates = showAllCandidates ? candidates : candidates.slice(0, CANDIDATES_SHOWN)

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-start justify-between gap-3" style={{ marginBottom: 24 }}>
          <div>
            <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 12, letterSpacing: '0.04em', marginBottom: 4 }}>
              Your practice
            </p>
            <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 26, lineHeight: 1.3 }}>
              What you&apos;re noticing
            </h1>
            <p className="font-sans text-charcoal-soft" style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 10 }}>
              Your practice is where you work with what your report found. Pick up to four traits, check in on
              them for a moment each day, and see how they move over the weeks.
            </p>
            <p className="font-sans text-muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>
              Pick a trait · Check in daily · Weekly, monthly and quarterly reviews
            </p>
          </div>
        </div>

        {nudgeTarget && (
          // Nudge.dc.html — event-triggered (no check-ins in
          // LOW_ENGAGEMENT_NUDGE_THRESHOLD_DAYS), computed lazily on load,
          // never pushed. Non-gamified copy: no streak language, no guilt.
          // A card at the top of the page, not a full-screen takeover: the
          // takeover hid the whole practice (check-ins, reviews) until it
          // was answered, and ignored this column on desktop.
          <div
            style={{
              marginBottom: 24, padding: 18, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E1D5',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 11, letterSpacing: '0.04em' }}>
              A quick check
            </p>
            <p className="font-serif font-medium text-charcoal" style={{ fontSize: 18, lineHeight: 1.4 }}>
              {facetDisplayLabel(nudgeTarget.facetId)} hasn&apos;t been landing lately.
            </p>
            <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.55 }}>
              No pressure either way — just checking if this is still the right one to keep active.
            </p>
            <div className="flex" style={{ gap: 10, paddingTop: 6 }}>
              <button
                onClick={handleKeepNudgedFacetActive}
                className="font-sans font-medium"
                style={{ flex: 1, textAlign: 'center', padding: 11, borderRadius: 8, background: '#262420', color: '#F7F4ED', fontSize: 14 }}
              >
                Keep it active
              </button>
              <Link
                href="/practice/manage"
                className="font-sans text-charcoal-soft"
                style={{ flex: 1, textAlign: 'center', padding: 11, borderRadius: 8, border: '1px solid #DAD3C3', fontSize: 14 }}
              >
                Swap it
              </Link>
            </div>
          </div>
        )}

        {notice && (
          <p
            className="font-sans text-charcoal-soft"
            style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: '#EFEBDF' }}
          >
            {notice}
          </p>
        )}

        {justActivatedFacet && (
          <p
            className="font-sans text-charcoal-soft"
            style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: '#EFEBDF' }}
          >
            {facetDisplayLabel(justActivatedFacet)} added. {practicePurposeCopy(false)}
          </p>
        )}

        {active.length > 0 && <div style={{ marginBottom: 28 }}>
          {/* Choosing which traits are active is editing this list, so the
              action sits on the list's own heading. */}
          <div className="flex items-baseline justify-between" style={{ marginBottom: 10 }}>
            <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 11, letterSpacing: '0.03em' }}>
              Active
            </p>
            <Link href="/practice/manage" className="font-sans" style={{ fontSize: 12.5, color: '#8a8375', textDecoration: 'underline' }}>
              Edit
            </Link>
          </div>

          {(
            <div className="flex flex-col gap-3">
              {active.map((a) => {
                const showBadge = showsDirectionalBadge(a, data.revealedFacetIds)
                const weekly = weeklyInsights.get(a.id)
                const weeklyProgress = weekly ? formatWeeklyProgress(weekly) : null
                const weeklyQualifies = weekly?.summary.qualifies ?? false
                const stage = stages.get(a.id)
                const stageLine = stage ? formatStageCompact(stage) : null
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: 18, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 10,
                      border: showBadge ? `1.5px solid ${directionalAccent}` : '1px solid #E5E1D5',
                      background: showBadge ? directionalSoft : '#FFFFFF',
                    }}
                  >
                    {/* Hierarchy (review feedback): the trait name reads
                        first; where it came from and where it stands share
                        one quiet line under it (this used to be an orange
                        eyebrow above the name, with the stage below the
                        description); then the description; then the
                        check-in. The unlock note sits under the check-in
                        rather than between the content and the action. The
                        card's tint/border still carries "directional". */}
                    <Link href={`/practice/${a.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="font-serif font-medium text-charcoal" style={{ fontSize: 19, lineHeight: 1.3 }}>
                        {facetDisplayLabel(a.facet_id)}
                      </span>
                      {(showBadge || stageLine) && (
                        <p className="font-sans text-muted" style={{ fontSize: 12 }}>
                          {showBadge && <span style={{ color: directionalAccent, fontWeight: 500 }}>Directional</span>}
                          {showBadge && stageLine && ' · '}
                          {stageLine}
                        </p>
                      )}
                      <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
                        {directionalBandCopy.get(a.facet_id) ?? FACET_DESCRIPTIONS[a.facet_id] ?? ''}
                      </p>
                    </Link>
                    {checkedInToday.has(a.id) ? (
                      // Round 5 feedback: this used to always show the dark
                      // "Check in today" button, even right after the user
                      // had just checked in — no way to tell it had worked.
                      // A distinct, non-clickable confirmed state (checking
                      // back in again today isn't a thing the product
                      // supports — check_ins is one row per day) closes
                      // that loop.
                      <div
                        className="font-sans font-medium"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          textAlign: 'center', padding: 11, borderRadius: 8,
                          border: '1px solid #DAD3C3', color: '#6b6659', fontSize: 14,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="#6b6659" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Checked in today
                      </div>
                    ) : (
                      <Link
                        href={`/practice/${a.id}/checkin`}
                        className="font-sans font-medium"
                        style={{ display: 'block', textAlign: 'center', padding: 11, borderRadius: 8, background: '#262420', color: '#F7F4ED', fontSize: 14 }}
                      >
                        Check in today
                      </Link>
                    )}
                    {/* Review feedback: weekly progress only ever showed up
                        on a facet's own detail page — the homepage, where
                        people actually land day to day, said nothing about
                        it. Same quiet, count-based copy as facet detail;
                        silent when there's nothing yet to report. */}
                    {weeklyQualifies ? (
                      <Link
                        href="/practice/reviews/weekly"
                        className="font-sans"
                        style={{ fontSize: 12, color: directionalAccent, textDecoration: 'underline', textAlign: 'center' }}
                      >
                        Your weekly read is ready
                      </Link>
                    ) : (
                      weeklyProgress && (
                        <p className="font-sans text-muted" style={{ fontSize: 12, textAlign: 'center' }}>
                          {weeklyProgress}
                        </p>
                      )
                    )}
                    {showBadge && (
                      <p className="font-sans" style={{ fontSize: 12, lineHeight: 1.45, color: '#8a5a3d', textAlign: 'center' }}>
                        Based on the mini-assessment. The full assessment (€49) gives a complete read.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>}

        {data.activations.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 11, letterSpacing: '0.03em', marginBottom: 10 }}>
              Your reviews
            </p>
            {/* One card per cadence, each opening a page with every active
                trait — not a card per trait. Progress is plain text, never a
                bar (same no-gamification rule as the stage ladder). */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {REVIEW_CADENCES.map((cadence) => {
                const progress = computeReviewProgress(cadence, reviewInputs)
                const progressLine = formatReviewProgress(cadence, progress)
                const ready = progress.total > 0 && progress.readyCount > 0
                return (
                  <Link
                    key={cadence}
                    href={REVIEW_COPY[cadence].href}
                    style={{
                      padding: '14px 12px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6,
                      background: ready ? directionalSoft : '#FFFFFF',
                      border: ready ? `1.5px solid ${directionalAccent}` : '1px solid #DAD3C3',
                    }}
                  >
                    <span className="font-serif font-medium text-charcoal" style={{ fontSize: 16 }}>
                      {REVIEW_COPY[cadence].title}
                    </span>
                    <span className="font-sans text-muted" style={{ fontSize: 11.5, lineHeight: 1.4 }}>
                      {REVIEW_COPY[cadence].description}
                    </span>
                    {progressLine && (
                      <span
                        className="font-sans"
                        style={{ marginTop: 'auto', paddingTop: 6, fontSize: 11.5, lineHeight: 1.35, fontWeight: 500, color: ready ? directionalAccent : '#4a463e' }}
                      >
                        {progressLine}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 11, letterSpacing: '0.03em', marginBottom: 10 }}>
            {active.length === 0 ? 'Pick a trait to start with' : 'Also noticed — not yet active'}
          </p>

          {candidateMessage && (
            <p className="font-sans" style={{ fontSize: 13, color: '#8a5a3d', marginBottom: 10 }}>
              {candidateMessage}
            </p>
          )}

          {candidates.length === 0 ? (
            <p className="font-sans text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
              Nothing else yet — as you reveal more patterns in your report, they&apos;ll show up here.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {shownCandidates.map((facetId) => (
                <div
                  key={facetId}
                  style={{
                    padding: '14px 16px', borderRadius: 12, border: '1px solid #DAD3C3', background: '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <div>
                    <div className="font-sans font-medium text-charcoal" style={{ fontSize: 14 }}>
                      {reportTraits.words.get(facetId) ?? facetDisplayLabel(facetId)}
                    </div>
                    <div className="font-sans text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {reportTraits.words.has(facetId) ? facetDisplayLabel(facetId) : 'From your report'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleActivateCandidate(facetId)}
                    disabled={activatingFacet === facetId}
                    aria-label={`Activate ${reportTraits.words.get(facetId) ?? facetDisplayLabel(facetId)}`}
                    className="font-sans"
                    style={{ fontSize: 20, color: '#8a8375', fontWeight: 300, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              ))}
              {candidates.length > CANDIDATES_SHOWN && (
                <button
                  onClick={() => setShowAllCandidates((v) => !v)}
                  className="font-sans"
                  style={{ alignSelf: 'center', marginTop: 6, fontSize: 12.5, color: '#8a8375', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showAllCandidates ? 'Show fewer' : `Show all ${candidates.length}`}
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
