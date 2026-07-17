'use client'

import { CSSProperties, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import QuestionCard from '@/components/known/QuestionCard'
import AnimatedBlob from '@/components/known/AnimatedBlob'
import { generatePatternCopy } from '@/app/actions/generatePatternCopy'
import {
  scoreWorkingStyle,
  AXIS_POLES,
  type WorkingStyleAxis,
  type WorkingStyleResponse,
  type WorkingStyleResult,
} from '@/lib/known/workingStyleScoring'
import type { PatternContent, PatternContentEntry } from '@/lib/known/types'

// ── Questions ──────────────────────────────────────────────────────────────────
// Source: reference/branch-question-specs.md — 21 items, 7 per axis.
// Presented grouped by axis (not the spec table's interleaved numbering) so a
// genuine per-axis progressive reveal is possible — spec item # noted per line
// for traceability. Scoring is order-independent, so this doesn't affect results.

interface WSQuestion {
  id: number
  text: string
  axis: WorkingStyleAxis
  reverse: boolean
}

const WS_QUESTIONS: WSQuestion[] = [
  // Structure (spec #1,2,3,4,5,16,17)
  { id: 0,  text: "I like having a clear plan before I start something.",                                          axis: 'structure', reverse: false },
  { id: 1,  text: "I prefer to figure things out as I go rather than plan every step.",                            axis: 'structure', reverse: true  },
  { id: 2,  text: "Unexpected changes to a plan bother me more than they seem to bother others.",                  axis: 'structure', reverse: false },
  { id: 3,  text: "I do my best work when there's room to improvise.",                                             axis: 'structure', reverse: true  },
  { id: 4,  text: "I like knowing exactly what's expected before I begin.",                                        axis: 'structure', reverse: false },
  { id: 5,  text: "I make lists or schedules to keep myself on track.",                                            axis: 'structure', reverse: false },
  { id: 6,  text: "I get bored quickly if a routine feels too rigid.",                                             axis: 'structure', reverse: true  },
  // Independence (spec #6,7,8,9,10,18,19)
  { id: 7,  text: "I do my best thinking on my own, not in a group.",                                              axis: 'independence', reverse: false },
  { id: 8,  text: "I'd rather bounce ideas off others than work them out alone.",                                  axis: 'independence', reverse: true  },
  { id: 9,  text: "I prefer to own a piece of work fully rather than share responsibility for it.",                axis: 'independence', reverse: false },
  { id: 10, text: "Working through a problem with someone else usually gets me to a better answer than working alone.", axis: 'independence', reverse: true },
  { id: 11, text: "I get more done when I'm left to work independently.",                                          axis: 'independence', reverse: false },
  { id: 12, text: "I'd rather ask for input early than risk going too far in the wrong direction alone.",          axis: 'independence', reverse: true  },
  { id: 13, text: "Given the choice, I'll pick the solo assignment over the group one.",                           axis: 'independence', reverse: false },
  // Directness (spec #11,12,13,14,15,20,21)
  { id: 14, text: "I'd rather say something honest and blunt than soften it.",                                     axis: 'directness', reverse: false },
  { id: 15, text: "I choose my words carefully so I don't come across as harsh.",                                  axis: 'directness', reverse: true  },
  { id: 16, text: "People sometimes tell me I'm too blunt.",                                                       axis: 'directness', reverse: false },
  { id: 17, text: "I'll hold back a critical opinion if the timing doesn't feel right.",                           axis: 'directness', reverse: true  },
  { id: 18, text: "I say what I think, even if it's not what people want to hear.",                                axis: 'directness', reverse: false },
  { id: 19, text: "If feedback is going to sting, I'd still rather give it straight.",                             axis: 'directness', reverse: false },
  { id: 20, text: "I read the room before deciding how much to say.",                                              axis: 'directness', reverse: true  },
]

const TOTAL_Q = WS_QUESTIONS.length
const AXIS_ORDER: WorkingStyleAxis[] = ['structure', 'independence', 'directness']
const AXIS_BOUNDARY: Record<WorkingStyleAxis, number> = { structure: 7, independence: 14, directness: 21 }
const AXIS_DISPLAY: Record<WorkingStyleAxis, string> = {
  structure: 'Structure', independence: 'Independence', directness: 'Directness',
}

// Non-AI templated reveal phrasing for axis 1 & 2 (axis 3 uses real AI copy — see
// triggerFinalCopyGeneration). Nothing to wait on for the first two reveals, so no
// loading state needed there.
const AXIS_LEAN_PHRASE: Record<WorkingStyleAxis, Record<'left' | 'right', string>> = {
  structure:    { left: 'wanting a clear plan before you start', right: 'staying flexible and figuring it out as you go' },
  independence: { left: 'working things out on your own',        right: 'bouncing ideas off other people' },
  directness:   { left: 'saying the direct, honest thing',       right: 'choosing your words carefully' },
}

// ── Scoring bridge ─────────────────────────────────────────────────────────────

function scoreAnswers(answers: Map<number, number>): WorkingStyleResult {
  const responses: WorkingStyleResponse[] = []
  for (const q of WS_QUESTIONS) {
    const value = answers.get(q.id)
    if (value == null) continue
    responses.push({ questionId: String(q.id), axis: q.axis, value, reverse: q.reverse })
  }
  return scoreWorkingStyle(responses)
}

// ── Design tokens ──────────────────────────────────────────────────────────────

const gray         = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal     = '#262420'
const cream        = '#F7F4ED'
const line         = '#E5E1D5'
const sans         = 'var(--font-inter), system-ui, sans-serif'
const serif        = 'var(--font-newsreader), serif'

function f(delay: number, dur = 0.6): CSSProperties {
  return { animation: `fadeIn ${dur}s ease both`, animationDelay: `${delay}ms` }
}

// ── Session helpers ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'known_session'

interface BranchState {
  answers: { questionId: number; value: number }[]
  completed?: boolean
}

interface StoredSession {
  patternContents?: PatternContentEntry[]
  branchResponses?: {
    working_style?: BranchState
    [key: string]: BranchState | undefined
  }
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

// ── TopBar ─────────────────────────────────────────────────────────────────────

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

export default function WorkingStylePage() {
  const router = useRouter()
  const [screen, setScreen]         = useState<Screen>('intro')
  const [currentQ, setCurrentQ]     = useState(0)
  const [answers, setAnswers]       = useState<Map<number, number>>(new Map())
  const [revealStage, setRevealStage] = useState(0) // 0, 1, or 2 — which axis reveal is showing
  const [result, setResult]         = useState<WorkingStyleResult | null>(null)
  const [content, setContent]       = useState<PatternContent | null>(null)

  useEffect(() => {
    const session = loadSession()
    const ws = session.branchResponses?.working_style
    if (!ws) return

    const answeredMap = new Map<number, number>()
    for (const a of ws.answers ?? []) answeredMap.set(a.questionId, a.value)
    setAnswers(answeredMap)

    if (ws.completed) {
      const r = scoreAnswers(answeredMap)
      setResult(r)
      const cached = session.patternContents?.find(e => e.branch === 'working_style')
      if (cached?.content) setContent(cached.content)
      setRevealStage(2)
      setScreen('pattern')
    } else if (answeredMap.size > 0) {
      setCurrentQ(answeredMap.size)
      setScreen('questions')
    }
  }, [])

  function triggerFinalCopyGeneration(r: WorkingStyleResult) {
    const strongConditions = AXIS_ORDER.map((axis) => ({
      label: axis,
      traitWord: r.axes[axis].leaningLabel,
      score: r.axes[axis].position,
    }))
    generatePatternCopy(strongConditions[0].traitWord, strongConditions[0].traitWord, 'high', null, 'working_style', strongConditions)
      .then((c) => {
        setContent(c)
        const s   = loadSession()
        const pcs = (s.patternContents ?? []).filter(e => e.branch !== 'working_style')
        const mergedConditions = strongConditions.map((sc, i) => ({
          ...sc,
          quote:    c.items?.[i]?.quote,
          evidence: c.items?.[i]?.evidence,
        }))
        const newEntry: PatternContentEntry = {
          facet:          'Working Style',
          traitWord:      strongConditions[0].traitWord,
          scoreDirection: 'high',
          content:        c,
          branch:         'working_style',
          dimensionScores: {
            structure:    r.axes.structure.position,
            independence: r.axes.independence.position,
            directness:   r.axes.directness.position,
          },
          strongConditions: mergedConditions,
          completedAt: new Date().toISOString(),
        }
        saveSession({ patternContents: [...pcs, newEntry] })
      })
      .catch(() => {})
  }

  function handleNext(answerStr: string) {
    const val = parseInt(answerStr, 10)
    const q   = WS_QUESTIONS[currentQ]

    const newAnswers = new Map(answers)
    newAnswers.set(q.id, val)
    setAnswers(newAnswers)

    const session  = loadSession()
    const existing = session.branchResponses?.working_style?.answers ?? []
    const updated  = existing.filter(a => a.questionId !== q.id)
    updated.push({ questionId: q.id, value: val })

    const nextQ = currentQ + 1
    const stageIdx = AXIS_ORDER.findIndex((axis) => nextQ === AXIS_BOUNDARY[axis])

    if (stageIdx !== -1) {
      const isFinal = stageIdx === 2
      saveSession({
        branchResponses: {
          ...session.branchResponses,
          working_style: { answers: updated, completed: isFinal },
        },
      })

      const r = scoreAnswers(newAnswers)
      setResult(r)
      setRevealStage(stageIdx)
      setScreen('pattern')

      if (isFinal) {
        const cached = session.patternContents?.find(e => e.branch === 'working_style')
        if (cached?.content) {
          setContent(cached.content)
        } else {
          setContent(null)
          triggerFinalCopyGeneration(r)
        }
      }
    } else {
      saveSession({
        branchResponses: {
          ...session.branchResponses,
          working_style: { answers: updated },
        },
      })
      setCurrentQ(nextQ)
    }
  }

  // ── Dev shortcuts ────────────────────────────────────────────────────────────
  // Three buttons matching the three progressive stages. All lean toward the
  // first-named pole (Structured / Independent / Direct) for simplicity — every
  // axis is always shown in the report, so there's no "which one wins" to vary.

  function handleDevStage(stage: 0 | 1 | 2) {
    const upToId = AXIS_BOUNDARY[AXIS_ORDER[stage]]
    const pairs: Array<[number, number]> = WS_QUESTIONS
      .filter((q) => q.id < upToId)
      .map((q) => [q.id, q.reverse ? 2 : 5])

    const newAnswers = new Map<number, number>(pairs)
    const updatedAnswers = pairs.map(([questionId, value]) => ({ questionId, value }))
    const session = loadSession()
    const isFinal = stage === 2
    saveSession({
      branchResponses: {
        ...session.branchResponses,
        working_style: { answers: updatedAnswers, completed: isFinal },
      },
    })
    const r = scoreAnswers(newAnswers)
    setAnswers(newAnswers)
    setResult(r)
    setRevealStage(stage)
    setScreen('pattern')

    if (isFinal) {
      setContent(null)
      triggerFinalCopyGeneration(r)
    } else {
      setContent(null)
    }
  }

  const devSkips = process.env.NODE_ENV === 'development' ? (
    <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2">
      <button onClick={() => handleDevStage(0)} className="font-sans text-[11px] text-muted/60 hover:text-muted underline">
        Dev: axis 1 reveal (structure)
      </button>
      <button onClick={() => handleDevStage(1)} className="font-sans text-[11px] text-muted/60 hover:text-muted underline">
        Dev: axis 2 reveal (independence)
      </button>
      <button onClick={() => handleDevStage(2)} className="font-sans text-[11px] text-muted/60 hover:text-muted underline">
        Dev: full completion → report
      </button>
    </div>
  ) : null

  if (screen === 'intro') return <><IntroScreen onStart={() => setScreen('questions')} />{devSkips}</>

  if (screen === 'questions') {
    const q = WS_QUESTIONS[currentQ]
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
            scaleLabels={['Strongly disagree', 'Strongly agree']}
          />
        </div>
        {devSkips}
      </>
    )
  }

  // pattern screen
  return (
    <>
      <TopBar answeredCount={Math.min(answers.size, TOTAL_Q)} />
      <div style={{ paddingTop: 52 }}>
        <PatternScreen
          result={result!}
          content={content}
          revealStage={revealStage}
          onKeepGoing={() => setScreen('questions')}
          onGoToReport={() => router.push('/report')}
        />
      </div>
      {devSkips}
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
            How you actually work
          </p>
          <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 20, fontWeight: 500, lineHeight: 1.5, textAlign: 'center', color: charcoal }}>
            Not how you&apos;d describe it in an interview. How it actually is.
          </p>
        </div>

        <div style={{ ...f(600) }}>
          <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.7, color: charcoalSoft, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
            You&apos;ll see where you sit on three axes — structured vs flexible, independent vs collaborative, direct vs diplomatic — and what that combination means in practice.
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
            Around 21 questions
          </p>
        </div>

      </div>
    </main>
  )
}

