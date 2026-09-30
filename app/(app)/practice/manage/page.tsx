'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { directionalAccent } from '@/lib/known/practiceTokens'
import { activateFacet, deactivateFacet } from '@/lib/known/facetActivationClient'
import { fetchPracticeData, isActive, type PracticeData } from '@/lib/known/practiceData'

interface ManageRow {
  facetId: string
  activationId: string | null
  active: boolean
  directional: boolean
  sourceLabel: string
}

// Deliberately the FULL set of facets the user has ever activated (active or
// not) union everything they've revealed — wider than Practice home's
// "Also noticed" list (see lib/known/practiceData.ts's candidateFacetIds
// header). A facet activated via the mini-assessment and later deactivated
// never earns a user_facet_reveals row, so it would otherwise vanish
// entirely — Manage is where it stays reachable.
function buildManageRows(data: PracticeData): ManageRow[] {
  const byFacetId = new Map(data.activations.map((a) => [a.facet_id, a]))
  const facetIds = new Set<string>([...Array.from(byFacetId.keys()), ...Array.from(data.revealedFacetIds)])

  const rows: ManageRow[] = Array.from(facetIds).map((facetId) => {
    const activation = byFacetId.get(facetId)
    if (!activation) {
      return { facetId, activationId: null, active: false, directional: false, sourceLabel: 'Base assessment' }
    }
    return {
      facetId,
      activationId: activation.id,
      active: isActive(activation),
      directional: activation.directional,
      sourceLabel: activation.source === 'mini_assessment' ? 'Mini-assessment · directional' : 'Base assessment',
    }
  })

  return rows.sort((a, b) => facetDisplayLabel(a.facetId).localeCompare(facetDisplayLabel(b.facetId)))
}

export default function ManagePracticePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [data, setData] = useState<PracticeData | null>(null)
  const [togglingFacet, setTogglingFacet] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Returns whether the refresh succeeded — a toggle can succeed in the
  // database while this refetch fails on a transient network error; without
  // checking this, the switch would silently stay showing its pre-toggle
  // position with no indication the click actually worked. See Practice
  // home's identical comment for the same reasoning.
  async function load(supabase: ReturnType<typeof createClient>, uid: string): Promise<boolean> {
    try {
      setData(await fetchPracticeData(supabase, uid))
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('[Manage] load error:', err)
      setIsLoading(false)
      return false
    }
  }

  useEffect(() => {
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

  async function handleToggle(row: ManageRow) {
    if (!userId) return
    setTogglingFacet(row.facetId)
    setMessage(null)

    const supabase = createClient()

    if (row.active && row.activationId) {
      const result = await deactivateFacet(supabase, row.activationId, userId)
      if (!result.ok) {
        console.error('[Manage] deactivate error:', result.message)
        setMessage('Something went wrong — try again in a moment.')
      } else {
        const refreshed = await load(supabase, userId)
        if (!refreshed) setMessage('Turned off — but the page could not refresh. Reload to see it.')
      }
    } else {
      const result = await activateFacet(supabase, userId, row.facetId, 'base_assessment')
      if (result.ok) {
        const refreshed = await load(supabase, userId)
        if (!refreshed) setMessage('Turned on — but the page could not refresh. Reload to see it.')
      } else if (result.reason === 'cap') {
        setMessage("You're at your check-in limit — turn one off first to make room for this one.")
      } else {
        console.error('[Manage] activate error:', result.message)
        setMessage('Something went wrong — try again in a moment.')
      }
    }

    setTogglingFacet(null)
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-sans text-sm text-muted">Loading…</p>
      </div>
    )
  }

  const rows = buildManageRows(data)

  return (
    <div className="min-h-screen bg-cream flex flex-col" style={{ position: 'relative' }}>
      <div style={{ padding: '48px 28px 0 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
          Manage your practice
        </p>
        <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 23, lineHeight: 1.3 }}>
          What's part of your check-ins?
        </h1>
        <p className="font-sans text-charcoal-soft" style={{ fontSize: 13, lineHeight: 1.5, paddingTop: 2 }}>
          We suggest a few, for focus. You decide what stays.
        </p>
      </div>

      {message && (
        <p
          className="font-sans"
          style={{ margin: '16px 28px 0 28px', fontSize: 13, color: '#8a5a3d', padding: '10px 14px', borderRadius: 10, background: '#FBEEE8' }}
        >
          {message}
        </p>
      )}

      <div style={{ padding: '22px 28px 0 28px', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.length === 0 ? (
          <p className="font-sans text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Nothing to manage yet — patterns will show up here once your report reveals them.
          </p>
        ) : (
          rows.map((row) => {
            const isToggling = togglingFacet === row.facetId
            return (
              <div
                key={row.facetId}
                style={{
                  padding: '14px 16px', borderRadius: 12, border: '1px solid #DAD3C3', background: '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}
              >
                <div>
                  <div className="font-sans font-medium text-charcoal" style={{ fontSize: 14, marginBottom: 2, lineHeight: 1.3 }}>
                    {facetDisplayLabel(row.facetId)}
                  </div>
                  <div
                    className="font-sans"
                    style={{ fontSize: 12, color: row.directional ? directionalAccent : '#8a8375', fontWeight: row.directional ? 500 : 400 }}
                  >
                    {row.sourceLabel}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(row)}
                  disabled={isToggling}
                  aria-label={`Toggle ${facetDisplayLabel(row.facetId)}`}
                  style={{
                    position: 'relative', width: 40, height: 24, borderRadius: 12, border: 'none', flexShrink: 0,
                    cursor: 'pointer', padding: 0, opacity: isToggling ? 0.6 : 1,
                    background: row.active ? directionalAccent : '#DAD3C3',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute', top: 3, left: row.active ? 19 : 3, width: 18, height: 18,
                      borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.15s',
                    }}
                  />
                </button>
              </div>
            )
          })
        )}
      </div>

      <div style={{ padding: '16px 28px 32px 28px' }}>
        <Link
          href="/practice"
          className="font-sans font-medium"
          style={{ display: 'block', textAlign: 'center', padding: 15, borderRadius: 10, background: '#262420', color: '#F7F4ED', fontSize: 15 }}
        >
          Done
        </Link>
      </div>
    </div>
  )
}
