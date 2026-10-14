'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FACET_QUESTIONS } from '@/lib/known/ring1-questions'
import { computeFacetScore, getTraitWord } from '@/lib/known/scoring'
import { INSIGHT_FIXTURES } from '../fixtures'

// Answers that land each facet clearly in its band (scores 4.5 / 3.25 / 1.5),
// so the report's tension thresholds see the same thing as the directions.
const ADJUSTED = { high: [5, 4, 5, 4], mid: [4, 2, 3, 4], low: [1, 2, 1, 2] } as const

function buildSession(fixtureId: string) {
  const fixture = INSIGHT_FIXTURES[fixtureId]
  if (!fixture) return null
  const responses: { questionId: number; value: number; answeredAt: string }[] = []
  const patternContents = fixture.traits.map(([facet, dir]) => {
    const items = FACET_QUESTIONS.get(facet) ?? []
    const answers = new Map<number, number>()
    items.forEach((q, i) => {
      const value = q.reverseScored ? 6 - ADJUSTED[dir][i] : ADJUSTED[dir][i]
      answers.set(q.id, value)
      responses.push({ questionId: q.id, value, answeredAt: '2026-10-13T10:00:00.000Z' })
    })
    const traitWord = getTraitWord(facet, computeFacetScore(facet, answers)!)
    const c = fixture.cards[`${facet}:${dir}`]
    const content = facet === fixture.oldCardFacet
      // The old cached format: no body; where_it_shows_up stands in, and
      // go_deeper / worth_trying must not appear on the card.
      ? { trait_quote: c.trait_quote, where_it_shows_up: c.body, tags: c.tags, go_deeper: 'OLD GO DEEPER (should not show)', worth_trying: 'OLD WORTH TRYING (should not show)' }
      : c
    return { facet, traitWord, scoreDirection: dir, content }
  })
  return {
    questionOrder: Array.from({ length: 120 }, (_, i) => i + 1),
    responses: responses.sort((a, b) => a.questionId - b.questionId),
    revealedFacets: patternContents.map((p) => p.facet),
    patternShown: { facet: patternContents[0].facet, traitWord: patternContents[0].traitWord, answeredAt: '2026-10-13T10:00:00.000Z' },
    patternContents,
  }
}

export default function InsightSeeder({ fixtureId }: { fixtureId: string }) {
  const router = useRouter()
  useEffect(() => {
    const session = buildSession(fixtureId)
    if (!session) return
    localStorage.setItem('known_session', JSON.stringify(session))
    // Fresh start for relationship insights: no cache, no spent attempts.
    try { sessionStorage.removeItem('known_relationship_insight_attempts') } catch {}
    router.replace('/report')
  }, [fixtureId, router])
  return (
    <p style={{ padding: 40, fontFamily: 'system-ui' }}>
      {INSIGHT_FIXTURES[fixtureId] ? 'Loading the fixture report…' : `Unknown fixture "${fixtureId}".`}
    </p>
  )
}
