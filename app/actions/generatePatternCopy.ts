'use server'

import Anthropic from '@anthropic-ai/sdk'
import { getSessionUser } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitKey } from '@/lib/server/rateLimit'
import { requestIp } from '@/lib/server/siteOrigin'
import { parsePatternCopyRequest, parseRing1Answers, type PatternCopyRequest } from '@/lib/server/patternCopyInput'
import { evidenceFor, type EvidenceItem, type FacetAnswer } from '@/lib/known/ring1Evidence'
import { claimFreeReveal, isFreeRevealed, isPaidUser } from '@/lib/server/entitlement'
import { parseRelationshipRequest, type RelationshipRequest } from '@/lib/server/relationshipInput'
import { RELATIONSHIP_INSIGHT_SCHEMA, checkInsightText, finishInsight } from '@/lib/known/relationshipInsight'
import type { FiredSignal } from '@/lib/known/relationships'
import type { PatternContent } from '@/lib/known/types'
import {
  RING1_CARD_SCHEMA,
  checkRing1CardText,
  finishRing1Card,
  isHarderTrait,
  type Ring1Card,
} from '@/lib/known/ring1Card'
import { CONTRAST_NOTE, betterAttempt, retryFeedback } from '@/lib/known/copyChecks'
import { attemptTimeout, temperatureFor } from '@/lib/known/modelOptions'

// ── Behavioral context per facet ─────────────────────────────────────────────
// One-line descriptions of what each facet actually measures behaviorally.
// Used to give the model concrete grounding before it writes copy.

const ENV_DIMENSION_CONTEXT: Record<string, string> = {
  'Autonomy':          'How strongly this person needs control over their own schedule, working conditions, and approach: their drive for self-directed work over managed structures',
  'Competence':        'How much this person is disrupted by interruptions, noise, and surrounding activity: their need for unbroken stretches of quiet, focused time to produce their best work',
  'Structure':         'How much this person needs extended, single-threaded time to do their best work: their preference for deep engagement over task-switching and fragmented attention',
  'Low Interruption':  'How much this person is disrupted by interruptions, noise, and surrounding activity: their need for unbroken stretches of quiet, focused time',
  'Deep Focus':        'How much this person needs extended, uninterrupted concentration to do their best work: their preference for going deep on one thing over rapidly switching between many',
}

const FACET_BEHAVIORAL_CONTEXT: Record<string, string> = {
  // Neuroticism
  Anxiety:               'How much this person tends to worry, anticipate negative outcomes, and feel a background sense of unease',
  Anger:                 'How quickly this person becomes frustrated, irritated, or feels a sense of injustice when things go wrong',
  Depression:            'How often this person experiences low mood, a lack of energy, and a tendency to dwell on the harder side of things',
  'Self-Consciousness':  'How sensitive this person is to being observed or judged: how much social situations activate self-monitoring. It supports feeling watched, embarrassed or self-aware in the moment, and nothing about replaying slips afterwards or where the person sits or stands',
  Immoderation:          'How much this person struggles to resist urges, cravings, or temptations in the moment',
  Vulnerability:         'How much this person feels rattled, overwhelmed, or helpless under pressure or stress',

  // Extraversion
  Friendliness:          'How easily and warmly this person connects with strangers and new people: their natural openness to others',
  Gregariousness:        'How much this person genuinely enjoys being in groups, crowds, and social gatherings',
  Assertiveness:         'How naturally this person takes charge, speaks up, and influences the direction of groups',
  'Activity Level':      'How much this person prefers a fast-paced, busy life and feels energized by having a lot going on',
  'Excitement-Seeking':  'How drawn this person is to novelty, risk, intense stimulation, and the thrill of new experiences',
  Cheerfulness:          'How often this person experiences and expresses positive emotions, joy, and lightheartedness. It supports how often joy and laughter show, and gives no downside for a high score, so none is invented',

  // Openness
  Imagination:           'How actively this person uses fantasy and imagination: how much they live in a rich inner world',
  'Artistic Interests':  'How deeply this person is moved by beauty in art, music, nature, or design. It supports being moved or unmoved by beauty itself, and names no places or venues (no galleries, concerts or museums)',
  Emotionality:          'How much this person is in touch with their own feelings and values emotion as a source of information',
  Adventurousness:       'How eager this person is to try new things, vary their routines, and seek out unfamiliar experiences',
  Intellect:             'How much this person enjoys abstract ideas, intellectual debate, and playing with complex concepts',
  Liberalism:            'How open this person is to questioning traditions, authority and established values. Liberalism here means only that openness, never politics, left or right, parties or voting',

  // Agreeableness
  Trust:                 'How much this person defaults to assuming good faith and benign intent in others',
  Morality:              'How strongly this person values honesty and directness: their discomfort with deception or manipulation',
  Altruism:              'How naturally this person orients toward helping others and finds satisfaction in meeting others\' needs',
  Cooperation:           'How much this person avoids conflict and prefers to accommodate others rather than assert their own position',
  Modesty:               'How much this person downplays their own achievements and avoids calling attention to themselves',
  Sympathy:              'How readily this person feels moved by others\' suffering and is motivated to help',

  // Conscientiousness
  'Self-Efficacy':       'How much this person believes in their own competence and ability to get things done effectively',
  Orderliness:           'How much this person craves structure, tidiness, and having systems in place',
  Dutifulness:           'How strongly this person feels bound by obligations, commitments, and moral duties',
  'Achievement-Striving':'How ambitious and driven this person is: how much they push toward high standards and success',
  'Self-Discipline':     'How well this person can stay on task, resist distractions, and follow through even when motivation drops',
  Cautiousness:          'How much this person deliberates before acting: their tendency to think carefully before committing',
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
  realistic:     "Prefers tangible, hands-on work: building, fixing, or making things they can see and touch the results of, rather than abstract or purely intellectual work.",
  investigative: "Drawn to analysis and figuring out why something works: research, problem-solving, and understanding underlying causes rather than just symptoms.",
  artistic:      "Needs creative freedom and originality: making something that didn't exist before, resistant to rigid templates or rules.",
  social:        "Motivated by helping people grow: teaching, coaching, or supporting others, finding more meaning in that than in personal credit or higher pay.",
  enterprising:  "Energized by initiating and driving outcomes: persuading people, taking risks on new ventures, leading rather than executing someone else's plan.",
  conventional:  "Thrives with clear systems and order: bringing structure to something messy, getting details exactly right, organizing for others even when it's not their job.",
}

