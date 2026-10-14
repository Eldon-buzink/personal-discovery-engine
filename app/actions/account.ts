'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabase, getSessionUser } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitKey } from '@/lib/server/rateLimit'
import { readAnonId } from '@/lib/server/anonymousVisitor'
import { buildDataExport, type ExportInput } from '@/lib/account/dataExport'
import { runAccountDeletion, type DeletionResult } from '@/lib/account/deleteAccount'

// /account: "Download my data" and "Delete my account". Every action takes
// the user from the session cookie, never from an argument, and reads or
// deletes with the service role.

type Failure<R extends string> = { ok: false; reason: R }

// ── Export ────────────────────────────────────────────────────────────

export async function exportMyData(): Promise<
  { ok: true; data: ReturnType<typeof buildDataExport> } | Failure<'signed-out' | 'rate' | 'error'>
> {
  const user = await getSessionUser()
  if (!user) return { ok: false, reason: 'signed-out' }
  if (!(await checkRateLimit(rateLimitKey('export', user.id, null), 3600, 5))) return { ok: false, reason: 'rate' }

  const admin = createAdminClient()
  const anonId = readAnonId()

  const [payment, sessions, miniClaimed, miniHere, activations, periods, checkIns, reveals] = await Promise.all([
    admin.from('users').select('is_paid, paid_at').eq('id', user.id).maybeSingle(),
    admin.from('anonymous_sessions').select('id, created_at, responses').eq('claimed_by', user.id),
    admin.from('mini_assessment_results').select('id, facet_id, band, responses, created_at, claimed_by').eq('claimed_by', user.id),
    anonId
      ? admin.from('mini_assessment_results').select('id, facet_id, band, responses, created_at, claimed_by').is('claimed_by', null).eq('session_id', anonId)
      : Promise.resolve({ data: [], error: null }),
    admin.from('facet_activations').select('id, facet_id, source, directional, created_at').eq('user_id', user.id),
    admin.from('facet_activation_periods').select('facet_activation_id, started_at, ended_at').eq('user_id', user.id),
    admin.from('check_ins').select('facet_activation_id, check_in_date, response_option, note, created_at').eq('user_id', user.id),
    admin.from('user_facet_reveals').select('facet_id, revealed_at').eq('user_id', user.id),
  ])
  const failed = [payment, sessions, miniClaimed, miniHere, activations, periods, checkIns, reveals].find((r) => r.error)
  if (failed) {
    console.error('[exportMyData] query failed:', failed.error?.message)
    return { ok: false, reason: 'error' }
  }

  const sessionIds = (sessions.data ?? []).map((s) => s.id as string)
  const reportContent = sessionIds.length
    ? await admin.from('report_content').select('facet, trait_word, score_direction, trait_quote, where_it_shows_up, tags, go_deeper, worth_trying, generated_at').in('assessment_id', sessionIds)
    : { data: [], error: null }
  if (reportContent.error) {
    console.error('[exportMyData] query failed:', reportContent.error.message)
    return { ok: false, reason: 'error' }
  }

  const input: ExportInput = {
    exportedAt: new Date().toISOString(),
    account: { email: user.email ?? null, created_at: user.created_at ?? null, last_sign_in_at: user.last_sign_in_at ?? null },
    payment: payment.data ? { is_paid: !!payment.data.is_paid, paid_at: payment.data.paid_at ?? null } : null,
    sessions: (sessions.data ?? []) as ExportInput['sessions'],
    reportContent: (reportContent.data ?? []) as ExportInput['reportContent'],
    miniResults: [...(miniClaimed.data ?? []), ...(miniHere.data ?? [])] as ExportInput['miniResults'],
    activations: (activations.data ?? []) as ExportInput['activations'],
    periods: (periods.data ?? []) as ExportInput['periods'],
    checkIns: (checkIns.data ?? []) as ExportInput['checkIns'],
    reveals: (reveals.data ?? []) as ExportInput['reveals'],
  }
  return { ok: true, data: buildDataExport(input) }
}

// ── Deletion ──────────────────────────────────────────────────────────

// Sends a fresh 6-digit code to the account's own email (never an address
// from the browser) to confirm the deletion.
export async function sendAccountDeletionCode(): Promise<{ ok: true } | Failure<'signed-out' | 'rate' | 'error'>> {
  const user = await getSessionUser()
  if (!user?.email) return { ok: false, reason: 'signed-out' }
  if (!(await checkRateLimit(rateLimitKey('delete-code', user.id, null), 600, 3))) return { ok: false, reason: 'rate' }
  const { error } = await createServerSupabase().auth.signInWithOtp({ email: user.email, options: { shouldCreateUser: false } })
  if (error) {
    console.error('[sendAccountDeletionCode] send failed:', error.message)
    return { ok: false, reason: 'error' }
  }
  return { ok: true }
}

const COOKIES_TO_CLEAR = ['bearing_anon', 'bearing_pending_session', 'bearing_free_reveals']

// Deletes the signed-in account: typed "delete" + a fresh code, then every
// data row in one transaction (public.delete_user_data), then the auth
// user. See lib/account/deleteAccount.ts for the order and the re-run
// behaviour. bearing_consent is kept: it's the visitor's privacy choice.
export async function deleteMyAccount(code: string, confirmation: string): Promise<DeletionResult | Failure<'signed-out' | 'rate'>> {
  const user = await getSessionUser()
  if (!user?.email) return { ok: false, reason: 'signed-out' }
  if (!(await checkRateLimit(rateLimitKey('delete-account', user.id, null), 600, 5))) return { ok: false, reason: 'rate' }

  const admin = createAdminClient()
  const anonId = readAnonId()
  const email = user.email
  const userId = user.id

  const result = await runAccountDeletion({ code, confirmation }, {
    verifyCode: async (token) => {
      const { data, error } = await createServerSupabase().auth.verifyOtp({ email, token, type: 'email' })
      return !error && data.user?.id === userId
    },
    deleteData: async () => {
      const { error } = await admin.rpc('delete_user_data', { p_user_id: userId, p_anon_session_id: anonId })
      if (error) console.error('[deleteMyAccount] delete_user_data failed:', error.message)
      return !error
    },
    deleteAuthUser: async () => {
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) console.error('[deleteMyAccount] auth user deletion failed:', error.message)
      return !error
    },
  })

  if (result.ok) {
    const jar = cookies()
    for (const c of jar.getAll()) {
      if (c.name.startsWith('sb-') || COOKIES_TO_CLEAR.includes(c.name)) jar.delete(c.name)
    }
    console.log('[deleteMyAccount] account deleted')
  }
  return result
}
