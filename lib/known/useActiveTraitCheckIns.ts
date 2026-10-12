'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchActiveTraitCheckIns, type ActiveTraitCheckIns } from './practiceData'

// Shared loader for the review pages and the daily check-in: signed out goes home (same as
// every practice screen), otherwise every active trait with its check-ins.
// `extra` runs once per load with the same client and user, for page-specific
// lookups (the monthly page's starting bands).
export function useActiveTraitCheckIns<E = undefined>(
  extra?: (supabase: ReturnType<typeof createClient>, userId: string, traits: ActiveTraitCheckIns[]) => Promise<E>
): { traits: ActiveTraitCheckIns[] | null; userId: string | null; extraData: E | undefined; failed: boolean } {
  const router = useRouter()
  const [traits, setTraits] = useState<ActiveTraitCheckIns[] | null>(null)
  const [extraData, setExtraData] = useState<E | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUserId(user.id)
      try {
        const loaded = await fetchActiveTraitCheckIns(supabase, user.id)
        if (extra) setExtraData(await extra(supabase, user.id, loaded))
        setTraits(loaded)
      } catch (err) {
        console.error('[Reviews] load error:', err)
        setFailed(true)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  return { traits, userId, extraData, failed }
}
