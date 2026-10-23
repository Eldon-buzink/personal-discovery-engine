'use client'

// The report page's section dividers and "What's next" cards, shared by
// app/report/page.tsx and the example report (app/report/example), so the
// example shows the same components a real report does.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/known/AuthModal'
import type { Branch } from '@/lib/known/branchSuggestion'
import { type } from '@/lib/design/type'

const charcoalSoft = '#56534D'
const charcoal = '#262420'
const cream = '#F7F4ED'
const line = '#E5E1D5'

// ── Section dividers ──────────────────────────────────────────────────────────

export function SectionDivider({ marker, body }: { marker?: string; body: string }) {
  return (
    <div style={{ borderTop: `1px solid ${line}`, padding: '44px 0 28px', marginTop: 40, textAlign: 'center' }}>
      {marker && (
        <p style={{ ...type.meta, margin: '0 0 10px' }}>
          {marker}
        </p>
      )}
      <p style={{ ...type.body, color: charcoalSoft, maxWidth: 360, margin: '0 auto' }}>
        {body}
      </p>
    </div>
  )
}

export function WhatsnextDivider() {
  return (
    <SectionDivider
      marker="What's next"
      body="Your patterns suggest somewhere worth exploring next."
    />
  )
}

// ── What's next cards ─────────────────────────────────────────────────────────

export function Ring1CompleteCard() {
  return (
    <div style={{ background: charcoal, borderRadius: 14, padding: '20px 22px', textAlign: 'center' }}>
      <p style={{ ...type.display4, color: cream, margin: 0 }}>
        Fully mapped.
      </p>
      <p style={{ ...type.body, color: 'rgba(247,244,237,0.85)', marginTop: 8 }}>
        {"You've answered all 120 questions. Your full pattern is mapped."}
      </p>
    </div>
  )
}

// Points people from the report to their practice. Practice needs an
// account, so signed out it opens the save-progress sign-in first.
export function PracticeCard({ isAuthenticated, href, label = 'Go to your practice →' }: { isAuthenticated: boolean; href?: string; /** Button wording; the CTA flag drops the arrow to match the bar. */ label?: string }) {
  const router = useRouter()
  const [authOpen, setAuthOpen] = useState(false)
  return (
    <div style={{ background: 'white', border: `1px solid ${line}`, borderRadius: 14, padding: '20px 22px', textAlign: 'center' }}>
      <p style={{ ...type.display4, color: charcoal, margin: 0 }}>
        Put it into practice
      </p>
      <p style={{ ...type.body, color: charcoalSoft, marginTop: 8 }}>
        Pick a few traits to check in on for a moment each day, and see how they show up in your weeks.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <button
          onClick={() => (href ? router.push(href) : isAuthenticated ? router.push('/practice') : setAuthOpen(true))}
          style={{ ...type.ui, background: charcoal, color: cream, borderRadius: 8, padding: '10px 18px', minHeight: 44, border: 'none', cursor: 'pointer' }}
        >
          {label}
        </button>
      </div>
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => setAuthOpen(false)}
        context="save-progress"
        returnPath="/practice"
      />
    </div>
  )
}

export function ContinueRing1Card({ totalAnswered, onContinue }: { totalAnswered: number; onContinue: () => void }) {
  return (
    <div style={{ background: charcoal, borderRadius: 14, padding: '20px 22px', textAlign: 'center' }}>
      <p style={{ ...type.display4, color: cream, margin: 0 }}>
        Keep discovering
      </p>
      <p style={{ ...type.body, color: 'rgba(247,244,237,0.85)', marginTop: 8 }}>
        {"You've answered"} {totalAnswered} of 120 questions. More patterns may still surface.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <button onClick={onContinue} style={{ ...type.ui, background: 'white', color: charcoal, borderRadius: 8, padding: '10px 18px', minHeight: 44, border: 'none', cursor: 'pointer' }}>
          Continue →
        </button>
      </div>
    </div>
  )
}

// One card, always — not one design for a single suggestion and a different
// layout for multiple. With multiple qualifying branches, the hero copy stays
// scoped to the top-ranked one only; the rest get named in a trailing
// reference line, not their own copy block.
export function BranchSuggestionCard({
  branchLabel,
  reason,
  extraBranchLabels,
  isPaid,
  onSelect,
  paidActionLabel,
}: {
  branchLabel: string
  reason: string
  extraBranchLabels?: string[]
  isPaid: boolean
  onSelect: () => void
  /** Paid button wording to use instead of "Start {branchLabel}" (NEXT_PUBLIC_REPORT_CTA). */
  paidActionLabel?: string
}) {
  const hasExtra = !!extraBranchLabels && extraBranchLabels.length > 0
  const ctaLabel = isPaid
    ? `${paidActionLabel ?? `Start ${branchLabel}`} →`
    : hasExtra
    ? `Unlock ${branchLabel} and ${extraBranchLabels!.length} more →`
    : `Unlock ${branchLabel} →`

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
        <p style={{ ...type.meta, margin: '0 0 8px' }}>
          {branchLabel}
        </p>
        <p style={{ ...type.display4, color: charcoal, margin: 0 }}>
          There might be something here
        </p>
        <p style={{ ...type.body, color: charcoalSoft, marginTop: 8 }}>
          {reason}
        </p>
        {hasExtra && (
          <p style={{ ...type.meta, marginTop: 10 }}>
            {isPaid ? 'Also available' : 'Also unlocks'}: {extraBranchLabels!.join(', ')}.
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button onClick={onSelect} style={{ ...type.ui, background: charcoal, color: cream, borderRadius: 8, padding: '10px 18px', minHeight: 44, border: 'none', cursor: 'pointer' }}>
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Branch routing ───────────────────────────────────────────────────────────

export const BRANCH_DISPLAY_NAMES: Record<Branch, string> = {
  environment:   'Your environment',
  relationships: 'How I connect',
  energy:        'Your energy',
  working_style: 'Your working style',
  direction:     'Your direction',
}

// "Explore …" wording per branch (behind NEXT_PUBLIC_REPORT_CTA). Written
// out, not lowercased from the display name: "How I connect" would read
// "Explore your how I connect".
export const BRANCH_EXPLORE_LABELS: Record<Branch, string> = {
  environment:   'Explore your environment',
  relationships: 'Explore how you connect',
  energy:        'Explore your energy',
  working_style: 'Explore your working style',
  direction:     'Explore your direction',
}

export const BRANCH_ROUTES: Record<Branch, string> = {
  environment:   '/assessment/environment',
  relationships: '/assessment/relationships',
  energy:        '/assessment/energy',
  working_style: '/assessment/working-style',
  direction:     '/assessment/direction',
}
