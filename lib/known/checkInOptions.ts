/**
 * lib/known/checkInOptions.ts
 *
 * Per-facet daily check-in question + forced-choice options — see
 * reference/05-daily-checkin-copy.md, the source of truth for this content.
 * Each facet's 3 options are tied to its TRAIT_WORDS (low/mid/high) from
 * lib/known/scoring.ts, so day-to-day check-in language matches the full
 * report's voice. These are "today, X showed up" observations, not a trait
 * re-score — option ids stay 'low'/'mid'/'high' internally (matching the
 * trait-word polarity) but the label is always phrased as what happened
 * today, never "you are X".
 *
 * Liberalism's user-facing label is "Values" everywhere (see
 * miniAssessmentScoring.ts's facetDisplayLabel) — none of the question/
 * option text below names the facet directly, so there's no leak risk in
 * this file itself, but any caller surfacing the facet's own name alongside
 * this content must still go through facetDisplayLabel, not the raw
 * facet_id.
 *
 * Unvalidated content, same status as the mini-assessment items — fine to
 * ship for v1, revisit once real usage data exists.
 */

export type CheckInOptionId = 'low' | 'mid' | 'high'

export interface CheckInOption {
  id: CheckInOptionId
  label: string
}

export interface CheckInPrompt {
  question: string
  options: CheckInOption[]
}

