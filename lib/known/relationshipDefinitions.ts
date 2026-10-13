/**
 * lib/known/relationshipDefinitions.ts
 *
 * The relationship insights shown on Ring 1 trait cards: plain data only, no
 * logic, so the content can be edited without touching code. The engine is
 * lib/known/relationships.ts.
 *
 * A "signal" is a facet whose stored direction is high or low — mid never
 * counts — and only for facets the user has actually revealed.
 *
 * Themes fire when every `requires` signal is met and at least `min` of
 * `signals` are. Tensions fire when two revealed facets in the same domain
 * point opposite ways (one high, one low). With CURATED_TENSIONS_ONLY, only
 * the pairs in TENSION_GROUNDINGS count; otherwise any other same-domain pair
 * is grounded with both facets' behavioural descriptions instead.
 */

export type SignalDirection = 'high' | 'low'

export interface RelationshipSignal {
  facet: string
  direction: SignalDirection
}

export interface ThemeDefinition {
  id: string
  // All of these must be met (the anchor), in addition to `min` of `signals`.
  requires: RelationshipSignal[]
  signals: RelationshipSignal[]
  min: number
  gives: string
  costs: string
}

export interface TensionGrounding {
  high: string
  low: string
  line: string
}

// Only the curated pairs in TENSION_GROUNDINGS count as tensions. Read by
// the engine, so the report and the server check follow it together.
export const CURATED_TENSIONS_ONLY = true

// Report side only (when raw facet scores are known): the high facet's score
// minus the low facet's score must be at least this. The server check is
// direction-based and doesn't use it. (Directions alone give high >= 3.5 and
// low <= 2.25, since facet scores are averages of 4 answers.)
export const TENSION_MIN_SCORE_GAP = 1.5

// Facets never used in any relationship (theme or tension).
export const RELATIONSHIP_EXCLUDED_FACETS: readonly string[] = ['Depression']

// PARKED — not used. These cross-domain themes are our own groupings, not
// an established framework (IPIP-NEO only groups facets into the five
// domains), so they stay off until a fit study validates them. The engine,
// the server check, the simulation and the UI use ACTIVE_THEMES only.
export const PARKED_THEMES: ThemeDefinition[] = [
  {
    id: 'self_direction',
    requires: [],
    signals: [
      { facet: 'Cooperation', direction: 'low' },
      { facet: 'Liberalism', direction: 'high' },
      { facet: 'Assertiveness', direction: 'high' },
      { facet: 'Dutifulness', direction: 'low' },
      { facet: 'Self-Efficacy', direction: 'high' },
    ],
    min: 3,
    gives: 'decisions that fit what you need, and people know where you stand',
    costs: "your answer isn't always the popular one, and independence can read as distance",
  },
  {
    id: 'putting_others_first',
    requires: [],
    signals: [
      { facet: 'Cooperation', direction: 'high' },
      { facet: 'Modesty', direction: 'high' },
      { facet: 'Trust', direction: 'high' },
      { facet: 'Altruism', direction: 'high' },
      { facet: 'Assertiveness', direction: 'low' },
    ],
    min: 3,
    gives: 'easy harmony and people feeling looked after',
    costs: "your own needs often go unsaid until they're large",
  },
  {
    id: 'drive_with_unease',
    requires: [{ facet: 'Achievement-Striving', direction: 'high' }],
    signals: [
      { facet: 'Anxiety', direction: 'high' },
      { facet: 'Vulnerability', direction: 'high' },
      { facet: 'Self-Consciousness', direction: 'high' },
    ],
    min: 1,
    gives: 'high standards and thorough preparation',
    costs: "finishing doesn't always feel finished",
  },
  {
    id: 'dependable_follow_through',
    requires: [],
    signals: [
      { facet: 'Self-Discipline', direction: 'high' },
      { facet: 'Orderliness', direction: 'high' },
      { facet: 'Dutifulness', direction: 'high' },
      { facet: 'Cautiousness', direction: 'high' },
      { facet: 'Achievement-Striving', direction: 'high' },
    ],
    min: 3,
    gives: 'people can count on you and things get done properly',
    costs: 'plans that change midway can feel like a loss, not a detour',
  },
  {
    id: 'wide_ranging_mind',
    requires: [],
    signals: [
      { facet: 'Imagination', direction: 'high' },
      { facet: 'Intellect', direction: 'high' },
      { facet: 'Adventurousness', direction: 'high' },
      { facet: 'Artistic Interests', direction: 'high' },
      { facet: 'Liberalism', direction: 'high' },
    ],
    min: 3,
    gives: 'many angles and a steady supply of ideas',
    costs: 'more threads open than any one person can close',
  },
]

// Themes the engine uses. Empty while all themes are parked; to re-enable
// after the fit study, set this to PARKED_THEMES (one line).
export const ACTIVE_THEMES: ThemeDefinition[] = []

// High facet first. Order here is the tie-break order between tensions.
// Every pair must sit inside one domain (DOMAIN_FACETS); the engine only
// looks for tensions within a domain, so a cross-domain pair never fires.
export const TENSION_GROUNDINGS: TensionGrounding[] = [
  { high: 'Achievement-Striving', low: 'Self-Discipline', line: 'Ambition runs ahead of day-to-day follow-through.' },
  { high: 'Self-Discipline', low: 'Achievement-Striving', line: 'Steady effort without a big goal pulling you.' },
  { high: 'Self-Efficacy', low: 'Self-Discipline', line: 'Strong belief you can do it, less steady pull to keep going.' },
  { high: 'Gregariousness', low: 'Friendliness', line: "Likes being around people, but doesn't warm to individuals quickly." },
  { high: 'Friendliness', low: 'Gregariousness', line: 'Warm one to one, less drawn to groups and crowds.' },
  { high: 'Anxiety', low: 'Vulnerability', line: "Worries a lot, yet doesn't come apart under real pressure." },
  { high: 'Vulnerability', low: 'Anxiety', line: 'Calm day to day, but rattled when pressure peaks.' },
  { high: 'Altruism', low: 'Cooperation', line: "Helps readily, but doesn't back down in a disagreement." },
  { high: 'Emotionality', low: 'Sympathy', line: "In touch with own feelings, less moved by other people's." },
  { high: 'Imagination', low: 'Intellect', line: 'Rich inner world, less pull toward abstract debate.' },
  { high: 'Orderliness', low: 'Cautiousness', line: 'Wants systems in place, but acts quickly without long deliberation.' },
]
