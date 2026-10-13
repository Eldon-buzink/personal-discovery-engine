import 'server-only'

import { facetTraitWords } from '@/lib/known/scoring'

// Validation for generatePatternCopy's arguments. They arrive from the
// browser and are interpolated into the model prompt, so anything outside
// the shapes the app actually sends is rejected rather than passed through.

export const BRANCHES = ['energy', 'working_style', 'direction', 'relationships', 'environment'] as const
export type Branch = (typeof BRANCHES)[number]

export interface StrongCondition {
  label: string
  traitWord: string
  score: number
}

export type PatternCopyRequest =
  | { kind: 'ring1'; facetName: string; traitWord: string; scoreDirection: 'high' | 'mid' | 'low'; assessmentId: string | null }
  | {
      kind: 'branch'
      branch: Branch
      facetName: string
      traitWord: string
      scoreDirection: 'high' | 'mid' | 'low'
      assessmentId: string | null
      strongConditions?: StrongCondition[]
    }

const DIRECTIONS = ['high', 'mid', 'low'] as const
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Branch labels/words the app sends are short plain phrases ("Making real
// progress", "Deep work", "Structured") — letters, spaces and a little
// punctuation. Nothing that could carry instructions into the prompt.
const BRANCH_TEXT = /^[A-Za-z][A-Za-z '&/()-]{0,39}$/

export function parsePatternCopyRequest(
  facetName: unknown,
  traitWord: unknown,
  scoreDirection: unknown,
  assessmentId: unknown,
  branch: unknown,
  strongConditions: unknown
): PatternCopyRequest | null {
  if (typeof scoreDirection !== 'string' || !(DIRECTIONS as readonly string[]).includes(scoreDirection)) return null
  const direction = scoreDirection as 'high' | 'mid' | 'low'

  let id: string | null = null
  if (assessmentId !== null && assessmentId !== undefined) {
    if (typeof assessmentId !== 'string' || !UUID.test(assessmentId)) return null
    id = assessmentId
  }

  if (branch === undefined || branch === null) {
    // Ring 1: must be one of the 30 real facets, with one of its own three
    // trait words (any band — the report page can pair a word computed at
    // reveal time with a direction computed later, which may differ).
    if (strongConditions !== undefined && strongConditions !== null) return null
    if (typeof facetName !== 'string' || typeof traitWord !== 'string') return null
    const words = facetTraitWords(facetName)
    if (!words || ![words.low, words.mid, words.high].includes(traitWord)) return null
    return { kind: 'ring1', facetName, traitWord, scoreDirection: direction, assessmentId: id }
  }

  if (typeof branch !== 'string' || !(BRANCHES as readonly string[]).includes(branch)) return null
  if (typeof facetName !== 'string' || !BRANCH_TEXT.test(facetName)) return null
  if (typeof traitWord !== 'string' || !BRANCH_TEXT.test(traitWord)) return null

  let conditions: StrongCondition[] | undefined
  if (strongConditions !== undefined && strongConditions !== null) {
    if (!Array.isArray(strongConditions) || strongConditions.length > 6) return null
    conditions = []
    for (const c of strongConditions) {
      if (!c || typeof c !== 'object') return null
      const { label, traitWord: word, score } = c as Record<string, unknown>
      if (typeof label !== 'string' || !BRANCH_TEXT.test(label)) return null
      if (typeof word !== 'string' || !BRANCH_TEXT.test(word)) return null
      if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 10) return null
      conditions.push({ label, traitWord: word, score })
    }
  }

  return {
    kind: 'branch',
    branch: branch as Branch,
    facetName,
    traitWord,
    scoreDirection: direction,
    assessmentId: id,
    strongConditions: conditions,
  }
}
