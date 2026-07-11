'use client'

import { CSSProperties, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AnimatedBlob from '@/components/known/AnimatedBlob'
import QuestionCard from '@/components/known/QuestionCard'
import { generatePatternCopy } from '@/app/actions/generatePatternCopy'
import type { PatternContent, PatternContentEntry } from '@/lib/known/types'

// ── Questions ──────────────────────────────────────────────────────────────────
// Questions marked [R] are reverse-scored (6 − raw before averaging)

type Dimension = 'autonomy' | 'focus' | 'deep'

interface EnvQuestion {
  id: number
  text: string
  dimension: Dimension
  reversed?: boolean
}

const ENV_QUESTIONS: EnvQuestion[] = [
  // Autonomy — E1,E3,E5 forward; E2(id1),E4(id3) reversed
  { id: 0,  dimension: 'autonomy',  text: 'I do my best thinking when I can work without anyone directing how I approach things.' },
  { id: 1,  dimension: 'autonomy',  text: 'I don\'t mind being given clear direction on how to structure my workday.', reversed: true },
  { id: 2,  dimension: 'autonomy',  text: 'I tend to produce better work when I set my own schedule rather than follow one given to me.' },
  { id: 3,  dimension: 'autonomy',  text: 'I work just as well when others manage my schedule as when I manage it myself.', reversed: true },
  { id: 4,  dimension: 'autonomy',  text: 'Being told exactly how to approach a task makes me less effective, not more.' },
  // Competence — E6,E7,E8 forward; E9(id8),E10(id9) reversed
  { id: 5,  dimension: 'focus', text: 'I find it difficult to focus when there is background noise or activity around me.' },
  { id: 6,  dimension: 'focus', text: 'I feel drained after a long stretch working in a busy, open-plan environment.' },
  { id: 7,  dimension: 'focus', text: 'I feel significantly more productive when I have long, unbroken blocks of time.' },
  { id: 8,  dimension: 'focus', text: 'Interruptions don\'t typically derail my focus for long.', reversed: true },
  { id: 9,  dimension: 'focus', text: 'Once interrupted, I can usually get back on track within a few minutes.', reversed: true },
  // Structure — E11,E12,E14,E15 forward; E13(id12) reversed
  { id: 10, dimension: 'deep', text: 'I prefer working on one thing at a time rather than switching between several.' },
  { id: 11, dimension: 'deep', text: 'I find it hard to do meaningful work in short time windows between other commitments.' },
  { id: 12, dimension: 'deep', text: 'I can produce good work within tight or fragmented time windows.', reversed: true },
  { id: 13, dimension: 'deep', text: 'My best work comes from extended concentration on one thing, not from rapid switching.' },
  { id: 14, dimension: 'deep', text: 'Context-switching between tasks tires me out, even when each task is straightforward.' },
]

const TOTAL_Q = ENV_QUESTIONS.length

// ── Scoring ────────────────────────────────────────────────────────────────────

const TRAIT_WORDS: Record<Dimension, Record<'high' | 'mid' | 'low', string>> = {
  autonomy: { high: 'Autonomous',       mid: 'Self-directed',   low: 'Collaborative'  },
  focus:    { high: 'Low interruption',  mid: 'Focused',         low: 'Flexible'       },
  deep:     { high: 'Deep focus',        mid: 'Single-threaded', low: 'Adaptive'       },
}

const DIM_LABELS: Record<Dimension, string> = {
  autonomy: 'Autonomy',
  focus:    'Competence',
  deep:     'Structure',
}

const DIM_QUESTION_IDS: Record<Dimension, number[]> = {
  autonomy: [0, 1, 2, 3, 4],
  focus:    [5, 6, 7, 8, 9],
  deep:     [10, 11, 12, 13, 14],
}

// Reverse-scored question IDs
const REVERSED_IDS = new Set(ENV_QUESTIONS.filter(q => q.reversed).map(q => q.id))

interface StrongCondition {
  label: string
  traitWord: string
  score: number
}

interface ScoredResult {
  dimension: Dimension
  dimLabel: string
  traitWord: string
  scoreDirection: 'high' | 'mid' | 'low'
  dimensionScores: Record<string, number>
  strongConditions: StrongCondition[]
}

function scoreEnvironment(answers: Map<number, number>): ScoredResult {
  function dimScore(dim: Dimension): number {
    const ids = DIM_QUESTION_IDS[dim]
    const vals: number[] = []
    for (const id of ids) {
      const v = answers.get(id)
      if (v == null) continue
      vals.push(REVERSED_IDS.has(id) ? 6 - v : v)
    }
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
  }

  const scores = {
    autonomy: dimScore('autonomy'),
    focus:    dimScore('focus'),
    deep:     dimScore('deep'),
  }

  const THRESHOLD = 3.5
  const rawDims: { dim: Dimension; score: number }[] = [
    { dim: 'autonomy', score: scores.autonomy },
    { dim: 'focus',    score: scores.focus    },
    { dim: 'deep',     score: scores.deep     },
  ]
  const allDims = rawDims.sort((a, b) => b.score - a.score)

  const strongConditions: StrongCondition[] = allDims
    .filter(d => d.score >= THRESHOLD)
    .map(d => {
      const tier: 'high' | 'mid' | 'low' = d.score >= 4.0 ? 'high' : 'mid'
      return { label: DIM_LABELS[d.dim], traitWord: TRAIT_WORDS[d.dim][tier], score: d.score }
    })

  const primary = allDims[0]
  const primaryScore = primary.score
  const tier: 'high' | 'mid' | 'low' = primaryScore >= 3.5 ? 'high' : primaryScore >= 2.5 ? 'mid' : 'low'

  return {
    dimension: primary.dim,
    dimLabel: DIM_LABELS[primary.dim],
    traitWord: TRAIT_WORDS[primary.dim][tier],
    scoreDirection: tier,
    dimensionScores: { autonomy: scores.autonomy, competence: scores.focus, structure: scores.deep },
    strongConditions,
  }
}

// ── Session helpers ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'known_session'

interface EnvBranchState {
  answers: { questionId: number; value: number }[]
  completed?: boolean
}

interface StoredSession {
  patternContents?: PatternContentEntry[]
  branchResponses?: { environment?: EnvBranchState }
  [key: string]: unknown
}

function loadSession(): StoredSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as StoredSession
  } catch { return {} }
}

