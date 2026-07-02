export type Domain =
  | 'Neuroticism'
  | 'Extraversion'
  | 'Openness'
  | 'Agreeableness'
  | 'Conscientiousness'

export interface Ring1Question {
  id: number
  text: string
  domain: Domain
  facet: string
  reverseScored: boolean
}

// IPIP-NEO-120 — public domain personality instrument
// Items 1-24: Neuroticism | 25-48: Extraversion | 49-72: Openness
// Items 73-96: Agreeableness | 97-120: Conscientiousness
// reverseScored = true means high agreement indicates LOW trait level (6 - raw)

export const RING1_QUESTIONS: Ring1Question[] = [
  // ── NEUROTICISM ──────────────────────────────────────────────────────────────

  // N1: Anxiety
  { id: 1,  text: 'Worry about things.',                          domain: 'Neuroticism', facet: 'Anxiety',           reverseScored: false },
  { id: 2,  text: 'Fear for the worst.',                          domain: 'Neuroticism', facet: 'Anxiety',           reverseScored: false },
  { id: 3,  text: 'Am afraid of many things.',                    domain: 'Neuroticism', facet: 'Anxiety',           reverseScored: false },
  { id: 4,  text: 'Get stressed out easily.',                     domain: 'Neuroticism', facet: 'Anxiety',           reverseScored: false },

  // N2: Anger
  { id: 5,  text: 'Get angry easily.',                            domain: 'Neuroticism', facet: 'Anger',             reverseScored: false },
  { id: 6,  text: 'Get irritated easily.',                        domain: 'Neuroticism', facet: 'Anger',             reverseScored: false },
  { id: 7,  text: 'Lose my temper.',                              domain: 'Neuroticism', facet: 'Anger',             reverseScored: false },
  { id: 8,  text: 'Am not easily annoyed.',                       domain: 'Neuroticism', facet: 'Anger',             reverseScored: true  },

  // N3: Depression
  { id: 9,  text: 'Often feel blue.',                             domain: 'Neuroticism', facet: 'Depression',        reverseScored: false },
  { id: 10, text: 'Dislike myself.',                              domain: 'Neuroticism', facet: 'Depression',        reverseScored: false },
  { id: 11, text: 'Am often down in the dumps.',                  domain: 'Neuroticism', facet: 'Depression',        reverseScored: false },
  { id: 12, text: 'Feel comfortable with myself.',                domain: 'Neuroticism', facet: 'Depression',        reverseScored: true  },

  // N4: Self-Consciousness
  { id: 13, text: 'Am easily embarrassed.',                       domain: 'Neuroticism', facet: 'Self-Consciousness', reverseScored: false },
  { id: 14, text: 'Find it difficult to approach others.',        domain: 'Neuroticism', facet: 'Self-Consciousness', reverseScored: false },
  { id: 15, text: 'Am afraid to draw attention to myself.',       domain: 'Neuroticism', facet: 'Self-Consciousness', reverseScored: false },
  { id: 16, text: 'Am comfortable in unfamiliar situations.',     domain: 'Neuroticism', facet: 'Self-Consciousness', reverseScored: true  },

  // N5: Immoderation
  { id: 17, text: 'Don\'t know why I do some of the things I do.', domain: 'Neuroticism', facet: 'Immoderation',    reverseScored: false },
  { id: 18, text: 'Have trouble resisting my cravings.',          domain: 'Neuroticism', facet: 'Immoderation',    reverseScored: false },
  { id: 19, text: 'Eat too much.',                                domain: 'Neuroticism', facet: 'Immoderation',    reverseScored: false },
  { id: 20, text: 'Easily resist temptations.',                   domain: 'Neuroticism', facet: 'Immoderation',    reverseScored: true  },

  // N6: Vulnerability
  { id: 21, text: 'Panic easily.',                                domain: 'Neuroticism', facet: 'Vulnerability',    reverseScored: false },
  { id: 22, text: 'Become overwhelmed by events.',                domain: 'Neuroticism', facet: 'Vulnerability',    reverseScored: false },
  { id: 23, text: 'Feel that I\'m unable to deal with things.',   domain: 'Neuroticism', facet: 'Vulnerability',    reverseScored: false },
  { id: 24, text: 'Remain calm under pressure.',                  domain: 'Neuroticism', facet: 'Vulnerability',    reverseScored: true  },

  // ── EXTRAVERSION ─────────────────────────────────────────────────────────────

  // E1: Friendliness
  { id: 25, text: 'Make friends easily.',                         domain: 'Extraversion', facet: 'Friendliness',    reverseScored: false },
  { id: 26, text: 'Warm up quickly to others.',                   domain: 'Extraversion', facet: 'Friendliness',    reverseScored: false },
  { id: 27, text: 'Feel comfortable around people.',              domain: 'Extraversion', facet: 'Friendliness',    reverseScored: false },
  { id: 28, text: 'Am hard to get to know.',                      domain: 'Extraversion', facet: 'Friendliness',    reverseScored: true  },

  // E2: Gregariousness
  { id: 29, text: 'Enjoy being part of a group.',                 domain: 'Extraversion', facet: 'Gregariousness',  reverseScored: false },
  { id: 30, text: 'Like to be where the action is.',              domain: 'Extraversion', facet: 'Gregariousness',  reverseScored: false },
  { id: 31, text: 'Involve others in what I\'m doing.',           domain: 'Extraversion', facet: 'Gregariousness',  reverseScored: false },
  { id: 32, text: 'Prefer to be alone.',                          domain: 'Extraversion', facet: 'Gregariousness',  reverseScored: true  },

  // E3: Assertiveness
  { id: 33, text: 'Take charge.',                                 domain: 'Extraversion', facet: 'Assertiveness',   reverseScored: false },
  { id: 34, text: 'Try to lead others.',                          domain: 'Extraversion', facet: 'Assertiveness',   reverseScored: false },
  { id: 35, text: 'Can talk others into doing things.',           domain: 'Extraversion', facet: 'Assertiveness',   reverseScored: false },
  { id: 36, text: 'Wait for others to lead the way.',             domain: 'Extraversion', facet: 'Assertiveness',   reverseScored: true  },

  // E4: Activity Level
  { id: 37, text: 'Am always busy.',                              domain: 'Extraversion', facet: 'Activity Level',  reverseScored: false },
  { id: 38, text: 'Like to keep busy.',                           domain: 'Extraversion', facet: 'Activity Level',  reverseScored: false },
  { id: 39, text: 'Am always on the go.',                         domain: 'Extraversion', facet: 'Activity Level',  reverseScored: false },
  { id: 40, text: 'Like a leisurely lifestyle.',                  domain: 'Extraversion', facet: 'Activity Level',  reverseScored: true  },

  // E5: Excitement-Seeking
  { id: 41, text: 'Enjoy being reckless.',                        domain: 'Extraversion', facet: 'Excitement-Seeking', reverseScored: false },
  { id: 42, text: 'Seek adventure.',                              domain: 'Extraversion', facet: 'Excitement-Seeking', reverseScored: false },
  { id: 43, text: 'Enjoy excitement.',                            domain: 'Extraversion', facet: 'Excitement-Seeking', reverseScored: false },
  { id: 44, text: 'Would rather not gamble.',                     domain: 'Extraversion', facet: 'Excitement-Seeking', reverseScored: true  },

  // E6: Cheerfulness
  { id: 45, text: 'Radiate joy.',                                 domain: 'Extraversion', facet: 'Cheerfulness',    reverseScored: false },
  { id: 46, text: 'Have a lot of fun.',                           domain: 'Extraversion', facet: 'Cheerfulness',    reverseScored: false },
  { id: 47, text: 'Laugh a lot.',                                 domain: 'Extraversion', facet: 'Cheerfulness',    reverseScored: false },
  { id: 48, text: 'Seldom joke around.',                          domain: 'Extraversion', facet: 'Cheerfulness',    reverseScored: true  },

  // ── OPENNESS ─────────────────────────────────────────────────────────────────

  // O1: Imagination
  { id: 49, text: 'Have a vivid imagination.',                    domain: 'Openness', facet: 'Imagination',         reverseScored: false },
  { id: 50, text: 'Enjoy wild flights of fantasy.',               domain: 'Openness', facet: 'Imagination',         reverseScored: false },
  { id: 51, text: 'Love to daydream.',                            domain: 'Openness', facet: 'Imagination',         reverseScored: false },
  { id: 52, text: 'Seldom get lost in thought.',                  domain: 'Openness', facet: 'Imagination',         reverseScored: true  },

  // O2: Artistic Interests
  { id: 53, text: 'Believe in the importance of art.',            domain: 'Openness', facet: 'Artistic Interests',  reverseScored: false },
  { id: 54, text: 'See beauty in things that others might not notice.', domain: 'Openness', facet: 'Artistic Interests', reverseScored: false },
  { id: 55, text: 'Am moved by beautiful music.',                 domain: 'Openness', facet: 'Artistic Interests',  reverseScored: false },
  { id: 56, text: 'Do not like art.',                             domain: 'Openness', facet: 'Artistic Interests',  reverseScored: true  },

  // O3: Emotionality
  { id: 57, text: 'Experience my emotions intensely.',            domain: 'Openness', facet: 'Emotionality',        reverseScored: false },
  { id: 58, text: 'Feel things deeply.',                          domain: 'Openness', facet: 'Emotionality',        reverseScored: false },
  { id: 59, text: 'Am passionate about causes.',                  domain: 'Openness', facet: 'Emotionality',        reverseScored: false },
  { id: 60, text: 'Rarely notice my emotional reactions.',        domain: 'Openness', facet: 'Emotionality',        reverseScored: true  },

  // O4: Adventurousness
  { id: 61, text: 'Prefer variety to routine.',                   domain: 'Openness', facet: 'Adventurousness',     reverseScored: false },
  { id: 62, text: 'Like to visit new places.',                    domain: 'Openness', facet: 'Adventurousness',     reverseScored: false },
  { id: 63, text: 'Am interested in many things.',                domain: 'Openness', facet: 'Adventurousness',     reverseScored: false },
  { id: 64, text: 'Prefer to stick with things that I know.',     domain: 'Openness', facet: 'Adventurousness',     reverseScored: true  },

  // O5: Intellect
  { id: 65, text: 'Like to think up new ways of doing things.',   domain: 'Openness', facet: 'Intellect',           reverseScored: false },
  { id: 66, text: 'Enjoy thinking about things.',                 domain: 'Openness', facet: 'Intellect',           reverseScored: false },
  { id: 67, text: 'Love to read challenging material.',           domain: 'Openness', facet: 'Intellect',           reverseScored: false },
  { id: 68, text: 'Avoid difficult reading material.',            domain: 'Openness', facet: 'Intellect',           reverseScored: true  },

  // O6: Liberalism
  { id: 69, text: 'Tend to vote for liberal political candidates.', domain: 'Openness', facet: 'Liberalism',        reverseScored: false },
  { id: 70, text: 'Believe that there is no absolute right and wrong.', domain: 'Openness', facet: 'Liberalism',    reverseScored: false },
  { id: 71, text: 'Tend toward liberal political views.',         domain: 'Openness', facet: 'Liberalism',          reverseScored: false },
  { id: 72, text: 'Believe in one true religion.',                domain: 'Openness', facet: 'Liberalism',          reverseScored: true  },

  // ── AGREEABLENESS ────────────────────────────────────────────────────────────

  // A1: Trust
  { id: 73, text: 'Trust others.',                                domain: 'Agreeableness', facet: 'Trust',          reverseScored: false },
  { id: 74, text: 'Believe that others have good intentions.',    domain: 'Agreeableness', facet: 'Trust',          reverseScored: false },
  { id: 75, text: 'Think well of others.',                        domain: 'Agreeableness', facet: 'Trust',          reverseScored: false },
  { id: 76, text: 'Suspect hidden motives in others.',            domain: 'Agreeableness', facet: 'Trust',          reverseScored: true  },

  // A2: Morality
  { id: 77, text: 'Would never cheat on my taxes.',               domain: 'Agreeableness', facet: 'Morality',       reverseScored: false },
  { id: 78, text: 'Stick to the rules.',                          domain: 'Agreeableness', facet: 'Morality',       reverseScored: false },
  { id: 79, text: 'Tell the truth.',                              domain: 'Agreeableness', facet: 'Morality',       reverseScored: false },
  { id: 80, text: 'Know how to get around the rules.',            domain: 'Agreeableness', facet: 'Morality',       reverseScored: true  },

  // A3: Altruism
  { id: 81, text: 'Make people feel welcome.',                    domain: 'Agreeableness', facet: 'Altruism',       reverseScored: false },
  { id: 82, text: 'Anticipate the needs of others.',              domain: 'Agreeableness', facet: 'Altruism',       reverseScored: false },
  { id: 83, text: 'Love to help others.',                         domain: 'Agreeableness', facet: 'Altruism',       reverseScored: false },
  { id: 84, text: 'Am indifferent to the feelings of others.',    domain: 'Agreeableness', facet: 'Altruism',       reverseScored: true  },

  // A4: Cooperation
  { id: 85, text: 'Hate to seem pushy.',                          domain: 'Agreeableness', facet: 'Cooperation',    reverseScored: false },
  { id: 86, text: 'Am easy to satisfy.',                          domain: 'Agreeableness', facet: 'Cooperation',    reverseScored: false },
  { id: 87, text: 'Am willing to compromise.',                    domain: 'Agreeableness', facet: 'Cooperation',    reverseScored: false },
  { id: 88, text: 'Insist on getting the best.',                  domain: 'Agreeableness', facet: 'Cooperation',    reverseScored: true  },

  // A5: Modesty
  { id: 89, text: 'Dislike being the center of attention.',       domain: 'Agreeableness', facet: 'Modesty',        reverseScored: false },
  { id: 90, text: 'Don\'t like to draw attention to myself.',     domain: 'Agreeableness', facet: 'Modesty',        reverseScored: false },
  { id: 91, text: 'Hold back my opinions.',                       domain: 'Agreeableness', facet: 'Modesty',        reverseScored: false },
  { id: 92, text: 'Believe I am better than others.',             domain: 'Agreeableness', facet: 'Modesty',        reverseScored: true  },

  // A6: Sympathy
  { id: 93, text: 'Sympathize with others\' feelings.',           domain: 'Agreeableness', facet: 'Sympathy',       reverseScored: false },
  { id: 94, text: 'Feel sympathy for those who are worse off than myself.', domain: 'Agreeableness', facet: 'Sympathy', reverseScored: false },
  { id: 95, text: 'Am interested in people.',                     domain: 'Agreeableness', facet: 'Sympathy',       reverseScored: false },
  { id: 96, text: 'Don\'t have a soft side.',                     domain: 'Agreeableness', facet: 'Sympathy',       reverseScored: true  },

  // ── CONSCIENTIOUSNESS ────────────────────────────────────────────────────────

  // C1: Self-Efficacy
  { id: 97,  text: 'Complete tasks successfully.',                domain: 'Conscientiousness', facet: 'Self-Efficacy',        reverseScored: false },
  { id: 98,  text: 'Handle tasks smoothly.',                      domain: 'Conscientiousness', facet: 'Self-Efficacy',        reverseScored: false },
  { id: 99,  text: 'Know how to get things done.',                domain: 'Conscientiousness', facet: 'Self-Efficacy',        reverseScored: false },
  { id: 100, text: 'Have difficulty starting tasks.',             domain: 'Conscientiousness', facet: 'Self-Efficacy',        reverseScored: true  },

  // C2: Orderliness
  { id: 101, text: 'Like order.',                                 domain: 'Conscientiousness', facet: 'Orderliness',          reverseScored: false },
  { id: 102, text: 'Keep things neat and tidy.',                  domain: 'Conscientiousness', facet: 'Orderliness',          reverseScored: false },
  { id: 103, text: 'Want everything to be \'just right\'.',       domain: 'Conscientiousness', facet: 'Orderliness',          reverseScored: false },
  { id: 104, text: 'Leave a mess in my room.',                    domain: 'Conscientiousness', facet: 'Orderliness',          reverseScored: true  },

  // C3: Dutifulness
  { id: 105, text: 'Try to follow the rules.',                    domain: 'Conscientiousness', facet: 'Dutifulness',          reverseScored: false },
  { id: 106, text: 'Keep my promises.',                           domain: 'Conscientiousness', facet: 'Dutifulness',          reverseScored: false },
  { id: 107, text: 'Pay my bills on time.',                       domain: 'Conscientiousness', facet: 'Dutifulness',          reverseScored: false },
  { id: 108, text: 'Do the opposite of what is asked.',           domain: 'Conscientiousness', facet: 'Dutifulness',          reverseScored: true  },

  // C4: Achievement-Striving
  { id: 109, text: 'Set high standards for myself and others.',   domain: 'Conscientiousness', facet: 'Achievement-Striving', reverseScored: false },
  { id: 110, text: 'Am always striving for more.',                domain: 'Conscientiousness', facet: 'Achievement-Striving', reverseScored: false },
  { id: 111, text: 'Work hard.',                                  domain: 'Conscientiousness', facet: 'Achievement-Striving', reverseScored: false },
  { id: 112, text: 'Do just enough work to get by.',              domain: 'Conscientiousness', facet: 'Achievement-Striving', reverseScored: true  },

  // C5: Self-Discipline
  { id: 113, text: 'Get chores done right away.',                 domain: 'Conscientiousness', facet: 'Self-Discipline',      reverseScored: false },
  { id: 114, text: 'Start tasks right away.',                     domain: 'Conscientiousness', facet: 'Self-Discipline',      reverseScored: false },
  { id: 115, text: 'Don\'t need a push to get started.',          domain: 'Conscientiousness', facet: 'Self-Discipline',      reverseScored: false },
  { id: 116, text: 'Postpone decisions.',                         domain: 'Conscientiousness', facet: 'Self-Discipline',      reverseScored: true  },

  // C6: Cautiousness
  { id: 117, text: 'Think before I speak.',                       domain: 'Conscientiousness', facet: 'Cautiousness',         reverseScored: false },
  { id: 118, text: 'Like to plan ahead.',                         domain: 'Conscientiousness', facet: 'Cautiousness',         reverseScored: false },
  { id: 119, text: 'Avoid making hasty decisions.',               domain: 'Conscientiousness', facet: 'Cautiousness',         reverseScored: false },
  { id: 120, text: 'Jump into things without thinking.',          domain: 'Conscientiousness', facet: 'Cautiousness',         reverseScored: true  },
]

