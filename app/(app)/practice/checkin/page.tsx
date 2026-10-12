'use client'

/**
 * Today's check-in — one entry point on Practice home that steps through
 * every trait in the check-in, one screen each, instead of a separate
 * "Check in today" per trait. Same question, options and note as the
 * single-trait check-in (CheckInQuestion), same save (saveCheckIn). Each
 * trait is saved as it's answered, so leaving halfway keeps what's done and
 * coming back picks up with the traits not yet logged today. Skip moves on
 * without writing anything, same as "Skip today" on the single-trait page.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { directionalAccent } from '@/lib/known/practiceTokens'
import { checkInOptionWord } from '@/lib/known/checkInOptions'
import { todayLocalDateString } from '@/lib/known/checkInDate'
import { formatUnlockMoment, type UnlockMoment } from '@/lib/known/checkInUnlock'
import { saveCheckIn, unlockHref } from '@/lib/known/saveCheckIn'
import { useActiveTraitCheckIns } from '@/lib/known/useActiveTraitCheckIns'
import CheckInQuestion from '@/components/known/CheckInQuestion'
import { ReviewLoading } from '@/components/known/ReviewStates'

interface StepResult {
  activationId: string
  facetId: string
  option: string | null // null = skipped
  moment: UnlockMoment
}

export default function DailyCheckInPage() {
  const { traits, userId, failed } = useActiveTraitCheckIns()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [results, setResults] = useState<StepResult[]>([])

  // The traits still to do today, fixed at load so the steps don't shift
  // as each one is saved.
  const queue = useMemo(() => {
    if (!traits) return []
    const today = todayLocalDateString()
    return traits.filter((t) => !t.checkIns.some((c) => c.check_in_date === today))
  }, [traits])

  useEffect(() => { window.scrollTo(0, 0) }, [index])

  if (!traits) return <ReviewLoading failed={failed} />

  const current = queue[index]

  function next(result: StepResult) {
    setResults((r) => [...r, result])
    setSelected(null)
    setNote('')
    setSaveError(false)
    setIndex((i) => i + 1)
  }

  async function handleSave() {
    if (!current || !userId || !selected) return
    setIsSaving(true)
    const result = await saveCheckIn(createClient(), {
      userId,
      activationId: current.activationId,
      option: selected,
      note,
      existingCheckIns: current.checkIns,
      periodStartedAt: current.periodStartedAt,
    })
    setIsSaving(false)
    if (!result.ok) {
      console.error('[DailyCheckIn] save error:', result.message)
      setSaveError(true)
      return
    }
    next({ activationId: current.activationId, facetId: current.facetId, option: selected, moment: result.moment })
  }

  if (!current) {
    const logged = results.filter((r) => r.option)
    const unlocks = results.filter((r) => formatUnlockMoment(r.moment))
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md flex flex-col items-center text-center" style={{ gap: 6 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%', background: directionalAccent, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
              animation: 'blobReveal 0.35s ease both',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#F7F4ED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-serif font-medium text-charcoal" style={{ fontSize: 20, lineHeight: 1.4 }}>
            {results.length === 0 ? 'Already checked in today' : logged.length > 0 ? 'Checked in' : 'Nothing logged today'}
          </p>

          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {results.map((r) => (
                <p key={r.activationId} className="font-sans text-charcoal-soft" style={{ fontSize: 14, lineHeight: 1.5 }}>
                  {facetDisplayLabel(r.facetId)}:{' '}
                  {r.option ? <>&ldquo;{checkInOptionWord(r.facetId, r.option)}&rdquo;</> : <span className="text-muted">skipped</span>}
                </p>
              ))}
            </div>
          )}

          {/* Rework Part 5 — said once, exactly when a check-in unlocks
              something; one line per trait that did. */}
          {unlocks.map((r) => (
            <div key={r.activationId} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <p className="font-sans text-charcoal-soft" style={{ fontSize: 14, lineHeight: 1.5 }}>
                {facetDisplayLabel(r.facetId)}: {formatUnlockMoment(r.moment)}
              </p>
              <Link
                href={unlockHref(r.moment, r.activationId)}
                className="font-sans font-medium"
                style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #DAD3C3', background: '#FFFFFF', color: '#262420', fontSize: 14 }}
              >
                See your review
              </Link>
            </div>
          ))}

          <Link
            href="/practice"
            className="font-sans font-medium"
            style={{ marginTop: 22, padding: '12px 22px', borderRadius: 10, background: '#262420', color: '#F7F4ED', fontSize: 14 }}
          >
            Back to your practice
          </Link>
        </div>
      </div>
    )
  }

  const isLast = index === queue.length - 1

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col">
        <div className="flex flex-col" style={{ padding: '40px 28px 0 28px', gap: 28 }}>
          <div className="flex items-center justify-between">
            <Link href="/practice" className="font-sans text-muted" style={{ fontSize: 13 }}>
              ← Your practice
            </Link>
            <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 12, letterSpacing: '0.04em' }}>
              Today&apos;s check-in · {index + 1} of {queue.length}
            </p>
          </div>

          <CheckInQuestion
            key={current.activationId}
            facetId={current.facetId}
            directional={current.directional}
            isFirstCheckIn={current.checkIns.length === 0}
            selected={selected}
            onSelect={setSelected}
            note={note}
            onNoteChange={setNote}
          />
        </div>

        <div style={{ padding: '24px 28px 32px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {saveError && (
            <p className="font-sans" style={{ fontSize: 13, color: '#8a5a3d', textAlign: 'center' }}>
              That didn&apos;t save — try again in a moment.
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={!selected || isSaving}
            className="font-sans font-medium"
            style={{
              display: 'block', textAlign: 'center', padding: 15, borderRadius: 10,
              background: '#262420', color: '#F7F4ED', fontSize: 15,
              opacity: !selected || isSaving ? 0.5 : 1,
            }}
          >
            {isSaving ? 'Saving…' : isLast ? 'Save and finish' : 'Save and continue'}
          </button>
          <button
            onClick={() => next({ activationId: current.activationId, facetId: current.facetId, option: null, moment: null })}
            className="font-sans text-muted"
            style={{ display: 'block', textAlign: 'center', padding: 8, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Skip this one today
          </button>
        </div>
      </div>
    </div>
  )
}
