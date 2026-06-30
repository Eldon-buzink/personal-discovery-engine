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
      } = await supabase.auth.getUser()

      if (user) {
        const sessionId = localStorage.getItem('known_pending_session_id')
        if (sessionId) {
          await supabase
            .from('anonymous_sessions')
            .update({ claimed_by: user.id })
            .eq('id', sessionId)

          localStorage.removeItem('known_pending_session_id')
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
