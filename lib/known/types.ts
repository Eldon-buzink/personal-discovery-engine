export interface PatternContent {
  trait_quote: string
  where_it_shows_up: string
  tags: string[]
  go_deeper: string
  worth_trying: string
}

export interface PatternContentEntry {
  facet: string
  traitWord: string
  scoreDirection: 'high' | 'mid' | 'low'
  content: PatternContent
  branch?: string
  dimensionScores?: Record<string, number>
  strongConditions?: Array<{ label: string; traitWord: string; score: number }>
}

export interface CompletedFacetRecord {
  facet: string
  traitWord: string
  scoreDirection: 'high' | 'mid' | 'low'
  hueOffset: number
  answeredCount: number
  content: PatternContent | null  // null while AI is generating
}
