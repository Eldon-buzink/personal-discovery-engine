// The example report (app/report/example): one complete first ring, all 30
// traits, for looking at the report as a whole (design reviews, sharing).
// Illustrative, under the page's "not your data" banner.
//
// Bands: each facet's result. Answers are built from them, so the real
// scoring (computeFacetScore, getTraitWord) gives these bands and the real
// evidence panel shows real statements.
// Cards: 14 are real model output (11 from app/dev/insights/fixtures.ts,
// two em dashes reworded, and the sample report's 3); 16 are written to the
// same rules (app/actions/generatePatternCopy.ts: describe, never advise).

import { FACET_QUESTIONS } from './ring1-questions'
import type { PatternContent } from './types'

export type Band = 'low' | 'mid' | 'high'

export const EXAMPLE_BANDS: Record<string, Band> = {
  "Achievement-Striving": "high",
  "Anger": "mid",
  "Anxiety": "mid",
  "Assertiveness": "high",
  "Cheerfulness": "mid",
  "Cooperation": "low",
  "Friendliness": "mid",
  "Imagination": "high",
  "Liberalism": "high",
  "Self-Discipline": "low",
  "Trust": "mid",
  "Cautiousness": "mid",
  "Self-Efficacy": "high",
  "Self-Consciousness": "mid",
  "Depression": "low",
  "Immoderation": "mid",
  "Vulnerability": "low",
  "Gregariousness": "low",
  "Activity Level": "high",
  "Excitement-Seeking": "mid",
  "Artistic Interests": "high",
  "Emotionality": "high",
  "Adventurousness": "mid",
  "Intellect": "high",
  "Morality": "high",
  "Altruism": "mid",
  "Modesty": "low",
  "Sympathy": "high",
  "Orderliness": "low",
  "Dutifulness": "mid"
}