// ── AxisRevealVisual ───────────────────────────────────────────────────────────
// Real visual presence via the actual AnimatedBlob component, positioned along a
// pole-to-pole line rather than the reference's plain static word+line.

function AxisRevealVisual({ axis, position, leaningLabel }: { axis: WorkingStyleAxis; position: number; leaningLabel: string }) {
  const poles = AXIS_POLES[axis]
  // Blob (size 90, so its box spans ±45 from center) sits well above the line —
  // previously the blob's own word text overlapped the pole-label row directly
  // beneath it since both were centered on the same y-position.
  const blobCenterY = 58
  const lineY = 130
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 340, height: 165, margin: '0 auto' }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: lineY,
        height: 1, background: line,
      }} />
      <span style={{ position: 'absolute', left: 0, top: lineY + 12, fontFamily: sans, fontSize: 12, color: charcoalSoft }}>
        {poles.left}
      </span>
      <span style={{ position: 'absolute', right: 0, top: lineY + 12, fontFamily: sans, fontSize: 12, color: gray }}>
        {poles.right}
      </span>
      <div style={{
        position: 'absolute', top: blobCenterY,
        left: `${position * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}>
        <AnimatedBlob seed={`ws-axis-${axis}`} hueOffset={0} word={leaningLabel} size={90} baseRadius={32} />
      </div>
    </div>
  )
}

// ── PatternScreen ──────────────────────────────────────────────────────────────

function PatternScreen({
  result,
  content,
  revealStage,
  onKeepGoing,
  onGoToReport,
}: {
  result:       WorkingStyleResult
  content:      PatternContent | null
  revealStage:  number
  onKeepGoing:  () => void
  onGoToReport: () => void
}) {
  const axis = AXIS_ORDER[revealStage]
  const { position, leaningLabel } = result.axes[axis]
  const isFinal = revealStage === 2
  const isLoading = isFinal && content === null

  const leanSide: 'left' | 'right' = position < 0.5 ? 'left' : 'right'
  const revealLine = `Your pull toward ${AXIS_LEAN_PHRASE[axis][leanSide]} is one of the clearest signals in how you answered.`
  const revealSub = revealStage === 0
    ? "That's one of three axes. A few more questions map the other two."
    : revealStage === 1
    ? "That's two of three axes. A few more questions map the last one."
    : "That's all three axes mapped. Your full pattern is in your report."

  const answeredSoFar = AXIS_BOUNDARY[axis]

  return (
    <div style={{
      minHeight: 'calc(100vh - 52px)', background: cream, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center',
    }}>
      <p style={{ fontFamily: sans, fontSize: 12, color: gray, letterSpacing: '0.04em', marginBottom: 40, ...f(0) }}>
        {answeredSoFar} responses · pattern identified
      </p>

      <p style={{
        fontFamily: sans, fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: gray, fontWeight: 600, margin: '0 0 24px', ...f(200),
      }}>
        {AXIS_DISPLAY[axis]} — your working style pattern
      </p>

      <div style={{
        width: '100%', maxWidth: 400,
        ...f(400, 1.1),
        animation: 'blobReveal 1.1s cubic-bezier(0.22,1,0.36,1) both',
        animationDelay: '400ms',
      }}>
        <AxisRevealVisual axis={axis} position={position} leaningLabel={leaningLabel} />
      </div>

      {isFinal && isLoading ? (
        <div style={{ minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 32 }}>
          <LoadingDots />
        </div>
      ) : (
        <>
          <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 18, lineHeight: 1.55, maxWidth: 380, margin: '0 0 8px', color: charcoalSoft, ...f(1300) }}>
            {isFinal ? content!.trait_quote : revealLine}
          </p>
          <p style={{ fontFamily: sans, fontSize: 13, color: gray, margin: '0 0 36px', ...f(1500) }}>
            {revealSub}
          </p>
        </>
      )}

      {!(isFinal && isLoading) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 380, ...f(1800) }}>
          {!isFinal && (
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
                {revealStage === 0 ? 'Map the other two axes' : 'Map the last one'}
              </span>
            </button>
          )}
          <button
            onClick={onGoToReport}
            style={{
              width: '100%', padding: '16px 20px', borderRadius: 10, fontFamily: sans,
              fontSize: 14.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: 3,
              background: isFinal ? charcoal : 'white',
              color: isFinal ? cream : charcoal,
              border: isFinal ? 'none' : `1px solid ${line}`,
            }}
          >
            <span>Go to your report</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: isFinal ? 'rgba(247,244,237,0.6)' : gray }}>
              {isFinal ? 'Your working style section is now ready to view' : 'See what\'s mapped so far'}
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
