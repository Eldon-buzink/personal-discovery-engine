'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

      if (user) {
        const sessionId = localStorage.getItem('known_pending_session_id')
        console.log('[claim] pending session id:', sessionId)

        if (sessionId) {
          const { error: updateError } = await supabase
            .from('anonymous_sessions')
            .update({ claimed_by: user.id })
            .eq('id', sessionId)

          if (updateError) {
            console.error('[claim] update error:', updateError.message)
          } else {
            console.log('[claim] claimed_by set to', user.id)
            localStorage.removeItem('known_pending_session_id')
          }
        } else {
          console.warn('[claim] no known_pending_session_id in localStorage')
        }
      }

      router.push('/assessment')
    }

    claim()
  }, [router])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <p className="font-sans text-sm text-muted">Saving your progress…</p>
    </div>
  )
}