// Quick lookup maps built once at module load
export const QUESTION_BY_ID = new Map<number, Ring1Question>(
  RING1_QUESTIONS.map(q => [q.id, q])
)

export const FACET_QUESTIONS = new Map<string, Ring1Question[]>()
for (const q of RING1_QUESTIONS) {
  const list = FACET_QUESTIONS.get(q.facet) ?? []
  list.push(q)
  FACET_QUESTIONS.set(q.facet, list)
}

export const DOMAIN_FACETS: Record<string, string[]> = {
  Neuroticism:       ['Anxiety', 'Anger', 'Depression', 'Self-Consciousness', 'Immoderation', 'Vulnerability'],
  Extraversion:      ['Friendliness', 'Gregariousness', 'Assertiveness', 'Activity Level', 'Excitement-Seeking', 'Cheerfulness'],
  Openness:          ['Imagination', 'Artistic Interests', 'Emotionality', 'Adventurousness', 'Intellect', 'Liberalism'],
  Agreeableness:     ['Trust', 'Morality', 'Altruism', 'Cooperation', 'Modesty', 'Sympathy'],
  Conscientiousness: ['Self-Efficacy', 'Orderliness', 'Dutifulness', 'Achievement-Striving', 'Self-Discipline', 'Cautiousness'],
}