const RELATIONSHIPS_QUADRANT_CONTEXT: Record<string, string> = {
  Open:        'Low on both anxiety and avoidance. Comfortable letting people in, depends on others without distress, and rarely worries about whether relationships are secure. Closeness feels natural rather than threatening.',
  Independent: 'Low anxiety but high avoidance. Not preoccupied with relationships, and prefers more emotional and physical distance, even in close ones. Self-reliant by orientation, not by necessity. Comfortable alone.',
  Attached:    'High anxiety but low avoidance. Wants closeness and doesn\'t shy away from it, but regularly worries whether the connection is mutual, solid, or enough. The concern is security, more than distance.',
  Cautious:    'High on both anxiety and avoidance. Simultaneously worried about relationships and inclined to keep distance from them. Distance functions as protection. May want connection but finds the risk of it difficult to hold.',
}

const SCORE_DIRECTION_DESCRIPTIONS: Record<'high' | 'mid' | 'low', (facet: string) => string> = {
  high: (f) => `This person scores HIGH on ${f}: they strongly and consistently exhibit this trait`,
  mid:  (f) => `This person scores in the MIDDLE on ${f}: they show this trait situationally, not across the board`,
  low:  (f) => `This person scores LOW on ${f}: they tend toward the opposite of this trait`,
}

const SYSTEM_PROMPT =
  'You are writing copy for Bearing, a personality discovery product. ' +
  'Bearing surfaces real psychological patterns using IPIP-NEO-120 data. ' +
  'The tone is warm, direct, and precise. Never clinical, never flattering, never vague. ' +
  "Write as if you're a sharp friend who actually understands psychology. " +
  'Never use em dashes or en dashes. Never write "it\'s not X, it\'s Y", "this isn\'t X, it\'s Y" or "not just X".'

// ── Ring 1 trait cards ───────────────────────────────────────────────────────
// Separate from SYSTEM_PROMPT / SCORE_DIRECTION_DESCRIPTIONS above, which the
// branch cards keep using unchanged. Ring 1 cards describe; they never advise.

const RING1_SYSTEM_PROMPT =
  'You write short descriptions for Bearing, a personality product based on IPIP-NEO-120. ' +
  "You describe patterns in a person's answers. You do not advise, diagnose, praise or predict. " +
  'Use plain, warm, precise language, like a smart friend. Speak to the reader as "you". ' +
  'Use "tends to" and "often" for anything that depends on the situation. Never tell the reader what to do. ' +
  'No clinical or diagnostic words. Mention an upside and a downside only where the behaviour itself supports them, ' +
  'without labelling them. Never invent details the description does not give.'

// Four items per facet can't support "strongly and consistently" or
// "situationally" — this only says which way the answers lean.
const RING1_SCORE_DIRECTION: Record<'high' | 'mid' | 'low', string> = {
  high: 'Their answers lean clearly toward this trait.',
  mid: "Their answers sit in the middle: a mix of both ends. Do NOT claim they are 'situational'. Describe the range and acknowledge it may vary.",
  low: 'Their answers lean clearly toward the opposite of this trait.',
}

const RING1_EXAMPLES = `Examples of the quality to aim for. Use your own wording:

Cautiousness, high
{"trait_quote": "You like to think a decision all the way through before you commit.", "body": "It often shows when a choice has to be made and you still have one more question. That care tends to make your choices solid. It can also mean missing the moment when waiting was the bigger risk.", "tags": ["Weighs it first", "Hard to rush", "Commits late"]}

Anxiety, mid
{"trait_quote": "Worry shows up when something seems to matter, and stays quiet when it doesn't.", "body": "Your answers sit in the middle, so the amount may change a lot from one situation to the next. That keeps you alert without running your day. It can also make it hard to tell, in the moment, which kind of worry you're feeling.", "tags": ["Selective worry", "Stays alert", "Varies by day"]}

Vulnerability, high (a harder trait: no strength is invented)
{"trait_quote": "When a lot lands at once, it can feel like more than you can handle.", "body": "It often shows up when pressure builds or several things go wrong together. In those moments the feeling tends to take over your day, and calm can be slow to come back.", "tags": ["Feels swamped", "Rattled by pressure", "Slow to settle"]}`

