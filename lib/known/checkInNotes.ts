/**
 * lib/known/checkInNotes.ts
 *
 * Rework Part 3c — "What you wrote". check_ins.note has always been saved
 * (checkin/page.tsx's upsert) but nothing ever read it back; this is the
 * first surface that does. Notes are shown exactly as typed — no editing,
 * no summarizing — and React's default text rendering already escapes
 * them safely as plain text, so no HTML-handling is needed here.
 */

import { RECENT_NOTES_LIMIT } from './practiceConfig'

export interface CheckInNoteRow {
  check_in_date: string
  note: string | null
}

export interface CheckInNote {
  date: string
  note: string
}

export function selectRecentNotes(checkIns: CheckInNoteRow[], limit: number = RECENT_NOTES_LIMIT): CheckInNote[] {
  return checkIns
    .filter((c): c is { check_in_date: string; note: string } => !!c.note && c.note.trim().length > 0)
    .sort((a, b) => b.check_in_date.localeCompare(a.check_in_date))
    .slice(0, limit)
    .map((c) => ({ date: c.check_in_date, note: c.note }))
}
