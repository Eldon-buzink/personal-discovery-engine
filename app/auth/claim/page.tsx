'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { recordFacetReveals } from '@/app/actions/recordFacetReveals'
import { PENDING_MINI_ASSESSMENT_ID_KEY } from '@/components/known/AuthModal'
import { claimMiniAssessmentResult } from '@/lib/known/miniAssessmentClaim'

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
        console.log('[claim] authenticated:', !!user)
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
            console.log('[claim] session claimed')
            localStorage.removeItem('known_pending_session_id')

            // Backfill user_facet_reveals for every facet revealed while
            // this session was still anonymous — the common case, since
            // most reveals happen before an account exists at all (see
            // app/assessment/page.tsx's triggerReveal for the other,
            // already-authenticated case this doesn't cover).
            const revealedFacets = claimedRow?.responses?.revealedFacets
            if (Array.isArray(revealedFacets) && revealedFacets.length > 0) {
              recordFacetReveals(revealedFacets).catch((err) =>
                console.error('[claim] recordFacetReveals error:', err)
              )
            }
          }
        } else {
          console.warn('[claim] no known_pending_session_id in localStorage')
        }

        // Mini-assessment signup gate (AuthModal's 'mini-assessment-signup'
        // context) — convert the claimed result into a facet_activation.
        // Shared with the mini-assessment result screen's own
        // already-authenticated path (no AuthModal needed there at all) via
        // lib/known/miniAssessmentClaim.ts, so the two can't drift.
        const miniAssessmentId = localStorage.getItem(PENDING_MINI_ASSESSMENT_ID_KEY)
        if (miniAssessmentId) {
          localStorage.removeItem(PENDING_MINI_ASSESSMENT_ID_KEY)
          const result = await claimMiniAssessmentResult(supabase, user.id, miniAssessmentId)

          if (!result.ok) {
            if (result.reason === 'already-active') alreadyActiveNotice = true
            else if (result.reason === 'at-cap') atCapNotice = true
            else console.error('[claim] mini-assessment claim error:', result.message)
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
