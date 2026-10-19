// Development only: fixtures for /dev/insights. Card text is real Haiku 4.5
// output from the 2026-10-13 readability run; relationship insights are
// generated live when the report opens. Not used outside /dev.

export interface InsightFixture {
  title: string
  description: string
  traits: [string, 'high' | 'mid' | 'low'][]
  // This facet's card is shown in the old cached 5-field format.
  oldCardFacet?: string
  cards: Record<string, { trait_quote: string; body: string; tags: string[] }>
}

export const INSIGHT_FIXTURES: Record<string, InsightFixture> = {
  "self-direction": {
    "title": "Theme: self-direction",
    "description": "Cooperation low, Liberalism high, Assertiveness high fire the self-direction theme. Anger (mid) has no insight. Liberalism uses the old cached card format.",
    "traits": [
      [
        "Cooperation",
        "low"
      ],
      [
        "Liberalism",
        "high"
      ],
      [
        "Assertiveness",
        "high"
      ],
      [
        "Anger",
        "mid"
      ]
    ],
    "oldCardFacet": "Liberalism",
    "cards": {
      "Cooperation:low": {
        "trait_quote": "You say what you think without softening it to keep the peace. Pushing back feels natural to you.",
        "body": "This shows up when others expect you to go along or when someone's idea conflicts with yours. You get to be honest and stand by your position without burning energy on diplomacy. The tradeoff is that people sometimes feel the impact of your bluntness before they understand your point. Working toward middle ground can feel like giving up rather than finding something better.",
        "tags": [
          "Says it straight",
          "Holds ground",
          "Stands firm"
        ]
      },
      "Liberalism:high": {
        "trait_quote": "You question the way things have always been done and imagine how they could work differently.",
        "body": "It often shows up when someone appeals to tradition or authority as a reason to keep something the same. You tend to dig into the thinking behind the rules, which can uncover real problems others miss. That curiosity also means you can resist ideas that work well enough, spending energy on change when stability might serve better.",
        "tags": [
          "Questions authority",
          "Imagines alternatives",
          "Seeks new ways"
        ]
      },
      "Assertiveness:high": {
        "trait_quote": "When a group needs direction, you naturally step in and shape where things go. People tend to follow when you speak.",
        "body": "It often shows up in meetings or projects where no one's taken the lead yet. You tend to influence the group's choices without much struggle, which gets things moving and builds momentum. That same ease can sometimes mean you're steering decisions that others might have wanted a say in.",
        "tags": [
          "Shapes the room",
          "Pulls people along",
          "Leads early"
        ]
      },
      "Anger:mid": {
        "trait_quote": "When something feels genuinely wrong, you feel it sharply. Minor annoyances tend to roll off you.",
        "body": "You often get a strong flash of anger when you spot real unfairness or when something matters to you. That sharpness can drive you to push back and speak up about what needs fixing. It can also mean the intensity surprises people around you, since smaller frustrations don't usually show.",
        "tags": [
          "Sharp when it counts",
          "Lets stuff go",
          "Speaks up"
        ]
      }
    }
  },
  "tension": {
    "title": "Tension: drive vs follow-through",
    "description": "Achievement-Striving high and Self-Discipline low (a curated tension). Trust (high) has no insight.",
    "traits": [
      [
        "Achievement-Striving",
        "high"
      ],
      [
        "Self-Discipline",
        "low"
      ],
      [
        "Trust",
        "high"
      ]
    ],
    "cards": {
      "Achievement-Striving:high": {
        "trait_quote": "You push yourself toward high standards and keep that same bar for what you expect from those around you.",
        "body": "It often shows up when there's work to be done or a goal to chase. You tend to stay focused and put in the effort where others might ease off. That drive can move you toward real accomplishments and keeps you from settling for half-baked work. It can also leave you tired, or make you impatient with people who don't share your pace or your thresholds.",
        "tags": [
          "High bar",
          "Steady push",
          "Won't settle"
        ]
      },
      "Self-Discipline:low": {
        "trait_quote": "Starting things often waits for the right mood or outside push, and finishing them follows its own timeline.",
        "body": "It often shows up when a task feels boring or feels far away. You get more done when something feels urgent or when someone else gets the ball rolling, and you can move fast once you do start. The flip side is that loose threads pile up, and you sometimes miss deadlines because momentum came too late.",
        "tags": [
          "Momentum-driven",
          "Slow starts",
          "Procrastinates casually"
        ]
      },
      "Trust:high": {
        "trait_quote": "When you meet someone, you often start by giving them the benefit of the doubt. You assume they mean well unless they show you otherwise.",
        "body": "This shows up in how you move through conversations and new relationships without building walls first. It tends to help you connect with people and find common ground quickly. The trade-off is that it can leave you hurt when someone acts in bad faith, and sometimes you notice the damage before you see it coming.",
        "tags": [
          "Assumes good intent",
          "Connects easily",
          "Can be blindsided"
        ]
      }
    }
  },
  "none": {
    "title": "Free user, nothing fires",
    "description": "Five revealed traits, mostly mid: no relationship, so no insight anywhere.",
    "traits": [
      [
        "Anxiety",
        "mid"
      ],
      [
        "Friendliness",
        "mid"
      ],
      [
        "Imagination",
        "high"
      ],
      [
        "Trust",
        "mid"
      ],
      [
        "Cheerfulness",
        "mid"
      ]
    ],
    "cards": {
      "Anxiety:mid": {
        "trait_quote": "You notice things that could go wrong, but you don't usually expect the worst.",
        "body": "Your worry tends to kick in when something actually matters to you—a conversation coming up, a choice you need to make, stakes that feel real. That alertness helps you think things through and stay ready. It can also mean the level of concern shifts quite a bit depending on what's on your mind, so you're not running on a steady hum.",
        "tags": [
          "Selective worry",
          "Shifts with stakes",
          "Stays alert"
        ]
      },
      "Friendliness:mid": {
        "trait_quote": "Friendship comes naturally to you once you decide to reach out, though warming to someone fresh can take a little time.",
        "body": "You often make real connections with people, especially when the setting invites you to engage. That gives you solid friendships without the drain of forcing yourself to be \"on\" all the time. It can mean you miss chances early on, when someone else might have already bonded with the group.",
        "tags": [
          "Builds real bonds",
          "Takes time opening",
          "Selective warmth"
        ]
      },
      "Imagination:high": {
        "trait_quote": "Your mind often wanders into possibility and detail, building rich scenes you can see clearly. You enjoy spending time inside your head.",
        "body": "It often shows when you're alone or doing something routine—your thoughts drift into stories, what-ifs, or vivid pictures. That gives you a private world that's interesting and absorbing, which can make waiting or downtime feel less empty. It can also pull your attention away from what's happening around you right now, or make the actual world feel a bit duller by comparison.",
        "tags": [
          "Lives in detail",
          "Enjoys daydreaming",
          "Easily absorbed"
        ]
      },
      "Trust:mid": {
        "trait_quote": "You're willing to trust people, yet you don't automatically assume their hearts are in the right place.",
        "body": "It often shows up when you're meeting someone new or when stakes are high. You can work with people without needing to believe they're purely well-intentioned, which keeps you from naive harm and lets you stay open at the same time. The gap between these two stances can sometimes feel like holding two separate judgments at once, and it means you're rarely fully settled either way.",
        "tags": [
          "Cautious openness",
          "Skeptical but cooperative",
          "Withheld certainty"
        ]
      },
      "Cheerfulness:mid": {
        "trait_quote": "You can light up a room without chasing fun constantly. There's a warmth to you that doesn't need to prove itself.",
        "body": "You tend to share positive feelings and energy when you're present with others, which draws people in. That gives you real connection without the pressure to be 'on' all the time. It can also mean you're quieter in your own company, or that others sometimes miss your steadier moods.",
        "tags": [
          "Radiates warmth",
          "Measured lightheartedness",
          "Selective energy"
        ]
      }
    }
  }
}