export const CHECK_IN_PROMPTS: Record<string, CheckInPrompt> = {
  // Neuroticism
  Anxiety: {
    question: 'How did uncertainty sit with you today?',
    options: [
      { id: 'low', label: "Grounded — It didn't really take hold." },
      { id: 'mid', label: 'Attuned — I noticed it, but stayed steady.' },
      { id: 'high', label: 'Anxious — It stayed with me most of the day.' },
    ],
  },
  Anger: {
    question: 'When something got under your skin today, how did you respond?',
    options: [
      { id: 'low', label: 'Patient — I let it pass without much reaction.' },
      { id: 'mid', label: 'Firm — I addressed it, calmly.' },
      { id: 'high', label: 'Volatile — It got the better of me.' },
    ],
  },
  Depression: {
    question: 'How did your mood move today?',
    options: [
      { id: 'low', label: 'Buoyant — It lifted easily.' },
      { id: 'mid', label: 'Steady — It held, even.' },
      { id: 'high', label: 'Brooding — It stayed low and lingered.' },
    ],
  },
  'Self-Consciousness': {
    question: 'How aware were you of being watched or judged today?',
    options: [
      { id: 'low', label: 'Assured — Barely crossed my mind.' },
      { id: 'mid', label: 'Reflective — I noticed it, without much weight.' },
      { id: 'high', label: 'Guarded — It shaped how I acted.' },
    ],
  },
  Immoderation: {
    question: 'How did you handle wanting something today?',
    options: [
      { id: 'low', label: 'Tempered — I held off without much effort.' },
      { id: 'mid', label: 'Flexible — I gave in a little, on my terms.' },
      { id: 'high', label: "Impulsive — I gave in before I'd decided to." },
    ],
  },
  Vulnerability: {
    question: 'How did you hold up under pressure today?',
    options: [
      { id: 'low', label: 'Resilient — It barely rattled me.' },
      { id: 'mid', label: 'Adaptive — I felt it, and adjusted.' },
      { id: 'high', label: 'Fragile — It knocked me off balance.' },
    ],
  },

  // Extraversion
  Friendliness: {
    question: 'How did you show up with someone new today?',
    options: [
      { id: 'low', label: 'Reserved — I held back a bit.' },
      { id: 'mid', label: 'Warm — I opened up naturally.' },
      { id: 'high', label: 'Radiant — I lit up the room.' },
    ],
  },
  Gregariousness: {
    question: 'How did being around others feel today?',
    options: [
      { id: 'low', label: 'Private — I preferred my own space.' },
      { id: 'mid', label: 'Social — I enjoyed the company, in moderation.' },
      { id: 'high', label: 'Gregarious — I sought the crowd out.' },
    ],
  },
  Assertiveness: {
    question: 'How did you show up when it mattered today?',
    options: [
      { id: 'low', label: 'Deferential — I let others lead.' },
      { id: 'mid', label: 'Poised — I spoke up when it counted.' },
      { id: 'high', label: 'Commanding — I took charge.' },
    ],
  },
  'Activity Level': {
    question: 'What was your pace today?',
    options: [
      { id: 'low', label: 'Measured — Slow and deliberate.' },
      { id: 'mid', label: 'Active — Steadily on the move.' },
      { id: 'high', label: 'Energized — Go, go, go.' },
    ],
  },
  'Excitement-Seeking': {
    question: 'How did you handle a chance to do something new or risky today?',
    options: [
      { id: 'low', label: 'Cautious — I passed on it.' },
      { id: 'mid', label: 'Daring — I leaned in, carefully.' },
      { id: 'high', label: 'Bold — I jumped right in.' },
    ],
  },
  Cheerfulness: {
    question: 'What was your emotional tone today?',
    options: [
      { id: 'low', label: 'Serious — Even-keeled, not much brightness.' },
      { id: 'mid', label: 'Upbeat — Genuinely good spirits.' },
      { id: 'high', label: 'Vibrant — Bright, almost buoyant.' },
    ],
  },

  // Openness
  Imagination: {
    question: 'How much did your mind wander today?',
    options: [
      { id: 'low', label: 'Literal — Stayed on the facts.' },
      { id: 'mid', label: 'Creative — Drifted into a few ideas.' },
      { id: 'high', label: 'Imaginative — Off in its own world.' },
    ],
  },
  'Artistic Interests': {
    question: "Did anything's beauty or design catch you today?",
    options: [
      { id: 'low', label: 'Practical — Not really, function over form.' },
      { id: 'mid', label: 'Perceptive — I noticed a few things.' },
      { id: 'high', label: 'Aesthetic — I was drawn in more than once.' },
    ],
  },
  Emotionality: {
    question: 'How in touch were you with what you were feeling today?',
    options: [
      { id: 'low', label: 'Detached — Mostly stayed in my head.' },
      { id: 'mid', label: 'Expressive — I noticed and named it.' },
      { id: 'high', label: 'Sensitive — Everything felt close to the surface.' },
    ],
  },
  Adventurousness: {
    question: 'Did you lean toward the familiar or the unfamiliar today?',
    options: [
      { id: 'low', label: 'Familiar — I stuck with what I know.' },
      { id: 'mid', label: 'Curious — I poked at something new.' },
      { id: 'high', label: 'Expansive — I went looking for the unfamiliar.' },
    ],
  },
  Intellect: {
    question: 'How did you engage with a hard idea today?',
    options: [
      { id: 'low', label: 'Concrete — I kept things simple.' },
      { id: 'mid', label: 'Inquisitive — I asked a few questions.' },
      { id: 'high', label: 'Analytical — I really dug into it.' },
    ],
  },
  // User-facing label is "Values" (facetDisplayLabel) — internal facet_id
  // and this key stay "Liberalism", matching scoring.ts/the DB.
  Liberalism: {
    question: "Did you question anything you'd normally take for granted today?",
    options: [
      { id: 'low', label: 'Traditional — Not really, things stayed as they were.' },
      { id: 'mid', label: 'Open — I gave it a second thought.' },
      { id: 'high', label: 'Progressive — I actively pushed against it.' },
    ],
  },

  // Agreeableness
  Trust: {
    question: "How did you read other people's intentions today?",
    options: [
      { id: 'low', label: 'Vigilant — I stayed on guard.' },
      { id: 'mid', label: 'Discerning — I weighed it, case by case.' },
      { id: 'high', label: 'Trusting — I gave the benefit of the doubt.' },
    ],
  },
  Morality: {
    question: 'Did a small shortcut tempt you today?',
    options: [
      { id: 'low', label: "Pragmatic — I took it, and didn't dwell." },
      { id: 'mid', label: 'Principled — I weighed it and chose carefully.' },
      { id: 'high', label: 'Sincere — I held the line without a second thought.' },
    ],
  },
  Altruism: {
    question: "How did you respond to someone else's need today?",
    options: [
      { id: 'low', label: 'Self-sufficient — I focused on my own.' },
      { id: 'mid', label: 'Considerate — I noticed and helped where I could.' },
      { id: 'high', label: 'Generous — I went out of my way.' },
    ],
  },
  Cooperation: {
    question: 'How did you handle disagreement today?',
    options: [
      { id: 'low', label: 'Direct — I said what I thought, plainly.' },
      { id: 'mid', label: 'Flexible — I met in the middle.' },
      { id: 'high', label: 'Harmonious — I smoothed it over.' },
    ],
  },
  Modesty: {
    question: 'How did you talk about your own wins today?',
    options: [
      { id: 'low', label: 'Confident — I owned them openly.' },
      { id: 'mid', label: 'Humble — I mentioned them, lightly.' },
      { id: 'high', label: 'Modest — I let them go unmentioned.' },
    ],
  },
  Sympathy: {
    question: "How did someone else's struggle land with you today?",
    options: [
      { id: 'low', label: 'Objective — I stayed clear-headed about it.' },
      { id: 'mid', label: 'Caring — I felt for them.' },
      { id: 'high', label: 'Compassionate — It stayed with me.' },
    ],
  },

  // Conscientiousness
  'Self-Efficacy': {
    question: 'How did you feel about handling what came up today?',
    options: [
      { id: 'low', label: 'Tentative — Unsure I was up to it.' },
      { id: 'mid', label: 'Capable — Confident I could manage it.' },
      { id: 'high', label: 'Masterful — Certain I had it handled.' },
    ],
  },
  Orderliness: {
    question: 'How did you approach your space or plans today?',
    options: [
      { id: 'low', label: 'Spontaneous — Let things fall where they fell.' },
      { id: 'mid', label: 'Organized — Kept a general order to it.' },
      { id: 'high', label: 'Methodical — Everything had its place.' },
    ],
  },
  Dutifulness: {
    question: 'How did you treat a commitment today?',
    options: [
      { id: 'low', label: 'Flexible — I let it slide a little.' },
      { id: 'mid', label: 'Reliable — I followed through as planned.' },
      { id: 'high', label: 'Dutiful — I held to it, no matter what.' },
    ],
  },
  'Achievement-Striving': {
    question: "How much did today's work push toward something bigger?",
    options: [
      { id: 'low', label: 'Laid-back — I did enough to get by.' },
      { id: 'mid', label: 'Driven — I pushed to make progress.' },
      { id: 'high', label: 'Ambitious — I aimed higher than I had to.' },
    ],
  },
  'Self-Discipline': {
    question: 'Did you keep going today even after it stopped feeling easy?',
    options: [
      { id: 'low', label: 'Fluid — I drifted, more than I stuck with it.' },
      { id: 'mid', label: 'Steady — I kept a decent pace.' },
      { id: 'high', label: 'Disciplined — I pushed through without much wavering.' },
    ],
  },
  Cautiousness: {
    question: 'How did you decide something today?',
    options: [
      { id: 'low', label: 'Spontaneous — I went with my gut, fast.' },
      { id: 'mid', label: 'Deliberate — I gave it a beat before deciding.' },
      { id: 'high', label: 'Careful — I thought it through fully before acting.' },
    ],
  },
}

