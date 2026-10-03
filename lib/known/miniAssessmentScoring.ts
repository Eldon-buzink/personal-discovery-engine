/**
 * lib/known/miniAssessmentScoring.ts
 *
 * Content + deterministic scoring for the 3 mini-assessment facets — see
 * reference/03-mini-assessment-items.md, the source of truth for item text,
 * scoring, and banding. No model call anywhere in this file.
 *
 * facet_id stays exactly as it already exists in lib/known/scoring.ts
 * (including 'Liberalism' for the third one) — MINI_ASSESSMENT_DISPLAY_LABEL
 * below is the *only* place "Values" should come from. Every user-facing
 * surface (quiz question header, result screen, badge, and eventually the
 * landing pages in 02-landing-page-handover.md) must read off that map, not
 * the facet_id directly — 'Liberalism' must never reach UI copy.
 */

import { reverseScore } from './scoring'

export type MiniAssessmentFacet = 'Self-Discipline' | 'Anxiety' | 'Liberalism'
export type MiniAssessmentBand = 'low' | 'mid' | 'high'

// URL-facing slugs — chosen to match the /start/{facet} vocabulary already
// locked in reference/02-landing-page-handover.md (discipline/anxiety/
// values), so that future landing page's CTA can link straight into
// /mini-assessment/{slug} without a translation layer.
export type MiniAssessmentSlug = 'discipline' | 'anxiety' | 'values'

export const MINI_ASSESSMENT_SLUG_TO_FACET: Record<MiniAssessmentSlug, MiniAssessmentFacet> = {
  discipline: 'Self-Discipline',
  anxiety: 'Anxiety',
  values: 'Liberalism',
}

export const MINI_ASSESSMENT_FACET_TO_SLUG: Record<MiniAssessmentFacet, MiniAssessmentSlug> = {
  'Self-Discipline': 'discipline',
  Anxiety: 'anxiety',
  Liberalism: 'values',
}

// The only place "Values" should come from — see file header.
export const MINI_ASSESSMENT_DISPLAY_LABEL: Record<MiniAssessmentFacet, string> = {
  'Self-Discipline': 'Self-Discipline',
  Anxiety: 'Anxiety',
  Liberalism: 'Values',
}

// General-purpose display label for ANY facet_id (used across the practice
// screens, not just the mini-assessment ones) — most of the 30 real facets
// have no override and just display as their own name; Liberalism is the
// one exception. Prefer this over reading MINI_ASSESSMENT_DISPLAY_LABEL
// directly so a facet outside the mini-assessment's 3 doesn't need a guard
// at every call site.
export function facetDisplayLabel(facetId: string): string {
  return (MINI_ASSESSMENT_DISPLAY_LABEL as Record<string, string>)[facetId] ?? facetId
}

export interface MiniAssessmentItem {
  text: string
  reverseScored: boolean
}

export const MINI_ASSESSMENT_ITEMS: Record<MiniAssessmentFacet, MiniAssessmentItem[]> = {
  'Self-Discipline': [
    { text: "I keep working on a task until it's finished, even after it stops being interesting.", reverseScored: false },
    { text: 'I get started on things right away rather than putting them off.', reverseScored: false },
    { text: "I have a hard time making myself do things I don't feel like doing.", reverseScored: true },
    { text: 'Once I commit to something, I follow through on it.', reverseScored: false },
    { text: 'I often leave tasks unfinished when something more appealing comes along.', reverseScored: true },
    { text: 'I can push through boredom to get a job done.', reverseScored: false },
  ],
  Anxiety: [
    { text: 'I often find myself worrying about things that might go wrong.', reverseScored: false },
    { text: 'Small problems can make me feel tense or on edge.', reverseScored: false },
    { text: 'I generally feel calm and relaxed, even under pressure.', reverseScored: true },
    { text: 'I tend to expect the worst in uncertain situations.', reverseScored: false },
    { text: 'It takes a lot to make me feel nervous.', reverseScored: true },
    { text: "I notice physical tension — a knot in my stomach, racing thoughts — when something's unresolved.", reverseScored: false },
  ],
  Liberalism: [
    { text: "I'm willing to question traditions if they no longer make sense to me.", reverseScored: false },
    { text: "I think it's important to follow the rules my community has always lived by.", reverseScored: true },
    { text: 'I often reconsider beliefs I was raised with.', reverseScored: false },
    { text: "Authority and tradition deserve the benefit of the doubt, even when I don't fully understand them.", reverseScored: true },
    { text: "I'm comfortable holding views that differ from the people I grew up around.", reverseScored: false },
    { text: "I feel loyalty to the values I was taught, and I'm cautious about revising them.", reverseScored: true },
  ],
}

