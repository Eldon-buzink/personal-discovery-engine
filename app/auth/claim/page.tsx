'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { recordFacetReveals } from '@/app/actions/recordFacetReveals'
import { PENDING_MINI_ASSESSMENT_ID_KEY } from '@/components/known/AuthModal'
import { isActive } from '@/lib/known/practiceData'
import { ACTIVE_FACET_CAP } from '@/lib/known/practiceConfig'

export default function ClaimPage() {
  const router = useRouter()

  useEffect(() => {
    async function claim() {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error('[claim] getUser error:', userError.message)
      } else {
        console.log('[claim] user:', user?.id ?? 'null (not authenticated)')
      }

      let alreadyActiveNotice = false
      let atCapNotice = false

      if (user) {
        const sessionId = localStorage.getItem('known_pending_session_id')
        console.log('[claim] pending session id:', sessionId)

        if (sessionId) {
          const { data: claimedRow, error: updateError } = await supabase
            .from('anonymous_sessions')
            .update({ claimed_by: user.id })
            .eq('id', sessionId)
            .select('responses')
            .single()

          if (updateError) {
            console.error('[claim] update error:', updateError.message)
          } else {
            console.log('[claim] claimed_by set to', user.id)
            localStorage.removeItem('known_pending_session_id')

            // Backfill user_facet_reveals for every facet revealed while
            // this session was still anonymous — the common case, since
            // most reveals happen before an account exists at all (see
            // app/assessment/page.tsx's triggerReveal for the other,
            // already-authenticated case this doesn't cover).
            const revealedFacets = claimedRow?.responses?.revealedFacets
            if (Array.isArray(revealedFacets) && revealedFacets.length > 0) {
              recordFacetReveals(user.id, revealedFacets).catch((err) =>
                console.error('[claim] recordFacetReveals error:', err)
              )
            }
          }
        } else {
          console.warn('[claim] no known_pending_session_id in localStorage')
        }

        // Mini-assessment signup gate (AuthModal's 'mini-assessment-signup'
        // context) — claim the result row, then create the facet_activation
        // it converts into (handover §6/§8). unique(user_id, facet_id) on
        // facet_activations is the "already active" check: rather than a
        // separate pre-check, just attempt the insert and treat a unique
        // violation as that case (per Eldon's rule — friendly message,
        // route to practice home, no changes made).
        //
        // ACTIVE_FACET_CAP is checked here too, ahead of the insert — the
        // handover is explicit that the cap is shared across every source
        // (base/branch/mini-assessment), and this path is the one place a
        // facet gets activated outside the Manage/Practice-home flows that
        // already enforce it (lib/known/facetActivationClient.ts). Account
        // creation itself still always succeeds regardless — only the
        // activation is blocked, with its own distinct notice.
        const miniAssessmentId = localStorage.getItem(PENDING_MINI_ASSESSMENT_ID_KEY)
        if (miniAssessmentId) {
          const { data: claimedResult, error: claimError } = await supabase
            .from('mini_assessment_results')
            .update({ claimed_by: user.id })
            .eq('id', miniAssessmentId)
            .select('facet_id')
            .single()

          if (claimError) {
            console.error('[claim] mini-assessment claim error:', claimError.message)
          } else {
            localStorage.removeItem(PENDING_MINI_ASSESSMENT_ID_KEY)

            const { data: existingActivations, error: countError } = await supabase
              .from('facet_activations')
              .select('facet_activation_periods(started_at, ended_at)')
              .eq('user_id', user.id)

            if (countError) {
              console.error('[claim] activation count error:', countError.message)
            } else if ((existingActivations ?? []).filter(isActive).length >= ACTIVE_FACET_CAP) {
              console.log('[claim] at ACTIVE_FACET_CAP, not activating:', claimedResult.facet_id)
              atCapNotice = true
            } else {
              const { data: activation, error: activationError } = await supabase
                .from('facet_activations')
                .insert({ user_id: user.id, facet_id: claimedResult.facet_id, source: 'mini_assessment', directional: true })
                .select('id')
                .single()

              if (activationError) {
                if (activationError.code === '23505') {
                  console.log('[claim] facet already active for this user, skipping activation:', claimedResult.facet_id)
                  alreadyActiveNotice = true
                } else {
                  console.error('[claim] facet_activations insert error:', activationError.message)
                }
              } else {
                const { error: periodError } = await supabase
                  .from('facet_activation_periods')
                  .insert({ facet_activation_id: activation.id, user_id: user.id })

                if (periodError) {
                  console.error('[claim] facet_activation_periods insert error:', periodError.message)
                }
              }
            }
          }
        }
      }

      // Send the user back to wherever they actually were (assessment,
      // report, or the practice home for the mini-assessment signup gate)
      // rather than always /assessment — PaywallModal's login step and
      // AuthModal's mini-assessment-signup context both set this right
      // before signInWithOtp; the original save-progress AuthModal trigger
      // doesn't, so this falls back to /assessment for that one.
      const returnPath = localStorage.getItem('known_post_auth_path') || '/assessment'
      const notice = alreadyActiveNotice ? 'already-active' : atCapNotice ? 'at-cap' : null
      const destination = notice
        ? `${returnPath}${returnPath.includes('?') ? '&' : '?'}notice=${notice}`
        : returnPath
      router.push(destination)
    }

    claim()
  }, [router])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <p className="font-sans text-sm text-muted">Saving your progress…</p>
    </div>
  )
}