// Shared by the card and insight prompts.
const GROUNDING_RULES = `- Never describe what other people think, feel, notice, say or do in reaction to the person (no "others miss", "friends wish", "people read you as"). Mention other people only as part of the behaviour itself.
- A low score means the feeling or tendency is weak, never hidden or suppressed. Never write that a low-scoring person feels something but does not show it.
- No concrete objects, places, people or events that the description or answers do not name (no meals, money, shopping, replayed words).
- No judgement words about the person's goals or choices (no "wishing bigger", "worth it", "settling").
- Never mention religion, faith, politics, parties, voting or sexuality.`

// The facet's IPIP name invites politics; the card is about questioning
// traditions, never about how someone votes.
const LIBERALISM_RULE = 'Liberalism here means openness to questioning traditions, authority and established values. Never mention politics, left or right, parties or voting.'

const HARDER_TRAIT_RULE = 'do not invent a strength. If the description gives none, describe the pattern and how it affects the person\'s day, nothing more.'

const RING1_HARDER_FACETS = 'high Anxiety, Anger, Vulnerability, Depression, Self-Consciousness, Immoderation, or low Self-Efficacy'

function buildRing1Prompt(
  facetName: string,
  traitWord: string,
  scoreDirection: 'high' | 'mid' | 'low',
  evidence: EvidenceItem[] = []
): string {
  const behavioralContext = FACET_BEHAVIORAL_CONTEXT[facetName] ?? `The ${facetName} facet of personality`
  // The person's own most strongly held answers (item text from the
  // question list, never from the browser), so the card builds on what
  // they said instead of inventing specifics.
  const evidenceBlock = evidence.length === 0 ? '' :
    `\nTheir most strongly held answers on this facet:\n` +
    evidence.map((e) => `- They ${e.direction === 'agree' ? 'agreed' : 'disagreed'} with: "${e.text}"`).join('\n') +
    `\nBuild on these where they fit. Do not quote them verbatim or mention that they come from their answers.\n`
  return `Facet: ${facetName}. ${RING1_SCORE_DIRECTION[scoreDirection]}

What ${facetName} measures: ${behavioralContext}.

Their trait word is "${traitWord}".
${evidenceBlock}
Write:
- trait_quote: 1-2 sentences. Second person ("you"), present tense. A behaviour or inner experience the reader would recognise. Do not use the words "${facetName}" or any domain name (Neuroticism, Extraversion, Openness, Agreeableness, Conscientiousness).
- body: 2-3 sentences of flowing prose with no labels. First describe where the behaviour tends to show up, then the upside and the downside of that same behaviour. Each of these must follow directly from the behaviour description and the answers above. If they support only one side, write only that side. Never invent the other.
- tags: exactly 3 tags, 2-3 words each, never more than 3. Natural phrases someone would say about themselves, not participle fragments or abstract nouns.

Rules:
- trait_quote and body together: about 70 words at most.
- Do not begin every trait_quote with "You tend to". Vary sentence openings.
- Situations are framed as tendencies ("it often shows up when…"), never as events that happened.
- Self-check: if a sentence would fit most people, make it more specific to this behaviour, without adding new details.
- No imperatives ("try", "consider", "notice", "make sure"), no advice.
- Use plain everyday words a 12-year-old would follow.
- Keep sentences under about 18 words, one idea per sentence.
- At most one "tends to" or "can" per sentence.
- No semicolons, em dashes or en dashes. No abstract nouns where a verb works.
- Never write "it's not X, it's Y", "this isn't X, it's Y" or "not just X". Say what it is.
- Never write "the payoff", "the cost" or "the price" as labels. Never start a sentence with "The trade is", "The trade-off is", "The cost is", "The price is", "The payoff is", "The upside is" or "The downside is".
- Every sentence must describe this facet's behaviour as described above. Add no other traits or outcomes.
- No abstract nouns or invented phrases (like "naive harm" or "withheld certainty"). Say what the person does or feels.
- If a sentence could just as well be about a different facet, rewrite it so it is clearly about this one.
- Do not add outcomes, feelings or situations that the supplied behaviour description does not state.
${GROUNDING_RULES}${facetName === 'Liberalism' ? `\n- ${LIBERALISM_RULE}` : ''}
- For harder traits (${RING1_HARDER_FACETS}), ${HARDER_TRAIT_RULE}${isHarderTrait(facetName, scoreDirection) ? `\n- This card is a harder trait: ${HARDER_TRAIT_RULE}` : ''}

Tags, good examples (2-3 words, never more than 3): "Starts quickly", "Slow to trust", "Likes variety", "Weighs it first", "Stays alert".

${RING1_EXAMPLES}

Return JSON only, no markdown: {"trait_quote": "...", "body": "...", "tags": ["...", "...", "..."]}`
}

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

