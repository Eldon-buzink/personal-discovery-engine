/**
 * lib/known/miniAssessmentLanding.ts
 *
 * Copy for the /start/{facet} landing pages — see
 * reference/02-landing-page-handover.md. Placeholder but production-shaped:
 * final creative can drop in here without touching the template. Two
 * angles, both agreed as viable and not yet ranked: 'curiosity'
 * (self-discovery) and 'behavior' (a concrete, recognizable pattern). Pick
 * one per visit via ?angle=curiosity|behavior (default: curiosity) so both
 * can be compared side by side.
 *
 * Facet display names come from MINI_ASSESSMENT_DISPLAY_LABEL, never the
 * facet_id — 'Liberalism' must not reach UI copy.
 *
 * Round 3 feedback: headlines are now grounded in the product's own
 * language — the daily check-in question (lib/known/checkInOptions.ts) and
 * the quiz items themselves (lib/known/miniAssessmentScoring.ts) — rather
 * than invented metaphors. The "Sound familiar?" cards below quote real
 * quiz items by INDEX, not by retyped string, so they can never drift from
 * MINI_ASSESSMENT_ITEMS — see StartLandingClient.tsx for where the index
 * gets resolved to text.
 */

import type { MiniAssessmentSlug } from './miniAssessmentScoring'

export type LandingAngle = 'curiosity' | 'behavior'

export interface LandingAngleCopy {
  headline: string
  subhead: string
}

export const LANDING_ANGLES: LandingAngle[] = ['curiosity', 'behavior']

// Part C6: tapping the landing page's first-statement preview stores that
// answer here, keyed by slug, so the quiz page can pick it up and skip
// re-asking question 1. Shared between StartLandingClient.tsx (writer) and
// the quiz page (reader + remover) so the key can't drift between them.
export function preAnswerStorageKey(slug: MiniAssessmentSlug): string {
  return `mini-assessment-preanswer-${slug}`
}

export const LANDING_COPY: Record<MiniAssessmentSlug, Record<LandingAngle, LandingAngleCopy>> = {
  discipline: {
    curiosity: {
      headline: 'Do you keep going after it stops feeling easy?',
      subhead: 'Six short statements about starting, finishing, and everything that pulls you away in between.',
    },
    behavior: {
      headline: 'What happens when a task stops being interesting?',
      subhead: 'Six short statements about follow-through — and what wins when something more appealing shows up.',
    },
  },
  anxiety: {
    curiosity: {
      headline: 'How does uncertainty sit with you?',
      subhead: "Six short statements about how unresolved things land for you — there's no right way to sit with not knowing.",
    },
    behavior: {
      headline: "When something's unresolved, where do you feel it?",
      subhead: 'Six short statements about tension and worry, grounded in what actually shows up for you.',
    },
  },
  values: {
    curiosity: {
      headline: 'What are you willing to question?',
      subhead: 'Six short statements about tradition, change, and where you draw your own line.',
    },
    behavior: {
      headline: 'Do you follow the rules you grew up with, or rewrite them?',
      subhead: "Six short statements about the beliefs you keep, and the ones you've let go.",
    },
  },
}

// Shared across all three pages. Voice matches the in-quiz conversion
// moment ("Add to your daily check-ins"): plain, sentence-case, no hype.
export const LANDING_SHARED = {
  cta: 'Start the quick check',
  microcopy: '6 statements · about 2 minutes · no account needed to see your result',
  honesty: 'A directional read from 6 questions, not the full picture.',
  previewLabel: 'The first statement',
  previewScaleLabels: ['Very inaccurate', 'Very accurate'] as [string, string],
  neitherWrong: 'Neither end of this is "wrong" — this just shows where you tend to sit.',
}

// One line, adapted only by facet label — the "this isn't a diagnosis"
// reassurance (Part C3). 30 verified against the product's own facet count
// (lib/known/scoring.ts TRAIT_WORDS / reference/04-facet-trait-words-and-
// descriptions.md lists exactly 30), matching the home page's existing
// "Each of your 30 facets..." line rather than introducing a new number.
export function landingReassurance(displayLabel: string): string {
  return `This is a personality read, not a diagnosis. ${displayLabel} is one of 30 traits here — everyone sits somewhere on it.`
}

export interface SoundFamiliarCard {
  title: string
  // First-person line in the visitor's own words — what it feels like
  // before they'd look for a quick check like this one.
  line: string
}

// "Your practice" headline per page — what tracking this one facet looks
// like after the quick check. The body line under it is built from the
// facet's real check-in question (lib/known/checkInOptions.ts), so it can't
// drift from what the check-in actually asks.
export const LANDING_PRACTICE_HEADLINE: Record<MiniAssessmentSlug, string> = {
  discipline: 'Keep noticing when you push through, and when you drift.',
  anxiety: 'Keep noticing how uncertainty actually sits with you.',
  values: 'Keep noticing which rules you keep, and which you question.',
}

export function landingPracticeBody(displayLabel: string, checkInQuestion: string): string {
  return `After the quick check, you can add ${displayLabel} to your evening check-ins. One question a day: “${checkInQuestion}” Over the weeks, your own answers show how it actually plays out.`
}

// "Sound familiar?" on each /start/{facet} page: three cards in one row,
// written from what someone feels when this facet is on their mind, ending
// on the question the quick check actually helps with. No diagnosis, no
// promise of change.
export interface SoundFamiliarCopy {
  subtitle: string
  cards: [SoundFamiliarCard, SoundFamiliarCard, SoundFamiliarCard]
}

export const LANDING_SOUND_FAMILIAR: Record<MiniAssessmentSlug, SoundFamiliarCopy> = {
  discipline: {
    subtitle: 'You know what you want to get done. Somewhere between starting and finishing, it slips.',
    cards: [
      { title: 'Busy, but not moving.', line: 'I\u2019m busy all day, and the thing that matters still isn\u2019t done.' },
      { title: 'Strong starts, quiet stops.', line: 'I start with real energy, then it fades once it gets boring.' },
      { title: 'Is it really discipline?', line: 'I can\u2019t tell if I lack discipline or just push myself the wrong way.' },
    ],
  },
  anxiety: {
    subtitle: 'Nothing is actually wrong right now. Your mind doesn\u2019t always agree.',
    cards: [
      { title: 'The what-ifs pile up.', line: 'I play out how things could go wrong before anything has happened.' },
      { title: 'Hard to switch off.', line: 'Even on a quiet evening, part of me is still on alert.' },
      { title: 'Is this just me?', line: 'I can\u2019t tell if I worry more than most people, or about the same.' },
    ],
  },
  values: {
    subtitle: 'You grew up with certain rules. You\u2019re not sure which ones are still yours.',
    cards: [
      { title: 'Some rules don\u2019t fit anymore.', line: 'Things I used to take for granted don\u2019t sit right with me now.' },
      { title: 'Keeping the peace.', line: 'I go along with how things are done, even when I\u2019d do it differently.' },
      { title: 'Where do I actually stand?', line: 'I can\u2019t tell how much of what I believe is mine, and how much I inherited.' },
    ],
  },
}
