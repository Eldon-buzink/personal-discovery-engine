'use client'

import { useEffect, useRef, useState } from 'react'

type Format = 'dot-scale' | 'custom-options' | 'free-text'

export interface QuestionCardProps {
  questionNumber: number
  totalQuestions: number
  question: string
  format: Format
  options?: string[]
  onNext: (answer: string) => void
  centered?: boolean
  scaleLabels?: [string, string]
  // Height of a fixed header above the card. The card fills the rest of the
  // screen, so the page isn't taller than the window and can't drift.
  topOffset?: number
  // Going back: the answer given before, shown selected; and the step back
  // to the previous question (the button shows only when this is passed).
  initialAnswer?: string
  onBack?: () => void
}

export default function QuestionCard({
  questionNumber,
  totalQuestions,
  question,
  format,
  options = [],
  onNext,
  centered = true,
  scaleLabels = ['Strongly disagree', 'Strongly agree'],
  topOffset = 0,
  initialAnswer = '',
  onBack,
}: QuestionCardProps) {
  const [answer, setAnswer] = useState(initialAnswer)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasAnswer = format === 'free-text' ? answer.trim().length > 0 : answer !== ''

  useEffect(() => {
    setAnswer(initialAnswer)
  }, [question, initialAnswer])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [answer])

  function handleNext() {
    onNext(answer)
    setAnswer('')
  }

  return (
    <div
      className="bg-cream flex flex-col items-center px-6 py-12"
      style={{ minHeight: `calc(100vh - ${topOffset}px)` }}
    >
      {/* Progress, with the step back on the left when there is one */}
      <div className="relative w-full max-w-md flex items-center justify-center min-h-[44px]">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-0 top-0 min-h-[44px] pr-4 font-sans text-[13px] text-muted hover:text-charcoal"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Previous
          </button>
        )}
        <span className="font-sans text-[11px] text-muted">
          {questionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Question + input + button */}
      <div className={`flex-1 flex flex-col items-center w-full max-w-md ${centered ? 'justify-center' : 'justify-start pt-8'}`}>
        <h2 className="font-serif text-[22px] font-medium leading-[1.45] text-charcoal text-center text-balance mb-14">
          {question}
        </h2>

        {format === 'dot-scale' && (
          <DotScale value={answer} onChange={setAnswer} labels={scaleLabels} />
        )}

        {format === 'custom-options' && (
          <OptionPills options={options} value={answer} onChange={setAnswer} />
        )}

        {format === 'free-text' && (
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && hasAnswer) {
                e.preventDefault()
                handleNext()
              }
            }}
            placeholder="Type your answer…"
            rows={1}
            className="w-full resize-none overflow-hidden bg-transparent outline-none font-sans text-[15px] text-charcoal placeholder:text-muted border-b border-line pb-2 leading-relaxed"
          />
        )}

        {/* Reserved height so the layout doesn't shift when button appears */}
        <div className="mt-10 h-11 flex items-center justify-center">
          {hasAnswer && (
            <button
              onClick={handleNext}
              className="bg-charcoal text-cream font-sans text-sm px-10 py-3 rounded-full"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function DotScale({
  value,
  onChange,
  labels,
}: {
  value: string
  onChange: (v: string) => void
  labels: [string, string]
}) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Dots with connecting line */}
      <div className="relative flex items-center justify-between w-full">
        <div className="absolute left-[10px] right-[10px] top-1/2 -translate-y-1/2 h-px bg-line" />
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === String(n)
          return (
            <button
              key={n}
              onClick={() => onChange(String(n))}
              aria-label={`${n} out of 5`}
              className="relative z-10 w-5 h-5 rounded-full transition-colors focus:outline-none"
              style={{
                background: selected ? '#262420' : '#F7F4ED',
                border: `2px solid ${selected ? '#262420' : '#8C8A83'}`,
              }}
            />
          )
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between w-full">
        <span className="font-sans text-[11px] text-muted">{labels[0]}</span>
        <span className="font-sans text-[11px] text-muted">{labels[1]}</span>
      </div>
    </div>
  )
}

function OptionPills({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {options.map((opt) => {
        const selected = value === opt
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="px-6 py-3 rounded-full font-sans text-sm text-center transition-colors focus:outline-none"
            style={{
              background: selected ? '#262420' : '#F7F4ED',
              color: selected ? '#F7F4ED' : '#262420',
              border: `1.5px solid ${selected ? '#262420' : '#E5E1D5'}`,
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