function saveSession(updates: Partial<StoredSession>): void {
  const session = loadSession()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, ...updates }))
}

// ── Tokens ─────────────────────────────────────────────────────────────────────

const gray         = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal     = '#262420'
const cream        = '#F7F4ED'
const line         = '#E5E1D5'
const white        = '#FDFCF9'
const sans         = 'var(--font-inter), system-ui, sans-serif'
const serif        = 'var(--font-newsreader), serif'

function f(delay: number, dur = 0.6): CSSProperties {
  return { animation: `fadeIn ${dur}s ease both`, animationDelay: `${delay}ms` }
}

// ── Shared topbar ──────────────────────────────────────────────────────────────

function TopBar({ answeredCount }: { answeredCount: number }) {
  const progress = Math.min((answeredCount / TOTAL_Q) * 100, 100)
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 52, background: cream, borderBottom: `1px solid ${line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 22px', zIndex: 50,
    }}>
      <Link href="/report" style={{ fontFamily: sans, fontSize: 13, color: gray, textDecoration: 'none' }}>
        ← Back to report
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: sans, fontSize: 11, color: gray }}>Getting closer</span>
        <div style={{ width: 120, height: 3, borderRadius: 3, background: line, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, background: charcoal, width: `${progress}%`, transition: 'width 0.5s ease' }} />
        </div>
      </div>
    </header>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Screen = 'intro' | 'questions' | 'pattern'

export default function EnvironmentPage() {
  const router = useRouter()
  const [screen, setScreen]     = useState<Screen>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers]   = useState<Map<number, number>>(new Map())
  const [result, setResult]     = useState<ScoredResult | null>(null)
  const [content, setContent]   = useState<PatternContent | null>(null)

  useEffect(() => {
    const session = loadSession()
    const env = session.branchResponses?.environment
    if (!env) return

    const answeredMap = new Map<number, number>()
    for (const a of env.answers ?? []) answeredMap.set(a.questionId, a.value)
    setAnswers(answeredMap)

    if (env.completed) {
      const r = scoreEnvironment(answeredMap)
      setResult(r)
      const cached = session.patternContents?.find(e => e.branch === 'environment')
      if (cached?.content) setContent(cached.content)
      setScreen('pattern')
    } else if (answeredMap.size > 0) {
      setCurrentQ(answeredMap.size)
      setScreen('questions')
    }
  }, [])

  function handleNext(answerStr: string) {
    const val = parseInt(answerStr, 10)
    const q = ENV_QUESTIONS[currentQ]
    const newAnswers = new Map(answers)
    newAnswers.set(q.id, val)
    setAnswers(newAnswers)

    const session = loadSession()
    const existing = session.branchResponses?.environment?.answers ?? []
    const updated = existing.filter(a => a.questionId !== q.id)
    updated.push({ questionId: q.id, value: val })

    if (currentQ + 1 >= TOTAL_Q) {
      saveSession({
        branchResponses: { ...session.branchResponses, environment: { answers: updated, completed: true } },
      })
      const r = scoreEnvironment(newAnswers)
      setResult(r)
      setScreen('pattern')

      const cached = session.patternContents?.find(e => e.branch === 'environment')
      if (cached?.content) {
        setContent(cached.content)
      } else {
        generatePatternCopy(r.dimLabel, r.traitWord, r.scoreDirection, null, 'environment', r.strongConditions)
          .then((c) => {
            setContent(c)
            const s = loadSession()
            const pcs = (s.patternContents ?? []).filter(e => e.branch !== 'environment')
            const newEntry: PatternContentEntry = {
              facet: r.dimLabel, traitWord: r.traitWord,
              scoreDirection: r.scoreDirection, content: c, branch: 'environment',
              dimensionScores: r.dimensionScores,
              strongConditions: r.strongConditions,
            }
            saveSession({ patternContents: [...pcs, newEntry] })
          })
          .catch(() => {})
      }
    } else {
      saveSession({
        branchResponses: { ...session.branchResponses, environment: { answers: updated } },
      })
      setCurrentQ(currentQ + 1)
    }
  }

  if (screen === 'intro') return <IntroScreen onStart={() => setScreen('questions')} />

  if (screen === 'questions') {
    const q = ENV_QUESTIONS[currentQ]
    return (
      <>
        <TopBar answeredCount={answers.size} />
        <div style={{ paddingTop: 52 }}>
          <QuestionCard
            key={currentQ}
            questionNumber={currentQ + 1}
            totalQuestions={TOTAL_Q}
            question={q.text}
            format="dot-scale"
            onNext={handleNext}
            centered={false}
            scaleLabels={['Very Inaccurate', 'Very Accurate']}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar answeredCount={TOTAL_Q} />
      <div style={{ paddingTop: 52 }}>
        <PatternScreen
          result={result!}
          content={content}
          onKeepGoing={() => { setCurrentQ(0); setScreen('questions') }}
          onGoToReport={() => router.push('/report')}
        />
      </div>
    </>
  )
}

// ── IntroScreen ────────────────────────────────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <main style={{ background: cream, minHeight: '100vh', padding: '64px 24px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>

        <div style={{ textAlign: 'center', ...f(0) }}>
          <span style={{ fontFamily: serif, fontSize: 14, fontWeight: 600, color: gray }}>known</span>
        </div>

        <div style={{ ...f(300) }}>
          <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: gray, fontWeight: 600, textAlign: 'center', marginBottom: 14 }}>
            Where you do your best work
          </p>
          <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 20, fontWeight: 500, lineHeight: 1.5, textAlign: 'center', color: charcoal }}>
            Some people think in noise. Others need silence. Most don&apos;t actually know which they are.
          </p>
        </div>

        <div style={{ ...f(600) }}>
          <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.7, color: charcoalSoft, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
            After these questions you&apos;ll see your specific conditions — the environments that fuel you, the ones that drain you, and how much that gap actually costs you day to day.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingBottom: 16, ...f(900) }}>
          <button
            onClick={onStart}
            style={{
              width: '100%', background: charcoal, color: cream,
              fontFamily: serif, fontSize: 18, textAlign: 'center',
              padding: '16px 24px', borderRadius: 9999, border: 'none',
              cursor: 'pointer',
            }}
          >
            Start this section
          </button>
          <p style={{ fontFamily: sans, fontSize: 13, color: gray }}>
            Around 15 questions
          </p>
        </div>

      </div>
    </main>
  )
}

// ── PatternScreen ──────────────────────────────────────────────────────────────

function PatternScreen({
  result,
  content,
  onKeepGoing,
  onGoToReport,
}: {
  result: ScoredResult
  content: PatternContent | null
  onKeepGoing: () => void
  onGoToReport: () => void
}) {
  const { traitWord } = result
  const isLoading = content === null

  return (
    <div style={{
      minHeight: 'calc(100vh - 52px)', background: cream, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center',
    }}>
      <p style={{ fontFamily: sans, fontSize: 12, color: gray, letterSpacing: '0.04em', marginBottom: 40, ...f(0) }}>
        15 responses · pattern identified
      </p>

      <p style={{
        fontFamily: sans, fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: gray, fontWeight: 600, margin: '0 0 24px', ...f(200),
      }}>
        Your environment pattern
      </p>

      <div style={{ height: 280, overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center', ...f(400, 1.1) }}>
        <div style={{
          position: 'relative', width: 220, height: 220, overflow: 'visible',
          transformOrigin: 'center center',
          animation: 'blobReveal 1.1s cubic-bezier(0.22,1,0.36,1) both',
          animationDelay: '400ms',
        }}>
          <AnimatedBlob
            seed={`env-pattern-${traitWord.toLowerCase().replace(/\s+/g, '-')}`}
            hueOffset={0}
            word={traitWord}
            size={220}
          />
          <div style={{
            position: 'absolute', inset: 6, borderRadius: '50%',
            border: '1px solid rgba(150,120,100,0.4)', pointerEvents: 'none',
            animation: 'pulseRing 2.4s ease-out both', animationDelay: '1200ms',
          }} />
        </div>
      </div>

      {isLoading ? (
        <div style={{ minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 32 }}>
          <LoadingDots />
        </div>
      ) : (
        <>
          <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 18, lineHeight: 1.55, maxWidth: 380, margin: '0 0 8px', color: charcoalSoft, ...f(1300) }}>
            {content!.trait_quote}
          </p>
          <p style={{ fontFamily: sans, fontSize: 13, color: gray, margin: '0 0 36px', ...f(1500) }}>
            There&apos;s more to the picture. This pattern is one of several conditions we found.
          </p>
        </>
      )}

      {!isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 380, ...f(1800) }}>
          <button
            onClick={onKeepGoing}
            style={{
              width: '100%', padding: '16px 20px', borderRadius: 10, fontFamily: sans,
              fontSize: 14.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: 3,
              background: charcoal, color: cream, border: 'none',
            }}
          >
            <span>Keep going</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(247,244,237,0.6)' }}>
              A few more questions round this out
            </span>
          </button>
          <button
            onClick={onGoToReport}
            style={{
              width: '100%', padding: '16px 20px', borderRadius: 10, fontFamily: sans,
              fontSize: 14.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: 3,
              background: white, color: charcoal, border: `1px solid ${line}`,
            }}
          >
            <span>Go to your report</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: gray }}>
              Your environment section is now ready to view
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── LoadingDots ────────────────────────────────────────────────────────────────

function LoadingDots() {
  const [dots, setDots] = useState('.')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    intervalRef.current = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 500)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])
  return (
    <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 18, color: charcoalSoft }}>
      Finding your pattern{dots}
    </p>
  )
}
