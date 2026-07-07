'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useState } from 'react'
import AnimatedBlob from '@/components/known/AnimatedBlob'
import AuthModal from '@/components/known/AuthModal'
import PatternToast from '@/components/known/PatternToast'
import QuestionCard from '@/components/known/QuestionCard'
import { RING1_QUESTIONS, FACET_QUESTIONS, QUESTION_BY_ID } from '@/lib/known/ring1-questions'
import { computeFacetScore, getTraitWord } from '@/lib/known/scoring'
import { generatePatternCopy } from '@/app/actions/generatePatternCopy'
import type { CompletedFacetRecord, PatternContent, PatternContentEntry } from '@/lib/known/types'

// ── Session types ─────────────────────────────────────────────────────────────

interface SessionResponse {
  questionId: number
  value: number
  answeredAt: string
}

interface PatternRecord {
  facet: string
  traitWord: string
  answeredAt: string
}

interface KnownSession {
  questionOrder: number[]
  responses: SessionResponse[]
  patternShown?: PatternRecord
  revealedFacets?: string[]
  patternContents?: PatternContentEntry[]
}

// ── Session helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'known_session'
const TOTAL = 120

function loadSession(): KnownSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { questionOrder: [], responses: [] }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) || typeof parsed !== 'object' || parsed === null) {
      return { questionOrder: [], responses: [] }
    }
    return {
      questionOrder: Array.isArray(parsed.questionOrder) ? parsed.questionOrder : [],
      responses: Array.isArray(parsed.responses) ? parsed.responses : [],
      patternShown: parsed.patternShown ?? undefined,
      revealedFacets: Array.isArray(parsed.revealedFacets) ? parsed.revealedFacets : undefined,
      patternContents: Array.isArray(parsed.patternContents)
        ? parsed.patternContents as PatternContentEntry[]
        : typeof parsed.patternContents === 'object' && parsed.patternContents !== null
          ? Object.entries(parsed.patternContents as Record<string, PatternContent>).map(([facet, content]) => ({
              facet,
              traitWord: parsed.patternShown?.facet === facet ? (parsed.patternShown as PatternRecord).traitWord : '',
              scoreDirection: 'mid' as const,
              content,
            }))
          : undefined,
    }
  } catch {
    return { questionOrder: [], responses: [] }
  }
}

