/**
 * lib/known/practicePurpose.ts
 *
 * The "what this is for" line (handover rework, Part 1) — shown wherever a
 * facet gets activated or first opened: the "+" activation success on
 * Practice home, the first visit to a facet's detail page, and the first
 * check-in screen. One function, one meaning, reused verbatim in all three
 * places plus the mini-assessment result page's "what happens next" box, so
 * the message can't drift between them.
 *
 * Two variants because the honest starting point differs: a mini-assessment
 * facet started from a 6-question guess, a base-assessment facet started
 * from the full report. Both land on the same idea — check-ins build the
 * real picture over time — just worded against what actually happened.
 */

export function practicePurposeCopy(directional: boolean): string {
  return directional
    ? 'Your first result was a quick guess from 6 questions. Checking in each day shows how your real days compare.'
    : 'Checking in each day turns your report into an ongoing picture, not just a one-time score.'
}
