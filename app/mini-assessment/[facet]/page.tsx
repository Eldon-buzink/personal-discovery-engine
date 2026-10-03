'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
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

  const [started, setStarted] = useState(false)
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

    // Hand the raw per-item responses to the result page via sessionStorage,
    // keyed by the result row's own id — same browser, same tab lineage,
    // no RLS change needed to let the (possibly pre-signup) result page
    // read responses back out of the database. Purely an enhancement: the
    // result page falls back to band-only copy if this key is missing
    // (direct link, different browser, cleared storage).
    try {
      sessionStorage.setItem(`mini-assessment-responses-${data.id}`, JSON.stringify(newResponses))
    } catch {
      // sessionStorage can throw in rare cases (private mode, storage full)
      // — the result page's fallback handles a missing key either way.
    }

    router.push(`/mini-assessment/${slug}/result?id=${data.id}&band=${band}`)
  }

  if (!started) {
    return (
      <MiniOnboarding
        displayLabel={displayLabel}
        questionCount={items.length}
        onStart={() => setStarted(true)}
      />
    )
  }

  return (
    <>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10">
        <span className="font-sans text-[11px] uppercase tracking-wide text-muted">
          {displayLabel} · quick check
        </span>
      </div>
      {isSubmitting ? (
        <FindingResultLoader />
      ) : (
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
      )}
    </>
  )
}

// Short "before you begin" interstitial, modeled on the full assessment's
// /onboarding screen (app/onboarding/OnboardingClient.tsx) but scaled down
// to match a 6-question, ~2-minute mini-assessment — a single screen, no
// trust-building essay, since there's much less to set expectations for.
// Same staggered fade-in + fade-out-on-start transition as that screen,
// just a shorter choreography (3 beats instead of 5).
function MiniOnboarding({
  displayLabel,
  questionCount,
  onStart,
}: {
  displayLabel: string
  questionCount: number
  onStart: () => void
}) {
  const [exiting, setExiting] = useState(false)

  function handleStart() {
    setExiting(true)
    setTimeout(onStart, 280)
  }

  function fade(delayMs: number): CSSProperties {
    return { animation: 'fadeIn 0.6s ease both', animationDelay: `${delayMs}ms` }
  }

  return (
    <div
      className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-12"
      style={{
        transition: 'opacity 0.28s ease, transform 0.28s ease',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-14px)' : 'none',
      }}
    >
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <span className="font-sans text-[11px] uppercase tracking-wide text-muted" style={{ ...fade(0), marginBottom: 20 }}>
          {displayLabel} · quick check
        </span>

        <h1
          className="font-serif text-[24px] font-medium leading-[1.4] text-charcoal"
          style={{ ...fade(200), marginBottom: 16 }}
        >
          There&apos;s no wrong answer here.
        </h1>

        <p className="font-sans text-[15px] leading-[1.65] text-charcoal-soft" style={{ ...fade(400), marginBottom: 32 }}>
          Rate each statement as it actually is for you right now, not how you wish it were. Go with your first
          instinct.
        </p>

        <div style={fade(600)} className="w-full flex flex-col items-center">
          <button
            onClick={handleStart}
            className="w-full bg-charcoal text-cream font-sans font-medium text-[15px] rounded-full"
            style={{ padding: '14px 24px', marginBottom: 14 }}
          >
            Start
          </button>

          <span className="font-sans text-[12.5px] text-muted">
            {questionCount} statements · about 2 minutes
          </span>
        </div>
      </div>
    </div>
  )
}

function FindingResultLoader() {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + '.'))
    }, 450)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <p
        className="font-serif italic text-center"
        style={{ fontSize: 19, color: '#56534D', lineHeight: 1.55, marginBottom: 10 }}
      >
        Finding your result{dots}
      </p>
      <p className="font-sans text-center text-[13px]" style={{ color: '#8C8A83' }}>
        Just a moment.
      </p>
    </div>
  )
}
