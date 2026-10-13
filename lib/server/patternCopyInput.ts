import 'server-only'

import { facetTraitWords } from '@/lib/known/scoring'
import { FACET_QUESTIONS } from '@/lib/known/ring1-questions'
import type { FacetAnswer } from '@/lib/known/ring1Evidence'

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

// Optional evidence for a Ring 1 card: the facet's own answers as ids and
// values only (the server looks up the item text). Every id must belong to
// that facet, values must be whole numbers 1–5, no duplicates. Anything
// else rejects the request rather than being silently dropped.
export function parseRing1Answers(facetName: string, answers: unknown): FacetAnswer[] | null {
  if (answers === undefined || answers === null) return []
  if (!Array.isArray(answers)) return null
  const facetIds = new Set((FACET_QUESTIONS.get(facetName) ?? []).map((q) => q.id))
  if (answers.length > facetIds.size) return null
  const seen = new Set<number>()
  const out: FacetAnswer[] = []
  for (const a of answers) {
    if (!a || typeof a !== 'object') return null
    const { questionId, value } = a as Record<string, unknown>
    if (typeof questionId !== 'number' || !facetIds.has(questionId) || seen.has(questionId)) return null
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) return null
    seen.add(questionId)
    out.push({ questionId, value })
  }
  return out
}
