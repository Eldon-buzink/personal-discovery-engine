'use client'

import { useEffect, useState } from 'react'
import { useRouter, notFound } from 'next/navigation'
import QuestionCard from '@/components/known/QuestionCard'
import { createClient } from '@/lib/supabase/client'
import { fetchIsPaid } from '@/lib/known/paywall'
import {
  MINI_ASSESSMENT_SLUG_TO_FACET,
  MINI_ASSESSMENT_ITEMS,
  MINI_ASSESSMENT_DISPLAY_LABEL,
  scoreMiniAssessment,
  bandForScore,
  type MiniAssessmentSlug,
} from '@/lib/known/miniAssessmentScoring'

// Per-browser identifier for a pre-account mini-assessment result, distinct
// from the row's own id (which is what actually gets claimed on signup —
// see AuthModalContext 'mini-assessment-signup'). Mirrors anonymous_sessions'
// shape even though nothing reads this back today; kept for the same reason
// anonymous_sessions carries one.
const MINI_SESSION_ID_KEY = 'known_mini_assessment_session_id'

export default function MiniAssessmentQuizPage({ params }: { params: { facet: string } }) {
  const router = useRouter()
  const slug = params.facet as MiniAssessmentSlug
  const facet = MINI_ASSESSMENT_SLUG_TO_FACET[slug]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eligibilityChecked, setEligibilityChecked] = useState(false)

  // Handover §7.1 eligibility rule, confirmed in review: gate on is_paid —
  // mini-assessments are acquisition, not for existing paid users. This was
  // the quiz-ACCESS half of the "two-place enforcement" the doc calls for;
  // the other half (landing-page routing) belongs to the separate
  // 02-landing-page-handover.md build, not here. A logged-out or
  // logged-in-but-unpaid visitor is unaffected — this only redirects paid
  // users away.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const paid = await fetchIsPaid(user.id)
        if (paid) {
          router.push('/practice')
          return
        }
      }
      setEligibilityChecked(true)
    })
  }, [router])

  if (!facet) notFound()
  if (!eligibilityChecked) return null

  const items = MINI_ASSESSMENT_ITEMS[facet]
  const displayLabel = MINI_ASSESSMENT_DISPLAY_LABEL[facet]

  async function handleNext(answer: string) {
    const value = Number(answer)
    const newResponses = [...responses, value]

    if (currentIndex + 1 < items.length) {
      setResponses(newResponses)
      setCurrentIndex((i) => i + 1)
      return
    }

    setIsSubmitting(true)
    const score = scoreMiniAssessment(facet, newResponses)
    const band = bandForScore(score)

    let sessionId = localStorage.getItem(MINI_SESSION_ID_KEY)
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      localStorage.setItem(MINI_SESSION_ID_KEY, sessionId)
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('mini_assessment_results')
      .insert({ session_id: sessionId, facet_id: facet, responses: newResponses, band })
      .select('id')
      .single()

    if (error) {
      console.error('[MiniAssessmentQuiz] insert error:', error.message)
      setIsSubmitting(false)
      return
    }

    router.push(`/mini-assessment/${slug}/result?id=${data.id}&band=${band}`)
  }

  return (
    <>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10">
        <span className="font-sans text-[11px] uppercase tracking-wide text-muted">
          {displayLabel} · quick check
        </span>
      </div>
      <div style={{ opacity: isSubmitting ? 0.4 : 1, transition: 'opacity 0.2s ease', pointerEvents: isSubmitting ? 'none' : 'auto' }}>
        <QuestionCard
          key={currentIndex}
          questionNumber={currentIndex + 1}
          totalQuestions={items.length}
          question={items[currentIndex].text}
          format="dot-scale"
          onNext={handleNext}
          centered={false}
          scaleLabels={['Very Inaccurate', 'Very Accurate']}
        />
      </div>
    </>
  )
}
