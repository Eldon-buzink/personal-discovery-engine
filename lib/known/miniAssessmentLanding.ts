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
  // Index into MINI_ASSESSMENT_ITEMS[facet] — resolved to the real item
  // text where this is rendered, never retyped here, so the quote can't
  // drift from the quiz. 3 straight-keyed items + 1 reverse-keyed item
  // per facet, so both ends of the trait are represented.
  itemIndex: number
}

export interface SoundFamiliarCopy {
  subtitle: string
  cards: [SoundFamiliarCard, SoundFamiliarCard, SoundFamiliarCard, SoundFamiliarCard]
}

// "Sound familiar?" section — ported from the home page's Problem section
// (reference/landing-copy-deck.md §2). Titles are editorial framing (not
// factual claims); the quotes themselves are real quiz items by index.
// Avoids index 0 where possible — that item is already shown in the hero's
// own first-statement preview card, right above this section — except for
// Values, where item 0 is one of only 3 straight-keyed items and leaving it
// out would mean only 2 straight items for this section's required 3.
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

export const LANDING_SOUND_FAMILIAR: Record<MiniAssessmentSlug, SoundFamiliarCopy> = {
  discipline: {
    subtitle: 'You know what you should be doing. That part was never the problem.',
    cards: [
      { title: 'Starting is the hard part.', itemIndex: 1 }, // straight: "I get started on things right away..."
      { title: 'Follow-through, when it matters.', itemIndex: 3 }, // straight: "Once I commit to something, I follow through on it."
      { title: 'Pushing through the boring part.', itemIndex: 5 }, // straight: "I can push through boredom to get a job done."
      { title: 'And sometimes, starting is genuinely hard.', itemIndex: 2 }, // reverse: "I have a hard time making myself..."
    ],
  },
  anxiety: {
    subtitle: 'Nothing is actually wrong right now. That doesn’t always settle it.',
    cards: [
      { title: 'The what-ifs pile up.', itemIndex: 3 }, // straight: "I tend to expect the worst in uncertain situations."
      { title: 'Small things can feel bigger.', itemIndex: 1 }, // straight: "Small problems can make me feel tense..."
      { title: 'It shows up in the body, not just the thoughts.', itemIndex: 5 }, // straight: "I notice physical tension..."
      { title: 'And sometimes, it just doesn’t take hold.', itemIndex: 2 }, // reverse: "I generally feel calm and relaxed..."
    ],
  },
  values: {
    subtitle: 'You respect where things came from. You still notice what doesn’t add up.',
    cards: [
      { title: 'Questioning what no longer fits.', itemIndex: 0 }, // straight: "I'm willing to question traditions..."
      { title: 'Old rules, new questions.', itemIndex: 2 }, // straight: "I often reconsider beliefs I was raised with."
      { title: 'Comfortable standing apart.', itemIndex: 4 }, // straight: "I'm comfortable holding views that differ..."
      { title: 'And sometimes, change can feel like betrayal.', itemIndex: 5 }, // reverse: "I feel loyalty to the values I was taught..."
    ],
  },
}
