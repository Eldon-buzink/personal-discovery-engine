<!-- DRAFT method page. No route; not read by the site (lib/blog/content.ts only loads content/blog/<category>/). Each factual sentence is followed by a comment naming its source. Describes the code on main as of this branch. -->

# How Bearing works

## What it is

Bearing is a Big Five personality assessment. <!-- source: app/(site)/page.tsx (metadata description) -->
You rate 120 short statements, and Bearing reads your answers as scores on 30 facets of personality. <!-- source: lib/known/ring1-questions.ts (RING1_QUESTIONS: 120 items; DOMAIN_FACETS: 30 facets) -->
The 30 facets are grouped into the five Big Five domains: Neuroticism, Extraversion, Openness, Agreeableness and Conscientiousness, six facets each. <!-- source: lib/known/ring1-questions.ts (Domain type, DOMAIN_FACETS) -->
Each facet is measured by four of the statements. <!-- source: lib/known/ring1-questions.ts (FACET_QUESTIONS); lib/known/facetReference.test.ts -->

## Where the statements come from

The statements are the IPIP-NEO-120, a 120-item public-domain inventory that measures thirty facets of the Five Factor Model (Johnson, 2014). <!-- source: Johnson (2014), title and citation checked via OpenAlex: https://api.openalex.org/works/https://doi.org/10.1016/j.jrp.2014.05.003; the inventory is named in app/(site)/landing/FaqSection.tsx -->
Its items come from the International Personality Item Pool, whose items and scales are in the public domain. <!-- source: https://ipip.ori.org/ ("The items and scales are in the public domain") -->
Everyone answers the same 120 statements. <!-- source: lib/known/ring1-questions.ts (one fixed RING1_QUESTIONS list); app/(site)/landing/FaqSection.tsx -->
Each statement is rated on a five-point scale from "Very Inaccurate" to "Very Accurate". <!-- source: app/assessment/page.tsx (QuestionCard scaleLabels); components/known/QuestionCard.tsx (DotScale, 1-5) -->

## How answers become scores

A facet score is the average of its four answers, on the same 1 to 5 scale. <!-- source: lib/known/scoring.ts (computeFacetScore) -->
Some statements are worded in the opposite direction of the facet; their answers are flipped (6 minus the answer) before averaging. <!-- source: lib/known/scoring.ts (reverseScore); lib/known/ring1-questions.ts (reverseScored) -->
A score of 3.5 or above reads as high, 2.5 to below 3.5 as mid, and below 2.5 as low. <!-- source: lib/known/scoring.ts (TRAIT_WORD_THRESHOLDS, getTraitWord) -->
Each of the three bands has its own trait word for every facet, so a high Modesty score is shown as "Modest", a mid one as "Humble" and a low one as "Confident". <!-- source: lib/known/scoring.ts (TRAIT_WORDS) -->
A facet's result appears as soon as all four of its statements are answered, so the first patterns show up while you're still answering. <!-- source: app/assessment/page.tsx (allAnswered check before a reveal); app/(site)/LandingPageClient.tsx ("usually before the halfway point") -->

## Which text is written by AI

The scores, the trait words, the statements and the daily check-in questions are fixed in the code and are not written by AI. <!-- source: lib/known/scoring.ts; lib/known/ring1-questions.ts; lib/known/checkInOptions.ts -->
The explanation of each revealed pattern is written by an AI model, Claude Haiku 4.5. <!-- source: app/actions/generatePatternCopy.ts (model 'claude-haiku-4-5-20251001') -->
For a facet, that text has five parts: a short observation, where the pattern tends to show up, three short tags, what it can cost, and one thing worth trying this week. <!-- source: app/actions/generatePatternCopy.ts (buildUserPrompt: trait_quote, where_it_shows_up, tags, go_deeper, worth_trying) -->
The model is given the facet's name, a fixed description of what the facet measures, whether your score is high, mid or low, and your trait word. <!-- source: app/actions/generatePatternCopy.ts (buildUserPrompt, FACET_BEHAVIORAL_CONTEXT, SCORE_DIRECTION_DESCRIPTIONS) -->
It is not given your individual answers. <!-- source: app/actions/generatePatternCopy.ts (generatePatternCopy's arguments: facetName, traitWord, scoreDirection, assessmentId, branch, strongConditions); app/assessment/page.tsx and app/report/page.tsx call sites -->
The deeper assessments work the same way: the model is given that section's result words, plus their scores for energy, working style, direction and environment (relationships gets only the pattern name), and writes the explanation around them. <!-- source: app/actions/generatePatternCopy.ts (buildUserPrompt branches: energy, working_style, direction and environment use strongConditions scores; relationships uses traitWord only) -->
The AI writes the explanation and cannot change your scores. <!-- source: app/actions/generatePatternCopy.ts (returns text only; scores are computed in lib/known/scoring.ts before the call); app/(site)/landing/FaqSection.tsx -->
If the text can't be generated, a fixed fallback text is shown instead. <!-- source: app/actions/generatePatternCopy.ts (fallbackContent) -->
The generated text is also saved on Bearing's server with the result it belongs to. <!-- source: app/actions/generatePatternCopy.ts (insert into report_content) -->

## The limits of a self-report questionnaire

Every score comes from your own answers, so it describes how you see and rate yourself, not behaviour anyone has observed. <!-- source: lib/known/scoring.ts (scores computed only from responses); app/(site)/landing/FaqSection.tsx ("it reflects how you answer") -->
Each facet rests on four statements, so moving one answer from one end of the scale to the other shifts that facet's score by a full point. <!-- source: lib/known/scoring.ts (computeFacetScore: mean of 4 items on 1-5; a change of 4 on one item changes the mean by 1) -->
That is enough to move a score across a band boundary, which is one reason a mid result is described as a range rather than a fixed point. <!-- source: lib/known/scoring.ts (bands are 1 point wide: 2.5 to below 3.5) -->
A result reflects how you answered at the time you took the assessment. <!-- source: app/assessment/page.tsx (handleNext stores each answer once, with answeredAt); lib/known/scoring.ts (scores computed from those stored answers) -->
Bearing describes patterns; it is not therapy and does not diagnose anything. <!-- source: app/(site)/landing/FaqSection.tsx ("it describes patterns rather than diagnosing you"; "Is this therapy or a diagnosis?") -->

## What is free and what is paid

Your first 5 patterns are free, and they need no account. <!-- source: lib/known/paywall.ts (REVEAL_CAP = 5); app/(site)/landing/FaqSection.tsx -->
Unlocking all 30 facets plus five deeper assessments is a one-time payment of €49, with no subscription. <!-- source: app/(site)/landing/FaqSection.tsx; app/(site)/pricing/PricingClient.tsx (€49) -->
The five deeper assessments cover direction, energy, environment, relationships and working style. <!-- source: app/assessment/ (direction, energy, environment, relationships, working-style) -->
An account is needed when you unlock the full report. <!-- source: app/(site)/landing/FaqSection.tsx -->
