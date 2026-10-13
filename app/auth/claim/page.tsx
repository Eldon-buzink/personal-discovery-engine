'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PENDING_MINI_ASSESSMENT_ID_KEY } from '@/components/known/AuthModal'
import { claimAnonymousSession } from '@/app/actions/anonymousSession'
import { claimMiniAssessmentResult } from '@/app/actions/miniAssessment'

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
        // The saved progress is identified by a signed cookie the server set
        // when it was saved, not by anything in localStorage. The server
        // also records the facets revealed while the session was anonymous.
        try {
          const { claimed } = await claimAnonymousSession()
          if (claimed) localStorage.removeItem('known_pending_session_id')
        } catch (err) {
          console.error('[claim] claim session error:', err instanceof Error ? err.message : 'unknown error')
        }

        // Mini-assessment signup gate (AuthModal's 'mini-assessment-signup'
        // context) — convert the claimed result into a facet_activation.
        // Same server action as the result screen's already-signed-in path,
        // so the two can't drift; it only succeeds from the browser that
        // submitted the result.
        const miniAssessmentId = localStorage.getItem(PENDING_MINI_ASSESSMENT_ID_KEY)
        if (miniAssessmentId) {
          localStorage.removeItem(PENDING_MINI_ASSESSMENT_ID_KEY)
          const result = await claimMiniAssessmentResult(miniAssessmentId)

          if (!result.ok) {
            if (result.reason === 'already-active') alreadyActiveNotice = true
            else if (result.reason === 'at-cap') atCapNotice = true
            else console.error('[claim] mini-assessment claim error:', result.reason === 'error' ? result.message : result.reason)
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
