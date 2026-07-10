'use client'

import Link from 'next/link'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  branchResponses?: { environment?: { answers: unknown[]; completed?: boolean } }
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

// ── Hue helpers ───────────────────────────────────────────────────────────────

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

// ── Blob engine ───────────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface MotionPoint { phase: number; freq: number; ampScale: number }

function buildPointMotionProfile(seed: number, points: number): MotionPoint[] {
  const rand = seededRandom(seed)
  const profile: MotionPoint[] = []
  for (let i = 0; i < points; i++) {
    profile.push({ phase: rand() * Math.PI * 2, freq: 0.4 + rand() * 0.5, ampScale: 0.7 + rand() * 0.6 })
  }
  return profile
}

interface Pt { x: number; y: number }

function generateAnimatedBlobPath(
  cx: number, cy: number, baseRadius: number,
  profile: MotionPoint[], irregularity: number, t: number,
): string {
  const n = profile.length
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = i * (Math.PI * 2) / n
    const p = profile[i]
    const r = baseRadius * (1 + Math.sin(t * p.freq + p.phase) * irregularity * p.ampScale)
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  function ctb(p0: Pt, p1: Pt, p2: Pt, p3: Pt) {
    return {
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      end: p2,
    }
  }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `
  for (let i = 0; i < n; i++) {
    const seg = ctb(pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n])
    d += `C ${seg.c1.x.toFixed(1)} ${seg.c1.y.toFixed(1)}, ${seg.c2.x.toFixed(1)} ${seg.c2.y.toFixed(1)}, ${seg.end.x.toFixed(1)} ${seg.end.y.toFixed(1)} `
  }
  return d + 'Z'
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
      top: 0, left: 0, right: 0,
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

// ── Interactive blob cluster ───────────────────────────────────────────────────

const CLUSTER_OFFSETS = [
  { dx:   0, dy:   0 },
  { dx: -80, dy: -40 },
  { dx:  75, dy: -45 },
  { dx: -85, dy:  45 },
  { dx:  80, dy:  50 },
]

function InteractiveCluster({
  facets,
  activeIdx,
  onSelect,
}: {
  facets: FacetEntry[]
  activeIdx: number
  onSelect: (i: number) => void
}) {
  const uid = useId().replace(/:/g, '')
  const fid = `ccf-${uid}`

  const startRef = useRef<number | null>(null)
  const pathRefs = useRef<(SVGPathElement | null)[]>([])

  const renderItems = useMemo(() => {
    const cxBase = 250, cyBase = 130
    const count = Math.min(facets.length, 5)
    const order = Array.from({ length: count }, (_, i) => i)
      .sort((a, b) => (a === activeIdx ? 1 : 0) - (b === activeIdx ? 1 : 0))
    return order.map((i) => {
      const f = facets[i]
      const isActive = i === activeIdx
      const hue = userCuratedHue(`ring1-pattern-${f.traitWord.toLowerCase()}`, f.hueOffset)
      const off = isActive
        ? CLUSTER_OFFSETS[0]
        : CLUSTER_OFFSETS[(i + (i > activeIdx ? 0 : 1)) % CLUSTER_OFFSETS.length]
      const cx = cxBase + off.dx
      const cy = cyBase + off.dy
      const radius = isActive ? 82 : 58
      const profile = buildPointMotionProfile(hashSeed(f.traitWord + '-shape'), 9)
      return { facetIdx: i, isActive, hue, cx, cy, radius, profile, word: f.traitWord }
    })
  }, [facets, activeIdx])

  useEffect(() => {
    let raf: number
    function tick(now: number) {
      if (startRef.current === null) startRef.current = now
      const t = (now - startRef.current) / 1000
      renderItems.forEach((b) => {
        pathRefs.current[b.facetIdx]?.setAttribute(
          'd',
          generateAnimatedBlobPath(b.cx, b.cy, b.radius, b.profile, 0.3, t),
        )
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [renderItems])

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox="0 0 500 270"
        width="100%"
        height={270}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="11" />
          </filter>
          {renderItems.map((b) => (
            <radialGradient key={b.facetIdx} id={`ccg-${uid}-${b.facetIdx}`} cx="45%" cy="40%" r="70%">
              {b.isActive ? (
                <>
                  <stop offset="0%"   stopColor={`hsl(${b.hue},80%,62%)`} stopOpacity="1"    />
                  <stop offset="45%"  stopColor={`hsl(${b.hue},78%,60%)`} stopOpacity="0.88" />
                  <stop offset="75%"  stopColor={`hsl(${b.hue},70%,68%)`} stopOpacity="0.4"  />
                  <stop offset="100%" stopColor={`hsl(${b.hue},60%,80%)`} stopOpacity="0"    />
                </>
              ) : (
                <>
                  <stop offset="0%"   stopColor={`hsl(${b.hue},60%,76%)`} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={`hsl(${b.hue},55%,85%)`} stopOpacity="0"   />
                </>
              )}
            </radialGradient>
          ))}
        </defs>
        {renderItems.map((b) => (
          <path
            key={b.facetIdx}
            ref={(el) => { pathRefs.current[b.facetIdx] = el }}
            d={generateAnimatedBlobPath(b.cx, b.cy, b.radius, b.profile, 0.3, 0)}
            fill={`url(#ccg-${uid}-${b.facetIdx})`}
            filter={`url(#${fid})`}
            style={{ cursor: b.isActive ? 'default' : 'pointer', pointerEvents: b.isActive ? 'none' : 'all' }}
            onClick={() => onSelect(b.facetIdx)}
          />
        ))}
      </svg>
      {renderItems.map((b) => (
        <div
          key={b.facetIdx}
          style={{
            position: 'absolute',
            left: `${(b.cx / 500) * 100}%`,
            top: `${(b.cy / 270) * 100}%`,
            transform: 'translate(-50%,-50%)',
            fontFamily: serif,
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: b.isActive ? 22 : 12,
            color: b.isActive ? `hsl(${b.hue},45%,24%)` : charcoalSoft,
            zIndex: 5,
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          {b.word}
        </div>
      ))}
    </div>
  )
}

