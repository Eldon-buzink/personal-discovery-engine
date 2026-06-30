'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import AnimatedBlob from '@/components/known/AnimatedBlob'
import AuthModal from '@/components/known/AuthModal'
import QuestionCard from '@/components/known/QuestionCard'

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionResponse {
  questionId: number
  value: string
  answeredAt: string
}

interface KnownSession {
  responses: SessionResponse[]
}

// ── Session helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'known_session'

function loadSession(): KnownSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { responses: [] }
    return JSON.parse(raw) as KnownSession
  } catch {
    return { responses: [] }
  }
}

function saveResponse(questionId: number, value: string): KnownSession {
  const session = loadSession()
  const responses = session.responses.filter((r) => r.questionId !== questionId)
  responses.push({ questionId, value, answeredAt: new Date().toISOString() })
  const updated: KnownSession = { responses }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

// ── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 1,
    question: 'I feel energized after spending time with large groups of people.',
    format: 'dot-scale' as const,
  },
  {
    id: 2,
    question: 'When making an important decision, what do you rely on most?',
    format: 'custom-options' as const,
    options: ['My gut feeling', 'Careful research', 'Advice from others', 'Past experience'],
  },
  {
    id: 3,
    question: 'I prefer having a clear plan rather than seeing where things go.',
    format: 'dot-scale' as const,
  },
  {
    id: 4,
    question: 'Describe a moment when you felt completely in your element.',
    format: 'free-text' as const,
  },
  {
    id: 5,
    question: 'I find it easy to adapt when plans change unexpectedly.',
    format: 'dot-scale' as const,
  },
  {
    id: 6,
    question: 'In a group project, which role do you naturally take on?',
    format: 'custom-options' as const,
    options: [
      'The organizer',
      'The idea generator',
      'The one who gets things done',
      'The mediator',
    ],
  },
  {
    id: 7,
    question: 'I tend to think carefully before speaking in group discussions.',
    format: 'dot-scale' as const,
  },
  {
    id: 8,
    question: 'What drains your energy most?',
    format: 'custom-options' as const,
    options: [
      'Too much social interaction',
      'Lack of structure',
      'Repetitive tasks',
      'Conflict with others',
    ],
  },
  {
    id: 9,
    question: 'I often notice details that other people miss.',
    format: 'dot-scale' as const,
  },
  {
    id: 10,
    question: 'Describe how you typically feel at the end of a very busy day.',
    format: 'free-text' as const,
  },
] as const

const TOTAL = QUESTIONS.length

// ── Sub-components ───────────────────────────────────────────────────────────

function TopBar({ answeredCount }: { answeredCount: number }) {
  const progress = (answeredCount / TOTAL) * 100

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-cream border-b border-line flex items-center justify-between px-6">
      <Link href="/onboarding" className="font-sans text-sm text-muted">
        ← Save and exit
      </Link>
      <div className="flex items-center gap-3">
        <span className="font-sans text-[13px] text-muted">Getting closer</span>
        <div className="w-[120px] h-[3px] rounded-full bg-line overflow-hidden">
          <div
            className="h-full rounded-full bg-charcoal transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </header>
  )
}

