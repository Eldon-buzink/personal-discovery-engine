// The report's next step, per state: one primary action and at most one
// secondary, used by both the sticky bar and the closing panel so the page
// never shows two labels for one action. Behind NEXT_PUBLIC_REPORT_CTA.
//
// Free users always have a way to the full report: as the secondary while
// they are still answering, as the primary once the free traits are in. The
// wording matches the paywall's own button. Practice is open to free users
// too (it only needs a signed-in account), so it is the secondary at 5.
//
// Paid users can have several branches open at once; the others come back
// as choices next to the suggested one.

import type { Branch } from './branchSuggestion'
import { REVEAL_CAP } from './paywall'

export type CtaState = 'not-started' | 'free-in-progress' | 'free-locked' | 'paid-in-progress' | 'paid-suggestion' | 'paid-done'

export type CtaAction =
  | { kind: 'start'; label: string }
  | { kind: 'continue'; label: string; branch: Branch | null }
  | { kind: 'unlock'; label: string }
  | { kind: 'practice'; label: string }
  | { kind: 'explore'; label: string; branch: Branch }

export interface CtaInput {
  /** The sample or example report (not the visitor's own). */
  isSample: boolean
  isPaid: boolean
  /** Ring 1 traits revealed. */
  revealed: number
  ring1Complete: boolean
  /** A started, unfinished branch, if any. */
  branchInProgress: Branch | null
  /** The suggested next branch, if any is left. */
  suggestion: Branch | null
  /** Other open branches the user could start instead, best first. */
  otherBranches?: Branch[]
  exploreLabel: (b: Branch) => string
}

export interface Cta {
  state: CtaState
  primary: CtaAction
  secondary: CtaAction | null
  /** Paid only: the other open branches to choose from, never the primary's own. */
  choices: CtaAction[]
}

export const PRACTICE: CtaAction = { kind: 'practice', label: 'Go to your practice' }

export const UNLOCK: CtaAction = { kind: 'unlock', label: 'Unlock the full picture' }

export function reportCta(i: CtaInput): Cta {
  if (i.isSample || i.revealed === 0) return { state: 'not-started', primary: { kind: 'start', label: 'Start free' }, secondary: null, choices: [] }
  if (!i.isPaid) {
    if (i.revealed >= REVEAL_CAP) return { state: 'free-locked', primary: UNLOCK, secondary: PRACTICE, choices: [] }
    return { state: 'free-in-progress', primary: { kind: 'continue', label: 'Continue', branch: null }, secondary: UNLOCK, choices: [] }
  }
  const choices = (skip: Branch | null): CtaAction[] =>
    [i.suggestion, ...(i.otherBranches ?? [])]
      .filter((b, n, all): b is Branch => !!b && b !== skip && all.indexOf(b) === n)
      .map((b) => ({ kind: 'explore', label: i.exploreLabel(b), branch: b }))
  if (i.branchInProgress) return { state: 'paid-in-progress', primary: { kind: 'continue', label: 'Continue', branch: i.branchInProgress }, secondary: PRACTICE, choices: choices(i.branchInProgress) }
  if (!i.ring1Complete) return { state: 'paid-in-progress', primary: { kind: 'continue', label: 'Continue', branch: null }, secondary: PRACTICE, choices: choices(null) }
  if (i.suggestion) return { state: 'paid-suggestion', primary: { kind: 'explore', label: i.exploreLabel(i.suggestion), branch: i.suggestion }, secondary: PRACTICE, choices: choices(i.suggestion) }
  return { state: 'paid-done', primary: PRACTICE, secondary: null, choices: [] }
}

/** A started, unfinished branch from known_session.branchResponses. */
export function branchInProgressFrom(branchResponses: Record<string, { answers?: unknown[]; completed?: boolean } | undefined> | undefined, branches: Branch[]): Branch | null {
  if (!branchResponses) return null
  return branches.find((b) => { const r = branchResponses[b]; return !!r && !r.completed && (r.answers?.length ?? 0) > 0 }) ?? null
}
