/**
 * lib/known/paywall.ts
 *
 * ── WHAT THIS DOES ──────────────────────────────────────────────────────
 * Shared constants + helpers for the free/paid gate: cap at 5 revealed Ring 1
 * traits, then require payment to continue Ring 1 or start any branch. Used
 * by both app/assessment/page.tsx (where the reveal cap is enforced and the
 * lock screen lives) and app/report/page.tsx (where branch-start CTAs and
 * the qualifying-branches list need to know lock state).
 *
 * ── "isPaid" IS A PLACEHOLDER ─────────────────────────────────────────────
 * There is no real payment integration anywhere in this codebase (no
 * Stripe, no `paid` column, nothing) — /pricing is a static marketing page.
 * getIsPaid()/setIsPaid() read/write a plain localStorage flag so the full
 * gating UX (lock screen, payment prompt, teased branch list) can be built
 * and tested end-to-end now. A real payment flow needs to replace this with
 * a server-verified check before this ships — flagged here so it isn't
 * mistaken for a real entitlement check later.
 * ───────────────────────────────────────────────────────────────────────
 */

export const REVEAL_CAP = 5

const PAID_KEY = 'known_is_paid'

export function getIsPaid(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(PAID_KEY) === 'true'
}

export function setIsPaid(value: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PAID_KEY, value ? 'true' : 'false')
}

export function isRevealCapped(revealedCount: number, isPaid: boolean): boolean {
  return !isPaid && revealedCount >= REVEAL_CAP
}
