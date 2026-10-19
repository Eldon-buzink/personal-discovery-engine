'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import BandSpectrum from '@/components/known/BandSpectrum'
import { answersHeading, evidenceTriggerShown, itemCountLine, type EvidencePanelData } from '@/lib/known/evidencePanel'
import { type } from '@/lib/design/type'

// "See what this is based on" on a Ring 1 trait card: a real <button> at
// the end of the card, opening a dialog only when asked. Centred modal on
// desktop, bottom sheet at 640px and below (app/globals.css .ev-*).
//
// The dialog lives in a portal on document.body. React still bubbles
// portal events to the card's ancestors, so the root stops key, pointer and
// touch events: the trait carousel's arrow keys and swipe never fire from
// inside it. role="dialog", aria-modal, aria-labelledby; focus moves in on
// open, stays in (Tab wraps), and returns to the button on close; Escape,
// the backdrop and the close button close it. Body scroll is locked by
// fixing the body at the current scroll position (works on iOS Safari) and
// restored on close. Reduced motion: it just appears.
//
// Content (lib/known/evidencePanel.ts): where you landed, the answers the
// model received, and the statement count. A sensitive facet (answers never
// sent) shows only the title and the count line.
export default function EvidenceDialog({ data }: { data: EvidencePanelData | null }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  if (!data || !evidenceTriggerShown(data)) return null
  return (
    <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
      <button
        ref={triggerRef}
        type="button"
        className="ev-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
        </svg>
        <span>See what this is based on</span>
      </button>
      {open && <Dialog data={data} onClose={close} returnFocusTo={triggerRef} />}
    </div>
  )
}

function Dialog({ data, onClose, returnFocusTo }: {
  data: EvidencePanelData
  onClose: () => void
  returnFocusTo: React.RefObject<HTMLButtonElement>
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus in on open, back to the button on close; body scroll lock.
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
    const focusable = Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    // Focus is moved here on every Tab, not left to the browser: Safari's
    // default Tab order skips buttons, which would let focus leave.
    e.preventDefault()
    if (focusable.length === 0) return
    const i = focusable.indexOf(document.activeElement as HTMLElement)
    const next = e.shiftKey
      ? focusable[i <= 0 ? focusable.length - 1 : i - 1]
      : focusable[i === -1 || i === focusable.length - 1 ? 0 : i + 1]
    next.focus()
  }

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  const answers = data.sensitive ? null : data.answers

  return createPortal(
    <div
      className="ev-backdrop"
      onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose() }}
      onKeyDown={onKeyDown}
      onPointerDown={stop} onPointerMove={stop} onPointerUp={stop}
      onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop}
      onWheel={stop}
    >
      <div ref={dialogRef} className="ev-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="ev-head">
          <h2 id={titleId} style={{ ...type.display3, color: '#262420', margin: 0 }}>What this is based on</h2>
          <button type="button" className="ev-close" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {!data.sensitive && (
          <section className="ev-part">
            <h3 style={{ ...type.ui, color: '#262420', margin: '0 0 12px' }}>Where you landed</h3>
            {/* 11px side padding: the spectrum centres its end dots on 0% and
                100%, so without it they'd hang half outside the dialog. */}
            <div style={{ width: '100%', padding: '0 11px', boxSizing: 'border-box' }}>
              <BandSpectrum band={data.direction} labels={data.words} />
            </div>
            <p style={{ ...type.body, color: '#56534D', margin: '12px 0 0' }}>{data.sentence}</p>
          </section>
        )}

        {answers && answers.length > 0 && (
          <section className="ev-part">
            <h3 style={{ ...type.ui, color: '#262420', margin: '0 0 10px' }}>{answersHeading(answers.length)}</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {answers.map((a) => (
                <li key={a.text} style={{ padding: '12px 14px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E5E1D5' }}>
                  <p style={{ ...type.body, color: '#262420', margin: 0 }}>&ldquo;{a.text}&rdquo;</p>
                  <p style={{ ...type.ui, color: '#56534D', margin: '4px 0 0' }}>{a.answer}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p style={{ ...type.body, color: '#56534D', margin: '22px 0 0' }}>{itemCountLine(data.itemCount)}</p>
      </div>
    </div>,
    document.body,
  )
}
