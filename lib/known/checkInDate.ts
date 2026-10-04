/**
 * lib/known/checkInDate.ts
 *
 * Browser-local "today" as a 'YYYY-MM-DD' string, not server/UTC — this is a
 * personal daily-reflection app, and a user checking in late in their own
 * evening shouldn't have that land on "tomorrow" because a server elsewhere
 * has already rolled over. Shared by the check-in screen (writes
 * check_ins.check_in_date with this) and Practice home (reads it back to
 * tell "checked in today" from "not yet") so the two can't drift apart.
 */
export function todayLocalDateString(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
