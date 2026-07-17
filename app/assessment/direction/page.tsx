'use client'

import { CSSProperties, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import QuestionCard from '@/components/known/QuestionCard'
import AnimatedBlob from '@/components/known/AnimatedBlob'
import { generatePatternCopy } from '@/app/actions/generatePatternCopy'
import {
  scoreDirection,
  selectShownDirections,
  type DirectionType,
  type DirectionResponse,
  type DirectionResult,
  type ShownDirection,
} from '@/lib/known/directionScoring'
import type { PatternContent, PatternContentEntry } from '@/lib/known/types'

// ── Questions ──────────────────────────────────────────────────────────────────
// Source: reference/branch-question-specs.md — 24 items, 4 per RIASEC type.
// Confirmed set (replaces the earlier drafted-to-fill-a-gap version). No reverse
// scoring (single-direction interest statements, same approach as Energy).

interface DirectionQuestion {
  id: number
  text: string
  type: DirectionType
}

const DIRECTION_QUESTIONS: DirectionQuestion[] = [
  { id: 0,  text: "I'd rather build or fix something with my hands than talk about how to build or fix it.",       type: 'realistic' },
  { id: 1,  text: "I like tasks where I can see a physical result at the end.",                                    type: 'realistic' },
  { id: 2,  text: "I'm drawn to work that involves tools, machines, or physical materials.",                       type: 'realistic' },
  { id: 3,  text: "I enjoy figuring out how something works by taking it apart.",                                  type: 'realistic' },
  { id: 4,  text: "I like digging into a problem until I really understand why it happens.",                       type: 'investigative' },
  { id: 5,  text: "I'm drawn to questions that don't have an obvious answer yet.",                                 type: 'investigative' },
  { id: 6,  text: "I enjoy research — reading, testing, comparing — more than most people I know.",                type: 'investigative' },
  { id: 7,  text: "Understanding the \"why\" behind something matters more to me than just knowing what to do.",   type: 'investigative' },
  { id: 8,  text: "I need creative freedom in my work, not just a set of instructions to follow.",                 type: 'artistic' },
  { id: 9,  text: "I'm happiest when I'm making something that didn't exist before.",                              type: 'artistic' },
  { id: 10, text: "I get more out of an unconventional idea than a proven, safe one.",                             type: 'artistic' },
  { id: 11, text: "Self-expression is something I actively look for in what I do.",                                type: 'artistic' },
  { id: 12, text: "Helping someone grow or improve is genuinely satisfying to me.",                                type: 'social' },
  { id: 13, text: "I naturally gravitate toward the person in the room who needs support.",                        type: 'social' },
  { id: 14, text: "I'd rather teach someone a skill than just do the task myself.",                                type: 'social' },
  { id: 15, text: "Conversations about people's lives interest me more than conversations about systems or things.", type: 'social' },
  { id: 16, text: "I like convincing people to see things my way.",                                                type: 'enterprising' },
  { id: 17, text: "Taking the lead on a project feels natural to me.",                                             type: 'enterprising' },
  { id: 18, text: "I'm energized by pitching an idea and getting others on board.",                                type: 'enterprising' },
  { id: 19, text: "I enjoy the competitive side of getting a deal or opportunity to work out.",                    type: 'enterprising' },
  { id: 20, text: "I like creating order out of a messy set of information.",                                      type: 'conventional' },
  { id: 21, text: "Keeping accurate records and details straight is something I'm good at and enjoy.",             type: 'conventional' },
  { id: 22, text: "I feel satisfaction from a well-organized system running smoothly.",                            type: 'conventional' },
  { id: 23, text: "I'd rather follow a clear, proven process than improvise one.",                                 type: 'conventional' },
]

const TOTAL_Q = DIRECTION_QUESTIONS.length

// ── Scoring bridge ─────────────────────────────────────────────────────────────

function scoreAnswers(answers: Map<number, number>): DirectionResult {
  const responses: DirectionResponse[] = []
  for (const q of DIRECTION_QUESTIONS) {
    const value = answers.get(q.id)
    if (value == null) continue
    responses.push({ questionId: String(q.id), type: q.type, value })
  }
  return scoreDirection(responses)
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
    direction?: BranchState
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

export default function DirectionPage() {
  const router = useRouter()
  const [screen, setScreen]     = useState<Screen>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers]   = useState<Map<number, number>>(new Map())
  const [result, setResult]     = useState<DirectionResult | null>(null)
  const [content, setContent]   = useState<PatternContent | null>(null)

  useEffect(() => {
    const session = loadSession()
    const dir = session.branchResponses?.direction
    if (!dir) return

    const answeredMap = new Map<number, number>()
    for (const a of dir.answers ?? []) answeredMap.set(a.questionId, a.value)
    setAnswers(answeredMap)

    if (dir.completed) {
      const r = scoreAnswers(answeredMap)
      setResult(r)
      const cached = session.patternContents?.find(e => e.branch === 'direction')
      if (cached?.content) setContent(cached.content)
      setScreen('pattern')
    } else if (answeredMap.size > 0) {
      setCurrentQ(answeredMap.size)
      setScreen('questions')
    }
  }, [])

  function triggerCopyGeneration(r: DirectionResult) {
    const shown: ShownDirection[] = selectShownDirections(r.ranked)
    const strongConditions = shown.map((d) => ({
      label: d.type,
      traitWord: d.label,
      score: d.score,
    }))
    generatePatternCopy(strongConditions[0].traitWord, strongConditions[0].traitWord, 'high', null, 'direction', strongConditions)
      .then((c) => {
        setContent(c)
        const s   = loadSession()
        const pcs = (s.patternContents ?? []).filter(e => e.branch !== 'direction')
        const mergedConditions = strongConditions.map((sc, i) => ({
          ...sc,
          word:     c.items?.[i]?.word,
          quote:    c.items?.[i]?.quote,
          evidence: c.items?.[i]?.evidence,
        }))
        const newEntry: PatternContentEntry = {
          facet:          'Direction',
          traitWord:      strongConditions[0].traitWord,
          scoreDirection: 'high',
          content:        c,
          branch:         'direction',
          dimensionScores: r.categoryScores,
          strongConditions: mergedConditions,
          completedAt: new Date().toISOString(),
        }
        saveSession({ patternContents: [...pcs, newEntry] })
      })
      .catch(() => {})
  }

  function handleNext(answerStr: string) {
    const val = parseInt(answerStr, 10)
    const q   = DIRECTION_QUESTIONS[currentQ]

    const newAnswers = new Map(answers)
    newAnswers.set(q.id, val)
    setAnswers(newAnswers)

    const session  = loadSession()
    const existing = session.branchResponses?.direction?.answers ?? []
    const updated  = existing.filter(a => a.questionId !== q.id)
    updated.push({ questionId: q.id, value: val })

    if (currentQ + 1 >= TOTAL_Q) {
      saveSession({
        branchResponses: { ...session.branchResponses, direction: { answers: updated, completed: true } },
      })

      const r = scoreAnswers(newAnswers)
      setResult(r)
      setScreen('pattern')

      const cached = session.patternContents?.find(e => e.branch === 'direction')
      if (cached?.content) {
        setContent(cached.content)
      } else {
        triggerCopyGeneration(r)
      }
    } else {
      saveSession({
        branchResponses: { ...session.branchResponses, direction: { answers: updated } },
      })
      setCurrentQ(currentQ + 1)
    }
  }

  // ── Dev shortcuts ────────────────────────────────────────────────────────────
  // Three scenarios covering the confidence-cutoff boundary in selectShownDirections
  // (CONTENDER_GAP = 0.5): a runaway leader (1 card), a close 2-way (2 cards), and
  // a tight 3-way cluster (3 cards) — so the cutoff can actually be checked visually.

  function handleDevScenario(scenario: 'one' | 'two' | 'three') {
    const SCENARIOS: Record<string, Partial<Record<DirectionType, number[]>>> = {
      // realistic 5.0 vs everything else 2.0 — gap 3.0, way past 0.5 → only rank 1 shown
      one:   { realistic: [5,5,5,5], investigative: [2,2,2,2], artistic: [2,2,2,2], social: [2,2,2,2], enterprising: [2,2,2,2], conventional: [2,2,2,2] },
      // realistic 4.25, investigative 3.75 — gap 0.5 (right at the cutoff, still shown), artistic 2.75 — gap 1.0, not shown
      two:   { realistic: [5,4,4,4], investigative: [4,4,4,3], artistic: [3,3,3,2], social: [2,2,2,2], enterprising: [2,2,2,2], conventional: [2,2,2,2] },
      // realistic 4.25, investigative 4.0, artistic 3.75 — both gaps 0.25, all three shown
      three: { realistic: [5,4,4,4], investigative: [4,4,4,4], artistic: [4,4,4,3], social: [2,2,2,2], enterprising: [2,2,2,2], conventional: [2,2,2,2] },
    }
    const byType = SCENARIOS[scenario]
    const pairs: Array<[number, number]> = []
    DIRECTION_QUESTIONS.forEach((q) => {
      const typeValues = byType[q.type]!
      const indexWithinType = DIRECTION_QUESTIONS.filter(dq => dq.type === q.type).findIndex(dq => dq.id === q.id)
      pairs.push([q.id, typeValues[indexWithinType]])
    })

    const newAnswers = new Map<number, number>(pairs)
    const updatedAnswers = pairs.map(([questionId, value]) => ({ questionId, value }))
    const session = loadSession()
    saveSession({
      branchResponses: {
        ...session.branchResponses,
        direction: { answers: updatedAnswers, completed: true },
      },
    })
    const r = scoreAnswers(newAnswers)
    setAnswers(newAnswers)
    setResult(r)
    setContent(null)
    setScreen('pattern')
    triggerCopyGeneration(r)
  }

  const devSkips = process.env.NODE_ENV === 'development' ? (
    <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2">
      <button onClick={() => handleDevScenario('one')} className="font-sans text-[11px] text-muted/60 hover:text-muted underline">
        Dev: clear winner (1 card)
      </button>
      <button onClick={() => handleDevScenario('two')} className="font-sans text-[11px] text-muted/60 hover:text-muted underline">
        Dev: close top 2 (2 cards)
      </button>
      <button onClick={() => handleDevScenario('three')} className="font-sans text-[11px] text-muted/60 hover:text-muted underline">
        Dev: tight top 3 (3 cards)
      </button>
    </div>
  ) : null

  if (screen === 'intro') return <><IntroScreen onStart={() => setScreen('questions')} />{devSkips}</>

  if (screen === 'questions') {
    const q = DIRECTION_QUESTIONS[currentQ]
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
      <TopBar answeredCount={TOTAL_Q} />
      <div style={{ paddingTop: 52 }}>
        <PatternScreen
          result={result!}
          content={content}
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
            Where this might lead
          </p>
          <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 20, fontWeight: 500, lineHeight: 1.5, textAlign: 'center', color: charcoal }}>
            This one&apos;s different. Less about who you are, more about what that points toward.
          </p>
        </div>

        <div style={{ ...f(600) }}>
          <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.7, color: charcoalSoft, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
            You&apos;ll see one to three directions that fit your profile — drawn from your traits, your conditions, and how you work. Each one comes with what makes it a fit and what to watch for.
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
            Around 24 questions
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
  onGoToReport,
}: {
  result:       DirectionResult
  content:      PatternContent | null
  onGoToReport: () => void
}) {
  const isLoading = content === null

  return (
    <div style={{
      minHeight: 'calc(100vh - 52px)', background: cream, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center',
    }}>
      <p style={{ fontFamily: sans, fontSize: 12, color: gray, letterSpacing: '0.04em', marginBottom: 40, ...f(0) }}>
        24 responses · pattern identified
      </p>

      <p style={{
        fontFamily: sans, fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: gray, fontWeight: 600, margin: '0 0 24px', ...f(200),
      }}>
        Your direction pattern
      </p>

      {/* Unlike other branches, the blob's WORD is itself AI-generated (teaserWord) —
          there's no deterministic label to show while waiting, so the whole visual
          waits on the same load as the quote below, not just the text. */}
      <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', ...f(400, 1.1) }}>
        {isLoading ? (
          <LoadingDots />
        ) : (
          <div style={{
            position: 'relative', width: 220, height: 220, overflow: 'visible',
            animation: 'blobReveal 1.1s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            <AnimatedBlob
              seed={`dir-pattern-${result.ranked[0].type}`}
              hueOffset={0}
              word={content!.teaserWord ?? result.ranked[0].label}
              size={220}
            />
            <div style={{
              position: 'absolute', inset: 6, borderRadius: '50%',
              border: '1px solid rgba(150,120,100,0.4)', pointerEvents: 'none',
              animation: 'pulseRing 2.4s ease-out both',
            }} />
          </div>
        )}
      </div>

      {!isLoading && (
        <>
          <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 18, lineHeight: 1.55, maxWidth: 380, margin: '0 0 8px', color: charcoalSoft, ...f(1300) }}>
            {content!.trait_quote}
          </p>
          <p style={{ fontFamily: sans, fontSize: 13, color: gray, margin: '0 0 36px', ...f(1500) }}>
            Your direction section will show you each one, with what makes it a fit and what to watch for.
          </p>
        </>
      )}

      {!isLoading && (
        // Single button, not a two-button fork — Direction computes one result from
        // all 24 responses at once (same as Relationships/Energy), so there's no
        // partial sub-result to "keep going" toward once this screen shows.
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 380, ...f(1800) }}>
          <button
            onClick={onGoToReport}
            style={{
              width: '100%', padding: '16px 20px', borderRadius: 10, fontFamily: sans,
              fontSize: 14.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: 3,
              background: charcoal, color: cream, border: 'none',
            }}
          >
            <span>Go to your report</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(247,244,237,0.6)' }}>
              Your direction section is now ready to view
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