export const EXAMPLE_CARDS: Record<string, PatternContent> = {
  "Achievement-Striving": {
    "trait_quote": "You push yourself toward high standards and keep that same bar for what you expect from those around you.",
    "body": "It often shows up when there's work to be done or a goal to chase. You tend to stay focused and put in the effort where others might ease off. That drive can move you toward real accomplishments and keeps you from settling for half-baked work. It can also leave you tired, or make you impatient with people who don't share your pace or your thresholds.",
    "tags": [
      "High bar",
      "Steady push",
      "Won't settle"
    ]
  },
  "Anger": {
    "trait_quote": "When something feels genuinely wrong, you feel it sharply. Minor annoyances tend to roll off you.",
    "body": "You often get a strong flash of anger when you spot real unfairness or when something matters to you. That sharpness can drive you to push back and speak up about what needs fixing. It can also mean the intensity surprises people around you, since smaller frustrations don't usually show.",
    "tags": [
      "Sharp when it counts",
      "Lets stuff go",
      "Speaks up"
    ]
  },
  "Anxiety": {
    "trait_quote": "You notice things that could go wrong, but you don't usually expect the worst.",
    "body": "Your worry tends to kick in when something actually matters to you, like a conversation coming up or a choice you need to make. That alertness helps you think things through and stay ready. It can also mean the level of concern shifts quite a bit depending on what's on your mind, so you're not running on a steady hum.",
    "tags": [
      "Selective worry",
      "Shifts with stakes",
      "Stays alert"
    ]
  },
  "Assertiveness": {
    "trait_quote": "When a group needs direction, you naturally step in and shape where things go. People tend to follow when you speak.",
    "body": "It often shows up in meetings or projects where no one's taken the lead yet. You tend to influence the group's choices without much struggle, which gets things moving and builds momentum. That same ease can sometimes mean you're steering decisions that others might have wanted a say in.",
    "tags": [
      "Shapes the room",
      "Pulls people along",
      "Leads early"
    ]
  },
  "Cheerfulness": {
    "trait_quote": "You can light up a room without chasing fun constantly. There's a warmth to you that doesn't need to prove itself.",
    "body": "You tend to share positive feelings and energy when you're present with others, which draws people in. That gives you real connection without the pressure to be 'on' all the time. It can also mean you're quieter in your own company, or that others sometimes miss your steadier moods.",
    "tags": [
      "Radiates warmth",
      "Measured lightheartedness",
      "Selective energy"
    ]
  },
  "Cooperation": {
    "trait_quote": "You say what you think without softening it to keep the peace. Pushing back feels natural to you.",
    "body": "This shows up when others expect you to go along or when someone's idea conflicts with yours. You get to be honest and stand by your position without burning energy on diplomacy. The tradeoff is that people sometimes feel the impact of your bluntness before they understand your point. Working toward middle ground can feel like giving up rather than finding something better.",
    "tags": [
      "Says it straight",
      "Holds ground",
      "Stands firm"
    ]
  },
  "Friendliness": {
    "trait_quote": "Friendship comes naturally to you once you decide to reach out, though warming to someone fresh can take a little time.",
    "body": "You often make real connections with people, especially when the setting invites you to engage. That gives you solid friendships without the drain of forcing yourself to be \"on\" all the time. It can mean you miss chances early on, when someone else might have already bonded with the group.",
    "tags": [
      "Builds real bonds",
      "Takes time opening",
      "Selective warmth"
    ]
  },
  "Imagination": {
    "trait_quote": "Your mind often wanders into possibility and detail, building rich scenes you can see clearly. You enjoy spending time inside your head.",
    "body": "It often shows when you're alone or doing something routine, and your thoughts drift into stories, what-ifs or vivid pictures. That gives you a private world that's interesting and absorbing, which can make waiting or downtime feel less empty. It can also pull your attention away from what's happening around you right now, or make the actual world feel a bit duller by comparison.",
    "tags": [
      "Lives in detail",
      "Enjoys daydreaming",
      "Easily absorbed"
    ]
  },
  "Liberalism": {
    "trait_quote": "You question the way things have always been done and imagine how they could work differently.",
    "body": "It often shows up when someone appeals to tradition or authority as a reason to keep something the same. You tend to dig into the thinking behind the rules, which can uncover real problems others miss. That curiosity also means you can resist ideas that work well enough, spending energy on change when stability might serve better.",
    "tags": [
      "Questions authority",
      "Imagines alternatives",
      "Seeks new ways"
    ]
  },
  "Self-Discipline": {
    "trait_quote": "Starting things often waits for the right mood or outside push, and finishing them follows its own timeline.",
    "body": "It often shows up when a task feels boring or feels far away. You get more done when something feels urgent or when someone else gets the ball rolling, and you can move fast once you do start. The flip side is that loose threads pile up, and you sometimes miss deadlines because momentum came too late.",
    "tags": [
      "Momentum-driven",
      "Slow starts",
      "Procrastinates casually"
    ]
  },
  "Trust": {
    "trait_quote": "You're willing to trust people, yet you don't automatically assume their hearts are in the right place.",
    "body": "It often shows up when you're meeting someone new or when stakes are high. You can work with people without needing to believe they're purely well-intentioned, which keeps you from naive harm and lets you stay open at the same time. The gap between these two stances can sometimes feel like holding two separate judgments at once, and it means you're rarely fully settled either way.",
    "tags": [
      "Cautious openness",
      "Skeptical but cooperative",
      "Withheld certainty"
    ]
  },
  "Cautiousness": {
    "trait_quote": "You don't speak until you've thought it through, and when you do, people tend to listen.",
    "body": "In meetings you often let the room talk itself out before you weigh in. That tends to give what you say more weight, and it can mean people read the pause as distance when you are fully engaged.",
    "tags": [
      "Considered",
      "Low reactivity",
      "High signal-to-noise"
    ]
  },
  "Self-Efficacy": {
    "trait_quote": "Left alone with a hard problem, you speed up rather than stall.",
    "body": "It often shows on the ambiguous project nobody else wants to own. That independence tends to get things moving without much oversight, and it can make check-ins and shared ownership feel like friction.",
    "tags": [
      "Self-directed",
      "Comfortable with ambiguity",
      "Low oversight need"
    ]
  },
  "Self-Consciousness": {
    "trait_quote": "You often finish thinking about a conversation hours after it ended.",
    "body": "Replaying it is how you tend to make sense of things, and it often lets you spot patterns in yourself before anyone points them out. The same habit can loop when there is no second voice in it.",
    "tags": [
      "Self-aware",
      "Internally processed",
      "Slow to conclude"
    ]
  },
  "Depression": {
    "trait_quote": "Low moods tend to pass through you quickly and rarely settle in.",
    "body": "On a hard day you still find the next thing to look forward to. Setbacks tend to stay the size they are. It can also mean you move on from a sad moment before you have taken it in.",
    "tags": [
      "Bounces back",
      "Rarely low",
      "Moves on fast"
    ]
  },
  "Immoderation": {
    "trait_quote": "Most of the time you can say no to an urge, and sometimes you just don't.",
    "body": "It often shows at the end of a long day, when an urge is harder to wave off. You rarely let it run for long. Some evenings it still gets its way before you think it through.",
    "tags": [
      "Mostly in control",
      "Gives in sometimes",
      "Tired evenings"
    ]
  },
  "Vulnerability": {
    "trait_quote": "When things pile up, you tend to stay level and keep working through them.",
    "body": "It often shows when several problems land at once. You can sort them one by one without feeling swamped. It can also mean you take on more pressure than you realise, because it rarely feels heavy.",
    "tags": [
      "Stays level",
      "Calm under pressure",
      "Handles a lot"
    ]
  },
  "Gregariousness": {
    "trait_quote": "Time with people is good, but you get your energy back on your own.",
    "body": "It often shows after a busy social stretch, when quiet time feels like a reset. Small groups and one-on-one time tend to suit you better than crowds. Big gatherings can wear you out faster than you expect.",
    "tags": [
      "Recharges alone",
      "Prefers small groups",
      "Crowds drain me"
    ]
  },
  "Activity Level": {
    "trait_quote": "You like your days full, and you tend to move fast through them.",
    "body": "It often shows in how many things you take on at once. That pace gets a lot done. It can also make slow days feel restless, and rest can feel like falling behind.",
    "tags": [
      "Always busy",
      "Moves fast",
      "Restless when idle"
    ]
  },
  "Excitement-Seeking": {
    "trait_quote": "Now and then you want something new or a bit risky, though not all the time.",
    "body": "It often shows when routine has run on for a while and you want a change. A little thrill tends to wake you up. Most days you are happy without it.",
    "tags": [
      "Likes some thrill",
      "Needs a change",
      "Fine with routine"
    ]
  },
  "Artistic Interests": {
    "trait_quote": "Music, art or a beautiful place can stop you in your tracks.",
    "body": "It often shows in how much you notice the look and feel of things. Beauty tends to lift your mood in a real way. Plain or ugly surroundings can also wear on you more than you expect.",
    "tags": [
      "Moved by beauty",
      "Notices design",
      "Needs nice surroundings"
    ]
  },
  "Emotionality": {
    "trait_quote": "You feel things fully, and you usually know what you are feeling.",
    "body": "It often shows when something touches you, good or bad. Your feelings tend to give you a clear read on what matters to you. Strong days can also leave you more tired than you expected.",
    "tags": [
      "Feels deeply",
      "Knows my feelings",
      "Moved easily"
    ]
  },
  "Adventurousness": {
    "trait_quote": "You like trying something new, as long as you can come back to what you know.",
    "body": "It often shows when a new place or a new way of doing things comes up. You tend to say yes, with something to fall back on. Too much change at once can start to feel like a lot.",
    "tags": [
      "Open to new",
      "Likes a home base",
      "Tries things"
    ]
  },
  "Intellect": {
    "trait_quote": "A hard idea is something you want to take apart and understand.",
    "body": "It often shows when a topic gets complex and you keep asking how it works. That drive tends to make you good at seeing the shape of a problem. It can also pull you into thinking when you meant to rest.",
    "tags": [
      "Loves ideas",
      "Takes things apart",
      "Keeps asking why"
    ]
  },
  "Morality": {
    "trait_quote": "You say what you mean, and bending the truth feels wrong to you.",
    "body": "It often shows when a small white lie would make things easier. You tend to choose the honest version anyway. That keeps you clear with yourself, and it can make some moments more awkward than they need to be.",
    "tags": [
      "Says what I mean",
      "Hates spin",
      "Plays it straight"
    ]
  },
  "Altruism": {
    "trait_quote": "You help when you see a real need, and you also keep time for yourself.",
    "body": "It often shows when someone close asks for a hand. You tend to say yes without giving everything away. On full weeks, helping can slip down the list.",
    "tags": [
      "Helps when needed",
      "Keeps some balance",
      "Busy-week limits"
    ]
  },
  "Modesty": {
    "trait_quote": "You know what you are good at, and you are comfortable saying so.",
    "body": "It often shows when your work comes up and you describe it plainly. That tends to make it easier to take credit and ask for what you want.",
    "tags": [
      "Owns my strengths",
      "Says it plainly",
      "Takes credit"
    ]
  },
  "Sympathy": {
    "trait_quote": "Someone else's pain tends to stay with you after you have walked away.",
    "body": "It often shows when a friend is having a hard time, or when something feels unfair. You feel it and want to help. That care can also be heavy to carry on days when there is a lot of it.",
    "tags": [
      "Feels for others",
      "Wants to help",
      "Carries it home"
    ]
  },
  "Orderliness": {
    "trait_quote": "You keep things loose and find what you need when you need it.",
    "body": "It often shows in how you set up your work and your space. Skipping the system tends to save you time and keeps you flexible. It can also mean hunting for things, or a mess that grows in a busy week.",
    "tags": [
      "Keeps it loose",
      "No fixed system",
      "Finds it later"
    ]
  },
  "Dutifulness": {
    "trait_quote": "When you say you'll do something, you usually do, and you weigh which promises matter most.",
    "body": "It often shows when plans pile up and something has to give. You tend to keep the commitments that count. It can also mean a smaller promise slips when your week is full.",
    "tags": [
      "Keeps key promises",
      "Weighs commitments",
      "Small things slip"
    ]
  }
}

// Answers (after reverse scoring) per band, varied by facet so the traits
// differ in strength. Means: high 4.25 to 4.5, mid 2.75 to 3.25, low 1.75
// to 2.0, all inside their band.
const PATTERNS: Record<Band, number[][]> = {
  high: [[5, 4, 5, 4], [4, 4, 5, 4], [5, 5, 4, 4]],
  mid: [[3, 4, 3, 3], [3, 3, 3, 2], [4, 3, 3, 2]],
  low: [[2, 1, 2, 2], [2, 2, 1, 2], [1, 2, 2, 3]],
}

// Raw 1-5 answers for all 120 statements, by question id.
export function exampleResponses(): Map<number, number> {
  const out = new Map<number, number>()
  Object.keys(EXAMPLE_BANDS).forEach((facet, fi) => {
    const pattern = PATTERNS[EXAMPLE_BANDS[facet]][fi % 3]
    ;(FACET_QUESTIONS.get(facet) ?? []).forEach((q, qi) => {
      out.set(q.id, q.reverseScored ? 6 - pattern[qi] : pattern[qi])
    })
  })
  return out
}
