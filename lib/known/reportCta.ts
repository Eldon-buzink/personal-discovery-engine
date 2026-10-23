// The report's next step, per state: one primary action and at most one
// secondary, used by both the sticky bar and the closing panel so the page
// never shows two labels for one action. Behind NEXT_PUBLIC_REPORT_CTA.
//
// Practice is open to free users too (the practice pages only need a
// signed-in account, not a payment), so free states offer it as secondary.

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
  exploreLabel: (b: Branch) => string
}

export interface Cta { state: CtaState; primary: CtaAction; secondary: CtaAction | null }

export const PRACTICE: CtaAction = { kind: 'practice', label: 'Go to your practice' }

export function reportCta(i: CtaInput): Cta {
  if (i.isSample || i.revealed === 0) return { state: 'not-started', primary: { kind: 'start', label: 'Start free' }, secondary: null }
  if (!i.isPaid) {
    if (i.revealed >= REVEAL_CAP) return { state: 'free-locked', primary: { kind: 'unlock', label: 'Unlock all 30 traits' }, secondary: PRACTICE }
    return { state: 'free-in-progress', primary: { kind: 'continue', label: 'Continue', branch: null }, secondary: PRACTICE }
  }
  if (i.branchInProgress) return { state: 'paid-in-progress', primary: { kind: 'continue', label: 'Continue', branch: i.branchInProgress }, secondary: PRACTICE }
  if (!i.ring1Complete) return { state: 'paid-in-progress', primary: { kind: 'continue', label: 'Continue', branch: null }, secondary: PRACTICE }
  if (i.suggestion) return { state: 'paid-suggestion', primary: { kind: 'explore', label: i.exploreLabel(i.suggestion), branch: i.suggestion }, secondary: PRACTICE }
  return { state: 'paid-done', primary: PRACTICE, secondary: null }
}

/** A started, unfinished branch from known_session.branchResponses. */
export function branchInProgressFrom(branchResponses: Record<string, { answers?: unknown[]; completed?: boolean } | undefined> | undefined, branches: Branch[]): Branch | null {
  if (!branchResponses) return null
  return branches.find((b) => { const r = branchResponses[b]; return !!r && !r.completed && (r.answers?.length ?? 0) > 0 }) ?? null
}
