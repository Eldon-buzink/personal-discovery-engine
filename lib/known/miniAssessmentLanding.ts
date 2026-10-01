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
 * Question previews are read from MINI_ASSESSMENT_ITEMS (the real quiz
 * items), not duplicated here, so the preview can't drift from the quiz.
 */

import type { MiniAssessmentSlug } from './miniAssessmentScoring'

export type LandingAngle = 'curiosity' | 'behavior'

export interface LandingAngleCopy {
  headline: string
  subhead: string
}

export const LANDING_ANGLES: LandingAngle[] = ['curiosity', 'behavior']

export const LANDING_COPY: Record<MiniAssessmentSlug, Record<LandingAngle, LandingAngleCopy>> = {
  discipline: {
    curiosity: {
      headline: 'How do you handle the things you don’t feel like doing?',
      subhead: 'Six short statements. See which way you lean on self-discipline.',
    },
    behavior: {
      headline: 'Do you finish what you start?',
      subhead: 'Six short statements about follow-through. See which way you lean.',
    },
  },
  anxiety: {
    curiosity: {
      headline: 'How much do you carry the ‘what if’?',
      subhead: 'Six short statements. See which way you lean on anxiety.',
    },
    behavior: {
      headline: 'Do small problems leave you on edge?',
      subhead: 'Six short statements about tension and worry. See which way you lean.',
    },
  },
  values: {
    curiosity: {
      headline: 'What do you hold onto, and what are you ready to question?',
      subhead: 'Six short statements. See which way you lean on values.',
    },
    behavior: {
      headline: 'Do you keep a tradition because it works, or because it’s there?',
      subhead: 'Six short statements about rules and tradition. See which way you lean.',
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
}

export interface LandingStep {
  title: string
  body: string
}

// "How it works" strip, shared across all three facets — the steps describe
// the mini-assessment flow itself, not facet-specific content.
export const LANDING_STEPS: LandingStep[] = [
  {
    title: 'Answer 6 short statements',
    body: 'Rated from very inaccurate to very accurate, same format as the full assessment.',
  },
  {
    title: 'See which way you lean',
    body: 'A quick, directional read on this one facet — no account needed.',
  },
  {
    title: 'Keep it, or go deeper',
    body: 'Add it to your daily check-ins, or unlock the full 30-facet report later.',
  },
]
