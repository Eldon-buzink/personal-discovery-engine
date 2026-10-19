'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PENDING_MINI_ASSESSMENT_ID_KEY } from '@/components/known/AuthModal'
import { claimAnonymousSession } from '@/app/actions/anonymousSession'
import { claimMiniAssessmentResult } from '@/app/actions/miniAssessment'
import { shouldRestoreSaved, type SessionLike } from '@/lib/known/savedProgress'
import { SAVED_PROGRESS_KEY } from '@/lib/known/progressAutosave'

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
        // Links the saved progress to the account (by this browser's signed
        // cookie, or by the verified email when the link opened in another
        // browser) and gets the account's newest saved session back. That
        // session replaces this browser's only when this browser has none,
        // or fewer answers: a longer local session is never overwritten.
        // /assessment then opens at the first unanswered question.
        try {
          const { saved } = await claimAnonymousSession()
          if (saved) {
            let local: SessionLike | null = null
            try { local = JSON.parse(localStorage.getItem('known_session') ?? 'null') } catch {}
            if (shouldRestoreSaved(local, saved.session as SessionLike | null)) {
              localStorage.setItem('known_session', JSON.stringify(saved.session))
            }
            localStorage.setItem('known_pending_session_id', saved.id)
            localStorage.setItem(SAVED_PROGRESS_KEY, saved.id)
          }
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
      <p className="font-sans text-meta text-muted">Bringing back your answers…</p>
    </div>
  )
}