This describes the specific conditions that genuinely fill this person up versus the ones that quietly deplete them. The pattern is about context and environment, not character.

Do NOT use the words "autonomy", "competence", "relatedness", "self-determination", "SDT", "intrinsic", "extrinsic", or any academic psychology terminology. Describe what actually happens (behavior, situations, feelings), not theory.

Write the following copy and return as JSON only, no markdown:
{
  "trait_quote": "A 1-2 sentence observation about how this person actually experiences energy in their day: what fills them up, what costs them, and what that gap feels like. First person, present tense. Make it specific and behavioral: something the reader would immediately recognise as true about themselves. Do not name the category labels directly (avoid 'Having a say', 'Real connection' etc.): describe the felt experience instead.",
  "where_it_shows_up": "2-3 sentences naming a concrete, specific real-world situation where this energy pattern becomes most visible: a type of day, a particular kind of meeting or interaction, a recurring moment of friction or flow. Behavioral and specific, not abstract.",
  "tags": ["3 short behavioral tags", "max 3 words each", "what this energy pattern looks like in action"],
  "go_deeper": "2 sentences. First: name what this pattern costs: the friction or blind spot it creates when conditions don't match. Second: point toward something worth noticing or exploring further: not a prescriptive fix, just something to pay attention to.",
  "worth_trying": "1-2 sentences. A specific, low-stakes experiment for this week: something concrete to notice or adjust in an actual day, tied directly to what their pattern reveals.",
  "items": [
    { "quote": "1 sentence, first person, present tense, specific to the TOP fuel only (${fuels[0]?.traitWord ?? ''}): not a restatement of the label.", "evidence": "2-3 sentences on the concrete, specific situation where this particular fuel shows up day to day." },
    { "quote": "1 sentence, first person, present tense, specific to the SECOND fuel only (${fuels[1]?.traitWord ?? ''}).", "evidence": "2-3 sentences on where this second fuel shows up. Note how it relates to the top fuel: e.g. whether the two pulls are close in strength and tend to travel together, or the second is more situational." },
    { "quote": "1 sentence, first person, present tense, specific to the TOP drain only (${drains[0]?.traitWord ?? ''}).", "evidence": "2-3 sentences on the concrete, specific situation where this particular drain shows up day to day." },
    { "quote": "1 sentence, first person, present tense, specific to the SECOND drain only (${drains[1]?.traitWord ?? ''}).", "evidence": "2-3 sentences on where this second drain shows up. Note how it relates to the top drain: e.g. whether they compound each other or show up in different situations." }
  ]: exactly 4 objects, in this exact order: top fuel, second fuel, top drain, second drain. Each quote/evidence must be about ONLY that one condition, not a restatement of the overall trait_quote.
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

Each axis is a spectrum, not a category: most people aren't at the extreme end of any of them. The position tells you how strongly they lean.

This describes how they actually operate day to day, outside the Big Five traits: how much structure they want, whether they think better alone or with others, and how directly they communicate.

Do not reference any other assessment section or branch (no mentioning relationships, environment, or energy): describe this person's working style entirely on its own terms.

Write the following copy and return as JSON only, no markdown:
{
  "trait_quote": "A 1-2 sentence observation about this person's overall working style, touching on the most distinctive of the three axes. First person, present tense. Specific and behavioral: something the reader would immediately recognize as true about themselves.",
  "where_it_shows_up": "2-3 sentences naming a concrete, specific work situation where this combination of axes becomes most visible: a type of meeting, a project kickoff, a moment of friction with a collaborator. Behavioral and specific, not abstract.",
  "tags": ["3 short behavioral tags", "max 3 words each", "what this working style looks like in practice"],
  "go_deeper": "2 sentences. First: name what this combination costs: the friction or blind spot it creates. Second: point toward something worth noticing or exploring further.",
  "worth_trying": "1-2 sentences. A specific, low-stakes experiment for this week tied directly to their pattern.",
  "items": [
    { "quote": "1 sentence, first person, present tense, specific to the STRUCTURE axis only: describes how they actually experience wanting a plan vs. improvising, not a restatement of the label.", "evidence": "2-3 sentences on the concrete, specific situation where this shows up day to day." },
    { "quote": "1 sentence, first person, present tense, specific to the INDEPENDENCE axis only.", "evidence": "2-3 sentences on where this shows up day to day." },
    { "quote": "1 sentence, first person, present tense, specific to the DIRECTNESS axis only.", "evidence": "2-3 sentences on where this shows up day to day." }
  ]: exactly 3 objects, in this exact order: structure, independence, directness. Each quote/evidence must be about ONLY that one axis, not a restatement of the overall trait_quote.
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

These are patterns of work that fit how this person is built. They are not career titles, job recommendations or a prescription for what job to take.

Do NOT use the words "Holland", "RIASEC", "realistic", "investigative", "artistic", "social", "enterprising", "conventional", or any category name: describe what actually fits, in plain behavioral language.

Write the following copy and return as JSON only, no markdown:
{
  "trait_quote": "A 1-2 sentence observation about the overall pull toward ${count === 1 ? 'this direction' : 'these directions'}. First person, present tense. Specific and behavioral: something the reader would immediately recognize as true about themselves.",
  "where_it_shows_up": "2-3 sentences naming a concrete, specific situation (a type of project, a moment choosing between two paths) where this pull becomes most visible.",
  "tags": ["3 short behavioral tags", "max 3 words each", "what this direction looks like in practice"],
  "go_deeper": "2 sentences. First: name the tension or cost of this pull: what it can mean settling for, or overlooking. Second: point toward something worth noticing or exploring further.",
  "worth_trying": "1-2 sentences. A specific, low-stakes experiment for this week tied directly to this pattern.",
  "teaserWord": "ONE evocative single word (not a phrase, not a category name) that works as an archetype for the TOP-ranked direction only (${strongConditions?.[0]?.traitWord ?? ''}). Style example: 'Builder', 'Analyst', 'Connector', 'Strategist'. Must be exactly one word.",
  "items": [
    { "word": "A short action-phrase, 4-8 words (style example: 'Make something with your hands'), describing what this specific direction actually looks like in practice.", "quote": "1 sentence, first person, present tense: a short collapsed-state summary of why this direction fits.", "evidence": "2-3 sentences for the expanded state: the fuller case for this one direction. Specific to it only, not a restatement of the overall trait_quote." }
  ]: exactly ${count} object${count === 1 ? '' : 's'}, one per direction listed above, in the SAME ORDER (closest match first). Each item's word/quote/evidence must be specific to only that one direction.
}`
  }

  if (branch === 'relationships') {
    const quadrantContext = RELATIONSHIPS_QUADRANT_CONTEXT[traitWord] ?? `The ${traitWord} attachment pattern`

    return `This person's attachment pattern is "${traitWord}".

What this pattern actually means: ${quadrantContext}.

This describes how they are wired around closeness, reliance, and emotional proximity. It makes no judgement about whether they're a good partner or friend.

Write the following copy and return as JSON only, no markdown:
{
  "trait_quote": "A 1-2 sentence observation about how this person actually experiences close relationships: what they notice in themselves, what they feel or avoid feeling. First person, present tense. Make it specific and behavioral: something the reader would immediately recognise as true about themselves. Do not use the words 'anxiety', 'avoidance', 'attachment', 'Open', 'Independent', 'Attached', or 'Cautious'. Example for Open: 'Most relationships don't feel like a balancing act to you. You can lean on people when you need to, and you don't spend much time wondering where you stand.'",
  "where_it_shows_up": "2-3 sentences naming a concrete, specific real-world situation where this pattern becomes most visible: a moment of tension, a type of conversation, a recurring dynamic with someone close. Behavioral and specific, not abstract.",
  "tags": ["3 short behavioral tags", "max 3 words each", "what this attachment pattern looks like in action"],
  "go_deeper": "2 sentences. First: name what this pattern costs: the friction or blind spot it creates in real relationships. Second: point toward something worth noticing or exploring further: not a prescriptive fix, just something to pay attention to.",
  "worth_trying": "1-2 sentences. A specific, low-stakes experiment for this week: something concrete to notice or try in an actual relationship, tied directly to what their pattern reveals."
}`
  }

  if (branch === 'environment') {
    const behavioralContext = ENV_DIMENSION_CONTEXT[facetName] ?? `The ${facetName} environmental dimension`
    const directionDesc = SCORE_DIRECTION_DESCRIPTIONS[scoreDirection](facetName)

    let combinationNote = ''
    if (strongConditions && strongConditions.length > 1) {
      combinationNote = `\n\nThis person shows strong patterns across multiple environmental dimensions:\n` +
        strongConditions.map(sc => `- ${sc.label}: "${sc.traitWord}" (score: ${sc.score.toFixed(1)})`).join('\n') +
        `\n\nThe primary dimension is ${facetName}. Write copy that describes the combination (how these needs interact or reinforce each other) rather than focusing on only one.`
    }

    return `${directionDesc}.

What ${facetName} actually measures as an environmental condition: ${behavioralContext}.

Their primary environment pattern word is "${traitWord}".${combinationNote}

This describes an environmental condition that determines when and where this person does their best work. It is a condition, separate from personality traits.

Write the following copy and return as JSON only, no markdown:
{
  "trait_quote": "A 1-2 sentence observation about this person's environmental needs. First person, present tense. Make it specific and behavioral: what they actually notice in themselves, not a label.",
  "where_it_shows_up": "2-3 sentences naming a concrete, specific real-world situation where this environmental need becomes most visible: a specific work scenario, type of day, or recurring moment of friction. Behavioral and specific, not abstract.",
  "tags": ["3 short behavioral tags", "max 3 words each", "what this environmental pattern looks like in practice"],
  "go_deeper": "2 sentences. First: name the cost: what happens to this person when their environment doesn't match their needs. Second: point toward a related pattern or something worth exploring further.",
  "worth_trying": "1-2 sentences. A specific, practical change this person can try this week to better match their environment to their actual needs. Not generic advice: tied directly to what their pattern reveals."
}`
  }

  return buildRing1Prompt(facetName, traitWord, scoreDirection)
}

// Branch cards only. Neutral on purpose: no claim about the person or the
// facet, since nothing was actually generated. Marked `fallback` so it can be
// told apart from real copy. (Ring 1 never falls back — generateRing1Copy
// reports a failure instead and the page shows a neutral line.)
function fallbackContent(
  traitWord: string,
  branch?: string,
  strongConditions?: { label: string; traitWord: string; score: number }[]
): PatternContent {
  const base: PatternContent = {
    trait_quote: `Your answers in this section point to "${traitWord}".`,
    where_it_shows_up: `We couldn't write the full description just now.`,
    tags: [traitWord],
    go_deeper: `The rest of this section's description will appear here when it's ready.`,
    worth_trying: `The rest of this section's description will appear here when it's ready.`,
    fallback: true,
  }

  if (
    (branch === 'energy' && strongConditions?.length === 4) ||
    (branch === 'working_style' && strongConditions?.length === 3) ||
    (branch === 'direction' && strongConditions && strongConditions.length >= 1 && strongConditions.length <= 3)
  ) {
    base.items = strongConditions!.map((c) => ({
      ...(branch === 'direction' ? { word: c.traitWord } : {}),
      quote: `${c.traitWord} came through in how you answered.`,
      evidence: `We couldn't write more about this one just now.`,
    }))
  }

  if (branch === 'direction') {
    base.teaserWord = traitWord
  }

  return base
}

