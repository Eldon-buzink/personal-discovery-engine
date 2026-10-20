// How Bearing works: the journey (HowItWorksJourney, the three steps with real
// product pieces), then the method as "The details", converted from
// content/drafts/method.md.
// Every factual sentence carries its source as a JSX comment (source only,
// never rendered). Sentences that would stop being true when the
// relationships branch merges (model name, card format, answers sent to the
// model, fallback text, stored text) were left out; see the PR description.

import type { ReactNode } from 'react'
import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import HowItWorksJourney from './HowItWorksJourney'

export const metadata = buildMetadata({
  path: '/how-it-works',
  title: 'How Bearing Works — Scoring, AI Text and Pricing',
  description: 'How Bearing turns 120 statements into 30 facet scores, which text in your report is written by AI, the limits of self-report, and what is free.',
})

// The details: one readable column on the site's type tokens.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h3 className="font-display font-normal text-display-3 text-charcoal" style={{ marginBottom: 12 }}>{title}</h3>
      <div className="font-sans text-body text-charcoal-soft">{children}</div>
    </section>
  )
}

const arrow = <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>

export default function HowItWorksPage() {
  return (
    <div className="bg-cream text-charcoal min-h-screen">
      <HowItWorksJourney />

      <article id="details" className="hiw-details mx-auto" style={{ maxWidth: 680, padding: '136px 24px 0' }}>
        <h2 className="font-display font-normal text-display-1 text-charcoal" style={{ marginBottom: 12 }}>
          The details
        </h2>
        <p className="font-sans text-body text-charcoal-soft" style={{ marginBottom: 8 }}>
          How the scores are made, which text is written by AI, and what a questionnaire can and can&apos;t tell you.
        </p>

        <Section title="What it is">
          <p>
            {/* source: app/(site)/page.tsx (metadata description) */}
            Bearing is a Big Five personality assessment.{' '}
            {/* source: lib/known/ring1-questions.ts (RING1_QUESTIONS: 120 items; DOMAIN_FACETS: 30 facets) */}
            You rate 120 short statements, and Bearing reads your answers as scores on{' '}
            <Link href="/traits">30 facets of personality</Link>.{' '}
            {/* source: lib/known/ring1-questions.ts (Domain type, DOMAIN_FACETS) */}
            The 30 facets are grouped into the five Big Five domains: Neuroticism, Extraversion, Openness, Agreeableness and Conscientiousness, six facets each.{' '}
            {/* source: lib/known/ring1-questions.ts (FACET_QUESTIONS); lib/known/facetReference.test.ts */}
            Each facet is measured by four of the statements.
          </p>
        </Section>

        <Section title="Where the statements come from">
          <p>
            {/* source: Johnson (2014), title and citation checked via OpenAlex: https://api.openalex.org/works/https://doi.org/10.1016/j.jrp.2014.05.003; the inventory is named in app/(site)/landing/FaqSection.tsx */}
            The statements are the IPIP-NEO-120, a 120-item public-domain inventory that measures thirty facets of the Five Factor Model (Johnson, 2014).{' '}
            {/* source: https://ipip.ori.org/ ("The items and scales are in the public domain") */}
            Its items come from the International Personality Item Pool, whose items and scales are in the public domain.{' '}
            {/* source: lib/known/ring1-questions.ts (one fixed RING1_QUESTIONS list); app/(site)/landing/FaqSection.tsx */}
            Everyone answers the same 120 statements.{' '}
            {/* source: app/assessment/page.tsx (QuestionCard scaleLabels); components/known/QuestionCard.tsx (DotScale, 1-5) */}
            Each statement is rated on a five-point scale from &ldquo;Very Inaccurate&rdquo; to &ldquo;Very Accurate&rdquo;.
          </p>
        </Section>

        <Section title="How answers become scores">
          <p>
            {/* source: lib/known/scoring.ts (computeFacetScore) */}
            A facet score is the average of its four answers, on the same 1 to 5 scale.{' '}
            {/* source: lib/known/scoring.ts (reverseScore); lib/known/ring1-questions.ts (reverseScored) */}
            Some statements are worded in the opposite direction of the facet; their answers are flipped (6 minus the answer) before averaging.{' '}
            {/* source: lib/known/scoring.ts (TRAIT_WORD_THRESHOLDS, getTraitWord) */}
            A score of 3.5 or above reads as high, 2.5 to below 3.5 as mid, and below 2.5 as low.
          </p>
          <p>
            {/* source: lib/known/scoring.ts (TRAIT_WORDS) */}
            Each of the three bands has its own trait word for every facet, so a high Modesty score is shown as &ldquo;Modest&rdquo;, a mid one as &ldquo;Humble&rdquo; and a low one as &ldquo;Confident&rdquo;.{' '}
            {/* source: app/assessment/page.tsx (allAnswered check before a reveal); app/(site)/LandingPageClient.tsx ("usually before the halfway point") */}
            A facet&apos;s result appears as soon as all four of its statements are answered, so the first patterns show up while you&apos;re still answering.
          </p>
        </Section>

        <Section title="Which text is written by AI">
          <p>
            {/* source: lib/known/scoring.ts; lib/known/ring1-questions.ts; lib/known/checkInOptions.ts */}
            The scores, the trait words, the statements and the daily check-in questions are fixed in the code and are not written by AI.{' '}
            {/* source: app/actions/generatePatternCopy.ts (Anthropic messages.create) */}
            The explanation of each revealed pattern is written by an AI model.{' '}
            {/* source: app/actions/generatePatternCopy.ts (buildUserPrompt, FACET_BEHAVIORAL_CONTEXT, SCORE_DIRECTION_DESCRIPTIONS) */}
            The model is given the facet&apos;s name, a fixed description of what the facet measures, whether your score is high, mid or low, and your trait word.
          </p>
          <p>
            {/* source: app/actions/generatePatternCopy.ts (buildUserPrompt branches: energy, working_style, direction and environment use strongConditions scores; relationships uses traitWord only) */}
            The deeper assessments work the same way: the model is given that section&apos;s result words, plus their scores for energy, working style, direction and environment (relationships gets only the pattern name), and writes the explanation around them.{' '}
            {/* source: app/actions/generatePatternCopy.ts (returns text only; scores are computed in lib/known/scoring.ts before the call); app/(site)/landing/FaqSection.tsx */}
            The AI writes the explanation and cannot change your scores.
          </p>
        </Section>

        <Section title="The limits of a self-report questionnaire">
          <p>
            {/* source: lib/known/scoring.ts (scores computed only from responses); app/(site)/landing/FaqSection.tsx ("it reflects how you answer") */}
            Every score comes from your own answers, so it describes how you see and rate yourself, not behaviour anyone has observed.{' '}
            {/* source: lib/known/scoring.ts (computeFacetScore: mean of 4 items on 1-5; a change of 4 on one item changes the mean by 1) */}
            Each facet rests on four statements, so moving one answer from one end of the scale to the other shifts that facet&apos;s score by a full point.{' '}
            {/* source: lib/known/scoring.ts (bands are 1 point wide: 2.5 to below 3.5) */}
            That is enough to move a score across a band boundary.
          </p>
          <p>
            {/* source: app/assessment/page.tsx (handleNext stores each answer once, with answeredAt); lib/known/scoring.ts (scores computed from those stored answers) */}
            A result reflects how you answered at the time you took the assessment.{' '}
            {/* source: app/(site)/landing/FaqSection.tsx ("it describes patterns rather than diagnosing you"; "Is this therapy or a diagnosis?") */}
            Bearing describes patterns; it is not therapy and does not diagnose anything.
          </p>
        </Section>

        <Section title="What is free and what is paid">
          <p>
            {/* source: lib/known/paywall.ts (REVEAL_CAP = 5); app/(site)/landing/FaqSection.tsx */}
            Your first 5 patterns are free, and they need no account.{' '}
            {/* source: app/(site)/landing/FaqSection.tsx; app/(site)/pricing/PricingClient.tsx (€49) */}
            Unlocking all 30 facets plus five deeper assessments is a one-time payment of €49, with no subscription.{' '}
            {/* source: app/assessment/ (direction, energy, environment, relationships, working-style) */}
            The five deeper assessments cover direction, energy, environment, relationships and working style.{' '}
            {/* source: app/(site)/landing/FaqSection.tsx */}
            An account is needed when you unlock the full report.
          </p>
          <p>
            <Link href="/pricing">See pricing</Link>
          </p>
        </Section>
      </article>

      <section className="text-center mx-auto" style={{ maxWidth: 560, padding: '120px 24px 128px' }}>
        <h2 className="font-display font-normal text-display-1 text-charcoal" style={{ marginBottom: 14 }}>
          Ready to see yours?
        </h2>
        <p className="font-sans text-body text-charcoal-soft">
          About 15 minutes. Your first 5 patterns are free, and you don&apos;t need an account to start.
        </p>
        <Link href="/onboarding" className="hiw-btn">Start the assessment {arrow}</Link>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .hiw-details p { margin: 0 0 14px; }
        .hiw-details a { color: #262420; text-decoration: underline; text-underline-offset: 3px; }
        .hiw-btn { display: inline-flex; align-items: center; gap: 10px; height: 52px; padding: 0 26px; margin-top: 28px; border-radius: 999px;
          background: #262420; color: #F7F4ED; font-size: var(--text-ui); font-weight: 500; text-decoration: none;
          box-shadow: 0 1px 2px rgba(38,36,32,0.2), 0 8px 24px -10px rgba(38,36,32,0.45); }
        @media (max-width: 640px) { .hiw-details { padding-top: 96px !important; } }
      ` }} />
    </div>
  )
}