function saveSession(session: KnownSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function shuffle(ids: number[]): number[] {
  const a = [...ids]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function findFirstUnanswered(
  questionOrder: number[],
  answeredSet: Set<number>,
  fromIndex = 0
): number {
  for (let i = fromIndex; i < questionOrder.length; i++) {
    if (!answeredSet.has(questionOrder[i])) return i
  }
  return questionOrder.length
}

function scoreDirection(score: number): 'high' | 'mid' | 'low' {
  return score >= 3.5 ? 'high' : score >= 2.5 ? 'mid' : 'low'
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

function TagPill({ label }: { label: string }) {
  return (
    <span
      className="font-sans text-[11px] text-charcoal-soft"
      style={{
        border: '1px solid #C5C1B8',
        borderRadius: 20,
        padding: '4px 12px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function ContentCard({
  eyebrow,
  body,
  delay,
}: {
  eyebrow: string
  body: string
  delay: number
}) {
  return (
    <div
      className="w-full"
      style={{
        background: '#ffffff',
        border: '1px solid #E5E1D5',
        borderRadius: 12,
        padding: 16,
        animation: `fadeIn 0.6s ease both`,
        animationDelay: `${delay}ms`,
      }}
    >
      <p
        className="font-sans font-semibold uppercase text-muted"
        style={{ fontSize: 10, letterSpacing: '0.08em', marginBottom: 8 }}
      >
        {eyebrow}
      </p>
      <p className="font-sans text-[13.5px] text-charcoal-soft leading-[1.55]">{body}</p>
    </div>
  )
}

function PatternDetectedScreen({
  record,
  isFirst,
  onKeepGoing,
  onReport,
}: {
  record: CompletedFacetRecord
  isFirst: boolean
  onKeepGoing: () => void
  onReport: () => void
}) {
  const f = (delay: number, duration = 0.6): CSSProperties => ({
    animation: `fadeIn ${duration}s ease both`,
    animationDelay: `${delay}ms`,
  })

  const { traitWord, answeredCount, content } = record
  const isLoading = content === null

  return (
    <div className="min-h-[90vh] bg-cream flex flex-col items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center w-full max-w-[380px]">

        <p
          className="font-sans text-[12px] text-muted mb-2"
          style={{ ...f(0), letterSpacing: '0.04em' }}
        >
          {answeredCount} responses · pattern identified
        </p>

        <p
          className="font-sans text-[12px] uppercase font-semibold text-muted"
          style={{ ...f(200), letterSpacing: '0.08em', marginBottom: 24 }}
        >
          {isFirst ? 'Your first pattern' : 'Another pattern'}
        </p>

        {/* Blob — fixed 280px container prevents layout shift */}
        <div style={{ height: 280, overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              seed={`ring1-pattern-${traitWord.toLowerCase()}`}
              hueOffset={record.hueOffset}
              word={traitWord}
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
        </div>

        {/* Loading vs loaded content — min-height reserves space so blob doesn't jump */}
        <div style={{ width: '100%', minHeight: 420 }}>
          {isLoading ? (
            <p
              className="font-sans text-[12px] text-muted text-center mt-6"
              style={{ opacity: 0.65 }}
            >
              reading your responses…
            </p>
          ) : (
            <>
              {/* Quote */}
              <p
                className="font-serif italic text-[18px] leading-[1.55] text-charcoal-soft text-center mt-8"
                style={f(0)}
              >
                {content!.trait_quote}
              </p>

              {/* Tags */}
              <div
                className="flex flex-wrap justify-center gap-2 mt-4"
                style={{ ...f(150), marginBottom: 4 }}
              >
                {content!.tags.map((tag) => (
                  <TagPill key={tag} label={tag} />
                ))}
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 w-full mt-6">
                <ContentCard eyebrow="Go deeper" body={content!.go_deeper} delay={300} />
                <ContentCard eyebrow="Worth trying" body={content!.worth_trying} delay={450} />
              </div>
            </>
          )}
        </div>

        {/* Action buttons — shown once content is ready */}
        {!isLoading && (
          <div className="flex flex-col gap-3 w-full mt-6" style={f(1900)}>
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

            <button
              onClick={onReport}
              className="w-full rounded-[10px] py-4 px-5 flex flex-col text-left border border-line"
              style={{ background: '#ffffff' }}
            >
              <span className="font-sans text-[15px] font-medium text-charcoal">
                See what we found
              </span>
              <span className="font-sans text-[12px] text-muted mt-1">
                Go to your report now — you can always come back
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PatternOverlay({
  record,
  onClose,
  onReport,
}: {
  record: CompletedFacetRecord
  onClose: () => void
  onReport: () => void
}) {
  return (
    <div
      className="fixed inset-0 bg-cream overflow-y-auto"
      style={{ zIndex: 4500 }}
    >
      <button
        onClick={onClose}
        className="fixed top-4 left-4 font-sans text-sm text-muted z-[4600]"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        ← Back
      </button>
      <div className="pt-10">
        <PatternDetectedScreen
          record={record}
          isFirst={false}
          onKeepGoing={onClose}
          onReport={onReport}
        />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const router = useRouter()

  const [questionOrder, setQuestionOrder] = useState<number[]>([])
  const [answeredMap, setAnsweredMap] = useState<Map<number, number>>(new Map())
  const [currentIndex, setCurrentIndex] = useState(0)

  // First-pattern full-screen reveal
  const [viewingPattern, setViewingPattern] = useState(false)

  // All completed facets (first + subsequent), in reveal order
  const [completedFacets, setCompletedFacets] = useState<CompletedFacetRecord[]>([])

  // Toast queue for subsequent patterns
  const [activeToast, setActiveToast] = useState<CompletedFacetRecord | null>(null)
  const [toastQueue, setToastQueue] = useState<CompletedFacetRecord[]>([])

  // Overlay when user taps "See it →" on a toast
  const [overlayFacet, setOverlayFacet] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)

  // ── Transition state ───────────────────────────────────────────────────────
  const [questionOpacity, setQuestionOpacity] = useState(1)
  const [creamOpacity, setCreamOpacity] = useState(0)
  const [creamDuration, setCreamDuration] = useState('0.35s')
  const [entryStyle, setEntryStyle] = useState<CSSProperties>({ opacity: 1 })

  useLayoutEffect(() => {
    if (sessionStorage.getItem('known_from') !== 'onboarding') return
    sessionStorage.removeItem('known_from')
    setEntryStyle({ opacity: 0, transform: 'translateY(20px)' })
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setEntryStyle({ opacity: 1, transform: 'translateY(0)', transition: 'opacity 0.45s ease, transform 0.45s ease' })
      })
    })
  }, [])

  // Dequeue next toast when active slot clears
  useEffect(() => {
    if (activeToast === null && toastQueue.length > 0) {
      const [next, ...rest] = toastQueue
      setActiveToast(next)
      setToastQueue(rest)
    }
  }, [activeToast, toastQueue])

  // Restore or initialise session
  useEffect(() => {
    const stored = loadSession()

    // If stored order isn't the full 120-item list the session is from a previous
    // version. Start completely fresh — preserving a stale patternShown would
    // permanently block pattern detection.
    let session: KnownSession
    if (stored.questionOrder.length === TOTAL) {
      session = stored
    } else {
      session = { questionOrder: shuffle(RING1_QUESTIONS.map((q) => q.id)), responses: [] }
      saveSession(session)
    }

    const map = new Map<number, number>()
    for (const r of session.responses) {
      map.set(r.questionId, r.value)
    }

    const answeredSet = new Set(map.keys())
    const firstUnanswered = findFirstUnanswered(session.questionOrder, answeredSet)

    setQuestionOrder(session.questionOrder)
    setAnsweredMap(map)
    setCurrentIndex(firstUnanswered)

    // Rebuild completedFacets from session. revealedFacets tracks all reveals;
    // fall back to patternShown for sessions saved before revealedFacets existed.
    let facetNames: string[] = session.revealedFacets ?? []
    if (facetNames.length === 0 && session.patternShown) {
      facetNames = [session.patternShown.facet]
    }

    if (facetNames.length > 0) {
      const restored: CompletedFacetRecord[] = facetNames.map((facet, idx) => {
        const score = computeFacetScore(facet, map) ?? 3.0
        const word = session.patternShown?.facet === facet
          ? session.patternShown.traitWord
          : getTraitWord(facet, score)
        const dir = scoreDirection(score)
        return { facet, traitWord: word, scoreDirection: dir, hueOffset: idx, answeredCount: map.size, content: null }
      })
      setCompletedFacets(restored)
    }
  }, [])

  // ── Pattern trigger helper ─────────────────────────────────────────────────

  function triggerReveal(
    facet: string,
    traitWord: string,
    dir: 'high' | 'mid' | 'low',
    answeredCount: number,
    session: KnownSession,
    newRevealedFacets: string[]
  ) {
    const hueOffset = newRevealedFacets.length - 1
    const record: CompletedFacetRecord = {
      facet, traitWord, scoreDirection: dir, hueOffset, answeredCount, content: null,
    }

    const isFirst = !session.patternShown

    setCompletedFacets((prev) => {
      if (prev.some((r) => r.facet === facet)) return prev
      return [...prev, record]
    })

    if (isFirst) {
      const patternRecord: PatternRecord = { facet, traitWord, answeredAt: new Date().toISOString() }
      saveSession({ ...session, patternShown: patternRecord, revealedFacets: newRevealedFacets })

      // Transition 2: question fades → cream beat → blob emerges
      setQuestionOpacity(0)
      setTimeout(() => { setCreamDuration('0.35s'); setCreamOpacity(1) }, 500)
      setTimeout(() => { setViewingPattern(true); setQuestionOpacity(1) }, 900)
      setTimeout(() => { setCreamDuration('0.6s'); setCreamOpacity(0) }, 1700)
    } else {
      saveSession({ ...session, revealedFacets: newRevealedFacets })
      setToastQueue((prev) => [...prev, record])
    }

    // Generate AI copy — updates React state and persists to localStorage for report page
    const assessmentId = localStorage.getItem('known_pending_session_id')
    generatePatternCopy(facet, traitWord, dir, assessmentId)
      .then((content: PatternContent) => {
        setCompletedFacets((prev) =>
          prev.map((r) => (r.facet === facet ? { ...r, content } : r))
        )
        setActiveToast((cur) => (cur?.facet === facet ? { ...cur, content } : cur))
        setToastQueue((q) => q.map((r) => (r.facet === facet ? { ...r, content } : r)))
        // Persist so /report can read it without a Supabase fetch
        const s = loadSession()
        const existing = s.patternContents ?? []
        const newEntry: PatternContentEntry = { facet, traitWord, scoreDirection: dir, content }
        saveSession({ ...s, patternContents: [...existing.filter(e => e.facet !== facet), newEntry] })
      })
      .catch(() => {})
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleNext(value: string) {
    const numValue = parseInt(value, 10)
    const questionId = questionOrder[currentIndex]
    if (!questionId) return

    const session = loadSession()
    const responses = session.responses.filter((r) => r.questionId !== questionId)
    responses.push({ questionId, value: numValue, answeredAt: new Date().toISOString() })
    const updatedSession: KnownSession = { ...session, responses }
    saveSession(updatedSession)

    const newMap = new Map(answeredMap)
    newMap.set(questionId, numValue)
    setAnsweredMap(newMap)

    const item = QUESTION_BY_ID.get(questionId)
    if (process.env.NODE_ENV === 'development' && item) {
      const facetItems = FACET_QUESTIONS.get(item.facet) ?? []
      console.log(
        '[pattern check] qId:', questionId,
        '| facet:', item.facet,
        '| facet IDs:', facetItems.map((q) => q.id),
        '| answered:', facetItems.filter((q) => newMap.has(q.id)).map((q) => q.id),
      )
    }

    if (item) {
      const facetItems = FACET_QUESTIONS.get(item.facet) ?? []
      const allAnswered = facetItems.every((q) => newMap.has(q.id))
      const alreadyRevealed = (updatedSession.revealedFacets ?? []).includes(item.facet)

      if (allAnswered && !alreadyRevealed) {
        const score = computeFacetScore(item.facet, newMap)!
        const traitWord = getTraitWord(item.facet, score)
        const dir = scoreDirection(score)
        const newRevealedFacets = [...(updatedSession.revealedFacets ?? []), item.facet]
        triggerReveal(item.facet, traitWord, dir, newMap.size, updatedSession, newRevealedFacets)
      }
    }

    const newAnsweredSet = new Set(newMap.keys())
    const next = findFirstUnanswered(questionOrder, newAnsweredSet, currentIndex + 1)
    setCurrentIndex(next)
  }

  function handleKeepGoing() {
    setViewingPattern(false)
  }

  function handleReport() {
    // Snap cream to full immediately — no animation gap during navigation
    setCreamDuration('0s')
    setCreamOpacity(1)
    requestAnimationFrame(() => {
      sessionStorage.setItem('known_from', 'pattern')
      router.push('/report')
    })
  }

  // Dev shortcut: pre-fill C6 Cautiousness items to reliably produce "Deliberate"
  function handleDevSkip() {
    console.log('[handleDevSkip] called')
    const session = loadSession()
    console.log('[handleDevSkip] patternShown:', session.patternShown ?? 'none')

    // values chosen so avg after reverse-scoring = 3.0 → Mid → "Deliberate"
    // items 117,118,119 are + keyed | item 120 is - keyed: reverse(4) = 2
    const devAnswers: Array<[number, number]> = [
      [117, 3], [118, 4], [119, 3], [120, 4],
    ]

    // Build a clean session with no prior pattern state so we can re-trigger cleanly
    let responses = [...session.responses]
    const sessionBase: KnownSession = { questionOrder: session.questionOrder, responses }
    const newMap = new Map(answeredMap)
    for (const [qId, val] of devAnswers) {
      responses = responses.filter((r) => r.questionId !== qId)
      responses.push({ questionId: qId, value: val, answeredAt: new Date().toISOString() })
      newMap.set(qId, val)
    }

    const freshSession: KnownSession = { ...sessionBase, responses }
    const score = computeFacetScore('Cautiousness', newMap)!
    const traitWord = getTraitWord('Cautiousness', score)
    const dir = scoreDirection(score)

    setAnsweredMap(newMap)
    setCompletedFacets([])
    setViewingPattern(false)

    const newAnsweredSet = new Set(newMap.keys())
    setCurrentIndex(findFirstUnanswered(questionOrder, newAnsweredSet, 0))

    triggerReveal('Cautiousness', traitWord, dir, newMap.size, freshSession, ['Cautiousness'])
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const currentQuestionId = questionOrder[currentIndex]
  const currentQuestion = currentQuestionId ? QUESTION_BY_ID.get(currentQuestionId) : undefined
  const allDone = currentIndex >= TOTAL
  const firstPattern = completedFacets[0] ?? null

  // Overlay record (live — updates when AI content arrives)
  const overlayRecord = overlayFacet
    ? completedFacets.find((r) => r.facet === overlayFacet) ?? null
    : null

  return (
    <>
      {/* Cream overlay for transition 2 (question → pattern) */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: '#F5F2EB',
        opacity: creamOpacity,
        pointerEvents: 'none',
        transition: `opacity ${creamDuration} ease`,
      }} />

      <TopBar answeredCount={answeredMap.size} />

      <div className="pt-14" style={entryStyle}>
        {viewingPattern && firstPattern ? (
          <PatternDetectedScreen
            record={firstPattern}
            isFirst={true}
            onKeepGoing={handleKeepGoing}
            onReport={handleReport}
          />
        ) : allDone ? (
          <div className="min-h-[90vh] bg-cream flex flex-col items-center justify-center px-6 gap-6">
            <p className="font-serif text-[22px] text-charcoal text-center leading-[1.45]">
              That&apos;s everything.
            </p>
            <p className="font-sans text-[13px] text-muted text-center">
              You&apos;ve answered all 120 questions.
            </p>
          </div>
        ) : currentQuestion ? (
          <div style={{ opacity: questionOpacity, transition: 'opacity 0.35s ease' }}>
            <QuestionCard
              key={currentIndex}
              questionNumber={currentIndex + 1}
              totalQuestions={TOTAL}
              question={currentQuestion.text}
              format="dot-scale"
              onNext={handleNext}
              centered={false}
              scaleLabels={['Very Inaccurate', 'Very Accurate']}
            />
          </div>
        ) : null}
      </div>

      {/* Subsequent-pattern toast */}
      {activeToast && (
        <PatternToast
          record={activeToast}
          onDismiss={() => setActiveToast(null)}
          onSeeIt={() => {
            setOverlayFacet(activeToast.facet)
            setActiveToast(null)
          }}
        />
      )}

      {/* Full-screen overlay when user taps "See it" on a toast */}
      {overlayRecord && (
        <PatternOverlay
          record={overlayRecord}
          onClose={() => setOverlayFacet(null)}
          onReport={handleReport}
        />
      )}

      {process.env.NODE_ENV === 'development' && !viewingPattern && !allDone && (
        <button
          onClick={handleDevSkip}
          className="fixed bottom-4 right-4 font-sans text-[11px] text-muted/60 hover:text-muted underline"
        >
          Dev: skip to pattern
        </button>
      )}

      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        questionCount={answeredMap.size}
        context="keep-going"
        onSuccess={() => {}}
      />
    </>
  )
}