// For logs: the error's kind and HTTP status only. Never err.message — an
// API error or a JSON parse error can quote request or response text, and
// Ring 1 requests carry the person's answers.
function describeError(err: unknown): string {
  if (err instanceof Anthropic.APIError) return `${err.constructor.name} ${err.status ?? ''}`.trim()
  return err instanceof Error ? err.name : 'unknown error'
}

// Model names, one place each. Ring 1 has its own so it can move
// independently of the branch cards.
const MODEL = 'claude-haiku-4-5-20251001'
// Ring 1 cards and relationship insights. Branch cards stay on MODEL.
const RING1_MODEL = 'claude-sonnet-5-5'

// Per caller, per 10 minutes. A paid user's full report generates up to 30
// facets plus five branches in one sitting, so signed-in callers get room
// for that; anonymous callers only ever need a handful (the free reveals).
const RATE_WINDOW_SECONDS = 600
const RATE_MAX_SIGNED_IN = 80
const RATE_MAX_ANONYMOUS = 20

// Server actions are public endpoints: everything is checked here, not
// trusted from the calling page. Throws on an invalid request, the rate
// limit, or the paywall.
async function authorize(
  facetName: unknown,
  traitWord: unknown,
  scoreDirection: unknown,
  assessmentId: unknown,
  branch: unknown,
  strongConditions: unknown
): Promise<PatternCopyRequest> {
  const req = parsePatternCopyRequest(facetName, traitWord, scoreDirection, assessmentId, branch, strongConditions)
  if (!req) throw new Error('Invalid request')

  const user = await getSessionUser()
  const allowed = await checkRateLimit(
    rateLimitKey('pattern-copy', user?.id ?? null, requestIp()),
    RATE_WINDOW_SECONDS,
    user ? RATE_MAX_SIGNED_IN : RATE_MAX_ANONYMOUS
  )
  if (!allowed) throw new Error('Too many requests')

  // Paywall, enforced here and not only in the UI: branch content needs a
  // paid account; ring-1 text beyond the free reveals needs one too.
  const paid = user ? await isPaidUser(user.id) : false
  if (!paid) {
    if (req.kind === 'branch') throw new Error('Payment required')
    if (!claimFreeReveal(req.facetName)) throw new Error('Payment required')
  }
  return req
}

