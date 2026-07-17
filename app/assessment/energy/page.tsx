'use client'

import { CSSProperties, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import QuestionCard from '@/components/known/QuestionCard'
import EnergyVisual from '@/components/known/EnergyVisual'
import { generatePatternCopy } from '@/app/actions/generatePatternCopy'
import {
  scoreEnergy,
  type EnergyCategory,
  type EnergyResponse,
  type EnergyResult,
} from '@/lib/known/energyScoring'
import type { PatternContent, PatternContentEntry } from '@/lib/known/types'

// ── Questions ──────────────────────────────────────────────────────────────────
// Source: reference/branch-question-specs.md — SDT-adapted, 24 items (4 per category —
// bumped up from an initial 15/3-or-2-per-category draft for better reliability).
// No reverse scoring: all items are directionally consistent (agree = more of that category).

interface EnergyQuestion {
  id: number
  text: string
  category: EnergyCategory
}

const ENERGY_QUESTIONS: EnergyQuestion[] = [
  { id: 0,  text: 'I feel most energized when I get to decide how to do something myself.',                            category: 'autonomy_fuel'     },
  { id: 1,  text: 'Having room to do things my own way gives me a real boost.',                                        category: 'autonomy_fuel'     },
  { id: 2,  text: 'I feel more alive when I\'m trusted to make my own calls.',                                         category: 'autonomy_fuel'     },
  { id: 3,  text: 'Getting to choose how I tackle something matters more to me than people realize.',                  category: 'autonomy_fuel'     },
  { id: 4,  text: 'Being told exactly how to do something, step by step, wears me down.',                              category: 'autonomy_drain'    },
  { id: 5,  text: 'I feel drained when I have no say in decisions that affect me.',                                    category: 'autonomy_drain'    },
  { id: 6,  text: 'I feel my energy drain when someone changes my approach without asking me first.',                  category: 'autonomy_drain'    },
  { id: 7,  text: 'Not having a say in how something gets done is exhausting, even when I don\'t mind the outcome.',    category: 'autonomy_drain'    },
  { id: 8,  text: 'Getting better at something difficult gives me a real lift.',                                        category: 'competence_fuel'   },
  { id: 9,  text: 'I feel energized after making visible progress on something that matters to me.',                   category: 'competence_fuel'   },
  { id: 10, text: 'Solving a hard problem leaves me feeling more energized, not less.',                                category: 'competence_fuel'   },
  { id: 11, text: 'There\'s a real lift I get from seeing something I built actually work.',                           category: 'competence_fuel'   },
  { id: 12, text: 'Feeling incompetent at something drains me quickly.',                                               category: 'competence_drain'  },
  { id: 13, text: 'Being stuck without progress wears me down over time.',                                             category: 'competence_drain'  },
  { id: 14, text: 'Repeating the same mistake wears me down more than the mistake itself.',                            category: 'competence_drain'  },
  { id: 15, text: 'Not knowing if I\'m doing something right saps my energy fast.',                                    category: 'competence_drain'  },
  { id: 16, text: 'Time spent with people I feel close to leaves me feeling recharged.',                               category: 'relatedness_fuel'  },
  { id: 17, text: 'A real conversation, not small talk, gives me energy.',                                             category: 'relatedness_fuel'  },
  { id: 18, text: 'Feeling understood by someone leaves me lighter, not heavier.',                                     category: 'relatedness_fuel'  },
  { id: 19, text: 'Being fully seen by someone, even briefly, gives me a noticeable lift.',                            category: 'relatedness_fuel'  },
  { id: 20, text: 'Being around people without any real connection drains me, even if the interaction is pleasant.',   category: 'relatedness_drain' },
  { id: 21, text: 'Feeling isolated wears me down faster than almost anything else.',                                  category: 'relatedness_drain' },
  { id: 22, text: 'Small talk that never turns into anything real leaves me feeling flat.',                            category: 'relatedness_drain' },
  { id: 23, text: 'Being around people who don\'t really know me is quietly draining, even if they\'re nice.',         category: 'relatedness_drain' },
]

const TOTAL_Q = ENERGY_QUESTIONS.length

// ── Scoring bridge ─────────────────────────────────────────────────────────────

function scoreAnswers(answers: Map<number, number>): EnergyResult {
  const responses: EnergyResponse[] = []
  for (const q of ENERGY_QUESTIONS) {
    const value = answers.get(q.id)
    if (value == null) continue
    responses.push({ questionId: String(q.id), category: q.category, value })
  }
  return scoreEnergy(responses)
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
    energy?: BranchState
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

export default function EnergyPage() {
  const router = useRouter()
  const [screen, setScreen]     = useState<Screen>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers]   = useState<Map<number, number>>(new Map())
  const [result, setResult]     = useState<EnergyResult | null>(null)
  const [content, setContent]   = useState<PatternContent | null>(null)

  useEffect(() => {
    const session = loadSession()
    const en = session.branchResponses?.energy
    if (!en) return

    const answeredMap = new Map<number, number>()
    for (const a of en.answers ?? []) answeredMap.set(a.questionId, a.value)
    setAnswers(answeredMap)

    if (en.completed) {
      const r = scoreAnswers(answeredMap)
      setResult(r)
      const cached = session.patternContents?.find(e => e.branch === 'energy')
      if (cached?.content) setContent(cached.content)
      setScreen('pattern')
    } else if (answeredMap.size > 0) {
      setCurrentQ(answeredMap.size)
      setScreen('questions')
    }
  }, [])

  function handleNext(answerStr: string) {
    const val = parseInt(answerStr, 10)
    const q   = ENERGY_QUESTIONS[currentQ]

    const newAnswers = new Map(answers)
    newAnswers.set(q.id, val)
    setAnswers(newAnswers)

    const session  = loadSession()
    const existing = session.branchResponses?.energy?.answers ?? []
    const updated  = existing.filter(a => a.questionId !== q.id)
    updated.push({ questionId: q.id, value: val })

    if (currentQ + 1 >= TOTAL_Q) {
      saveSession({
        branchResponses: {
          ...session.branchResponses,
          energy: { answers: updated, completed: true },
        },
      })

      const r = scoreAnswers(newAnswers)
      setResult(r)
      setScreen('pattern')

      const cached = session.patternContents?.find(e => e.branch === 'energy')
      if (cached?.content) {
        setContent(cached.content)
      } else {
        triggerCopyGeneration(r)
      }
    } else {
      saveSession({
        branchResponses: {
          ...session.branchResponses,
          energy: { answers: updated },
        },
      })
      setCurrentQ(currentQ + 1)
    }
  }

  function triggerCopyGeneration(r: EnergyResult) {
    // Order matters — generatePatternCopy's energy prompt and the merge below both
    // assume: top fuel, second fuel, top drain, second drain.
    const strongConditions = [
      { label: 'fuel',  traitWord: r.topFuels[0].label,  score: r.topFuels[0].score },
      { label: 'fuel',  traitWord: r.topFuels[1].label,  score: r.topFuels[1].score },
      { label: 'drain', traitWord: r.topDrains[0].label, score: r.topDrains[0].score },
      { label: 'drain', traitWord: r.topDrains[1].label, score: r.topDrains[1].score },
    ]
    generatePatternCopy(r.topFuels[0].label, r.topFuels[0].label, 'high', null, 'energy', strongConditions)
      .then((c) => {
        setContent(c)
        const s   = loadSession()
        const pcs = (s.patternContents ?? []).filter(e => e.branch !== 'energy')
        const mergedConditions = strongConditions.map((sc, i) => ({
          ...sc,
          quote:    c.items?.[i]?.quote,
          evidence: c.items?.[i]?.evidence,
        }))
        const newEntry: PatternContentEntry = {
          facet:          'Energy',
          traitWord:      r.topFuels[0].label,
          scoreDirection: 'high',
          content:        c,
          branch:         'energy',
          dimensionScores: {
            autonomy_fuel:    r.categoryScores.autonomy_fuel,
            autonomy_drain:   r.categoryScores.autonomy_drain,
            competence_fuel:  r.categoryScores.competence_fuel,
            competence_drain: r.categoryScores.competence_drain,
            relatedness_fuel: r.categoryScores.relatedness_fuel,
            relatedness_drain: r.categoryScores.relatedness_drain,
          },
          strongConditions: mergedConditions,
          completedAt: new Date().toISOString(),
        }
        saveSession({ patternContents: [...pcs, newEntry] })
      })
      .catch(() => {})
  }

  // ── Dev shortcuts ────────────────────────────────────────────────────────────
  // One button per category — forces that category to the top of its fuel/drain group.
  // No reverse scoring in energy: all items are directionally consistent.

  function handleDevCategory(category: EnergyCategory) {
    // Built from ENERGY_QUESTIONS rather than hand-written per-id pairs (error-prone at
    // 24 items across 6 buttons). Targeted category's 4 items get 5 (clear top of its
    // fuel/drain group); other same-side categories get a lower, spread score so the
    // ranking is unambiguous; the opposite side stays neutral — this button only needs
    // to preview one specific category, not stage both sides.
    const CATEGORY_QUESTION_IDS = ENERGY_QUESTIONS.reduce((acc, q) => {
      (acc[q.category] ??= []).push(q.id)
      return acc
    }, {} as Record<EnergyCategory, number[]>)

    const isFuel = category.endsWith('_fuel')
    const fuelCategories: EnergyCategory[]  = ['autonomy_fuel', 'competence_fuel', 'relatedness_fuel']
    const drainCategories: EnergyCategory[] = ['autonomy_drain', 'competence_drain', 'relatedness_drain']
    const sameSideOthers = (isFuel ? fuelCategories : drainCategories).filter((c) => c !== category)
    const otherSide = isFuel ? drainCategories : fuelCategories

    const pairs: Array<[number, number]> = []
    for (const id of CATEGORY_QUESTION_IDS[category]) pairs.push([id, 5])
    sameSideOthers.forEach((c, i) => {
      for (const id of CATEGORY_QUESTION_IDS[c]) pairs.push([id, i === 0 ? 3 : 2])
    })
    for (const c of otherSide) {
      for (const id of CATEGORY_QUESTION_IDS[c]) pairs.push([id, 3])
    }

    const newAnswers = new Map<number, number>(pairs)
    const updatedAnswers = pairs.map(([questionId, value]) => ({ questionId, value }))
    const session = loadSession()
    saveSession({
      branchResponses: {
        ...session.branchResponses,
        energy: { answers: updatedAnswers, completed: true },
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
      {(
        [
          ['autonomy_fuel',     'autonomy fuel'],
          ['competence_fuel',   'competence fuel'],
          ['relatedness_fuel',  'relatedness fuel'],
          ['autonomy_drain',    'autonomy drain'],
          ['competence_drain',  'competence drain'],
          ['relatedness_drain', 'relatedness drain'],
        ] as [EnergyCategory, string][]
      ).map(([cat, label]) => (
        <button
          key={cat}
          onClick={() => handleDevCategory(cat)}
          className="font-sans text-[11px] text-muted/60 hover:text-muted underline"
        >
          Dev: {label}
        </button>
      ))}
    </div>
  ) : null

  if (screen === 'intro') return <><IntroScreen onStart={() => setScreen('questions')} />{devSkips}</>

  if (screen === 'questions') {
    const q = ENERGY_QUESTIONS[currentQ]
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
// Copy from reference/known-branch-flows.html #enIntro

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <main style={{ background: cream, minHeight: '100vh', padding: '64px 24px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>

        <div style={{ textAlign: 'center', ...f(0) }}>
          <span style={{ fontFamily: serif, fontSize: 14, fontWeight: 600, color: gray }}>known</span>
        </div>

        <div style={{ ...f(300) }}>
          <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: gray, fontWeight: 600, textAlign: 'center', marginBottom: 14 }}>
            What fuels you and what costs you
          </p>
          <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 20, fontWeight: 500, lineHeight: 1.5, textAlign: 'center', color: charcoal }}>
            The same day can feel energising to one person and draining to another.
          </p>
        </div>

        <div style={{ ...f(600) }}>
          <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.7, color: charcoalSoft, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
            You&apos;ll get a map of what genuinely fuels you versus what you tolerate — split into what gives energy and what quietly takes it, with the specific conditions behind each.
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
  result:       EnergyResult
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
        Your energy pattern
      </p>

      <div style={{
        width: '100%', maxWidth: 400,
        ...f(400, 1.1),
        animation: 'blobReveal 1.1s cubic-bezier(0.22,1,0.36,1) both',
        animationDelay: '400ms',
      }}>
        <EnergyVisual topFuel={result.topFuels[0]} topDrain={result.topDrains[0]} />
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
        // Energy computes one result from all 24 responses at once — there's no
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
              Your energy section is now ready to view
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
