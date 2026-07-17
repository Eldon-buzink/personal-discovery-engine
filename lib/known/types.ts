export interface PatternContent {
  trait_quote: string
  where_it_shows_up: string
  tags: string[]
  go_deeper: string
  worth_trying: string
  // Multi-item branches only (Energy, Working Style, Direction): per-item content,
  // positionally matched to strongConditions. Energy: fuel[0], fuel[1], drain[0],
  // drain[1]. Working Style: the 3 axes (structure, independence, directness).
  // Direction: the 1-3 shown types from selectShownDirections(), closest match
  // first — `word` is the accordion card's action-phrase title (Direction only;
  // absent for Energy/Working Style, which don't have a card title distinct from
  // quote/evidence). Absent entirely for every other branch/facet.
  items?: Array<{ quote: string; evidence: string; word?: string }>
  // Direction branch only: a single evocative archetype word (e.g. "Builder") for
  // the mid-assessment teaser blob — distinct from trait_quote's full sentence,
  // since every other branch's teaser word comes from a deterministic label, not AI.
  teaserWord?: string
}

export interface PatternContentEntry {
  facet: string
  traitWord: string
  scoreDirection: 'high' | 'mid' | 'low'
  content: PatternContent
  branch?: string
  dimensionScores?: Record<string, number>
  strongConditions?: Array<{ label: string; traitWord: string; score: number; quote?: string; evidence?: string; word?: string }>
  // ISO timestamp stamped when this branch's copy generation resolves. Drives the
  // report's completion-order section sequencing (environment/relationships/energy
  // only — Ring 1 facets don't set this, Ring 1 is always the report's first section).
  completedAt?: string
}

export interface CompletedFacetRecord {
  facet: string
  traitWord: string
  scoreDirection: 'high' | 'mid' | 'low'
  hueOffset: number
  answeredCount: number
  content: PatternContent | null  // null while AI is generating
}
