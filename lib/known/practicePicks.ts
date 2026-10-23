// "Track this" on the report (NEXT_PUBLIC_REPORT_PAID_V2): the traits a user
// has marked for their practice, kept in this browser until they confirm
// them on "Manage your practice". Nothing is activated here; activation and
// the cap check stay in facetActivationClient.ts.

import { ACTIVE_FACET_CAP } from './practiceConfig'

const KEY = 'bearing_practice_picks'

export function readPicks(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, ACTIVE_FACET_CAP) : []
  } catch {
    return []
  }
}

export function writePicks(picks: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(picks.slice(0, ACTIVE_FACET_CAP))) } catch {}
}

export type ToggleResult = { picks: string[]; atCap: boolean }

/** Add or remove a trait; adding a fifth is refused (atCap). */
export function togglePick(picks: string[], facet: string): ToggleResult {
  if (picks.includes(facet)) return { picks: picks.filter((f) => f !== facet), atCap: false }
  if (picks.length >= ACTIVE_FACET_CAP) return { picks, atCap: true }
  return { picks: [...picks, facet], atCap: false }
}

/** The Manage link: the picks, or the strongest traits when none are picked. */
export function manageHref(picks: string[], strongest: string[]): string {
  const list = (picks.length ? picks : strongest).slice(0, ACTIVE_FACET_CAP)
  return `/practice/manage?pick=${encodeURIComponent(list.join(','))}`
}