// ── Branch cards ─────────────────────────────────────────────────────────────

export async function generatePatternCopy(
  facetName: string,
  traitWord: string,
  scoreDirection: 'high' | 'mid' | 'low',
  assessmentId: string | null,
  branch?: string,
  strongConditions?: { label: string; traitWord: string; score: number }[]
): Promise<PatternContent> {
  const req = await authorize(facetName, traitWord, scoreDirection, assessmentId, branch, strongConditions)
  // Ring 1 cards go through generateRing1Copy (no fallback text).
  if (req.kind !== 'branch') throw new Error('Invalid request')

  let content: PatternContent
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1536,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(req.facetName, req.traitWord, req.scoreDirection, req.branch, req.strongConditions) }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonText = rawText.replace(/^```(?:json)?\n?|```\s*$/gm, '').trim()
    content = JSON.parse(jsonText) as PatternContent
  } catch (err) {
    console.error('[generatePatternCopy] generation failed:', describeError(err))
    content = fallbackContent(req.traitWord, req.branch, req.strongConditions)
  }

  // Not stored server-side: the report renders from the browser's own
  // cached copy, and nothing has ever read public.report_content back, so
  // writing every generated text there only kept an unused copy. The table
  // and its existing rows are left in place (see supabase/migrations).
  // assessmentId is still accepted and validated so callers don't change.
  return content
}