/** Mean of the 6 reverse-key-adjusted (1-5) Likert responses, in item order. */
export function scoreMiniAssessment(facet: MiniAssessmentFacet, responses: number[]): number {
  const items = MINI_ASSESSMENT_ITEMS[facet]
  if (responses.length !== items.length) {
    throw new Error(`scoreMiniAssessment: expected ${items.length} responses for ${facet}, got ${responses.length}`)
  }
  let sum = 0
  for (let i = 0; i < items.length; i++) {
    sum += items[i].reverseScored ? reverseScore(responses[i]) : responses[i]
  }
  return sum / items.length
}

// Even thirds across the 1.0-5.0 range, per reference/03-mini-assessment-items.md.
// That file also gives rounded decimal boundaries (2.33/2.34, 3.66/3.67) that
// don't quite divide evenly — using the exact thirds (4/3 wide each) instead
// avoids a gap/overlap at a boundary an actual mean-of-6 score could land on
// (e.g. 14/6 = 2.3333...). Matches the doc's own "even thirds" framing more
// precisely than its rounded display values do.
const BAND_WIDTH = 4 / 3

export function bandForScore(score: number): MiniAssessmentBand {
  if (score < 1 + BAND_WIDTH) return 'low'
  if (score < 1 + 2 * BAND_WIDTH) return 'mid'
  return 'high'
}

// Result-screen copy, one line per facet per band. Not in
// reference/03-mini-assessment-items.md — that file covers item text and
// scoring only, not result-screen prose, so this is new copy authored here
// to make the result screen functional. Same status as the item text:
// unvalidated draft, fine to ship given the "directional, not confident"
// framing, worth revisiting once real band-distribution data exists.
//
// 'mid' rewritten (round 3 feedback) to describe an actual position —
// middling scores come from averaging 6 items, not from "no clear lean",
// and the old copy read as a non-answer. Each mid line now names what the
// middle ground actually looks like day to day, same as low/high do.
export const MINI_ASSESSMENT_BAND_COPY: Record<MiniAssessmentFacet, Record<MiniAssessmentBand, string>> = {
  'Self-Discipline': {
    low: 'Right now, the pull to set things aside shows up more often than the pull to push through.',
    mid: 'You keep a steady pace — not immune to distraction, but not easily knocked off course either. Whether you follow through tends to depend on the task more than on willpower alone.',
    high: 'You have a strong pull toward finishing what you start, even past the point it stops feeling interesting.',
  },
  Anxiety: {
    low: "Uncertainty doesn't seem to sit with you for long — you lean toward steady rather than tense.",
    mid: "You notice tension when it shows up, but it doesn't usually take over. Some situations get under your skin more than others, without a single pattern to it.",
    high: 'Worry and tension show up readily for you, especially around what might go wrong.',
  },
  Liberalism: {
    low: 'You lean toward holding onto the frameworks you were raised with, more than questioning them.',
    mid: "You hold onto some of what you were raised with and question other parts of it — picking and choosing rather than deferring wholesale or rejecting it outright.",
    high: 'You lean toward questioning inherited rules and beliefs rather than deferring to them.',
  },
}