// ── Orbit cluster (Where you thrive) ──────────────────────────────────────────

const ORBIT_R = 92
const OCX = 250
const OCY = 125

interface OrbitCondition { traitWord: string; hue: number }

function OrbitCluster({
  conditions,
  primaryTraitWord,
  primaryHue,
  activeIdx,
  onSelect,
}: {
  conditions: OrbitCondition[]
  primaryTraitWord: string
  primaryHue: number
  activeIdx: number
  onSelect: (i: number) => void
}) {
  const uid = useId().replace(/:/g, '')
  const fid = `ocf-${uid}`
  const startRef = useRef<number | null>(null)
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const count = conditions.length

  const renderItems = useMemo(() => {
    if (count === 0) {
      return [{ idx: 0, isActive: true, weak: true, hue: primaryHue, cx: OCX, cy: OCY, radius: 72, profile: buildPointMotionProfile(hashSeed(primaryTraitWord + '-env-weak'), 8), word: primaryTraitWord }]
    }
    if (count === 1) {
      return [{ idx: 0, isActive: true, weak: false, hue: conditions[0].hue, cx: OCX, cy: OCY, radius: 82, profile: buildPointMotionProfile(hashSeed(conditions[0].traitWord + '-env-shape'), 8), word: conditions[0].traitWord }]
    }
    return conditions.map((c, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2
      const cx = OCX + Math.cos(angle) * ORBIT_R
      const cy = OCY + Math.sin(angle) * ORBIT_R
      const isActive = i === activeIdx
      return { idx: i, isActive, weak: false, hue: c.hue, cx, cy, radius: isActive ? 54 : 36, profile: buildPointMotionProfile(hashSeed(c.traitWord + '-env-shape'), 8), word: c.traitWord }
    })
  }, [conditions, activeIdx, primaryTraitWord, primaryHue, count])

  useEffect(() => {
    let raf: number
    function tick(now: number) {
      if (startRef.current === null) startRef.current = now
      const t = (now - startRef.current) / 1000
      renderItems.forEach((b) => {
        pathRefs.current[b.idx]?.setAttribute('d', generateAnimatedBlobPath(b.cx, b.cy, b.radius, b.profile, 0.28, t))
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [renderItems])

  const isOrbit = count >= 2

  return (
    <div style={{ position: 'relative', height: 260 }}>
      {/* Orbit ring — multi-condition only */}
      {isOrbit && (
        <div style={{
          position: 'absolute', left: '50%', top: OCY,
          width: ORBIT_R * 2, height: ORBIT_R * 2, borderRadius: '50%',
          border: `1px dashed ${line}`, transform: 'translate(-50%, -50%)', pointerEvents: 'none',
        }} />
      )}

      {/* "You" dot — orbit center for multi, inside blob for single/none */}
      <div style={{
        position: 'absolute', left: '50%', top: OCY,
        transform: 'translate(-50%, -50%)',
        zIndex: 10, pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: isOrbit ? 30 : 24, height: isOrbit ? 30 : 24, borderRadius: '50%',
          background: charcoal, border: `${isOrbit ? 4 : 3}px solid #F7F4ED`, boxShadow: `0 0 0 1px ${line}`,
        }} />
        <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, color: charcoalSoft, marginTop: 6 }}>You</span>
      </div>

      {/* Blobs */}
      <svg viewBox="0 0 500 260" width="100%" height={260} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', display: 'block' }}>
        <defs>
          <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          {renderItems.map((b) => (
            <radialGradient key={b.idx} id={`ocg-${uid}-${b.idx}`} cx="45%" cy="40%" r="70%">
              {b.isActive && !b.weak ? (
                <>
                  <stop offset="0%"   stopColor={`hsl(${b.hue},80%,62%)`} stopOpacity="1"    />
                  <stop offset="50%"  stopColor={`hsl(${b.hue},78%,60%)`} stopOpacity="0.85" />
                  <stop offset="80%"  stopColor={`hsl(${b.hue},65%,70%)`} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={`hsl(${b.hue},55%,82%)`} stopOpacity="0"    />
                </>
              ) : (
                <>
                  <stop offset="0%"   stopColor={`hsl(${b.hue},${b.weak ? 50 : 55}%,${b.weak ? 76 : 78}%)`} stopOpacity={b.weak ? '0.5' : '0.55'} />
                  <stop offset="100%" stopColor={`hsl(${b.hue},50%,86%)`} stopOpacity="0" />
                </>
              )}
            </radialGradient>
          ))}
        </defs>
        {renderItems.map((b) => (
          <path
            key={b.idx}
            ref={(el) => { pathRefs.current[b.idx] = el }}
            d={generateAnimatedBlobPath(b.cx, b.cy, b.radius, b.profile, 0.28, 0)}
            fill={`url(#ocg-${uid}-${b.idx})`}
            filter={`url(#${fid})`}
            style={{
              opacity: b.weak ? 0.6 : 1,
              cursor: isOrbit && !b.isActive ? 'pointer' : 'default',
              pointerEvents: isOrbit && !b.isActive ? 'all' : 'none',
            }}
            onClick={() => isOrbit && onSelect(b.idx)}
          />
        ))}
      </svg>

      {/* Labels */}
      {renderItems.map((b) => {
        const topPct = isOrbit
          ? (b.cy / 260) * 100
          : ((b.cy + b.radius + 14) / 260) * 100
        return (
          <div
            key={b.idx}
            style={{
              position: 'absolute',
              left: `${(b.cx / 500) * 100}%`,
              top: `${topPct}%`,
              transform: isOrbit ? 'translate(-50%, -50%)' : 'translate(-50%, 0)',
              fontFamily: serif, fontStyle: 'italic', fontWeight: 500,
              fontSize: isOrbit ? (b.isActive ? 14 : 10.5) : 13,
              color: b.weak ? gray : `hsl(${b.hue},50%,26%)`,
              zIndex: 5, pointerEvents: 'none', textAlign: 'center',
            }}
          >
            {b.word}
          </div>
        )
      })}

      {/* Tagline for no-strong-conditions */}
      {count === 0 && (
        <p style={{
          position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
          fontFamily: serif, fontStyle: 'italic', fontSize: 12.5, color: gray,
          textAlign: 'center', width: 260, margin: 0, pointerEvents: 'none',
        }}>
          A subtle lean — not a strong signal either way
        </p>
      )}
    </div>
  )
}

// ── Unlocked content ─────────────────────────────────────────────────────────

function UnlockedContent({
  traitWord, content, hue,
  subtitle = 'Your first pattern',
  source = 'From your Ring 1 assessment',
}: {
  traitWord: string
  content: PatternContent
  hue: number
  subtitle?: string
  source?: string
}) {
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
        {subtitle}
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
        {source}
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
          flex: 1, background: 'white', border: `1px solid ${line}`, borderRadius: 12, padding: 18,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        }}>
          <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 700, margin: '0 0 10px' }}>
            Go deeper
          </p>
          <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: charcoal, margin: '0 0 14px' }}>
            {content.go_deeper}
          </p>
        </div>

        <div style={{
          flex: 1, background: '#F3F1EB', border: `1px solid ${line}`, borderRadius: 12, padding: 18,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
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

function LockedCard({ branchName, href = '/assessment' }: { branchName: string; href?: string }) {
  return (
    <div style={{ background: cream, border: `1.5px dashed ${line}`, borderRadius: 14, padding: '32px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 20, marginBottom: 12 }}>🔒</p>
      <p style={{ fontFamily: sans, fontSize: 13, color: charcoalSoft, marginBottom: 20 }}>
        Complete <strong style={{ color: charcoal }}>{branchName}</strong> to unlock this section
      </p>
      <Link href={href}>
        <button style={{ background: charcoal, color: cream, borderRadius: 10, padding: '12px 24px', fontSize: 13.5, fontFamily: sans, fontWeight: 500, cursor: 'pointer', border: 'none' }}>
          Start {branchName}
        </button>
      </Link>
    </div>
  )
}

// ── Section dividers ──────────────────────────────────────────────────────────

function SectionDivider({ marker, body }: { marker: string; body: string }) {
  return (
    <div style={{ borderTop: `1px solid ${line}`, padding: '44px 0 28px', marginTop: 40, textAlign: 'center' }}>
      <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: gray, fontWeight: 600, margin: '0 0 10px' }}>
        {marker}
      </p>
      <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 15, color: charcoalSoft, maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
        {body}
      </p>
    </div>
  )
}

function WhatsnextDivider() {
  return (
    <SectionDivider
      marker="What's next"
      body="Your patterns suggest somewhere worth exploring next."
    />
  )
}

// ── What's next cards ─────────────────────────────────────────────────────────

function Ring1CompleteCard() {
  return (
    <div style={{ background: charcoal, borderRadius: 14, padding: '20px 22px', textAlign: 'center' }}>
      <p style={{ fontFamily: sans, fontSize: 11, textTransform: 'uppercase', color: 'rgba(247,244,237,0.6)', fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.05em' }}>
        Ring 1
      </p>
      <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: cream, margin: 0, lineHeight: 1.3 }}>
        Ring 1 complete
      </p>
      <p style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: 'rgba(247,244,237,0.8)', marginTop: 8 }}>
        {"You've answered all 120 questions. Your full pattern is mapped."}
      </p>
    </div>
  )
}

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

