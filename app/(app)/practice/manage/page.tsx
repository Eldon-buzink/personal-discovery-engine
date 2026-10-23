'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import ManageRow from '@/components/known/practice/ManageRow'
import { activateFacet, deactivateFacet } from '@/lib/known/facetActivationClient'
import { fetchPracticeData, isActive, type PracticeData } from '@/lib/known/practiceData'
import { type } from '@/lib/design/type'
import { REPORT_PAID_V2 } from '@/lib/known/reportFlags'
import { ACTIVE_FACET_CAP } from '@/lib/known/practiceConfig'
import { writePicks } from '@/lib/known/practicePicks'

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
  // From the report (NEXT_PUBLIC_REPORT_PAID_V2): ?pick=a,b,c shows those
  // traits as suggestions. Nothing is switched on until "Start these".
  const [pending, setPending] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (!REPORT_PAID_V2) return
    const raw = new URLSearchParams(window.location.search).get('pick')
    if (raw) setPending(raw.split(',').map((x) => x.trim()).filter(Boolean).slice(0, ACTIVE_FACET_CAP))
  }, [])

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
        setMessage('Something went wrong. Try again in a moment.')
      } else {
        const refreshed = await load(supabase, userId)
        if (!refreshed) setMessage('Turned off, but the page could not refresh. Reload to see it.')
      }
    } else {
      const result = await activateFacet(supabase, userId, row.facetId, 'base_assessment')
      if (result.ok) {
        const refreshed = await load(supabase, userId)
        if (!refreshed) setMessage('Turned on, but the page could not refresh. Reload to see it.')
      } else if (result.reason === 'cap') {
        setMessage("You're at your check-in limit. Turn one off first to make room for this one.")
      } else {
        console.error('[Manage] activate error:', result.message)
        setMessage('Something went wrong. Try again in a moment.')
      }
    }

    setTogglingFacet(null)
  }

  async function confirmPending(rows: ManageRow[]) {
    if (!userId) return
    setConfirming(true); setMessage(null)
    const supabase = createClient()
    const toStart = pending.filter((f) => rows.some((r) => r.facetId === f && !r.active))
    let started = 0
    for (const f of toStart) {
      const result = await activateFacet(supabase, userId, f, 'base_assessment')
      if (result.ok) { started++; continue }
      setMessage(result.reason === 'cap'
        ? `You can follow ${ACTIVE_FACET_CAP} traits at a time. ${started > 0 ? `${started} started. ` : ''}Turn one off to make room for the rest.`
        : 'Something went wrong. Try again in a moment.')
      break
    }
    await load(supabase, userId)
    setPending([]); writePicks([])
    setConfirming(false)
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-sans text-meta text-muted">Loading…</p>
      </div>
    )
  }

  const rows = buildManageRows(data)
  const pendingRows = pending.filter((f) => rows.some((r) => r.facetId === f && !r.active))

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center" style={{ position: 'relative' }}>
      {/* Centers the whole screen in the same max-w-md column every other
          practice screen uses — see the check-in page's identical comment
          for why. No-op below 448px. */}
      <div className="w-full max-w-md flex flex-col" style={{ minHeight: '100vh' }}>
      <div style={{ padding: '48px 28px 0 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p className="font-sans text-meta text-muted">
          Manage your practice
        </p>
        <h1 className="font-display font-normal text-display-2 text-charcoal">
          What&apos;s part of your check-ins?
        </h1>
        <p className="font-sans text-body text-charcoal-soft" style={{ paddingTop: 2 }}>
          We suggest a few, for focus. You decide what stays.
        </p>
      </div>

      {message && (
        <p
          className="font-sans"
          style={{ ...type.meta, margin: '16px 28px 0 28px', color: '#8a5a3d', padding: '10px 14px', borderRadius: 10, background: '#FBEEE8' }}
        >
          {message}
        </p>
      )}

      {pendingRows.length > 0 && (
        <div style={{ margin: '16px 28px 0 28px', padding: '14px 16px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #E5E1D5' }}>
          <p style={{ ...type.ui, margin: '0 0 4px' }}>Suggested from your report</p>
          <p className="font-sans text-charcoal-soft" style={{ ...type.meta, margin: '0 0 10px' }}>
            {pendingRows.map((f) => facetDisplayLabel(f)).join(', ')}. Nothing is switched on until you start them.
          </p>
          <button type="button" disabled={confirming} onClick={() => confirmPending(rows)} className="font-sans font-medium"
            style={{ ...type.ui, minHeight: 44, padding: '0 16px', borderRadius: 10, border: 0, background: '#262420', color: '#F7F4ED', cursor: 'pointer' }}>
            {confirming ? 'Starting…' : 'Start these'}
          </button>
        </div>
      )}

      <div style={{ padding: '22px 28px 0 28px', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.length === 0 ? (
          <p className="font-sans text-body text-muted">
            Nothing to manage yet. Patterns will show up here once your report reveals them.
          </p>
        ) : (
          rows.map((row) => {
            const isToggling = togglingFacet === row.facetId
            return (
              <ManageRow
                key={row.facetId}
                label={facetDisplayLabel(row.facetId)}
                sourceLabel={row.sourceLabel}
                directional={row.directional}
                active={row.active}
                busy={isToggling}
                onToggle={() => handleToggle(row)}
              />
            )
          })
        )}
      </div>

      <div style={{ padding: '16px 28px 32px 28px' }}>
        <Link
          href="/practice"
          className="font-sans font-medium"
          style={{ ...type.ui, display: 'block', textAlign: 'center', padding: 15, borderRadius: 10, background: '#262420', color: '#F7F4ED' }}
        >
          Done
        </Link>
      </div>
      </div>
    </div>
  )
}
