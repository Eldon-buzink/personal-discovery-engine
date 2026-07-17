'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { PatternContent } from '@/lib/known/types'

// ── Behavioral context per facet ─────────────────────────────────────────────
// One-line descriptions of what each facet actually measures behaviorally.
// Used to give the model concrete grounding before it writes copy.

const ENV_DIMENSION_CONTEXT: Record<string, string> = {
  'Autonomy':          'How strongly this person needs control over their own schedule, working conditions, and approach — their drive for self-directed work over managed structures',
  'Competence':        'How much this person is disrupted by interruptions, noise, and surrounding activity — their need for unbroken stretches of quiet, focused time to produce their best work',
  'Structure':         'How much this person needs extended, single-threaded time to do their best work — their preference for deep engagement over task-switching and fragmented attention',
  'Low Interruption':  'How much this person is disrupted by interruptions, noise, and surrounding activity — their need for unbroken stretches of quiet, focused time',
  'Deep Focus':        'How much this person needs extended, uninterrupted concentration to do their best work — their preference for going deep on one thing over rapidly switching between many',
}

const FACET_BEHAVIORAL_CONTEXT: Record<string, string> = {
  // Neuroticism
  Anxiety:               'How much this person tends to worry, anticipate negative outcomes, and feel a background sense of unease',
  Anger:                 'How quickly this person becomes frustrated, irritated, or feels a sense of injustice when things go wrong',
  Depression:            'How often this person experiences low mood, a lack of energy, and a tendency to dwell on the harder side of things',
  'Self-Consciousness':  'How sensitive this person is to being observed or judged — how much social situations activate self-monitoring',
  Immoderation:          'How much this person struggles to resist urges, cravings, or temptations in the moment',
  Vulnerability:         'How much this person feels rattled, overwhelmed, or helpless under pressure or stress',

  // Extraversion
  Friendliness:          'How easily and warmly this person connects with strangers and new people — their natural openness to others',
  Gregariousness:        'How much this person genuinely enjoys being in groups, crowds, and social gatherings',
  Assertiveness:         'How naturally this person takes charge, speaks up, and influences the direction of groups',
  'Activity Level':      'How much this person prefers a fast-paced, busy life and feels energized by having a lot going on',
  'Excitement-Seeking':  'How drawn this person is to novelty, risk, intense stimulation, and the thrill of new experiences',
  Cheerfulness:          'How often this person experiences and expresses positive emotions, joy, and lightheartedness',

  // Openness
  Imagination:           'How actively this person uses fantasy and imagination — how much they live in a rich inner world',
  'Artistic Interests':  'How deeply this person is moved by beauty in art, music, nature, or design',
  Emotionality:          'How much this person is in touch with their own feelings and values emotion as a source of information',
  Adventurousness:       'How eager this person is to try new things, vary their routines, and seek out unfamiliar experiences',
  Intellect:             'How much this person enjoys abstract ideas, intellectual debate, and playing with complex concepts',
  Liberalism:            'How open this person is to questioning authority, tradition, and conventional ways of doing things',

  // Agreeableness
  Trust:                 'How much this person defaults to assuming good faith and benign intent in others',
  Morality:              'How strongly this person values honesty and directness — their discomfort with deception or manipulation',
  Altruism:              'How naturally this person orients toward helping others and finds satisfaction in meeting others\' needs',
  Cooperation:           'How much this person avoids conflict and prefers to accommodate others rather than assert their own position',
  Modesty:               'How much this person downplays their own achievements and avoids calling attention to themselves',
  Sympathy:              'How readily this person feels moved by others\' suffering and is motivated to help',

  // Conscientiousness
  'Self-Efficacy':       'How much this person believes in their own competence and ability to get things done effectively',
  Orderliness:           'How much this person craves structure, tidiness, and having systems in place',
  Dutifulness:           'How strongly this person feels bound by obligations, commitments, and moral duties',
  'Achievement-Striving':'How ambitious and driven this person is — how much they push toward high standards and success',
  'Self-Discipline':     'How well this person can stay on task, resist distractions, and follow through even when motivation drops',
  Cautiousness:          'How much this person deliberates before acting — their tendency to think carefully before committing',
}