function EndScreen({
  answeredCount,
  onKeepGoing,
  onReport,
}: {
  answeredCount: number
  onKeepGoing: () => void
  onReport: () => void
}) {
  const f = (delay: number, duration = 0.6): CSSProperties => ({
    animation: `fadeIn ${duration}s ease both`,
    animationDelay: `${delay}ms`,
  })

  return (
    <div className="min-h-[90vh] bg-cream flex flex-col items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center w-full max-w-[380px]">

        {/* 1. Response count */}
        <p
          className="font-sans text-[12px] text-muted mb-2"
          style={{ ...f(0), letterSpacing: '0.04em' }}
        >
          {answeredCount} responses · pattern identified
        </p>

        {/* 2. Eyebrow */}
        <p
          className="font-sans text-[12px] uppercase font-semibold text-muted"
          style={{ ...f(200), letterSpacing: '0.08em', marginBottom: 24 }}
        >
          Your first pattern
        </p>

        {/* 3. Blob + 4. Pulsing ring */}
        <div
          style={{
            position: 'relative',
            width: 220,
            height: 220,
            overflow: 'visible',
            transformOrigin: 'center center',
            animation: 'blobReveal 1.1s cubic-bezier(0.22,1,0.36,1) both',
            animationDelay: '400ms',
          }}
        >
          <AnimatedBlob
            seed="u_played-2826-deliberate-autonomous"
            word="Deliberate"
            size={220}
          />
          <div
            style={{
              position: 'absolute',
              inset: 6,
              borderRadius: '50%',
              border: '1px solid hsl(8, 50%, 65%)',
              pointerEvents: 'none',
              animation: 'pulseRing 2.4s ease-out both',
              animationDelay: '1200ms',
            }}
          />
        </div>

        {/* 5. Trait quote */}
        <p
          className="font-serif italic text-[18px] leading-[1.55] text-charcoal-soft text-center mt-8"
          style={f(1300)}
        >
          You don&apos;t rush toward conclusions. Your responses showed a pattern
          of holding space before committing.
        </p>

        {/* 6. Sub-line */}
        <p
          className="font-sans text-[13px] text-muted text-center mt-3"
          style={{ ...f(1500), marginBottom: 36 }}
        >
          This is the strongest signal so far — there&apos;s more underneath it.
        </p>

        {/* 7. Two-button fork */}
        <div className="flex flex-col gap-3 w-full" style={f(1800)}>
          {/* Primary */}
          <button
            onClick={onKeepGoing}
            className="w-full rounded-[10px] py-4 px-5 flex flex-col text-left"
            style={{ background: '#262420' }}
          >
            <span className="font-sans text-[15px] font-medium text-cream">
              Keep going
            </span>
            <span className="font-sans text-[12px] mt-1" style={{ color: 'rgba(247,244,237,0.6)' }}>
              A few more questions sharpen what else is there
            </span>
          </button>

          {/* Secondary */}
          <button
            onClick={onReport}
            className="w-full rounded-[10px] py-4 px-5 flex flex-col text-left border border-line"
            style={{ background: '#ffffff' }}
          >
            <span className="font-sans text-[15px] font-medium text-charcoal">
              See what we found
            </span>
            <span className="font-sans text-[12px] text-muted mt-1">
              Go to your report now — you can always come back to this
            </span>
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [isDone, setIsDone] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContext, setModalContext] = useState<'keep-going' | 'report'>('keep-going')

  // Resume from last unanswered question on mount
  useEffect(() => {
    const session = loadSession()
    const answeredIds = new Set(session.responses.map((r) => r.questionId))
    const count = answeredIds.size
    setAnsweredCount(count)

    if (count >= TOTAL) {
      setIsDone(true)
    } else {
      const firstUnanswered = QUESTIONS.findIndex((q) => !answeredIds.has(q.id))
      setCurrentIndex(firstUnanswered === -1 ? 0 : firstUnanswered)
    }
  }, [])

  function handleNext(value: string) {
    const question = QUESTIONS[currentIndex]
    const updated = saveResponse(question.id, value)
    setAnsweredCount(updated.responses.length)

    if (currentIndex >= TOTAL - 1) {
      setIsDone(true)
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  function openModal(context: 'keep-going' | 'report') {
    setModalContext(context)
    setModalOpen(true)
  }

  const question = QUESTIONS[currentIndex]

  return (
    <>
      <TopBar answeredCount={answeredCount} />

      {/* pt-14 clears the fixed top bar */}
      <div className="pt-14">
        {isDone ? (
          <EndScreen
            answeredCount={answeredCount}
            onKeepGoing={() => openModal('keep-going')}
            onReport={() => openModal('report')}
          />
        ) : (
          <QuestionCard
            key={currentIndex}
            questionNumber={currentIndex + 1}
            totalQuestions={TOTAL}
            question={question.question}
            format={question.format}
            options={'options' in question ? [...question.options] : undefined}
            onNext={handleNext}
            centered={false}
          />
        )}
      </div>

      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        questionCount={answeredCount}
        context={modalContext}
        onSuccess={() => {}}
      />
    </>
  )
}