// ── Ring 1 trait cards ───────────────────────────────────────────────────────

// `content: null` means the card couldn't be written (after one retry). The
// caller shows a neutral line, saves nothing, and leaves the trait's content
// null so the report tries again later — no fallback text is ever presented
// as if it were real.
export type Ring1CopyResult = { content: PatternContent } | { content: null; failed: true }

type Checked<T> = { ok: true; value: T; violations: string[]; words: number } | { ok: false; reason: string }

// Two attempts with structured output on RING1_MODEL (structured output
// rather than a forced tool call: newer models reject forced tool_choice).
// - A hard failure (or a failed call) retries the original prompt.
// - Soft violations retry once with the model's own answer and a note naming
//   exactly what failed; the better attempt is kept (fewest violations, then
//   fewest words). A soft violation alone never leaves the result empty.
// - Both attempts share GENERATION_BUDGET_MS (20 s). Each request times out
//   at what's left, with no SDK-level retries, and a timeout ends the loop.
// Returns null only when neither attempt is usable.
async function generateWithRetry<T>(
  anthropic: Anthropic,
  request: { system: string; prompt: string; schema: Record<string, unknown>; maxTokens: number; temperature?: number },
  check: (text: string) => Checked<T>,
  logTag: string
): Promise<T | null> {
  const first: Anthropic.MessageParam = { role: 'user', content: request.prompt }
  let messages: Anthropic.MessageParam[] = [first]
  let best: { value: T; violations: string[]; words: number } | null = null
  const startedAt = Date.now()
  for (let attempt = 0; attempt < 2; attempt++) {
    const timeout = attemptTimeout(startedAt, Date.now())
    if (timeout === null) break
    try {
      const message = await anthropic.messages.create({
        model: RING1_MODEL,
        max_tokens: request.maxTokens,
        system: request.system,
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        output_config: { format: { type: 'json_schema', schema: request.schema } },
        messages,
      }, { timeout, maxRetries: 0 })
      // A refusal or a cut-off answer may not match the schema.
      if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
        console.error(`[${logTag}] stop_reason:`, message.stop_reason)
        messages = [first]
        continue
      }
      const block = message.content.find((b) => b.type === 'text')
      const text = block && block.type === 'text' ? block.text : ''
      const c = check(text)
      if (!c.ok) {
        console.error(`[${logTag}] rejected:`, c.reason)
        messages = [first]
        continue
      }
      const usable = { value: c.value, violations: c.violations, words: c.words }
      best = best ? betterAttempt(best, usable) : usable
      if (usable.violations.length === 0) break
      messages = [first, { role: 'assistant', content: text }, { role: 'user', content: retryFeedback(usable.violations) }]
    } catch (err) {
      console.error(`[${logTag}] generation failed:`, describeError(err))
      if (err instanceof Anthropic.APIConnectionTimeoutError) break
      messages = [first]
    }
  }
  // A contrast left after the retry is accepted (the text is still the
  // model's own, never a placeholder) and logged, without any text.
  if (best?.violations.includes(CONTRAST_NOTE)) console.warn(`[${logTag}] kept with a contrast pattern`)
  return best ? best.value : null
}

export async function generateRing1Copy(
  facetName: string,
  traitWord: string,
  scoreDirection: 'high' | 'mid' | 'low',
  assessmentId: string | null,
  // This facet's answers (ids and values) — optional evidence for the card.
  answers?: FacetAnswer[]
): Promise<Ring1CopyResult> {
  const req = await authorize(facetName, traitWord, scoreDirection, assessmentId, undefined, undefined)
  if (req.kind !== 'ring1') throw new Error('Invalid request')
  const parsedAnswers = parseRing1Answers(req.facetName, answers)
  if (!parsedAnswers) throw new Error('Invalid request')
  // Excluded facets (RING1_EVIDENCE_EXCLUDED_FACETS) get no evidence, even
  // if the request carried answers.
  const evidence = evidenceFor(req.facetName, parsedAnswers)

  const card = await generateWithRetry<Ring1Card>(
    new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
    {
      system: RING1_SYSTEM_PROMPT,
      prompt: buildRing1Prompt(req.facetName, req.traitWord, req.scoreDirection, evidence),
      schema: RING1_CARD_SCHEMA,
      // Room for models that think by default.
      maxTokens: 4096,
    },
    (text) => {
      const c = checkRing1CardText(text)
      return c.ok ? { ok: true, value: c.card, violations: c.violations, words: c.words } : c
    },
    'generateRing1Copy'
  )
  return card ? { content: finishRing1Card(card) } : { content: null, failed: true }
}

// ── Relationship insights (Ring 1 traits) ────────────────────────────────────

// Same voice as the trait cards.
const RELATIONSHIP_SYSTEM_PROMPT = RING1_SYSTEM_PROMPT

// Sent only to models that accept it (temperatureFor): Sonnet 5.5, the
// current RING1_MODEL, rejects a non-default temperature, so it gets none.
const RELATIONSHIP_TEMPERATURE = 0.5