// Behavioral descriptions of what each energy category actually means day-to-day.
// Used to ground the model before it writes copy — no SDT theory, just behavior.
const ENERGY_CATEGORY_CONTEXT: Record<string, string> = {
  'Having a say':         'Choosing their own approach, setting their own direction, making real decisions rather than executing someone else\'s plan.',
  'Feeling boxed in':     'Being told exactly how to do something, having no input into decisions that affect them, working within tight constraints they didn\'t choose.',
  'Making real progress': 'Getting better at things that matter, solving hard problems, seeing work move forward in ways that are visible and meaningful.',
  'Feeling stuck':        'Not being able to make progress, hitting walls repeatedly, feeling blocked without a clear path forward.',
  'Real connection':      'Time with people they feel genuinely close to, real conversations rather than surface-level ones, feeling understood rather than just heard.',
  'Feeling unseen':       'Being around people without real connection, social interactions that go nowhere, isolation or not mattering to the people around them.',
}

// Behavioral meaning of both poles of each Working Style axis. Used to ground the
// model on what each end of the spectrum actually looks like day to day.
const WORKING_STYLE_AXIS_CONTEXT: Record<string, { left: string; right: string; leftMeans: string; rightMeans: string }> = {
  structure: {
    left: 'Structured', right: 'Flexible',
    leftMeans: 'Wants a clear plan before starting, prefers knowing what to expect, finds unplanned changes disruptive.',
    rightMeans: 'Prefers to figure things out as they go, does their best work with room to improvise, finds rigid plans constraining.',
  },
  independence: {
    left: 'Independent', right: 'Collaborative',
    leftMeans: 'Does their best thinking alone, prefers to own a piece of work fully rather than share it, gets more done working independently.',
    rightMeans: 'Thinks better out loud with others, prefers bouncing ideas around, gets to better answers by working through problems with someone else.',
  },
  directness: {
    left: 'Direct', right: 'Diplomatic',
    leftMeans: 'Says the honest, blunt thing rather than softening it, will give straight feedback even if it stings.',
    rightMeans: 'Chooses words carefully, reads the room before speaking, holds back a critical opinion if the timing feels wrong.',
  },
}

// Behavioral meaning of each RIASEC type. Used to ground the model before it
// writes copy — no Holland Codes theory or category names, just behavior.
const DIRECTION_TYPE_CONTEXT: Record<string, string> = {
  realistic:     "Prefers tangible, hands-on work — building, fixing, or making things they can see and touch the results of, rather than abstract or purely intellectual work.",
  investigative: "Drawn to analysis and figuring out why something works — research, problem-solving, and understanding underlying causes rather than just symptoms.",
  artistic:      "Needs creative freedom and originality — making something that didn't exist before, resistant to rigid templates or rules.",
  social:        "Motivated by helping people grow — teaching, coaching, or supporting others, finding more meaning in that than in personal credit or higher pay.",
  enterprising:  "Energized by initiating and driving outcomes — persuading people, taking risks on new ventures, leading rather than executing someone else's plan.",
  conventional:  "Thrives with clear systems and order — bringing structure to something messy, getting details exactly right, organizing for others even when it's not their job.",
}

const RELATIONSHIPS_QUADRANT_CONTEXT: Record<string, string> = {
  Open:        'Low on both anxiety and avoidance. Comfortable letting people in, depends on others without distress, and rarely worries about whether relationships are secure. Closeness feels natural rather than threatening.',
  Independent: 'Low anxiety but high avoidance. Not preoccupied with relationships, and prefers more emotional and physical distance — even in close ones. Self-reliant by orientation, not by necessity. Comfortable alone.',
  Attached:    'High anxiety but low avoidance. Wants closeness and doesn\'t shy away from it, but regularly worries whether the connection is mutual, solid, or enough. The concern isn\'t distance — it\'s security.',
  Cautious:    'High on both anxiety and avoidance. Simultaneously worried about relationships and inclined to keep distance from them. Distance functions as protection. May want connection but finds the risk of it difficult to hold.',
}

const SCORE_DIRECTION_DESCRIPTIONS: Record<'high' | 'mid' | 'low', (facet: string) => string> = {
  high: (f) => `This person scores HIGH on ${f} — they strongly and consistently exhibit this trait`,
  mid:  (f) => `This person scores in the MIDDLE on ${f} — they show this trait situationally, not across the board`,
  low:  (f) => `This person scores LOW on ${f} — they tend toward the opposite of this trait`,
}

const SYSTEM_PROMPT =
  'You are writing copy for Known, a personality discovery product. ' +
  'Known surfaces real psychological patterns using IPIP-NEO-120 data. ' +
  'The tone is warm, direct, and precise — never clinical, never flattering, never vague. ' +
  "Write as if you're a sharp friend who actually understands psychology, not a therapist or a fortune cookie."

