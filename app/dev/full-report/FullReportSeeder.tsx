'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DOMAIN_FACETS, FACET_QUESTIONS } from '@/lib/known/ring1-questions'

// Deterministic, varied answers: each facet gets its own lean (from clearly
// low to clearly high, some in the middle), so the strength order and the
// trait words cover the full range.
const LEANS = [1, 5, 3, 2, 4, 5, 1, 3, 4, 2]

function buildSession() {
  const facets = Object.values(DOMAIN_FACETS).flat()
  const responses: { questionId: number; value: number }[] = []
  facets.forEach((facet, fi) => {
    const lean = LEANS[fi % LEANS.length]
    ;(FACET_QUESTIONS.get(facet) ?? []).forEach((q, qi) => {
      const target = Math.max(1, Math.min(5, lean + (qi === 3 ? (fi % 3) - 1 : 0)))
      responses.push({ questionId: q.id, value: q.reverseScored ? 6 - target : target })
    })
  })
  responses.sort((a, b) => a.questionId - b.questionId)
  // Reveal order as if answered in question order: a facet reveals once all
  // four of its questions are in.
  const revealed = [...facets].sort((a, b) => {
    const last = (f: string) => Math.max(...(FACET_QUESTIONS.get(f) ?? []).map((q) => q.id))
    return last(a) - last(b)
  })
  return { responses, revealedFacets: revealed, patternContents: [] }
}

export default function FullReportSeeder() {
  const router = useRouter()
  useEffect(() => {
    localStorage.setItem('known_session', JSON.stringify(buildSession()))
    router.replace('/report')
  }, [router])
  return <p style={{ padding: 40, fontFamily: 'system-ui' }}>Loading a complete test report…</p>
}
