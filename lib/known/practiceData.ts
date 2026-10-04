/**
 * lib/known/practiceData.ts
 *
 * Shared fetch + derivation logic for the practice screens (Practice home,
 * Manage). Kept in one place so "what counts as active" and "what counts as
 * a candidate" can't drift between the two pages that both need them.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { todayLocalDateString } from './checkInDate'

export interface ActivationRow {
  id: string
  facet_id: string
  source: 'base_assessment' | 'mini_assessment'
  directional: boolean
  created_at: string
  facet_activation_periods: { started_at: string; ended_at: string | null }[]
}

export interface PracticeData {
  activations: ActivationRow[]
  revealedFacetIds: Set<string>
}

export async function fetchPracticeData(supabase: SupabaseClient, userId: string): Promise<PracticeData> {
  const [activationsRes, revealsRes] = await Promise.all([
    supabase
      .from('facet_activations')
      .select('id, facet_id, source, directional, created_at, facet_activation_periods(started_at, ended_at)')
      .eq('user_id', userId),
    supabase.from('user_facet_reveals').select('facet_id').eq('user_id', userId),
  ])

  if (activationsRes.error) throw new Error(activationsRes.error.message)
  if (revealsRes.error) throw new Error(revealsRes.error.message)

  return {
    activations: (activationsRes.data ?? []) as ActivationRow[],
    revealedFacetIds: new Set((revealsRes.data ?? []).map((r: { facet_id: string }) => r.facet_id)),
  }
}

// Round 5 feedback: Practice home showed "Check in today" on every active
// card even after the user had already checked in — the button worked (the
// check-in itself saved fine), there was just no UI reflecting that it had
// happened. One query, by today's date, for every activation at once.
export async function fetchTodayCheckedInActivationIds(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('facet_activation_id')
    .eq('user_id', userId)
    .eq('check_in_date', todayLocalDateString())

  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((r: { facet_activation_id: string }) => r.facet_activation_id))
}

export function isActive(a: Pick<ActivationRow, 'facet_activation_periods'>): boolean {
  return a.facet_activation_periods.some((p) => p.ended_at === null)
}

export function activeActivations(data: PracticeData): ActivationRow[] {
  return data.activations.filter(isActive)
}

// Badge-flip rule (handover §5, refined in review): the directional badge
// clears once real Ring-1 data exists for this specific facet, regardless
// of the user's overall payment status. Never mutates the stored row itself
// (source/directional stay as historical fact of how the activation
// originated) — this is computed fresh on every read against
// user_facet_reveals, avoiding a second place that "directional" could
// drift out of sync with reality.
export function showsDirectionalBadge(a: Pick<ActivationRow, 'directional' | 'facet_id'>, revealedFacetIds: Set<string>): boolean {
  return a.directional && !revealedFacetIds.has(a.facet_id)
}

// "Also noticed — not yet active" on Practice home: facets with real
// (base-assessment) data the user isn't currently checking in on.
// Deliberately narrower than Manage's list — a facet activated via the
// mini-assessment and later deactivated never earns a user_facet_reveals
// row, so it won't resurface here; it's only reachable again via Manage,
// which lists every facet_activations row regardless of current state (see
// lib/known/facetActivationClient.ts). This keeps "candidate" meaning one
// specific thing: real data that exists but isn't being used yet.
export function candidateFacetIds(data: PracticeData): string[] {
  const activeIds = new Set(activeActivations(data).map((a) => a.facet_id))
  return Array.from(data.revealedFacetIds).filter((f) => !activeIds.has(f))
}
