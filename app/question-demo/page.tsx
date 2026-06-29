'use client'

import { useState } from 'react'
import QuestionCard from '@/components/known/QuestionCard'

const TOTAL_QUESTIONS = 60

const questions = [
  {
    question: 'How energized do you feel after spending time with a large group of people?',
    format: 'dot-scale' as const,
  },
  {
    question: 'When making an important decision, what do you rely on most?',
    format: 'custom-options' as const,
    options: ['My gut feeling', 'Careful research', 'Advice from others', 'Past experience'],
  },
  {
    question: 'Describe a moment when you felt completely in your element.',
    format: 'free-text' as const,
  },
]

export default function QuestionDemo() {
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)

  function handleNext() {
    if (index < questions.length - 1) {
      setIndex(index + 1)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 gap-8">
        <p className="font-serif text-[22px] text-charcoal text-center leading-[1.45]">
          That&apos;s all for now.
        </p>
        <button
          onClick={() => { setIndex(0); setDone(false) }}
          className="bg-charcoal text-cream font-sans text-sm px-10 py-3 rounded-full"
        >
          Start over
        </button>
      </div>
    )
  }

  const q = questions[index]

  return (
    <QuestionCard
      key={index}
      questionNumber={index + 1}
      totalQuestions={TOTAL_QUESTIONS}
      question={q.question}
      format={q.format}
      options={'options' in q ? q.options : undefined}
      onNext={handleNext}
    />
  )
}