function BranchSuggestionCard() {
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
          <Link href="/assessment/environment">
            <button style={{ background: charcoal, color: cream, borderRadius: 8, padding: '10px 18px', fontSize: 13, fontFamily: sans, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Start Your environment →
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Sticky bottom bar ─────────────────────────────────────────────────────────

function StickyBar({ leftText, rightLabel, rightHref }: { leftText: string; rightLabel: string; rightHref: string }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 64, background: cream, borderTop: `1px solid ${line}`,
      zIndex: 100, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 28px',
    }}>
      <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 16, color: charcoalSoft, margin: 0 }}>
        {leftText}
      </p>
      <Link href={rightHref} style={{ textDecoration: 'none' }}>
        <div style={{
          padding: 2,
          borderRadius: 100,
          background: 'linear-gradient(135deg, hsl(175,65%,55%), hsl(205,65%,60%), hsl(235,60%,65%), hsl(290,55%,60%), hsl(8,65%,60%), hsl(35,70%,58%))',
          backgroundSize: '300% 300%',
          animation: 'gradientRotate 4s ease infinite',
          boxShadow: '0 0 20px 2px hsla(175,65%,55%,0.25), 0 0 40px 4px hsla(205,65%,60%,0.15)',
        }}>
          <button style={{
            fontFamily: sans, fontSize: 13, fontWeight: 500, color: charcoal,
            padding: '10px 20px', border: 'none', borderRadius: 100,
            background: cream, cursor: 'pointer',
          }}>
            {rightLabel}
          </button>
        </div>
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const [facets, setFacets] = useState<FacetEntry[]>([])
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [ring1Complete, setRing1Complete] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [envEntry, setEnvEntry] = useState<PatternContentEntry | null>(null)
  const [activeEnvIdx, setActiveEnvIdx] = useState(0)
  const [relEntry, setRelEntry] = useState<PatternContentEntry | null>(null)

  const [entryCream, setEntryCream] = useState(0)

  useLayoutEffect(() => {
    if (sessionStorage.getItem('known_from') !== 'pattern') return
    sessionStorage.removeItem('known_from')
    setEntryCream(1)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { setEntryCream(0) })
    })
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('known_session')
    if (!raw) return

    let session: StoredSession
    try { session = JSON.parse(raw) } catch { return }

    const responses = Array.isArray(session.responses) ? session.responses : []
    const answeredMap = new Map<number, number>(responses.map((r) => [r.questionId, r.value]))
    const total = responses.length
    setTotalAnswered(total)
    setRing1Complete(total >= 120)

    const pcArray = Array.isArray(session.patternContents) ? session.patternContents : []
    const envPc = pcArray.find(e => e.branch === 'environment') ?? null
    const relPc = pcArray.find(e => e.branch === 'relationships') ?? null
    const ring1Pcs = pcArray.filter(e => e.branch !== 'environment' && e.branch !== 'relationships')
    setEnvEntry(envPc)
    setRelEntry(relPc)

    let facetNames: string[] = []
    if (ring1Pcs.length > 0) {
      facetNames = ring1Pcs.map((e) => e.facet)
    } else if (Array.isArray(session.revealedFacets) && session.revealedFacets.length > 0) {
      facetNames = session.revealedFacets
    } else if (session.patternShown) {
      facetNames = [session.patternShown.facet]
    }

    if (facetNames.length === 0) return

    const pcByFacet = new Map(ring1Pcs.map((e) => [e.facet, e]))

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
  const safeIdx = Math.min(activeIdx, Math.max(0, facets.length - 1))
  const activeFacet = facets[safeIdx] ?? null
  const hasContent = facets[0]?.content != null
  const activeHue = activeFacet
    ? userCuratedHue(`ring1-pattern-${activeFacet.traitWord.toLowerCase()}`, activeFacet.hueOffset)
    : 8

  const suggestRelationships = !!relEntry || ((envEntry?.dimensionScores?.autonomy ?? 0) > 3.5)

  const nextBranchLabel = !envEntry && isUnlocked
    ? 'Your environment'
    : suggestRelationships && !relEntry
    ? 'How I connect'
    : undefined
  const nextBranchHref = !envEntry && isUnlocked
    ? '/assessment/environment'
    : suggestRelationships && !relEntry
    ? '/assessment/relationships'
    : undefined

  const stickyBar: { leftText: string; rightLabel: string; rightHref: string } | null =
    !isUnlocked || (ring1Complete && !nextBranchLabel)
      ? null
      : ring1Complete
      ? { leftText: 'Ready to go deeper.', rightLabel: `Start ${nextBranchLabel!} →`, rightHref: nextBranchHref! }
      : nextBranchLabel
      ? { leftText: "There's more to find.", rightLabel: `Start ${nextBranchLabel} →`, rightHref: nextBranchHref! }
      : { leftText: "There's more underneath this.", rightLabel: 'Continue Ring 1 →', rightHref: '/assessment' }

  return (
    <>
      {/* Entry cream overlay for transition 3 */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: '#F5F2EB',
        opacity: entryCream,
        pointerEvents: 'none',
        transition: entryCream === 1 ? 'none' : 'opacity 0.6s ease',
      }} />

      <TopBar />
      {stickyBar && <StickyBar {...stickyBar} />}

      <div style={{ background: cream, minHeight: '100vh', paddingTop: 52 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 22px 64px' }}>

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
                <InteractiveCluster facets={facets} activeIdx={safeIdx} onSelect={setActiveIdx} />

                <div style={{ marginTop: 28 }}>
                  {activeFacet?.content ? (
                    <UnlockedContent
                      traitWord={activeFacet.traitWord}
                      content={activeFacet.content}
                      hue={activeHue}
                    />
                  ) : (
                    <PatternLoadingState
                      traitWord={activeFacet?.traitWord ?? ''}
                      isLoading={true}
                    />
                  )}
                </div>

                {hasContent && (
                  <>
                    <WhatsnextDivider />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {ring1Complete ? <Ring1CompleteCard /> : <ContinueRing1Card totalAnswered={totalAnswered} />}
                      {!envEntry && <BranchSuggestionCard />}
                    </div>
                  </>
                )}
              </>
            ) : (
              <LockedCard branchName="Ring 1" />
            )}
          </section>

          {/* ── Branch 2: Where you thrive ────────────────── */}
          {isUnlocked && (() => {
            const envHue = envEntry
              ? userCuratedHue(`env-pattern-${envEntry.traitWord.toLowerCase().replace(/\s+/g, '-')}`, 0)
              : 8
            // Derive orbit conditions from stored strongConditions; fall back to single-item
            // for older entries that don't have strongConditions stored
            const envConditions: OrbitCondition[] = envEntry
              ? (envEntry.strongConditions?.map(sc => ({
                  traitWord: sc.traitWord,
                  hue: userCuratedHue(`env-pattern-${sc.traitWord.toLowerCase().replace(/\s+/g, '-')}`, 0),
                })) ?? [{ traitWord: envEntry.traitWord, hue: envHue }])
              : []
            return (
              <>
                <SectionDivider
                  marker="Who you are → Where you thrive"
                  body={"That's what's true on your own. The next part is about what's true around you."}
                />

                <section style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
                    Where you thrive
                  </p>

                  {envEntry ? (
                    <>
                      <OrbitCluster
                        conditions={envConditions}
                        primaryTraitWord={envEntry.traitWord}
                        primaryHue={envHue}
                        activeIdx={activeEnvIdx}
                        onSelect={setActiveEnvIdx}
                      />
                      <div style={{ marginTop: 20 }}>
                        {envEntry.content ? (
                          <UnlockedContent
                            traitWord={envEntry.traitWord}
                            content={envEntry.content}
                            hue={envHue}
                            subtitle="Your environment pattern"
                            source="From your environment branch"
                          />
                        ) : (
                          <PatternLoadingState traitWord={envEntry.traitWord} isLoading={true} />
                        )}
                      </div>
                    </>
                  ) : (
                    <LockedCard branchName="Your environment" href="/assessment/environment" />
                  )}
                </section>

                {suggestRelationships && (
                  <SectionDivider
                    marker="Where you thrive → How I connect"
                    body="Conditions are one thing. This part is about what happens when someone else is in the room."
                  />
                )}
              </>
            )
          })()}

          {/* ── Footer ────────────────────────────────────── */}
          <footer style={{ marginTop: 64, paddingTop: 28, borderTop: `1px solid ${line}`, textAlign: 'center' }}>
            <p style={{ fontFamily: serif, fontSize: 14, color: charcoal, marginBottom: 6 }}>known</p>
            <p style={{ fontFamily: sans, fontSize: 11.5, color: gray }}>
              A living report — it grows as you keep exploring.
            </p>
          </footer>

        </div>
      </div>

    </>
  )
}
