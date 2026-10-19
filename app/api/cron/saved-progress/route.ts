import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/server/email'
import { PRODUCTION_ORIGINS } from '@/lib/server/siteOrigin'
import { reminderEmail } from '@/lib/email/reminder'
import {
  answeredCount,
  answersToNextTraitFor,
  isFinished,
  isReminderEligible,
  isRetentionDue,
  keptUntil,
  reminderCutoff,
  retentionCutoff,
  type SavedProgressRow,
} from '@/lib/known/savedProgress'

// Scheduled (vercel.json crons) once a day. Two jobs on saved progress
// (anonymous_sessions rows saved with an email through "Finish later"):
//   1. The one reminder: 24 hours after the last activity, if the person
//      hasn't come back, finished or paid. A fresh sign-in link is made on
//      the server (service role) and the email goes through Resend.
//   2. Deletion: unclaimed, unfinished progress with no activity for 30
//      days.
// Vercel sends "Authorization: Bearer <CRON_SECRET>"; anything else is
// refused. Running it twice in a row sends nothing twice: a row is marked
// before its email goes out, only if nobody touched it since it was read,
// and the Resend idempotency key catches a retry of the same send.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BATCH = 200

type Row = SavedProgressRow & { id: string }

function revealedCount(responses: unknown): number {
  const r = (responses as { revealedFacets?: unknown } | null)?.revealedFacets
  return Array.isArray(r) ? r.length : 0
}

async function sendReminders(admin: SupabaseClient, now: Date) {
  const counts = { candidates: 0, sent: 0, neverRemind: 0, skipped: 0, failed: 0 }
  const { data: rows, error } = await admin
    .from('anonymous_sessions')
    .select('id, email, claimed_by, updated_at, reminder_sent_at, responses')
    .not('email', 'is', null)
    .is('claimed_by', null)
    .is('reminder_sent_at', null)
    .lt('updated_at', reminderCutoff(now))
    .gte('updated_at', retentionCutoff(now))
    .order('updated_at', { ascending: true })
    .limit(BATCH)
  if (error) {
    console.error('[cron/saved-progress] reminder query failed:', error.message)
    return counts
  }

  for (const row of (rows ?? []) as Row[]) {
    counts.candidates++
    if (!isReminderEligible(row, now, { isPaid: false, resumedElsewhere: false })) { counts.skipped++; continue }

    // The account behind the email (created when the link was first sent)
    // and a fresh sign-in link for it; nothing is emailed by this call.
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: row.email! })
    const tokenHash = link?.properties?.hashed_token
    if (linkError || !tokenHash || !link?.user) {
      console.error('[cron/saved-progress] link failed:', linkError?.message ?? 'no link returned')
      counts.failed++
      continue
    }
    const userId = link.user.id
    const [{ data: paid }, { data: others }] = await Promise.all([
      admin.from('users').select('is_paid').eq('id', userId).maybeSingle(),
      admin.from('anonymous_sessions').select('updated_at, responses').eq('claimed_by', userId),
    ])
    const resumedElsewhere = (others ?? []).some((o) => o.updated_at > row.updated_at || isFinished(o.responses))

    // Mark first, and only if the row is exactly as read (no answers saved,
    // nobody claimed it, no reminder) — so a parallel run or a person who
    // just came back can't get an email.
    const { data: reserved } = await admin
      .from('anonymous_sessions')
      .update({ reminder_sent_at: now.toISOString() })
      .eq('id', row.id)
      .eq('updated_at', row.updated_at)
      .is('claimed_by', null)
      .is('reminder_sent_at', null)
      .select('id')
      .maybeSingle()
    if (!reserved) { counts.skipped++; continue }

    // Paid, or picked up in another session: this row never gets a
    // reminder, and the mark stays so it isn't looked at again.
    if (!isReminderEligible(row, now, { isPaid: !!paid?.is_paid, resumedElsewhere })) { counts.neverRemind++; continue }

    const email = reminderEmail({
      answered: answeredCount(row.responses),
      toNextTrait: answersToNextTraitFor(row.responses),
      hasTrait: revealedCount(row.responses) > 0,
      keptUntil: keptUntil(row.updated_at),
      link: `${PRODUCTION_ORIGINS[0]}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`,
    })
    try {
      await sendEmail({ to: row.email!, ...email, idempotencyKey: `saved-progress-reminder-${row.id}` })
      counts.sent++
    } catch (err) {
      console.error('[cron/saved-progress] send failed:', err instanceof Error ? err.message : 'unknown error')
      // Not sent: clear the mark so tomorrow's run tries again.
      await admin.from('anonymous_sessions').update({ reminder_sent_at: null }).eq('id', row.id).eq('reminder_sent_at', now.toISOString())
      counts.failed++
    }
  }
  return counts
}

async function deleteExpired(admin: SupabaseClient, now: Date): Promise<number> {
  const cutoff = retentionCutoff(now)
  const { data: rows, error } = await admin
    .from('anonymous_sessions')
    .select('id, claimed_by, updated_at, responses')
    .is('claimed_by', null)
    .lt('updated_at', cutoff)
    .limit(500)
  if (error) {
    console.error('[cron/saved-progress] deletion query failed:', error.message)
    return 0
  }
  const ids = ((rows ?? []) as Array<Pick<Row, 'id' | 'claimed_by' | 'updated_at' | 'responses'>>)
    .filter((r) => isRetentionDue(r, now))
    .map((r) => r.id)
  if (ids.length === 0) return 0
  // Same conditions again in the delete itself, in case a row was claimed
  // or saved to in between. report_content rows go with it (cascade).
  const { data: deleted, error: deleteError } = await admin
    .from('anonymous_sessions')
    .delete()
    .in('id', ids)
    .is('claimed_by', null)
    .lt('updated_at', cutoff)
    .select('id')
  if (deleteError) {
    console.error('[cron/saved-progress] delete failed:', deleteError.message)
    return 0
  }
  return deleted?.length ?? 0
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const now = new Date()
  const admin = createAdminClient()
  const reminders = await sendReminders(admin, now)
  const deleted = await deleteExpired(admin, now)
  console.log('[cron/saved-progress]', JSON.stringify({ ...reminders, deleted }))
  return NextResponse.json({ ...reminders, deleted })
}