// Fallback for a facet_id not in the table above — shouldn't happen now that
// all 30 real facets are covered, but kept as a safety net rather than
// letting the check-in screen crash on an unrecognized id.
const FALLBACK_PROMPT: CheckInPrompt = {
  question: 'Did today bring up this pattern?',
  options: [
    { id: 'low', label: 'Not really' },
    { id: 'mid', label: 'A little' },
    { id: 'high', label: 'Yes, clearly' },
  ],
}

export function getCheckInPrompt(facetId: string): CheckInPrompt {
  return CHECK_IN_PROMPTS[facetId] ?? FALLBACK_PROMPT
}

// Full label as shown on the check-in screen's button itself — "{Word} —
// {Clause}.", already carrying its own terminal punctuation.
export function checkInOptionLabel(facetId: string, optionId: string): string {
  const prompt = getCheckInPrompt(facetId)
  return prompt.options.find((o) => o.id === optionId)?.label ?? optionId
}

// Just the trait word ("Grounded"), not the full "Grounded — It didn't
// really take hold." sentence — for compact summary contexts (facet-detail's
// "Most recently, you noticed X" / "leaned toward X" lines, quarterly's
// per-facet row, recap's week tiles) where the full clause is both too long
// for the space (a recap tile) and would double up its own trailing period
// against the summary sentence's own ("...noticed "X.".", not "...noticed
// "X..""). Splits on the first " — " in the full label; the fallback
// prompt's options have no " — " at all and come back unchanged.
export function checkInOptionWord(facetId: string, optionId: string): string {
  const label = checkInOptionLabel(facetId, optionId)
  const dashIndex = label.indexOf(' — ')
  return dashIndex === -1 ? label : label.slice(0, dashIndex)
}
