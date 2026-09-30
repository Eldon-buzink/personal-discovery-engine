/**
 * lib/known/facetActivationClient.ts
 *
 * Activate/deactivate a facet for a user — shared by the Practice home
 * candidate "+" and the Manage screen's toggle, so ACTIVE_FACET_CAP
 * enforcement can't diverge between the two entry points.
 *
 * Deliberately NOT used by app/auth/claim/page.tsx's mini-assessment
 * activation — that path has its own "already active → no changes made"
 * conflict rule (a facet_activations row existing at all is a hard stop,
 * not something to reuse-and-reopen), which is a different semantic from
 * activateFacet's "reuse the existing row and reopen a period" behavior
 * here. The two are similar but not the same operation: this one is an
 * explicit user request to (re)activate; the claim page's is an implicit
 * side effect of signup where changing an existing activation would be
 * surprising. The claim page does apply the same ACTIVE_FACET_CAP, just
 * with its own check, for the same "shared across all sources" reason.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ACTIVE_FACET_CAP } from './practiceConfig'
import { isActive, type ActivationRow } from './practiceData'

export type ActivateResult =
  | { ok: true }
  | { ok: false; reason: 'cap' }
  | { ok: false; reason: 'error'; message: string }

export interface DeactivateResult {
  ok: boolean
  message?: string
}

export async function activateFacet(
  supabase: SupabaseClient,
  userId: string,
  facetId: string,
  source: 'base_assessment' | 'mini_assessment' = 'base_assessment'
): Promise<ActivateResult> {
  const { data: existingRows, error: fetchErr } = await supabase
    .from('facet_activations')
    .select('id, facet_id, facet_activation_periods(started_at, ended_at)')
    .eq('user_id', userId)

  if (fetchErr) return { ok: false, reason: 'error', message: fetchErr.message }

  const rows = (existingRows ?? []) as Pick<ActivationRow, 'id' | 'facet_id' | 'facet_activation_periods'>[]
  const activeCount = rows.filter(isActive).length
  if (activeCount >= ACTIVE_FACET_CAP) return { ok: false, reason: 'cap' }

  const existing = rows.find((r) => r.facet_id === facetId)
  let activationId: string

  if (existing) {
    // Reactivating a facet that already has a row (most commonly: was
    // active once, got deactivated) — source/directional stay as
    // originally set, never overwritten by a reactivation.
    activationId = existing.id
  } else {
    const { data: created, error: createErr } = await supabase
      .from('facet_activations')
      .insert({ user_id: userId, facet_id: facetId, source, directional: source === 'mini_assessment' })
      .select('id')
      .single()
    if (createErr) return { ok: false, reason: 'error', message: createErr.message }
    activationId = created.id
  }

  const { error: periodErr } = await supabase
    .from('facet_activation_periods')
    .insert({ facet_activation_id: activationId, user_id: userId })
  if (periodErr) return { ok: false, reason: 'error', message: periodErr.message }

  return { ok: true }
}

export async function deactivateFacet(
  supabase: SupabaseClient,
  activationId: string,
  userId: string
): Promise<DeactivateResult> {
  const { error } = await supabase
    .from('facet_activation_periods')
    .update({ ended_at: new Date().toISOString() })
    .eq('facet_activation_id', activationId)
    .eq('user_id', userId)
    .is('ended_at', null)

  return { ok: !error, message: error?.message }
}
