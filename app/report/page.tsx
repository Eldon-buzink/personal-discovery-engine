'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useState } from 'react'
import AnimatedBlob from '@/components/known/AnimatedBlob'
import { computeFacetScore, getTraitWord } from '@/lib/known/scoring'
import type { PatternContent, PatternContentEntry } from '@/lib/known/types'

// ── Local types ────────────────────────────────────────────────────────────────

interface SessionResponse { questionId: number; value: number; answeredAt: string }
interface PatternRecord { facet: string; traitWord: string; answeredAt: string }
interface StoredSession {
  questionOrder?: number[]
  responses?: SessionResponse[]
  patternShown?: PatternRecord
  revealedFacets?: string[]
  patternContents?: PatternContentEntry[]
}

interface FacetEntry {
  facet: string
  traitWord: string
  hueOffset: number
  content: PatternContent | null
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const gray = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal = '#262420'
const cream = '#F7F4ED'
const line = '#E5E1D5'

const sans = 'var(--font-inter), system-ui, sans-serif'
const serif = 'var(--font-newsreader), serif'

// ── Hue helpers (mirrored from AnimatedBlob) ──────────────────────────────────

const curatedHues = [
  { hue: 8 }, { hue: 35 }, { hue: 145 }, { hue: 175 },
  { hue: 205 }, { hue: 235 }, { hue: 290 }, { hue: 335 },
]

function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function userCuratedHue(seedStr: string, offset: number): number {
  const key = seedStr + '-' + offset
  const base = hashSeed(key)
  const bucket = base % curatedHues.length
  const jitter = (hashSeed(key + 'jitter') % 21) - 10
  return (curatedHues[bucket].hue + jitter + 360) % 360
}

// ── Primitives ────────────────────────────────────────────────────────────────

function TagPill({ label, hue = 8 }: { label: string; hue?: number }) {
  return (
    <span style={{
      fontFamily: sans,
      fontSize: 12.5,
      padding: '5px 12px',
      borderRadius: 14,
      border: `1px solid hsl(${hue},40%,75%)`,
      color: charcoalSoft,
      background: 'white',
      whiteSpace: 'nowrap' as const,
    }}>
      {label}
    </span>
  )
}

// ── Mini topbar ───────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 52,
      background: cream,
      borderBottom: `1px solid ${line}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 22px',
      zIndex: 100,
    }}>
      <Link href="/assessment" style={{ fontFamily: sans, fontSize: 13, color: gray, textDecoration: 'none' }}>
        ← Back
      </Link>
      <p style={{ fontFamily: serif, fontSize: 14, fontWeight: 600, color: charcoal, margin: 0 }}>known</p>
      <div style={{ width: 50 }} />
    </header>
  )
}

// ── Blob cluster (dynamic height) ─────────────────────────────────────────────

type BlobPos = { size: number; left: number; top: number }

function getBlobLayout(count: number): { height: number; positions: BlobPos[] } {
  if (count === 1) return {
    height: 180,
    positions: [{ size: 150, left: 105, top: 15 }],
  }
  if (count === 2) return {
    height: 230,
    positions: [
      { size: 150, left: 30,  top: 35 },
      { size: 120, left: 195, top: 50 },
    ],
  }
  if (count === 3) return {
    height: 240,
    positions: [
      { size: 150, left: 105, top: 0  },
      { size: 120, left: 5,   top: 95 },
      { size: 120, left: 230, top: 95 },
    ],
  }
  if (count === 4) return {
    height: 270,
    positions: [
      { size: 150, left: 15,  top: 15  },
      { size: 120, left: 200, top: 25  },
      { size: 120, left: 20,  top: 145 },
      { size: 120, left: 225, top: 145 },
    ],
  }
  return {
    height: 270,
    positions: [
      { size: 150, left: 105, top: 60  },
      { size: 120, left: 10,  top: 10  },
      { size: 120, left: 235, top: 10  },
      { size: 120, left: 10,  top: 140 },
      { size: 120, left: 235, top: 140 },
    ],
  }
}

function BlobCluster({ facets }: { facets: FacetEntry[] }) {
  const visible = facets.slice(0, 5)
  const { height, positions } = getBlobLayout(visible.length)
  return (
    <div style={{ position: 'relative', width: 360, height, margin: '0 auto' }}>
      {visible.map((f, idx) => {
        const { size, left, top } = positions[idx]
        return (
          <div key={f.facet} style={{ position: 'absolute', left, top }}>
            <AnimatedBlob
              seed={`ring1-pattern-${f.traitWord.toLowerCase()}`}
              hueOffset={f.hueOffset}
              size={size}
              baseRadius={Math.round(size * 0.355)}
              word={f.traitWord}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── Secondary pattern card ────────────────────────────────────────────────────

function SecondaryPatternCard({ facet }: { facet: FacetEntry }) {
  const hue = userCuratedHue(`ring1-pattern-${facet.traitWord.toLowerCase()}`, facet.hueOffset)
  return (
    <div style={{
      background: 'white',
      border: `1px solid ${line}`,
      borderRadius: 12,
      padding: 16,
      minWidth: 220,
      maxWidth: 260,
      flexShrink: 0,
      textAlign: 'left',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: `hsl(${hue},55%,55%)`, flexShrink: 0 }} />
        <p style={{ fontFamily: serif, fontSize: 15, fontWeight: 600, color: charcoal, margin: 0 }}>
          {facet.traitWord}
        </p>
      </div>
      {facet.content ? (
        <>
          <p style={{
            fontFamily: sans,
            fontSize: 13,
            color: charcoalSoft,
            lineHeight: 1.55,
            margin: '0 0 10px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {facet.content.trait_quote}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {facet.content.tags.slice(0, 2).map((t) => (
              <TagPill key={t} label={t} hue={hue} />
            ))}
          </div>
        </>
      ) : (
        <p style={{ fontFamily: sans, fontSize: 12, color: gray, margin: 0 }}>Loading…</p>
      )}
    </div>
  )
}

// ── Unlocked content ─────────────────────────────────────────────────────────

function UnlockedContent({ traitWord, content, hue }: { traitWord: string; content: PatternContent; hue: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{
        fontFamily: serif,
        fontSize: 25,
        fontWeight: 600,
        color: charcoal,
        margin: '0 0 6px',
        textAlign: 'center',
      }}>
        {traitWord}
      </h2>

      <p style={{ fontFamily: sans, fontSize: 13, color: gray, marginBottom: 22, textAlign: 'center' }}>
        Your first pattern
      </p>

      <div style={{ maxWidth: 420, margin: '0 auto 24px' }}>
        <p style={{
          fontFamily: serif,
          fontStyle: 'italic',
          fontSize: 17,
          lineHeight: 1.5,
          color: charcoalSoft,
          textAlign: 'center',
        }}>
          {content.trait_quote}
        </p>
      </div>

      <p style={{ fontFamily: sans, fontSize: 12, color: gray, margin: '0 0 24px', textAlign: 'center' }}>
        From your Ring 1 assessment
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: `hsl(${hue},55%,50%)`, flexShrink: 0 }} />
        <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: charcoal, margin: 0 }}>
          Where this shows up
        </p>
      </div>

      <div style={{ maxWidth: 420, margin: '0 auto', marginBottom: 16 }}>
        <p style={{ fontFamily: sans, fontSize: 14.5, lineHeight: 1.7, color: charcoalSoft, textAlign: 'center' }}>
          {content.where_it_shows_up}
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 7, margin: '0 0 26px' }}>
        {content.tags.map((t) => <TagPill key={t} label={t} hue={hue} />)}
      </div>

      <div style={{ display: 'flex', gap: 12, maxWidth: 500, margin: '0 auto 8px' }}>
        <div style={{
          flex: 1,
          background: 'white',
          border: `1px solid ${line}`,
          borderRadius: 12,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}>
          <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 700, margin: '0 0 10px' }}>
            Go deeper
          </p>
          <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: charcoal, margin: '0 0 14px' }}>
            {content.go_deeper}
          </p>
        </div>

        <div style={{
          flex: 1,
          background: '#F3F1EB',
          border: `1px solid ${line}`,
          borderRadius: 12,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}>
          <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 700, margin: '0 0 10px' }}>
            Worth trying
          </p>
          <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: charcoal, margin: 0 }}>
            {content.worth_trying}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Loading / empty states ────────────────────────────────────────────────────

function PatternLoadingState({ traitWord, isLoading }: { traitWord: string; isLoading: boolean }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 28 }}>
      <h2 style={{ fontFamily: serif, fontSize: 25, fontWeight: 600, color: charcoal, margin: '0 0 12px' }}>
        {traitWord}
      </h2>
      <p style={{ fontFamily: sans, fontSize: 13.5, color: gray, lineHeight: 1.6 }}>
        {isLoading ? 'Loading your pattern…' : 'Still loading your pattern. Try refreshing in a moment.'}
      </p>
    </div>
  )
}

// ── Locked card ───────────────────────────────────────────────────────────────

function LockedCard({ branchName }: { branchName: string }) {
  return (
    <div style={{ background: cream, border: `1.5px dashed ${line}`, borderRadius: 14, padding: '32px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 20, marginBottom: 12 }}>🔒</p>
      <p style={{ fontFamily: sans, fontSize: 13, color: charcoalSoft, marginBottom: 20 }}>
        Complete <strong style={{ color: charcoal }}>{branchName}</strong> to unlock this section
      </p>
      <Link href="/assessment">
        <button style={{ background: charcoal, color: cream, borderRadius: 10, padding: '12px 24px', fontSize: 13.5, fontFamily: sans, fontWeight: 500, cursor: 'pointer', border: 'none' }}>
          Start {branchName}
        </button>
      </Link>
    </div>
  )
}

// ── Section divider ───────────────────────────────────────────────────────────

function WhatsnextDivider() {
  return (
    <div style={{ borderTop: `1px solid ${line}`, padding: '44px 0 28px', marginTop: 40, textAlign: 'center' }}>
      <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: gray, fontWeight: 600, margin: '0 0 10px' }}>
        {"What's next"}
      </p>
      <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 15, color: charcoalSoft, maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
        Your patterns suggest somewhere worth exploring next.
      </p>
    </div>
  )
}

// ── What's next cards ─────────────────────────────────────────────────────────

function ContinueRing1Card({ totalAnswered }: { totalAnswered: number }) {
  return (
    <div style={{ background: charcoal, borderRadius: 14, padding: '20px 22px', textAlign: 'center' }}>
      <p style={{ fontFamily: sans, fontSize: 11, textTransform: 'uppercase', color: 'rgba(247,244,237,0.6)', fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.05em' }}>
        Ring 1
      </p>
      <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: cream, margin: 0, lineHeight: 1.3 }}>
        Keep discovering
      </p>
      <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: 'rgba(247,244,237,0.8)', marginTop: 8 }}>
        {"You've answered"} {totalAnswered} of 120 questions. More patterns may still surface.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <Link href="/assessment">
          <button style={{ background: 'white', color: charcoal, borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: sans }}>
            Continue →
          </button>
        </Link>
      </div>
    </div>
  )
}

function BranchSuggestionCard({ onStartEnvironment }: { onStartEnvironment: () => void }) {
  return (
    <div style={{
      padding: 2,
      borderRadius: 16,
      background: 'linear-gradient(135deg, hsl(175,65%,55%), hsl(205,65%,60%), hsl(235,60%,65%), hsl(290,55%,60%), hsl(8,65%,60%), hsl(35,70%,58%))',
      backgroundSize: '300% 300%',
      animation: 'gradientRotate 4s ease infinite',
      boxShadow: '0 0 20px 2px hsla(175,65%,55%,0.25), 0 0 40px 4px hsla(205,65%,60%,0.15)',
    }}>
      <div style={{ background: 'white', borderRadius: 14, padding: '20px 22px', textAlign: 'center' }}>
        <p style={{ fontFamily: sans, fontSize: 11, textTransform: 'uppercase', color: gray, fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.05em' }}>
          Your environment
        </p>
        <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: charcoal, margin: 0, lineHeight: 1.3 }}>
          There might be something here
        </p>
        <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, lineHeight: 1.6, marginTop: 8 }}>
          Based on what we found so far, your environment might be worth exploring.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button
            onClick={onStartEnvironment}
            style={{ background: charcoal, color: cream, borderRadius: 8, padding: '10px 18px', fontSize: 13, fontFamily: sans, fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            Start Your environment →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const [facets, setFacets] = useState<FacetEntry[]>([])
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [ring1Complete, setRing1Complete] = useState(false)
  const [showEnvToast, setShowEnvToast] = useState(false)

  function handleStartEnvironment() {
    setShowEnvToast(true)
    setTimeout(() => setShowEnvToast(false), 3000)
  }

  // Transition 3 entry: cream covers navigation gap, then fades out over 600ms
  const [entryCream, setEntryCream] = useState(0)

  useLayoutEffect(() => {
    if (sessionStorage.getItem('known_from') !== 'pattern') return
    sessionStorage.removeItem('known_from')
    // Snap cream to full (no transition) — content fully loaded underneath
    setEntryCream(1)
    // Two frames later: cream fades out revealing the report
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setEntryCream(0)
      })
    })
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('known_session')

    console.log('[report] known_session raw:', raw)
    if (!raw) {
      console.log('[report] no session found')
      return
    }

    let session: StoredSession
    try { session = JSON.parse(raw) } catch { return }

    console.log('[report] session:', session)

    const responses = Array.isArray(session.responses) ? session.responses : []
    const answeredMap = new Map<number, number>(responses.map((r) => [r.questionId, r.value]))
    const total = responses.length
    setTotalAnswered(total)
    setRing1Complete(total >= 120)

    // patternContents array is the primary source; fall back for old sessions
    const pcArray = Array.isArray(session.patternContents) ? session.patternContents : []
    const hasLocalContent = pcArray.length > 0

    // Collect facet names: prefer patternContents, then revealedFacets, then patternShown
    let facetNames: string[] = []
    if (pcArray.length > 0) {
      facetNames = pcArray.map((e) => e.facet)
    } else if (Array.isArray(session.revealedFacets) && session.revealedFacets.length > 0) {
      facetNames = session.revealedFacets
    } else if (session.patternShown) {
      facetNames = [session.patternShown.facet]
    }

    console.log('[report] facetNames:', facetNames, '| hasLocalContent:', hasLocalContent)
    if (facetNames.length === 0) return

    const pcByFacet = new Map(pcArray.map((e) => [e.facet, e]))

    const initial: FacetEntry[] = facetNames.map((facet, idx) => {
      const pc = pcByFacet.get(facet)
      const score = computeFacetScore(facet, answeredMap) ?? 3.0
      const traitWord =
        pc?.traitWord ||
        (session.patternShown?.facet === facet ? session.patternShown!.traitWord : getTraitWord(facet, score))
      return { facet, traitWord, hueOffset: idx, content: pc?.content ?? null }
    })
    setFacets(initial)
  }, [])

  const isUnlocked = facets.length > 0
  const primaryFacet = facets[0] ?? null
  const hasContent = primaryFacet?.content != null
  const primaryHue = primaryFacet
    ? userCuratedHue(`ring1-pattern-${primaryFacet.traitWord.toLowerCase()}`, primaryFacet.hueOffset)
    : 8
  console.log('[report] primaryHue:', primaryHue, '| traitWord:', primaryFacet?.traitWord, '| hueOffset:', primaryFacet?.hueOffset)

  return (
    <>
      {/* Entry cream overlay for transition 3 — bridges navigation gap */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: '#F5F2EB',
        opacity: entryCream,
        pointerEvents: 'none',
        transition: entryCream === 1 ? 'none' : 'opacity 0.6s ease',
      }} />

      <TopBar />

      <div style={{ background: cream, minHeight: '100vh', paddingTop: 52 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 22px 100px' }}>

          {/* ── Intro ─────────────────────────────────────── */}
          <div style={{ padding: '36px 0 30px', textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 12 }}>
              Your report
            </p>
            <h1 style={{ fontFamily: serif, fontSize: 27, fontWeight: 500, lineHeight: 1.3, color: charcoal, margin: '0 0 12px' }}>
              Everything found so far.
            </h1>
            <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
              All patterns surface here as you explore.
            </p>
          </div>

          {/* ── Branch 1: Who you are ──────────────────────── */}
          <section style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
              Who you are
            </p>

            {isUnlocked ? (
              <>
                <BlobCluster facets={facets} />

                <div style={{ marginTop: 28 }}>
                  {hasContent ? (
                    <UnlockedContent
                      traitWord={primaryFacet!.traitWord}
                      content={primaryFacet!.content!}
                      hue={primaryHue}
                    />
                  ) : (
                    <PatternLoadingState
                      traitWord={primaryFacet!.traitWord}
                      isLoading={true}
                    />
                  )}
                </div>

                {/* Secondary pattern cards — shown when more than one pattern exists */}
                {facets.length > 1 && (
                  <div style={{ marginTop: 32, marginLeft: -22, marginRight: -22 }}>
                    <p style={{ fontFamily: sans, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: gray, fontWeight: 600, marginBottom: 12, paddingLeft: 22, textAlign: 'left' }}>
                      Other patterns
                    </p>
                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 22, paddingRight: 22, paddingBottom: 4 }}>
                      {facets.slice(1).map((f) => (
                        <SecondaryPatternCard key={f.facet} facet={f} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Only show What's next when primary content is ready */}
                {hasContent && (
                  <>
                    <WhatsnextDivider />
                    {ring1Complete ? (
                      <BranchSuggestionCard onStartEnvironment={handleStartEnvironment} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <ContinueRing1Card totalAnswered={totalAnswered} />
                        <BranchSuggestionCard onStartEnvironment={handleStartEnvironment} />
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <LockedCard branchName="Ring 1" />
            )}
          </section>

          {/* ── Footer ────────────────────────────────────── */}
          <footer style={{ marginTop: 64, paddingTop: 28, borderTop: `1px solid ${line}`, textAlign: 'center' }}>
            <p style={{ fontFamily: serif, fontSize: 14, color: charcoal, marginBottom: 6 }}>known</p>
            <p style={{ fontFamily: sans, fontSize: 11.5, color: gray }}>
              A living report — it grows as you keep exploring.
            </p>
          </footer>

        </div>
      </div>

      {/* Environment branch coming-soon toast */}
      {showEnvToast && (
        <div style={{
          position: 'fixed',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          background: charcoal,
          color: cream,
          borderRadius: 10,
          padding: '13px 20px',
          fontFamily: sans,
          fontSize: 13.5,
          lineHeight: 1.5,
          textAlign: 'center',
          maxWidth: 340,
          width: 'calc(100% - 48px)',
          zIndex: 1000,
          animation: 'slideUp 0.3s ease both',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        }}>
          Branch assessments are coming soon. Keep going with Ring 1 for now.
        </div>
      )}
    </>
  )
}
