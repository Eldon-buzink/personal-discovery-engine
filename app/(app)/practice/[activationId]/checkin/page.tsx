'use client'

/**
 * Daily check-in — Main.dc.html in the mockup. The mechanism (forced-choice
 * + optional note, upsert on unique(facet_activation_id, check_in_date),
 * Skip today writes nothing) is real. Question + options come from
 * lib/known/checkInOptions.ts's per-facet CHECK_IN_PROMPTS (see
 * reference/05-daily-checkin-copy.md) — real content now, not the earlier
 * generic placeholder.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { directionalAccent } from '@/lib/known/practiceTokens'
import { getCheckInPrompt, checkInOptionWord } from '@/lib/known/checkInOptions'
import { todayLocalDateString } from '@/lib/known/checkInDate'

export default function CheckInPage({ params }: { params: { activationId: string } }) {
  const router = useRouter()
  const { activationId } = params

  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [facetId, setFacetId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }
      setUserId(user.id)

      const { data, error } = await supabase
        .from('facet_activations')
        .select('facet_id')
        .eq('id', activationId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error || !data) {
        console.error('[CheckIn] load error:', error?.message ?? 'activation not found')
        router.push('/practice')
        return
      }

      setFacetId(data.facet_id)
      setIsLoading(false)
    }

    load()
  }, [activationId, router])

  async function handleSave() {
    if (!userId || !selected) return
    setIsSaving(true)

    const supabase = createClient()
    const { error } = await supabase.from('check_ins').upsert(
      {
        user_id: userId,
        facet_activation_id: activationId,
        check_in_date: todayLocalDateString(),
        response_option: selected,
        note: note.trim() || null,
      },
      { onConflict: 'facet_activation_id,check_in_date' }
    )

    if (error) {
      console.error('[CheckIn] save error:', error.message)
      setIsSaving(false)
      return
    }

    // Round 5 feedback: saving used to redirect to /practice with zero
    // visual confirmation — the user genuinely couldn't tell it had worked.
    // Hold here briefly on an explicit "saved" state (what was logged, in
    // the same wording the option itself used) before moving on, instead
    // of an instant, silent redirect.
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => router.push('/practice'), 1100)
  }

  if (isLoading || !facetId) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-sans text-sm text-muted">Loading…</p>
      </div>
    )
  }

  if (saved && selected) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md flex flex-col items-center text-center">
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%', background: directionalAccent, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              animation: 'blobReveal 0.35s ease both',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#F7F4ED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-serif font-medium text-charcoal" style={{ fontSize: 20, lineHeight: 1.4, marginBottom: 6 }}>
            Checked in
          </p>
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 14, lineHeight: 1.5 }}>
            Logged as &ldquo;{checkInOptionWord(facetId, selected)}&rdquo; for {facetDisplayLabel(facetId)} today.
          </p>
        </div>
      </div>
    )
  }

  const prompt = getCheckInPrompt(facetId)

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center" style={{ position: 'relative' }}>
      {/* Centers the whole screen in a max-w-md column on wide viewports —
          same width every other practice screen (Practice home) uses.
          Below 448px (max-w-md) this is a no-op: mobile renders pixel-
          identical to before. The inner flex-col + minHeight keeps the
          existing sticky-bottom-button-bar structure working exactly as
          it did when this div was the root. */}
      <div className="w-full max-w-md flex flex-col" style={{ minHeight: '100vh' }}>
      <div className="flex-1 flex flex-col" style={{ padding: '48px 28px 0 28px', gap: 28, overflowY: 'auto' }}>
        <Link href="/practice" className="font-sans text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          ← Your practice
        </Link>

        <div className="flex items-center gap-2">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: directionalAccent }} />
          <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
            Today&apos;s check-in
          </p>
        </div>

        <div>
          <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 28, lineHeight: 1.25, marginBottom: 12 }}>
            {facetDisplayLabel(facetId)}
          </h1>
          <p className="font-sans text-charcoal-soft" style={{ fontSize: 15, lineHeight: 1.55 }}>
            {prompt.question}
          </p>
          {/* Review feedback: this screen had zero framing of what a
              check-in is for, despite being the highest-frequency screen in
              the product. Mechanism, not momentum — no streaks, no counts,
              no "keep it up," matching the recap's own "No score. No
              verdict." voice. */}
          <p className="font-sans text-muted" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 10 }}>
            This becomes part of your next recap — not a score, just a record of what you noticed.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {prompt.options.map((o) => {
            const isSelected = selected === o.id
            return (
              <button
                key={o.id}
                onClick={() => setSelected(o.id)}
                className="font-sans text-charcoal"
                style={{
                  textAlign: 'left', width: '100%', boxSizing: 'border-box', padding: '16px 18px',
                  borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${isSelected ? directionalAccent : '#DAD3C3'}`,
                  background: isSelected ? '#FBEEE8' : '#FFFFFF',
                }}
              >
                <span style={{ fontSize: 15, lineHeight: 1.4 }}>{o.label}</span>
              </button>
            )
          })}
        </div>

        <div>
          <label htmlFor="note" className="font-sans text-charcoal-soft" style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
            Anything else worth noting? (optional)
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A line or two is plenty"
            className="font-sans text-charcoal"
            style={{
              width: '100%', boxSizing: 'border-box', minHeight: 64, padding: '12px 14px',
              borderRadius: 10, border: '1px solid #DAD3C3', background: '#FFFFFF', fontSize: 14, resize: 'none',
            }}
          />
        </div>
      </div>

      <div
        style={{
          padding: '16px 28px 32px 28px', display: 'flex', flexDirection: 'column', gap: 10,
          background: 'linear-gradient(to top, #F7F4ED 70%, rgba(247,244,237,0))',
        }}
      >
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
          {isSaving ? 'Saving…' : 'Save check-in'}
        </button>
        <Link href="/practice" className="font-sans text-muted" style={{ display: 'block', textAlign: 'center', padding: 8, fontSize: 13 }}>
          Skip today
        </Link>
      </div>
      </div>
    </div>
  )
}