function buildUserPrompt(
  facetName: string,
  traitWord: string,
  scoreDirection: 'high' | 'mid' | 'low',
  branch?: string,
  strongConditions?: { label: string; traitWord: string; score: number }[]
): string {
  if (branch === 'energy') {
    // Expected order: fuel[0] (top fuel), fuel[1] (2nd fuel), drain[0] (top drain), drain[1] (2nd drain)
    const fuels  = strongConditions?.filter(c => c.label === 'fuel')  ?? []
    const drains = strongConditions?.filter(c => c.label === 'drain') ?? []
    const describe = (c: { traitWord: string; score: number }) =>
      `- ${c.traitWord} (score ${c.score.toFixed(2)} of 5): ${ENERGY_CATEGORY_CONTEXT[c.traitWord] ?? c.traitWord}`
    const fuelLines  = fuels.map(describe).join('\n')
    const drainLines = drains.map(describe).join('\n')

    return `This person's top two energy sources, ranked, are:
${fuelLines}

Their top two energy costs, ranked, are:
${drainLines}

This is NOT a personality trait — it describes the specific conditions that genuinely fill this person up versus the ones that quietly deplete them. The pattern is about context and environment, not character.

Do NOT use the words "autonomy", "competence", "relatedness", "self-determination", "SDT", "intrinsic", "extrinsic", or any academic psychology terminology. Describe what actually happens — behavior, situations, feelings — not theory.

Write the following copy and return as JSON only, no markdown:
{
  "trait_quote": "A 1-2 sentence observation about how this person actually experiences energy in their day — what fills them up, what costs them, and what that gap feels like. First person, present tense. Make it specific and behavioral — something the reader would immediately recognise as true about themselves. Do not name the category labels directly (avoid 'Having a say', 'Real connection' etc.) — describe the felt experience instead.",
  "where_it_shows_up": "2-3 sentences naming a concrete, specific real-world situation where this energy pattern becomes most visible — a type of day, a particular kind of meeting or interaction, a recurring moment of friction or flow. Behavioral and specific, not abstract.",
  "tags": ["3 short behavioral tags", "max 3 words each", "what this energy pattern looks like in action"],
  "go_deeper": "2 sentences. First: name what this pattern costs — the friction or blind spot it creates when conditions don't match. Second: point toward something worth noticing or exploring further — not a prescriptive fix, just something to pay attention to.",
  "worth_trying": "1-2 sentences. A specific, low-stakes experiment for this week — something concrete to notice or adjust in an actual day, tied directly to what their pattern reveals.",
  "items": [
    { "quote": "1 sentence, first person, present tense, specific to the TOP fuel only (${fuels[0]?.traitWord ?? ''}) — not a restatement of the label.", "evidence": "2-3 sentences on the concrete, specific situation where this particular fuel shows up day to day." },
    { "quote": "1 sentence, first person, present tense, specific to the SECOND fuel only (${fuels[1]?.traitWord ?? ''}).", "evidence": "2-3 sentences on where this second fuel shows up. Note how it relates to the top fuel — e.g. whether the two pulls are close in strength and tend to travel together, or the second is more situational." },
    { "quote": "1 sentence, first person, present tense, specific to the TOP drain only (${drains[0]?.traitWord ?? ''}).", "evidence": "2-3 sentences on the concrete, specific situation where this particular drain shows up day to day." },
    { "quote": "1 sentence, first person, present tense, specific to the SECOND drain only (${drains[1]?.traitWord ?? ''}).", "evidence": "2-3 sentences on where this second drain shows up. Note how it relates to the top drain — e.g. whether they compound each other or show up in different situations." }
  ] — exactly 4 objects, in this exact order: top fuel, second fuel, top drain, second drain. Each quote/evidence must be about ONLY that one condition, not a restatement of the overall trait_quote.
}`
  }

  if (branch === 'working_style') {
    // Expected order: structure, independence, directness — matches WorkingStyleVisual's fixed layout.
    const axisLines = (strongConditions ?? []).map((c) => {
      const ctx = WORKING_STYLE_AXIS_CONTEXT[c.label]
      if (!ctx) return `- ${c.label}: leans "${c.traitWord}"`
      return `- ${c.label} axis (position ${c.score.toFixed(2)} of 1, where 0 = fully ${ctx.left}, 1 = fully ${ctx.right}): leans "${c.traitWord}". ${ctx.left} means: ${ctx.leftMeans} ${ctx.right} means: ${ctx.rightMeans}`
    }).join('\n')

    return `This person's working style spans three independent axes:
${axisLines}

Each axis is a spectrum, not a category — most people aren't at the extreme end of any of them. The position tells you how strongly they lean.

This is NOT a personality trait in the Big Five sense — it's a description of how they actually operate day to day: how much structure they want, whether they think better alone or with others, and how directly they communicate.

Do not reference any other assessment section or branch (no mentioning relationships, environment, or energy) — describe this person's working style entirely on its own terms.

Write the following copy and return as JSON only, no markdown:
{
  "trait_quote": "A 1-2 sentence observation about this person's overall working style, touching on the most distinctive of the three axes. First person, present tense. Specific and behavioral — something the reader would immediately recognize as true about themselves.",
  "where_it_shows_up": "2-3 sentences naming a concrete, specific work situation where this combination of axes becomes most visible — a type of meeting, a project kickoff, a moment of friction with a collaborator. Behavioral and specific, not abstract.",
  "tags": ["3 short behavioral tags", "max 3 words each", "what this working style looks like in practice"],
  "go_deeper": "2 sentences. First: name what this combination costs — the friction or blind spot it creates. Second: point toward something worth noticing or exploring further.",
  "worth_trying": "1-2 sentences. A specific, low-stakes experiment for this week tied directly to their pattern.",
  "items": [
    { "quote": "1 sentence, first person, present tense, specific to the STRUCTURE axis only — describes how they actually experience wanting a plan vs. improvising, not a restatement of the label.", "evidence": "2-3 sentences on the concrete, specific situation where this shows up day to day." },
    { "quote": "1 sentence, first person, present tense, specific to the INDEPENDENCE axis only.", "evidence": "2-3 sentences on where this shows up day to day." },
    { "quote": "1 sentence, first person, present tense, specific to the DIRECTNESS axis only.", "evidence": "2-3 sentences on where this shows up day to day." }
  ] — exactly 3 objects, in this exact order: structure, independence, directness. Each quote/evidence must be about ONLY that one axis, not a restatement of the overall trait_quote.
}`
  }

  if (branch === 'direction') {
    // Expected order matches selectShownDirections(): index 0 is always the closest
    // match (rank 1); any remaining entries (1-2 more) are close contenders.
    const count = strongConditions?.length ?? 0
    const lines = (strongConditions ?? []).map((c, i) => {
      const ctx = DIRECTION_TYPE_CONTEXT[c.label] ?? c.label
      const tier = i === 0 ? 'Closest match' : 'Worth exploring'
      return `- ${c.traitWord} (${tier}, score ${c.score.toFixed(2)} of 5): ${ctx}`
    }).join('\n')

    return `This person's interests point to ${count === 1 ? 'one clear direction' : `${count} real directions`}:
${lines}

These are NOT career titles or job recommendations — they're patterns of work that fit how this person is built, not a prescription for what job to take.

Do NOT use the words "Holland", "RIASEC", "realistic", "investigative", "artistic", "social", "enterprising", "conventional", or any category name — describe what actually fits, in plain behavioral language.

Write the following copy and return as JSON only, no markdown:
{
  "trait_quote": "A 1-2 sentence observation about the overall pull toward ${count === 1 ? 'this direction' : 'these directions'}. First person, present tense. Specific and behavioral — something the reader would immediately recognize as true about themselves.",
  "where_it_shows_up": "2-3 sentences naming a concrete, specific situation — a type of project, a moment choosing between two paths — where this pull becomes most visible.",
  "tags": ["3 short behavioral tags", "max 3 words each", "what this direction looks like in practice"],
  "go_deeper": "2 sentences. First: name the tension or cost of this pull — what it can mean settling for, or overlooking. Second: point toward something worth noticing or exploring further.",
  "worth_trying": "1-2 sentences. A specific, low-stakes experiment for this week tied directly to this pattern.",
  "teaserWord": "ONE evocative single word — not a phrase, not a category name — that works as an archetype for the TOP-ranked direction only (${strongConditions?.[0]?.traitWord ?? ''}). Style example: 'Builder', 'Analyst', 'Connector', 'Strategist'. Must be exactly one word.",
  "items": [
    { "word": "A short action-phrase, 4-8 words (style example: 'Make something with your hands'), describing what this specific direction actually looks like in practice.", "quote": "1 sentence, first person, present tense — a short collapsed-state summary of why this direction fits.", "evidence": "2-3 sentences for the expanded state — the fuller case for this one direction. Specific to it only, not a restatement of the overall trait_quote." }
  ] — exactly ${count} object${count === 1 ? '' : 's'}, one per direction listed above, in the SAME ORDER (closest match first). Each item's word/quote/evidence must be specific to only that one direction.
}`
  }

  if (branch === 'relationships') {
    const quadrantContext = RELATIONSHIPS_QUADRANT_CONTEXT[traitWord] ?? `The ${traitWord} attachment pattern`

    return `This person's attachment pattern is "${traitWord}".

What this pattern actually means: ${quadrantContext}.

This is NOT a judgement about whether they're a good partner or friend — it's a description of how they are wired around closeness, reliance, and emotional proximity.

Write the following copy and return as JSON only, no markdown:
{
  "trait_quote": "A 1-2 sentence observation about how this person actually experiences close relationships — what they notice in themselves, what they feel or avoid feeling. First person, present tense. Make it specific and behavioral — something the reader would immediately recognise as true about themselves. Do not use the words 'anxiety', 'avoidance', 'attachment', 'Open', 'Independent', 'Attached', or 'Cautious'. Example for Open: 'Most relationships don't feel like a balancing act to you. You can lean on people when you need to, and you don't spend much time wondering where you stand.'",
  "where_it_shows_up": "2-3 sentences naming a concrete, specific real-world situation where this pattern becomes most visible — a moment of tension, a type of conversation, a recurring dynamic with someone close. Behavioral and specific, not abstract.",
  "tags": ["3 short behavioral tags", "max 3 words each", "what this attachment pattern looks like in action"],
  "go_deeper": "2 sentences. First: name what this pattern costs — the friction or blind spot it creates in real relationships. Second: point toward something worth noticing or exploring further — not a prescriptive fix, just something to pay attention to.",
  "worth_trying": "1-2 sentences. A specific, low-stakes experiment for this week — something concrete to notice or try in an actual relationship, tied directly to what their pattern reveals."
}`
  }

  if (branch === 'environment') {
    const behavioralContext = ENV_DIMENSION_CONTEXT[facetName] ?? `The ${facetName} environmental dimension`
    const directionDesc = SCORE_DIRECTION_DESCRIPTIONS[scoreDirection](facetName)

    let combinationNote = ''
    if (strongConditions && strongConditions.length > 1) {
      combinationNote = `\n\nThis person shows strong patterns across multiple environmental dimensions:\n` +
        strongConditions.map(sc => `- ${sc.label}: "${sc.traitWord}" (score: ${sc.score.toFixed(1)})`).join('\n') +
        `\n\nThe primary dimension is ${facetName}. Write copy that describes the combination — how these needs interact or reinforce each other — rather than focusing on only one.`
    }

    return `${directionDesc}.

What ${facetName} actually measures as an environmental condition: ${behavioralContext}.

Their primary environment pattern word is "${traitWord}".${combinationNote}

This is NOT a personality trait — it's an environmental condition that determines when and where this person does their best work.

Write the following copy and return as JSON only, no markdown:
{
  "trait_quote": "A 1-2 sentence observation about this person's environmental needs. First person, present tense. Make it specific and behavioral — what they actually notice in themselves, not a label. Example for Deep Focus: 'You don't do your best thinking in short windows. You need time to actually sink in before you can produce anything that feels like real work.'",
  "where_it_shows_up": "2-3 sentences naming a concrete, specific real-world situation where this environmental need becomes most visible — a specific work scenario, type of day, or recurring moment of friction. Behavioral and specific, not abstract.",
  "tags": ["3 short behavioral tags", "max 3 words each", "what this environmental pattern looks like in practice"],
  "go_deeper": "2 sentences. First: name the cost — what happens to this person when their environment doesn't match their needs. Second: point toward a related pattern or something worth exploring further.",
  "worth_trying": "1-2 sentences. A specific, practical change this person can try this week to better match their environment to their actual needs. Not generic advice — tied directly to what their pattern reveals."
}`
  }

  const behavioralContext = FACET_BEHAVIORAL_CONTEXT[facetName] ?? `The ${facetName} facet of personality`
  const directionDesc = SCORE_DIRECTION_DESCRIPTIONS[scoreDirection](facetName)

  return `${directionDesc}.

What ${facetName} actually measures: ${behavioralContext}.

Their trait word is "${traitWord}".

Write the following copy and return as JSON only, no markdown:
{
  "trait_quote": "A 1-2 sentence behavioral observation. First person, present tense. Must describe a specific behavior or internal experience the user would immediately recognize in themselves — NOT a restatement of the facet name or domain. Do not use the words '${facetName}' or any IPIP domain names (Neuroticism, Extraversion, Openness, Agreeableness, Conscientiousness). Focus on what this actually looks like day-to-day. Example for high Cautiousness: 'You tend to sit with a decision longer than most people around you. It's not hesitation — it's that you genuinely want to understand what you're committing to before you do.'",
  "where_it_shows_up": "2-3 sentences naming a concrete, specific real-world situation where this trait is most visible — a meeting, a conversation, a decision moment. Behavioral and specific, not abstract. Do not name the facet directly.",
  "tags": ["3 short behavioral tags", "max 3 words each", "what this looks like in action"],
  "go_deeper": "2 sentences. First: name the shadow side or blind spot of this trait — what it costs this person or where it can work against them. Second: point toward a related pattern worth exploring next.",
  "worth_trying": "1-2 sentences. A specific, actionable experiment for this week — not a generic mindfulness tip. It should be directly tied to the behavioral reality of their score on this facet."
}`
}

