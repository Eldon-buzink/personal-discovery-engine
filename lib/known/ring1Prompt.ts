/**
 * lib/known/ring1Prompt.ts
 *
 * The Ring 1 trait-card prompt and the pieces it shares with the
 * relationship-insight prompt. Moved here verbatim from
 * app/actions/generatePatternCopy.ts (a 'use server' file can only export
 * async functions), so lab code can build the same prompt. Not shown to
 * users; generatePatternCopy.ts imports everything from here.
 */

import type { EvidenceItem } from './ring1Evidence'
import { isHarderTrait } from './ring1Card'

// What each facet measures, behaviourally. Grounding for the model only.
export const FACET_BEHAVIORAL_CONTEXT: Record<string, string> = {
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

// ── Ring 1 trait cards ───────────────────────────────────────────────────────
// Separate from SYSTEM_PROMPT / SCORE_DIRECTION_DESCRIPTIONS above, which the
// branch cards keep using unchanged. Ring 1 cards describe; they never advise.

export const RING1_SYSTEM_PROMPT =
  'You write short descriptions for Bearing, a personality product based on IPIP-NEO-120. ' +
  "You describe patterns in a person's answers. You do not advise, diagnose, praise or predict. " +
  'Use plain, warm, precise language, like a smart friend. Speak to the reader as "you". ' +
  'Use "tends to" and "often" for anything that depends on the situation. Never tell the reader what to do. ' +
  'No clinical or diagnostic words. Mention an upside and a downside only where the behaviour itself supports them, ' +
  'without labelling them. Never invent details the description does not give.'

// Four items per facet can't support "strongly and consistently" or
// "situationally" — this only says which way the answers lean.
export const RING1_SCORE_DIRECTION: Record<'high' | 'mid' | 'low', string> = {
  high: 'Their answers lean clearly toward this trait.',
  mid: "Their answers sit in the middle: a mix of both ends. Do NOT claim they are 'situational'. Describe the range and acknowledge it may vary.",
  low: 'Their answers lean clearly toward the opposite of this trait.',
}

export const RING1_EXAMPLES = `Examples of the quality to aim for. Use your own wording:

Cautiousness, high
{"trait_quote": "You like to think a decision all the way through before you commit.", "body": "It often shows when a choice has to be made and you still have one more question. That care tends to make your choices solid. It can also mean missing the moment when waiting was the bigger risk.", "tags": ["Weighs it first", "Hard to rush", "Commits late"]}

Anxiety, mid
{"trait_quote": "Worry shows up when something seems to matter, and stays quiet when it doesn't.", "body": "Your answers sit in the middle, so the amount may change a lot from one situation to the next. That keeps you alert without running your day. It can also make it hard to tell, in the moment, which kind of worry you're feeling.", "tags": ["Selective worry", "Stays alert", "Varies by day"]}

Vulnerability, high (a harder trait: no strength is invented)
{"trait_quote": "When a lot lands at once, it can feel like more than you can handle.", "body": "It often shows up when pressure builds or several things go wrong together. In those moments the feeling tends to take over your day, and calm can be slow to come back.", "tags": ["Feels swamped", "Rattled by pressure", "Slow to settle"]}`

// Shared by the card and insight prompts.
export const GROUNDING_RULES = `- Never describe what other people think, feel, notice, say or do in reaction to the person (no "others miss", "friends wish", "people read you as"). Mention other people only as part of the behaviour itself.
- A low score means the feeling or tendency is weak, never hidden or suppressed. Never write that a low-scoring person feels something but does not show it.
- No concrete objects, places, people or events that the description or answers do not name (no meals, money, shopping, replayed words).
- No judgement words about the person's goals or choices (no "wishing bigger", "worth it", "settling").
- Never mention religion, faith, politics, parties, voting or sexuality.`

// The facet's IPIP name invites politics; the card is about questioning
// traditions, never about how someone votes.
export const LIBERALISM_RULE = 'Liberalism here means openness to questioning traditions, authority and established values. Never mention politics, left or right, parties or voting.'

export const HARDER_TRAIT_RULE = 'do not invent a strength. If the description gives none, describe the pattern and how it affects the person\'s day, nothing more.'

export const RING1_HARDER_FACETS = 'high Anxiety, Anger, Vulnerability, Depression, Self-Consciousness, Immoderation, or low Self-Efficacy'

export function buildRing1Prompt(
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
