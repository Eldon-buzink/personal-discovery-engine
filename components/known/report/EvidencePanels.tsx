'use client'

// "See what this is based on", one pattern everywhere (the same
// pill and dialog as the product's EvidenceDialog, .ev-* in globals.css),
// with the picked option A inside:
// - MultiEvidence (Summary, cluster reading): two plain sentences, then a
//   blob-on-a-track row per trait it draws on (validated draws_on, so
//   excluded facets never appear), at most 8, no answers. Tapping a row
//   opens that trait.
// - TraitEvidence (trait card): the statements sentence, the track and the
//   position sentence, the two answers, the statements line.
// Dialog behaviour as EvidenceDialog: portal, focus in on open and back to
// the pill on close, Tab stays inside, Escape and the backdrop close it,
// body scroll locked.

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { type } from '@/lib/design/type'
import type { Colour } from '@/lib/known/blobColour'
import { MultiRows, SingleBody, type EvidenceTrait } from './evidenceParts'

export const MAX_EVIDENCE_ROWS = 8

export function EvidencePill({ onOpen, expanded, pillRef }: { onOpen: () => void; expanded: boolean; pillRef?: React.Ref<HTMLButtonElement> }) {
  return (
    <button ref={pillRef} type="button" className="ev-trigger" aria-haspopup="dialog" aria-expanded={expanded} onClick={onOpen}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
      </svg>
      <span>See what this is based on</span>
    </button>
  )
}

function WithPill({ startOpen, footer, children }: { startOpen: boolean; footer?: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(startOpen)
  const pillRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  return (
    <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <EvidencePill onOpen={() => setOpen(true)} expanded={open} pillRef={pillRef} />
      {footer}
      {open && <Dialog onClose={close} returnFocusTo={pillRef}>{children(close)}</Dialog>}
    </div>
  )
}

export function MultiEvidence<T extends EvidenceTrait>({ traits, hueOf, onSeeTrait, startOpen = false, footer }: {
  traits: T[]
  hueOf: (t: T) => Colour
  onSeeTrait: (facet: string) => void
  startOpen?: boolean
  /** Shown directly under the pill (the AI-written line). */
  footer?: ReactNode
}) {
  const rows = traits.slice(0, MAX_EVIDENCE_ROWS)
  if (rows.length === 0) return null
  return (
    <WithPill startOpen={startOpen} footer={footer}>
      {(close) => <MultiRows traits={rows} hueOf={hueOf} onPick={(f) => { close(); onSeeTrait(f) }} />}
    </WithPill>
  )
}

export function TraitEvidence({ t, hue, responses, hasAnswers = true, startOpen = false, footer }: { t: EvidenceTrait; hue: Colour; responses: Map<number, number>; hasAnswers?: boolean; startOpen?: boolean; footer?: ReactNode }) {
  return (
    <WithPill startOpen={startOpen} footer={footer}>
      {() => <SingleBody t={t} hue={hue} responses={responses} hasAnswers={hasAnswers} />}
    </WithPill>
  )
}

function Dialog({ onClose, returnFocusTo, children }: { onClose: () => void; returnFocusTo: React.RefObject<HTMLButtonElement>; children: ReactNode }) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const trigger = returnFocusTo.current
    dialogRef.current?.focus()
    const { body, documentElement: html } = document
    const scrollY = window.scrollY
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: html.style.overflow }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    html.style.overflow = 'hidden'
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      html.style.overflow = prev.overflow
      window.scrollTo(0, scrollY)
      trigger?.focus()
    }
  }, [returnFocusTo])

  function onKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation()
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key !== 'Tab') return
    const root = dialogRef.current
    if (!root) return
    const focusable = Array.from(root.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'))
    e.preventDefault()
    if (focusable.length === 0) return
    const i = focusable.indexOf(document.activeElement as HTMLElement)
    const next = e.shiftKey ? focusable[i <= 0 ? focusable.length - 1 : i - 1] : focusable[i === -1 || i === focusable.length - 1 ? 0 : i + 1]
    next.focus()
  }

  return createPortal(
    <div className="ev-backdrop" onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose() }} onKeyDown={onKeyDown}>
      <style dangerouslySetInnerHTML={{ __html: '.evr-row:focus-visible{outline:2px solid #262420;outline-offset:2px;}' }} />
      <div ref={dialogRef} className="ev-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} style={{ textAlign: 'center' }}>
        <div className="ev-head">
          <h2 id={titleId} style={{ ...type.display3, color: '#262420', margin: 0 }}>What this is based on</h2>
          <button type="button" className="ev-close" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div style={{ marginTop: 10 }}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