function fallbackContent(
  facetName: string,
  traitWord: string,
  branch?: string,
  strongConditions?: { label: string; traitWord: string; score: number }[]
): PatternContent {
  const base: PatternContent = {
    trait_quote: `You showed a clear signal in the ${facetName} dimension of your personality. This pattern shapes more of your daily life than you might expect.`,
    where_it_shows_up: `It tends to surface when decisions require sustained attention or deliberate pacing. Most visible in how you handle competing demands on your time and energy.`,
    tags: [traitWord, facetName, 'Signal found'],
    go_deeper: `Every trait carries a shadow: the same quality that serves you in some contexts can work against you in others. There's more nuance underneath this pattern worth exploring.`,
    worth_trying: `This week, notice one moment where this pattern shows up in a decision you're making. Just observe it — no need to change anything yet.`,
  }

  if (
    (branch === 'energy' && strongConditions?.length === 4) ||
    (branch === 'working_style' && strongConditions?.length === 3) ||
    (branch === 'direction' && strongConditions && strongConditions.length >= 1 && strongConditions.length <= 3)
  ) {
    base.items = strongConditions!.map((c) => ({
      ...(branch === 'direction' ? { word: c.traitWord } : {}),
      quote: `${c.traitWord} showed up as a clear signal in how you answered.`,
      evidence: `This is one of the more consistent patterns in your responses — worth noticing where it shows up in an actual day.`,
    }))
  }

  if (branch === 'direction') {
    base.teaserWord = traitWord
  }

  return base
}

