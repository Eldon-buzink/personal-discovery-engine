// Saved progress for the full assessment: the rules shared by the browser
// (progress label, restoring a session after sign-in) and the server (the
// reminder email and the 30-day deletion in app/api/cron/saved-progress).
// Pure functions, no I/O, so they can be tested on their own.

import { FACET_QUESTIONS, RING1_QUESTIONS } from './ring1-questions'

export const TOTAL_QUESTIONS = RING1_QUESTIONS.length
export const REMINDER_AFTER_HOURS = 24
export const SAVED_PROGRESS_DAYS = 30

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

// The shape of 'known_session' (and of anonymous_sessions.responses).
export interface SessionLike {
  questionOrder?: unknown
  responses?: unknown
  revealedFacets?: unknown
}

function questionOrder(session: SessionLike | null | undefined): number[] {
  return Array.isArray(session?.questionOrder) ? session!.questionOrder.filter((n): n is number => typeof n === 'number') : []
}

export function answeredIds(session: SessionLike | null | undefined): Set<number> {
  const out = new Set<number>()
  if (!Array.isArray(session?.responses)) return out
  for (const r of session!.responses as Array<{ questionId?: unknown }>) {
    if (r && typeof r.questionId === 'number') out.add(r.questionId)
  }
  return out
}

export function answeredCount(session: SessionLike | null | undefined): number {
  return answeredIds(session).size
}

export function isFinished(session: SessionLike | null | undefined): boolean {
  return answeredCount(session) >= TOTAL_QUESTIONS
}

// How many more answers, taking the questions in the order they come, until
// the next trait is revealed. A trait is revealed when every question of its
// facet is answered (the rule in app/assessment/page.tsx handleNext), so for
// each facet that isn't complete yet this is the position of its last open
// question in the remaining order; the nearest facet wins. Null when nothing
// is left to reveal.
export function answersToNextTrait(
  order: readonly number[],
  answered: ReadonlySet<number>,
  facets: ReadonlyMap<string, ReadonlyArray<{ id: number }>> = FACET_QUESTIONS,
): number | null {
  const step = new Map<number, number>()
  let k = 0
  for (const id of order) if (!answered.has(id)) step.set(id, ++k)

  let best: number | null = null
  for (const items of Array.from(facets.values())) {
    const open = items.filter((q) => !answered.has(q.id))
    if (open.length === 0) continue
    let last = 0
    for (const q of open) {
      const s = step.get(q.id)
      if (s === undefined) { last = -1; break }
      last = Math.max(last, s)
    }
    if (last > 0 && (best === null || last < best)) best = last
  }
  return best
}

export function answersToNextTraitFor(session: SessionLike | null | undefined): number | null {
  return answersToNextTrait(questionOrder(session), answeredIds(session))
}

// After sign-in on another device: use the saved session only when this
// browser has nothing, or fewer answers. A longer local session is never
// overwritten (equal counts keep the local one too).
export function shouldRestoreSaved(local: SessionLike | null | undefined, saved: SessionLike | null | undefined): boolean {
  const savedCount = answeredCount(saved)
  if (savedCount === 0) return false
  return answeredCount(local) < savedCount
}

// ── Reminder and deletion (server) ───────────────────────────────────────────

export interface SavedProgressRow {
  email: string | null
  claimed_by: string | null
  updated_at: string
  reminder_sent_at: string | null
  responses: SessionLike | null
}

export function reminderCutoff(now: Date): string {
  return new Date(now.getTime() - REMINDER_AFTER_HOURS * HOUR).toISOString()
}

export function retentionCutoff(now: Date): string {
  return new Date(now.getTime() - SAVED_PROGRESS_DAYS * DAY).toISOString()
}

export function keptUntil(updatedAt: string): Date {
  return new Date(new Date(updatedAt).getTime() + SAVED_PROGRESS_DAYS * DAY)
}

// One reminder, only for progress saved with an email and then left alone:
//   - an email is attached and no reminder has gone out yet;
//   - nobody came back through the link (claimed_by is still empty: the
//     link claims the row, so a claimed row means they resumed);
//   - no activity for 24 hours (updated_at moves on every autosave);
//   - not finished, not past the 30-day deletion, the person hasn't paid and
//     hasn't finished the assessment in another session.
// The cron route's database query applies the same column filters first;
// this is the full rule, checked again per row.
export function isReminderEligible(
  row: SavedProgressRow,
  now: Date,
  ctx: { isPaid: boolean; resumedElsewhere: boolean },
): boolean {
  if (!row.email) return false
  if (row.reminder_sent_at) return false
  if (row.claimed_by) return false
  if (row.updated_at >= reminderCutoff(now)) return false
  if (row.updated_at < retentionCutoff(now)) return false
  if (isFinished(row.responses)) return false
  if (ctx.isPaid || ctx.resumedElsewhere) return false
  return true
}

// Deleted after 30 days without activity: saved progress that was never
// picked up again through the link (claimed rows belong to an account and
// go with the account) and isn't finished.
export function isRetentionDue(row: Pick<SavedProgressRow, 'claimed_by' | 'updated_at' | 'responses'>, now: Date): boolean {
  if (row.claimed_by) return false
  if (isFinished(row.responses)) return false
  return row.updated_at < retentionCutoff(now)
}
