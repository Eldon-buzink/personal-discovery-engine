'use client'

import { useEffect, useState } from 'react'
import { useRouter, notFound } from 'next/navigation'
import AuthModal from '@/components/known/AuthModal'
import PaywallModal from '@/components/known/PaywallModal'
import { createClient } from '@/lib/supabase/client'
import { claimMiniAssessmentResult } from '@/lib/known/miniAssessmentClaim'
import {
  MINI_ASSESSMENT_SLUG_TO_FACET,
  MINI_ASSESSMENT_DISPLAY_LABEL,
  MINI_ASSESSMENT_BAND_COPY,
  type MiniAssessmentSlug,
  type MiniAssessmentBand,
} from '@/lib/known/miniAssessmentScoring'
import { directionalAccent } from '@/lib/known/practiceTokens'

const BAND_LABEL: Record<MiniAssessmentBand, string> = {
  low: 'Lower',
  mid: 'Middle',
  high: 'Higher',
}

export default function MiniAssessmentResultPage({ params }: { params: { facet: string } }) {
  const router = useRouter()
  const slug = params.facet as MiniAssessmentSlug
  const facet = MINI_ASSESSMENT_SLUG_TO_FACET[slug]

  const [resultId, setResultId] = useState<string | null>(null)
  const [band, setBand] = useState<MiniAssessmentBand | null>(null)
  const [ready, setReady] = useState(false)

  // Null until the auth check resolves — distinct from "checked and found no
  // user", so the button doesn't briefly offer the wrong flow while loading.
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    setResultId(search.get('id'))
    setBand(search.get('band') as MiniAssessmentBand | null)
    setReady(true)

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      setAuthChecked(true)
    })
  }, [])

  if (!facet) notFound()
  if (!ready) return null
  if (!resultId || !band) notFound()

  const displayLabel = MINI_ASSESSMENT_DISPLAY_LABEL[facet]
  const bandCopy = MINI_ASSESSMENT_BAND_COPY[facet][band]

  // Only a logged-out visitor needs the signup gate at all — an already-
  // authenticated user (e.g. someone with an existing free-tier account who
  // revealed a few traits already) just activates directly, no account
  // creation step in the way. Runs the exact same claim logic
  // app/auth/claim/page.tsx uses for the post-magic-link path.
  async function handleAddToCheckIns() {
    if (!authChecked) return
    if (!userId) {
      setAuthModalOpen(true)
      return
    }

    setIsActivating(true)
    setActivateError(null)
    const supabase = createClient()
    const result = await claimMiniAssessmentResult(supabase, userId, resultId!)

    if (result.ok) {
      router.push('/practice')
    } else if (result.reason === 'already-active') {
      router.push('/practice?notice=already-active')
    } else if (result.reason === 'at-cap') {
      router.push('/practice?notice=at-cap')
    } else {
      console.error('[MiniAssessmentResult] activate error:', result.message)
      setActivateError('Something went wrong — try again in a moment.')
      setIsActivating(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center px-6 py-16">
      <div className="w-full max-w-md flex flex-col items-center">
        <span
          className="font-sans font-semibold uppercase text-center"
          style={{ fontSize: 11, letterSpacing: '0.07em', color: directionalAccent, marginBottom: 14 }}
        >
          Directional read
        </span>

        <p className="font-sans text-[11px] uppercase tracking-wide text-muted" style={{ marginBottom: 10 }}>
          {displayLabel}
        </p>

        <h1
          className="font-serif font-medium text-charcoal text-center"
          style={{ fontSize: 26, lineHeight: 1.3, marginBottom: 20 }}
        >
          {BAND_LABEL[band]} {displayLabel.toLowerCase()}
        </h1>

        <p className="font-sans text-charcoal-soft text-center" style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}>
          {bandCopy}
        </p>

        <p className="font-sans text-muted text-center" style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 32 }}>
          This is a directional read from 6 questions, not the full picture — the complete report gives you a
          confident score plus everything else your patterns show.
        </p>

        {activateError && (
          <p className="font-sans text-center" style={{ fontSize: 13, color: '#8a5a3d', marginBottom: 12 }}>
            {activateError}
          </p>
        )}

        <button
          onClick={handleAddToCheckIns}
          disabled={isActivating}
          className="w-full font-sans font-medium text-cream bg-charcoal"
          style={{ fontSize: 15, borderRadius: 10, padding: 15, marginBottom: 12, opacity: isActivating ? 0.6 : 1 }}
        >
          {isActivating ? 'Adding…' : 'Add to your daily check-ins'}
        </button>

        <button
          onClick={() => setPaywallOpen(true)}
          className="font-sans text-muted underline text-center w-full"
          style={{ fontSize: 12.5 }}
        >
          Unlock the full report — €49
        </button>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {}}
        context="mini-assessment-signup"
        miniAssessmentResultId={resultId}
        returnPath="/practice"
      />

      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        isAuthenticated={!!userId}
        userId={userId}
        traitCount={1}
        onAuthenticated={(id) => setUserId(id)}
        onPaymentConfirmed={() => setPaywallOpen(false)}
      />
    </div>
  )
}
