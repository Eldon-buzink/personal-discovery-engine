'use client'

import { CSSProperties, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import QuestionCard from '@/components/known/QuestionCard'
import RelationshipsVisual from '@/components/known/RelationshipsVisual'
import { generatePatternCopy } from '@/app/actions/generatePatternCopy'
import {
  scoreRelationships,
  type RelationshipsResponse,
  type RelationshipsResult,
} from '@/lib/known/relationshipsScoring'
import type { PatternContent, PatternContentEntry } from '@/lib/known/types'

// ── Questions ──────────────────────────────────────────────────────────────────
// Source: reference/branch-question-specs.md — ECR-R adapted, 15 items
// Dimension and reverse flags verified against that spec before wiring in.
// Items flagged reversed: score = 6 − raw_value before averaging.

type RelDimension = 'anxiety' | 'avoidance'

interface RelQuestion {
  id: number
  text: string
  dimension: RelDimension
  reversed?: boolean
}

const REL_QUESTIONS: RelQuestion[] = [
  { id: 0,  text: "I find it easy to trust people I've just met.",                                            dimension: 'avoidance', reversed: true  },
  { id: 1,  text: "When I'm upset, I tend to work through it alone before talking to someone.",               dimension: 'avoidance'                  },
  { id: 2,  text: "I worry about whether the people close to me really understand me.",                       dimension: 'anxiety'                    },
  { id: 3,  text: "I'm comfortable depending on others when I need to.",                                      dimension: 'avoidance', reversed: true  },
  { id: 4,  text: "I find it hard to open up to someone until I've known them for a long time.",              dimension: 'avoidance'                  },
  { id: 5,  text: "I notice when the people I care about seem distant, even when they say nothing is wrong.", dimension: 'anxiety'                    },
  { id: 6,  text: "I would rather handle a difficult situation alone than ask for help.",                     dimension: 'avoidance'                  },
  { id: 7,  text: "I find it easy to show affection to the people I'm close to.",                            dimension: 'avoidance', reversed: true  },
  { id: 8,  text: "I sometimes worry that I care more about relationships than others care about them.",       dimension: 'anxiety'                    },
  { id: 9,  text: "When someone lets me down, I find it hard to go back to how things were before.",          dimension: 'anxiety'                    },
  { id: 10, text: "I prefer to keep some emotional distance, even in close relationships.",                   dimension: 'avoidance'                  },
  { id: 11, text: "I rarely worry about whether the people I care about will be there when I need them.",     dimension: 'anxiety',   reversed: true  },
  { id: 12, text: "I find it uncomfortable when someone relies on me emotionally.",                           dimension: 'avoidance'                  },
  { id: 13, text: "I often feel like the people around me don't need me as much as I need them.",             dimension: 'anxiety'                    },
  { id: 14, text: "I often find myself seeking reassurance that the people close to me still care.",          dimension: 'anxiety'                    },
]

const TOTAL_Q = REL_QUESTIONS.length

// ── Scoring bridge ─────────────────────────────────────────────────────────────
// Converts the Map<questionId, rawValue> to RelationshipsResponse[] and calls
// the shared scoring module.

function scoreAnswers(answers: Map<number, number>): RelationshipsResult {
  const responses: RelationshipsResponse[] = []
  for (const q of REL_QUESTIONS) {
    const value = answers.get(q.id)
    if (value == null) continue
    responses.push({
      questionId: String(q.id),
      dimension: q.dimension,
      value,
      reverse: q.reversed ?? false,
    })
  }
  return scoreRelationships(responses)
}

// ── Hue helpers (mirrors report/page.tsx) ─────────────────────────────────────

const curatedHues = [
  { hue: 8 }, { hue: 35 }, { hue: 145 }, { hue: 175 },
  { hue: 205 }, { hue: 235 }, { hue: 290 }, { hue: 335 },
]

function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function userCuratedHue(seedStr: string, offset: number): number {
  const key = seedStr + '-' + offset
  const base = hashSeed(key)
  const bucket = base % curatedHues.length
  const jitter = (hashSeed(key + 'jitter') % 21) - 10
  return (curatedHues[bucket].hue + jitter + 360) % 360
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
    environment?: BranchState
    relationships?: BranchState
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

export default function RelationshipsPage() {
  const router = useRouter()
  const [screen, setScreen]     = useState<Screen>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers]   = useState<Map<number, number>>(new Map())
  const [result, setResult]     = useState<RelationshipsResult | null>(null)
  const [content, setContent]   = useState<PatternContent | null>(null)

  useEffect(() => {
    const session = loadSession()
    const rel = session.branchResponses?.relationships
    if (!rel) return

    const answeredMap = new Map<number, number>()
    for (const a of rel.answers ?? []) answeredMap.set(a.questionId, a.value)
    setAnswers(answeredMap)

    if (rel.completed) {
      const r = scoreAnswers(answeredMap)
      setResult(r)
      const cached = session.patternContents?.find(e => e.branch === 'relationships')
      if (cached?.content) setContent(cached.content)
      setScreen('pattern')
    } else if (answeredMap.size > 0) {
      setCurrentQ(answeredMap.size)
      setScreen('questions')
    }
  }, [])

  function handleNext(answerStr: string) {
    const val = parseInt(answerStr, 10)
    const q   = REL_QUESTIONS[currentQ]

    const newAnswers = new Map(answers)
    newAnswers.set(q.id, val)
    setAnswers(newAnswers)

    const session  = loadSession()
    const existing = session.branchResponses?.relationships?.answers ?? []
    const updated  = existing.filter(a => a.questionId !== q.id)
    updated.push({ questionId: q.id, value: val })

    if (currentQ + 1 >= TOTAL_Q) {
      saveSession({
        branchResponses: {
          ...session.branchResponses,
          relationships: { answers: updated, completed: true },
        },
      })

      const r = scoreAnswers(newAnswers)
      setResult(r)
      setScreen('pattern')

      const cached = session.patternContents?.find(e => e.branch === 'relationships')
      if (cached?.content) {
        setContent(cached.content)
      } else {
        generatePatternCopy(r.quadrant, r.quadrant, 'high', null, 'relationships')
          .then((c) => {
            setContent(c)
            const s   = loadSession()
            const pcs = (s.patternContents ?? []).filter(e => e.branch !== 'relationships')
            const newEntry: PatternContentEntry = {
              facet:         'Relationships',
              traitWord:     r.quadrant,
              scoreDirection: 'high',
              content:        c,
              branch:        'relationships',
              dimensionScores: {
                anxiety:         r.anxietyScore,
                avoidance:       r.avoidanceScore,
                partnerDistance: r.partnerDistance,
              },
              completedAt: new Date().toISOString(),
            }
            saveSession({ patternContents: [...pcs, newEntry] })
          })
          .catch(() => {})
      }
    } else {
      saveSession({
        branchResponses: {
          ...session.branchResponses,
          relationships: { answers: updated },
        },
      })
      setCurrentQ(currentQ + 1)
    }
  }

  // Dev shortcuts: inject pre-computed answers for each attachment quadrant.
  // Reverse-scored items: scored = 6 − raw. Midpoint = 3.0; Low < 3.0, High > 3.0.
  // Avoidance reversed: ids 0,3,7. Anxiety reversed: id 11.
  function handleDevQuadrant(quadrant: 'Open' | 'Independent' | 'Attached' | 'Cautious') {
    const QUADRANT_ANSWERS: Record<string, Array<[number, number]>> = {
      // avoidance-rev raw=5→scored=1, avoidance-fwd raw=2→scored=2, anxiety-rev raw=5→scored=1, anxiety-fwd raw=2→scored=2
      Open:        [[0,5],[1,2],[2,2],[3,5],[4,2],[5,2],[6,2],[7,5],[8,2],[9,2],[10,2],[11,5],[12,2],[13,2],[14,2]],
      // avoidance-rev raw=1→scored=5, avoidance-fwd raw=5→scored=5, anxiety same as Open
      Independent: [[0,1],[1,5],[2,2],[3,1],[4,5],[5,2],[6,5],[7,1],[8,2],[9,2],[10,5],[11,5],[12,5],[13,2],[14,2]],
      // avoidance same as Open, anxiety-rev raw=1→scored=5, anxiety-fwd raw=5→scored=5
      Attached:    [[0,5],[1,2],[2,5],[3,5],[4,2],[5,5],[6,2],[7,5],[8,5],[9,5],[10,2],[11,1],[12,2],[13,5],[14,5]],
      // avoidance same as Independent, anxiety same as Attached
      Cautious:    [[0,1],[1,5],[2,5],[3,1],[4,5],[5,5],[6,5],[7,1],[8,5],[9,5],[10,5],[11,1],[12,5],[13,5],[14,5]],
    }
    const pairs = QUADRANT_ANSWERS[quadrant]
    const newAnswers = new Map<number, number>(pairs)
    const updatedAnswers = pairs.map(([questionId, value]) => ({ questionId, value }))
    const session = loadSession()
    saveSession({
      branchResponses: {
        ...session.branchResponses,
        relationships: { answers: updatedAnswers, completed: true },
      },
    })
    const r = scoreAnswers(newAnswers)
    setAnswers(newAnswers)
    setResult(r)
    setContent(null)
    setScreen('pattern')
    const s   = loadSession()
    const pcs = (s.patternContents ?? []).filter(e => e.branch !== 'relationships')
    generatePatternCopy(r.quadrant, r.quadrant, 'high', null, 'relationships')
      .then((c) => {
        setContent(c)
        const newEntry: PatternContentEntry = {
          facet:           'Relationships',
          traitWord:       r.quadrant,
          scoreDirection:  'high',
          content:         c,
          branch:          'relationships',
          dimensionScores: { anxiety: r.anxietyScore, avoidance: r.avoidanceScore, partnerDistance: r.partnerDistance },
          completedAt: new Date().toISOString(),
        }
        saveSession({ patternContents: [...pcs, newEntry] })
      })
      .catch(() => {})
  }

  const devSkips = process.env.NODE_ENV === 'development' ? (
    <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2">
      {(['Open', 'Independent', 'Attached', 'Cautious'] as const).map(q => (
        <button key={q} onClick={() => handleDevQuadrant(q)} className="font-sans text-[11px] text-muted/60 hover:text-muted underline">
          Dev: {q}
        </button>
      ))}
    </div>
  ) : null

  if (screen === 'intro') return <><IntroScreen onStart={() => setScreen('questions')} />{devSkips}</>

  if (screen === 'questions') {
    const q = REL_QUESTIONS[currentQ]
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
    </>
  )
}

// ── IntroScreen ────────────────────────────────────────────────────────────────
// Copy from reference/known-branch-flows.html #relIntro

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <main style={{ background: cream, minHeight: '100vh', padding: '64px 24px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>

        <div style={{ textAlign: 'center', ...f(0) }}>
          <span style={{ fontFamily: serif, fontSize: 14, fontWeight: 600, color: gray }}>known</span>
        </div>

        <div style={{ ...f(300) }}>
          <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: gray, fontWeight: 600, textAlign: 'center', marginBottom: 14 }}>
            How you connect with people
          </p>
          <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 20, fontWeight: 500, lineHeight: 1.5, textAlign: 'center', color: charcoal }}>
            Not whether you&apos;re an introvert or extrovert. Something more specific than that.
          </p>
        </div>

        <div style={{ ...f(600) }}>
          <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.7, color: charcoalSoft, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
            You&apos;ll see your attachment pattern — how close you let people get, how you respond when that&apos;s tested, and what that means for the relationships that matter most.
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
  onGoToReport,
}: {
  result: RelationshipsResult
  content: PatternContent | null
  onGoToReport: () => void
}) {
  const { quadrant, partnerDistance } = result
  const hue       = userCuratedHue(`rel-pattern-${quadrant.toLowerCase()}`, 0)
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
        Your relationships pattern
      </p>

      <div style={{
        width: '100%', maxWidth: 400, ...f(400, 1.1),
        animation: 'blobReveal 1.1s cubic-bezier(0.22,1,0.36,1) both',
        animationDelay: '400ms',
      }}>
        <RelationshipsVisual
          traitWord={quadrant}
          partnerDistance={partnerDistance}
          hue={hue}
        />
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
            There&apos;s more to the picture. Your full pattern is in your report.
          </p>
        </>
      )}

      {!isLoading && (
        // Relationships computes one result from all 15 responses at once — there's no
        // partial sub-result to "keep going" toward, so only "Go to your report" shows.
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
              Your relationships section is now ready to view
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
