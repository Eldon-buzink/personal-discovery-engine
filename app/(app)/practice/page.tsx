'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FACET_DESCRIPTIONS } from '@/lib/known/scoring'
import { facetDisplayLabel, MINI_ASSESSMENT_BAND_COPY, type MiniAssessmentBand, type MiniAssessmentFacet } from '@/lib/known/miniAssessmentScoring'
import { directionalAccent, directionalSoft } from '@/lib/known/practiceTokens'
import { activateFacet } from '@/lib/known/facetActivationClient'
import {
  fetchPracticeData,
  fetchTodayCheckedInActivationIds,
  activeActivations,
  candidateFacetIds,
  showsDirectionalBadge,
  type PracticeData,
} from '@/lib/known/practiceData'
import { isLowEngagement } from '@/lib/known/engagement'

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
  const [notice, setNotice] = useState<string | null>(null)
  const [activatingFacet, setActivatingFacet] = useState<string | null>(null)
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null)
  const [nudgeTarget, setNudgeTarget] = useState<NudgeTarget | null>(null)

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

  if (nudgeTarget) {
    // Nudge.dc.html — event-triggered (no check-ins in
    // LOW_ENGAGEMENT_NUDGE_THRESHOLD_DAYS), computed lazily right here on
    // load, never pushed. Non-gamified copy: no streak language, no guilt.
    return (
      <div className="min-h-screen bg-cream flex flex-col justify-center px-7" style={{ gap: 20 }}>
        <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
          A quick check
        </p>
        <p className="font-serif font-medium text-charcoal" style={{ fontSize: 22, lineHeight: 1.4 }}>
          {facetDisplayLabel(nudgeTarget.facetId)} hasn&apos;t been landing lately.
        </p>
        <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.55 }}>
          No pressure either way — just checking if this is still the right one to keep active.
        </p>
        <div className="flex flex-col" style={{ gap: 10, paddingTop: 8 }}>
          <button
            onClick={handleKeepNudgedFacetActive}
            className="font-sans font-medium"
            style={{ display: 'block', textAlign: 'center', padding: 14, borderRadius: 10, background: '#262420', color: '#F7F4ED', fontSize: 14 }}
          >
            Keep it active
          </button>
          <Link
            href="/practice/manage"
            className="font-sans text-charcoal-soft"
            style={{ display: 'block', textAlign: 'center', padding: 14, borderRadius: 10, border: '1px solid #DAD3C3', fontSize: 14 }}
          >
            Swap it for something else
          </Link>
        </div>
      </div>
    )
  }

  const active = activeActivations(data)
  const candidates = candidateFacetIds(data)

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
          </div>
          {/* A 3-line hamburger here used to just navigate straight to
              /practice/manage — no actual menu behind it — which reads as a
              mobile-nav convention gone wrong on desktop (an icon implying
              a dropdown that never opens). Plain text matches the
              quarterly-review link right below and is unambiguous at any
              width. */}
          <Link
            href="/practice/manage"
            className="font-sans"
            style={{ fontSize: 13, color: '#8a8375', textDecoration: 'underline', marginTop: 4, flexShrink: 0 }}
          >
            Manage
          </Link>
        </div>

        {notice && (
          <p
            className="font-sans text-charcoal-soft"
            style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: '#EFEBDF' }}
          >
            {notice}
          </p>
        )}

        <div style={{ marginBottom: 28 }}>
          <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 11, letterSpacing: '0.03em', marginBottom: 10 }}>
            Active
          </p>

          {active.length === 0 ? (
            <div
              style={{
                padding: '22px 18px', borderRadius: 14, border: '1px dashed #DAD3C3',
                textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <p className="font-serif text-charcoal-soft" style={{ fontSize: 16 }}>Nothing active right now</p>
              <p className="font-sans text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                Add a pattern below to start your daily check-ins.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {active.map((a) => {
                const showBadge = showsDirectionalBadge(a, data.revealedFacetIds)
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: 18, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 10,
                      border: showBadge ? `1.5px solid ${directionalAccent}` : '1px solid #E5E1D5',
                      background: showBadge ? directionalSoft : '#FFFFFF',
                    }}
                  >
                    {showBadge && (
                      <div
                        style={{
                          display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6,
                          padding: '5px 10px', borderRadius: 7, background: directionalAccent,
                        }}
                      >
                        <span className="font-sans font-medium" style={{ fontSize: 11, color: '#F7F4ED' }}>
                          Directional · from mini-assessment
                        </span>
                      </div>
                    )}
                    <Link href={`/practice/${a.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-medium text-charcoal" style={{ fontSize: 18 }}>
                          {facetDisplayLabel(a.facet_id)}
                        </span>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: directionalAccent, flexShrink: 0 }} />
                      </div>
                      <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.5 }}>
                        {directionalBandCopy.get(a.facet_id) ?? FACET_DESCRIPTIONS[a.facet_id] ?? ''}
                      </p>
                    </Link>
                    {showBadge && (
                      <p
                        className="font-sans"
                        style={{ fontSize: 12, color: '#8a5a3d', paddingTop: 8, borderTop: `1px solid ${directionalAccent}4d` }}
                      >
                        Unlock the full assessment (€49) for a complete, non-directional read on this pattern.
                      </p>
                    )}
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
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 11, letterSpacing: '0.03em', marginBottom: 10 }}>
            Also noticed — not yet active
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
              {candidates.map((facetId) => (
                <div
                  key={facetId}
                  style={{
                    padding: '14px 16px', borderRadius: 12, border: '1px solid #DAD3C3', background: '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <div>
                    <div className="font-sans font-medium text-charcoal" style={{ fontSize: 14 }}>
                      {facetDisplayLabel(facetId)}
                    </div>
                    <div className="font-sans text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                      From your report
                    </div>
                  </div>
                  <button
                    onClick={() => handleActivateCandidate(facetId)}
                    disabled={activatingFacet === facetId}
                    aria-label={`Activate ${facetDisplayLabel(facetId)}`}
                    className="font-sans"
                    style={{ fontSize: 20, color: '#8a8375', fontWeight: 300, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Moved down from top-of-page (review feedback): a once-a-quarter
            link doesn't earn permanent second-item billing above Active,
            the thing people actually open this page for daily. Quiet
            footer placement matches quarterly/recap's own bottom-link
            convention instead of competing with the daily surface. */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Link href="/practice/quarterly" className="font-sans" style={{ fontSize: 12.5, color: '#8a8375', textDecoration: 'underline' }}>
            This quarter&apos;s review
          </Link>
        </div>
      </div>
    </div>
  )
}