export async function generatePatternCopy(
  facetName: string,
  traitWord: string,
  scoreDirection: 'high' | 'mid' | 'low',
  assessmentId: string | null,
  branch?: string,
  strongConditions?: { label: string; traitWord: string; score: number }[]
): Promise<PatternContent> {
  console.log('[generatePatternCopy] called with:', { facetName, traitWord, scoreDirection, assessmentId, branch, strongConditions })
  let content: PatternContent

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    console.log('[generatePatternCopy] calling Anthropic...')

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1536,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(facetName, traitWord, scoreDirection, branch, strongConditions) }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonText = rawText.replace(/^```(?:json)?\n?|```\s*$/gm, '').trim()
    content = JSON.parse(jsonText) as PatternContent
    console.log('[generatePatternCopy] success:', content)
  } catch (err) {
    console.error('[generatePatternCopy] generation failed:', err)
    content = fallbackContent(facetName, traitWord, branch, strongConditions)
  }

  // Persist to Supabase — fire-and-forget. Content is already final at this point;
  // the UI doesn't need to wait on this write, and failures here are non-critical
  // (already just logged, never surfaced to the user).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  supabase.from('report_content').insert({
    assessment_id: assessmentId ?? null,
    facet: facetName,
    trait_word: traitWord,
    score_direction: scoreDirection,
    trait_quote: content.trait_quote,
    where_it_shows_up: content.where_it_shows_up,
    tags: content.tags,
    go_deeper: content.go_deeper,
    worth_trying: content.worth_trying,
  }).then(undefined, (dbErr) => console.error('[generatePatternCopy] db insert failed:', dbErr))

  return content
}
