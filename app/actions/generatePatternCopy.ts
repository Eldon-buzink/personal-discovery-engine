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

function fallbackContent(facetName: string, traitWord: string): PatternContent {
  return {
    trait_quote: `You showed a clear signal in the ${facetName} dimension of your personality. This pattern shapes more of your daily life than you might expect.`,
    where_it_shows_up: `It tends to surface when decisions require sustained attention or deliberate pacing. Most visible in how you handle competing demands on your time and energy.`,
    tags: [traitWord, facetName, 'Signal found'],
    go_deeper: `Every trait carries a shadow: the same quality that serves you in some contexts can work against you in others. There's more nuance underneath this pattern worth exploring.`,
    worth_trying: `This week, notice one moment where this pattern shows up in a decision you're making. Just observe it — no need to change anything yet.`,
  }
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
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(facetName, traitWord, scoreDirection, branch, strongConditions) }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonText = rawText.replace(/^```(?:json)?\n?|```\s*$/gm, '').trim()
    content = JSON.parse(jsonText) as PatternContent
    console.log('[generatePatternCopy] success:', content)
  } catch (err) {
    console.error('[generatePatternCopy] generation failed:', err)
    content = fallbackContent(facetName, traitWord)
  }

  // Persist to Supabase (non-critical — swallow failures)
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('report_content').insert({
      assessment_id: assessmentId ?? null,
      facet: facetName,
      trait_word: traitWord,
      score_direction: scoreDirection,
      trait_quote: content.trait_quote,
      where_it_shows_up: content.where_it_shows_up,
      tags: content.tags,
      go_deeper: content.go_deeper,
      worth_trying: content.worth_trying,
    })
  } catch (dbErr) {
    console.error('[generatePatternCopy] db insert failed:', dbErr)
  }

  return content
}
