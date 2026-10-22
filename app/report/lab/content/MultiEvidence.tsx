'use client'

// Report lab: "See what this is based on" for a Summary or a cluster
// reading. The same pill and dialog as the trait card (EvidenceDialog, the
// .ev-* styles in app/globals.css), with one compact row per trait the text
// draws on: hue dot (paid only), trait word, the 3-point scale the trait
// panel uses (BandSpectrum), and "See this trait". No answers, no position
// sentence, at most 8 rows. The list is the validated draws_on, so excluded
// facets never appear.
//
// Dialog behaviour copied from EvidenceDialog: portal, focus in on open and
// back to the pill on close, Tab stays inside, Escape and the backdrop close
// it, body scroll locked.

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import BandSpectrum from '@/components/known/BandSpectrum'
import { facetTraitWords } from '@/lib/known/scoring'
import { type } from '@/lib/design/type'
import { bandOf, FAMILY_HUES, type FilterTrait } from '@/lib/lab/filterLab'

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

export function MultiEvidence({ traits, paid, onSeeTrait, startOpen = false, footer }: {
  traits: FilterTrait[]
  paid: boolean
  onSeeTrait: (facet: string) => void
  startOpen?: boolean
  /** Shown directly under the pill (the AI-written line). */
  footer?: React.ReactNode
}) {
  const [open, setOpen] = useState(startOpen)
  const pillRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const rows = traits.slice(0, MAX_EVIDENCE_ROWS)
  if (rows.length === 0) return null
  return (
    <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <EvidencePill onOpen={() => setOpen(true)} expanded={open} pillRef={pillRef} />
      {footer}
      {open && <Dialog rows={rows} paid={paid} onClose={close} returnFocusTo={pillRef} onSeeTrait={(f) => { setOpen(false); onSeeTrait(f) }} />}
    </div>
  )
}

function Dialog({ rows, paid, onClose, returnFocusTo, onSeeTrait }: {
  rows: FilterTrait[]
  paid: boolean
  onClose: () => void
  returnFocusTo: React.RefObject<HTMLButtonElement>
  onSeeTrait: (facet: string) => void
}) {
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
      <style dangerouslySetInnerHTML={{ __html: ME_CSS }} />
      <div ref={dialogRef} className="ev-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="ev-head">
          <h2 id={titleId} style={{ ...type.display3, color: '#262420', margin: 0 }}>What this is based on</h2>
          <button type="button" className="ev-close" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <ul className="me-rows">
          {rows.map((t) => {
            const words = facetTraitWords(t.facet)
            return (
              <li key={t.facet} className="me-row">
                <div className="me-top">
                  {paid && <span aria-hidden="true" className="me-dot" style={{ background: `hsl(${FAMILY_HUES[t.cluster]},70%,60%)` }} />}
                  <span style={{ ...type.traitWord, fontSize: 18, color: '#262420' }}>{t.word}</span>
                  <button type="button" className="me-see" onClick={() => onSeeTrait(t.facet)}>See this trait</button>
                </div>
                {words && (
                  <div style={{ width: '100%', padding: '0 11px', boxSizing: 'border-box' }}>
                    <BandSpectrum band={bandOf(t.facet)} labels={words} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>,
    document.body,
  )
}

const ME_CSS = `
  .me-rows{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:10px;}
  .me-row{padding:12px 14px 2px;border-radius:12px;background:#FFFFFF;border:1px solid #E5E1D5;}
  .me-top{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
  .me-dot{width:9px;height:9px;border-radius:999px;flex-shrink:0;}
  .me-see{margin-left:auto;min-height:44px;padding:0 4px;border:0;background:none;cursor:pointer;color:#262420;
    font-family:var(--font-body);font-size:var(--text-ui);font-weight:500;text-decoration:underline;text-underline-offset:3px;}
  .me-see:focus-visible{outline:2px solid #262420;outline-offset:2px;}
`
