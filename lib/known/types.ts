export interface PatternContent {
  trait_quote: string
  where_it_shows_up: string
  tags: string[]
  go_deeper: string
  worth_trying: string
  // Energy branch only: per-item quote+evidence, positionally matched to the
  // strongConditions passed into generatePatternCopy (order: fuel[0], fuel[1],
  // drain[0], drain[1]). Absent for every other branch/facet.
  items?: Array<{ quote: string; evidence: string }>
}

export interface PatternContentEntry {
  facet: string
  traitWord: string
  scoreDirection: 'high' | 'mid' | 'low'
  content: PatternContent
  branch?: string
  dimensionScores?: Record<string, number>
  strongConditions?: Array<{ label: string; traitWord: string; score: number; quote?: string; evidence?: string }>
}

export interface CompletedFacetRecord {
  facet: string
  traitWord: string
  scoreDirection: 'high' | 'mid' | 'low'
  hueOffset: number
  answeredCount: number
  content: PatternContent | null  // null while AI is generating
}