const RELATIONSHIP_EXAMPLES = `Examples of the quality to aim for. Use your own wording:

Self-direction theme
{"insight": "You tend to decide based on what you need, and you're fine being the one who disagrees. You rarely end up living someone else's plan. It can also mean your answer is often the less popular one. Which of your choices feel most like your own?"}

Tension: high Achievement-Striving, low Self-Discipline
{"insight": "Your drive and your day-to-day follow-through pull in different directions. You tend to set big targets. Staying on task when motivation dips can be harder than the goal itself suggests. What gets in the way once the first excitement fades?"}`

function describeSignal(s: FiredSignal): string {
  const context = FACET_BEHAVIORAL_CONTEXT[s.facet] ?? `The ${s.facet} facet of personality`
  return `- ${s.direction === 'high' ? 'High' : 'Low'} ${s.facet} (their word: "${s.traitWord}"). ${s.facet} measures: ${context}`
}

function buildRelationshipPrompt(req: RelationshipRequest): string {
  const { relationship: rel, theme } = req
  const what = theme
    ? `Their answers point the same way on these traits:
${rel.signals.map(describeSignal).join('\n')}

What this pattern tends to give them: ${theme.gives}.
What it tends to cost them: ${theme.costs}.`
    : `Their answers point opposite ways on two traits in the same area:
${rel.signals.map(describeSignal).join('\n')}

${rel.grounding ? `What this looks like: ${rel.grounding}` : 'Describe how these two pull against each other, using only the descriptions above.'}`

  return `Write a short note about how some of this person's traits relate.

${what}

Rules:
- Describe only what is listed above. Do not add other traits or outcomes.
- Second person ("you"), present tense.
- 2-3 sentences, then end with one reflective question. The question invites reflection; it is not an instruction.
- About 65 words at most.
- Where the descriptions support it, say what it gives and what it costs, in plain words. If they support only one side, write only that side. Never write "the payoff", "the cost" or "the price".
${GROUNDING_RULES}
- Use "others" or "people" only for the described behaviour (for example helping others), never for how they react to the person.
- For harder traits (${RING1_HARDER_FACETS}), ${HARDER_TRAIT_RULE}${rel.signals.some((s) => isHarderTrait(s.facet, s.direction)) ? `\n- One of these traits is a harder trait: ${HARDER_TRAIT_RULE}` : ''}
- Use "tends to", "often" or "can" for anything that depends on the situation. Never tell the reader what to do: no "try", "should", "consider", "make sure", "remember to".
- Do not use the facet names or domain names; describe the behaviour.
- Use plain everyday words a 12-year-old would follow.
- Keep sentences under about 18 words, one idea per sentence.
- At most one "tends to" or "can" per sentence.
- No semicolons, em dashes or en dashes. No abstract nouns where a verb works.
- Never write "it's not X, it's Y", "this isn't X, it's Y" or "not just X". Say what it is.

${RELATIONSHIP_EXAMPLES}

Return JSON only, no markdown: {"insight": "..."}`
}

// `insight: null` means it couldn't be written (after one retry): the card
// shows nothing and nothing is stored.
export type RelationshipInsightResult = { insight: string } | { insight: null; failed: true }

const REL_RATE_MAX_SIGNED_IN = 40
const REL_RATE_MAX_ANONYMOUS = 10

export async function generateRelationshipInsight(
  relationshipId: string,
  signals: { facet: string; direction: 'high' | 'low'; traitWord: string }[]
): Promise<RelationshipInsightResult> {
  // Public endpoint: validated, rate limited and paywalled here.
  const req = parseRelationshipRequest(relationshipId, signals)
  if (!req) throw new Error('Invalid request')

  const user = await getSessionUser()
  const allowed = await checkRateLimit(
    rateLimitKey('relationship-insight', user?.id ?? null, requestIp()),
    RATE_WINDOW_SECONDS,
    user ? REL_RATE_MAX_SIGNED_IN : REL_RATE_MAX_ANONYMOUS
  )
  if (!allowed) throw new Error('Too many requests')

  // Paid: any valid relationship. Unpaid: only between traits this visitor
  // has already been given (read-only — never uses up a free reveal).
  const paid = user ? await isPaidUser(user.id) : false
  if (!paid && !req.relationship.signals.every((s) => isFreeRevealed(s.facet))) throw new Error('Payment required')

  const insight = await generateWithRetry<string>(
    new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
    {
      system: RELATIONSHIP_SYSTEM_PROMPT,
      prompt: buildRelationshipPrompt(req),
      schema: RELATIONSHIP_INSIGHT_SCHEMA,
      maxTokens: 2048,
      temperature: temperatureFor(RING1_MODEL, RELATIONSHIP_TEMPERATURE),
    },
    (text) => {
      const c = checkInsightText(text)
      return c.ok ? { ok: true, value: c.insight, violations: c.violations, words: c.words } : c
    },
    'generateRelationshipInsight'
  )
  return insight ? { insight: finishInsight(insight) } : { insight: null, failed: true }
}
